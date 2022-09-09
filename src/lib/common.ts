import fs from 'fs';
import path from 'path';

import { listFrameworks } from '@netlify/framework-info';
import chalk from 'chalk';
import glob from 'glob';
import createJITI from 'jiti';
import { exec } from 'promisify-child-process';

import { archiveUrl } from './archive';
import {
  getConfig,
  getDb,
  Web3ArchiveConfig,
  Web3DeployConfig,
} from './config';
import { logger, web3StorageDeploy } from './deploy';
const jiti = createJITI(__filename);

const buildCommands = {
  react: 'npx react-scripts build',
  next: 'npx next build && npx next export',
  vue: 'npx vue-cli-service build',
  nuxt: 'npx nuxt generate',
  vite: 'npx vite build',
};

const checkConfig = (cliConfig: Web3DeployConfig | Web3ArchiveConfig) => {
  const errors: string[] = [];
  if (!cliConfig.apiKey) {
    errors.push('Web3.storage apiKey is not setup');
  }
  if (errors.length > 0) {
    throw new Error(chalk.red('-> ') + errors.join('\n' + chalk.red('-> ')));
  }
};

const getAppConfig = (pattern: string, folderPath?: string) => {
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
    if (
      frameworks.length === 2 &&
      /[svelte|vite]/g.test(frameworks[0].id) &&
      /[svelte|vite]/g.test(frameworks[1].id)
    ) {
      return 'vite';
    }
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
    const appConfig = getAppConfig(
      'next.cliConfig.{js,ts}',
      cliConfig.folderPath
    );
    cliConfig.folderPath = appConfig.outDir ? appConfig.outDir : 'out';
  } else if (cliConfig.appType === 'vue') {
    const appConfig = getAppConfig(
      'vue.cliConfig.{js,ts}',
      cliConfig.folderPath
    );
    cliConfig.folderPath = appConfig.outputDir ? appConfig.outputDir : 'dist';
  } else if (cliConfig.appType === 'nuxt') {
    const appConfig = getAppConfig(
      'nuxt.cliConfig.{js,ts}',
      cliConfig.folderPath
    );
    cliConfig.folderPath = appConfig?.generate?.dir
      ? appConfig?.generate?.dir
      : 'dist';
  } else if (cliConfig.appType === 'vite') {
    const appConfig = getAppConfig(
      'vite.cliConfig.{js,ts}',
      cliConfig.folderPath
    );
    cliConfig.folderPath = appConfig?.build?.outDir
      ? appConfig?.build?.outDir
      : 'dist';
  }
};

const buildApp = async (cliConfig: Web3DeployConfig) => {
  if (cliConfig.appType) {
    await runCommand(buildCommands[cliConfig.appType]);
  }
};

const deployWithConfig = async (cliConfig: Web3DeployConfig) => {
  if (fs.existsSync(cliConfig.folderPath)) {
    try {
      const db = getDb();
      const rootCid = await web3StorageDeploy(cliConfig);
      const deployedURL = `https://w3s.link/ipfs/${rootCid}`;
      let deployments = db.getCollection('deployments');
      if (deployments === null) {
        deployments = db.addCollection('deployments');
      }
      deployments.insert({
        name: path.basename(path.resolve(process.cwd())),
        URL: deployedURL,
        timestamp: new Date().getTime(),
      });
      logger.info(`Web app uploaded to ${deployedURL}`);
      db.close();
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
  const config = getConfig();
  config.set('apiKey', options.apiKey);
  logger.info('Web3.storage apiKey is saved');
};

export const deploy = async (options: { build: boolean }) => {
  try {
    const config = getConfig();
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
    await deployWithConfig(cliConfig);
  } catch (e) {
    logger.error(e?.message ?? e);
  }
};

export const deployments = () => {
  getDb(true, 'deployments');
};

export const archive = async (url: string) => {
  logger.info(`Archiving url: ${url}`);
  const config = getConfig();
  const apiKey = config.get('apiKey', '') as string;
  const cliConfig: Web3ArchiveConfig = {
    apiKey,
  };
  checkConfig(cliConfig);
  const { status, message, contentID, title } = await archiveUrl(
    cliConfig,
    url
  );
  if (status === 'success') {
    const db = getDb();
    const archivedURL = `https://w3s.link/ipfs/${contentID}`;
    let archives = db.getCollection('archives');
    if (archives === null) {
      archives = db.addCollection('archives');
    }
    archives.insert({
      URL: url,
      title,
      archivedURL,
      timestamp: new Date().getTime(),
    });
    logger.info(`${url} archived to ${archivedURL}`);
    db.close();
  } else {
    logger.error(message);
  }
};

export const archives = () => {
  getDb(true, 'archives');
};
