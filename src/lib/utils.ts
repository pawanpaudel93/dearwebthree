import fs from 'fs';
import path from 'path';

import { listFrameworks } from '@netlify/framework-info';
import chalk from 'chalk';
import Conf from 'conf';
import glob from 'glob';
import createJITI from 'jiti';
import { exec } from 'promisify-child-process';

import { logger, Web3Deploy, Web3DeployConfig } from './Web3Deploy';

const jiti = createJITI(__filename);

const buildCommands = {
  react: 'npx react-scripts build',
  next: 'npx next build && npx next export',
  vue: 'npx vue-cli-service build',
  nuxt: 'npx nuxt generate',
  vite: 'npx vite build --base "./"',
};

interface Deployment {
  name: string;
  timestamp: string;
  URL: string;
}

const checkConfig = (cliConfig: Web3DeployConfig) => {
  const errors: string[] = [];
  if (!cliConfig.apiKey) {
    errors.push('Web3.storage apiKey is not setup');
  }
  if (errors.length > 0) {
    throw new Error(chalk.red('-> ') + errors.join('\n' + chalk.red('-> ')));
  }
};

const getConfig = (pattern: string, folderPath?: string) => {
  if (!folderPath) {
    const configFiles = glob.sync(path.join(process.cwd(), pattern));
    if (configFiles.length > 0) {
      const appConfig = jiti(configFiles[0]);
      return appConfig.default ? appConfig.default : appConfig;
    }
  }
  return {};
};

const runCommand = async (command: string) => {
  logger.info('Running command: ' + chalk.gray(command));
  const child = exec(command);
  child.stdout.pipe(process.stdout);
  child.stderr.on('data', (data) => console.log(data));
  await child;
};

const detectFramework = async () => {
  const frameworks = await listFrameworks('.');
  if (frameworks.length > 0) {
    return frameworks[0].id;
  }
  return '';
};

const buildConfig = async (cliConfig: Web3DeployConfig) => {
  const appType = await detectFramework();
  cliConfig.appType = appType === 'create-react-app' ? 'react' : appType;
  if (cliConfig.appType === 'react') {
    cliConfig.folderPath = 'build';
  } else if (cliConfig.appType === 'next') {
    const appConfig = getConfig('next.cliConfig.{js,ts}', cliConfig.folderPath);
    cliConfig.folderPath = appConfig.outDir ? appConfig.outDir : 'out';
  } else if (cliConfig.appType === 'vue') {
    const appConfig = getConfig('vue.cliConfig.{js,ts}', cliConfig.folderPath);
    cliConfig.folderPath = appConfig.outputDir ? appConfig.outputDir : 'dist';
  } else if (cliConfig.appType === 'nuxt') {
    const appConfig = getConfig('nuxt.cliConfig.{js,ts}', cliConfig.folderPath);
    cliConfig.folderPath = appConfig?.generate?.dir
      ? appConfig?.generate?.dir
      : 'dist';
  } else if (cliConfig.appType === 'vite') {
    const appConfig = getConfig('vite.cliConfig.{js,ts}', cliConfig.folderPath);
    cliConfig.folderPath = appConfig?.build?.outDir
      ? appConfig?.build?.outDir
      : 'dist';
  }
};

const buildApp = async (cliConfig: Web3DeployConfig) => {
  if (cliConfig.appType) {
    if (cliConfig.appType === 'react') {
      process.env.PUBLIC_URL = './';
    }
    await runCommand(buildCommands[cliConfig.appType]);
  }
};

const uploadFolder = async (cliConfig: Web3DeployConfig) => {
  if (fs.existsSync(cliConfig.folderPath)) {
    try {
      const config = new Conf();
      const deployer = new Web3Deploy(cliConfig);
      const rootCid = await deployer.uploadFolder();
      const deployedURL = `https://${rootCid}.ipfs.w3s.link`;
      const deployments = config.get('deployments', []) as Deployment[];
      deployments.push({
        name: path.basename(path.resolve(process.cwd())),
        URL: deployedURL,
        timestamp: new Date().toDateString(),
      });
      config.set('deployments', deployments);
      logger.info(`Web app uploaded to ${deployedURL}`);
    } catch (e) {
      if (e.message === 'canceled') {
        logger.info('Exiting');
        return;
      }
      logger.error(e?.message ?? e);
    }
  } else {
    logger.error(`Folder path ${cliConfig.folderPath} does not exist`);
  }
};

export const setup = (options: { apiKey: string }) => {
  logger.info('Setting up Web3.storage apiKey');
  const config = new Conf();
  config.set('apiKey', options.apiKey);
  logger.info('Web3.storage apiKey is saved');
};

export const deploy = async (options: { build: boolean }) => {
  try {
    const config = new Conf();
    const apiKey = config.get('apiKey', '') as string;
    const cliConfig: Web3DeployConfig = {
      folderPath: '',
      appType: '',
      apiKey,
    };
    await buildConfig(cliConfig);
    checkConfig(cliConfig);
    if (options.build) {
      await buildApp(cliConfig);
    }
    await uploadFolder(cliConfig);
  } catch (e) {
    logger.error(e?.message ?? e);
  }
};

export const deployments = () => {
  const config = new Conf();
  const deployments = config.get('deployments', []) as Deployment[];
  if (deployments.length > 0) {
    logger.info(JSON.stringify(deployments, null, 2));
  } else {
    logger.info('No deployments yet.');
  }
};
