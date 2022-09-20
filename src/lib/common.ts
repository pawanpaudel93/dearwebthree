import fs from 'fs';
import path from 'path';

import { listFrameworks } from '@netlify/framework-info';
import chalk from 'chalk';
import glob from 'glob';
import createJITI from 'jiti';
import { exec } from 'promisify-child-process';
import prompts from 'prompts';
import { v4 as uuidv4 } from 'uuid';

import { captureUrl } from './capture';
import {
  getConfig,
  getDb,
  logger,
  Web3CaptureConfig,
  Web3DeployConfig,
} from './config';
import { moralisIPFSDeploy, web3StorageDeploy } from './deploy';
const jiti = createJITI(__filename);

const buildCommands = {
  react: 'npx react-scripts build',
  next: 'npx next build && npx next export',
  vue: 'npx vue-cli-service build',
  nuxt: 'npx nuxt generate',
  vite: 'npx vite build',
};

const checkConfig = async (
  cliConfig: Web3DeployConfig | Web3CaptureConfig,
  isMoralis = false
) => {
  const errors: string[] = [];
  const service = isMoralis ? 'Moralis' : 'Web3.Storage';
  if (!cliConfig.apiKey[isMoralis ? 'moralis' : 'web3Storage']) {
    errors.push(`${service} apiKey is not setup`);
  }

  if (errors.length > 0) {
    logger.error(chalk.red('-> ') + errors.join('\n' + chalk.red('-> ')));
    const response = await prompts({
      type: 'string',
      name: 'apiKey',
      message: `Enter your ${service} API Key:`,
    });
    setup({ apiKey: response.apiKey, moralis: isMoralis });
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
      ((/[svelte|vite]/g.test(frameworks[0].id) &&
        /[svelte|vite]/g.test(frameworks[1].id)) ||
        (/[svelte-kit|vite]/g.test(frameworks[0].id) &&
          /[svelte-kit|vite]/g.test(frameworks[1].id)))
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

const deployWithConfig = async (
  cliConfig: Web3DeployConfig,
  isMoralis: boolean
) => {
  if (fs.existsSync(cliConfig.folderPath)) {
    try {
      const db = getDb();
      let rootCid: string;
      if (isMoralis) {
        rootCid = await moralisIPFSDeploy(cliConfig);
      } else {
        rootCid = await web3StorageDeploy(cliConfig);
      }
      const deployedURL = `https://w3s.link/ipfs/${rootCid}`;
      let deployments = db.getCollection('deployments');
      if (deployments === null) {
        deployments = db.addCollection('deployments');
      }
      deployments.insert({
        id: uuidv4(),
        name: path.basename(path.resolve(process.cwd())),
        url: deployedURL,
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

export const setup = (options: { apiKey: string; moralis: boolean }) => {
  const service = options.moralis ? 'Moralis' : 'Web3.Storage';
  const key = options.moralis ? 'moralis' : 'web3Storage';
  logger.info(`Setting up ${service} apiKey`);
  const config = getConfig();
  const apiKey = config.get('apiKey', undefined);
  if (apiKey) {
    config.set('apiKey', {
      ...(apiKey as { moralis?: string; web3Storage?: string }),
      [key]: options.apiKey,
    });
  } else {
    config.set('apiKey', {
      [key]: options.apiKey,
    });
  }
  logger.info(`${service} apiKey is saved`);
};

export const deploy = async (options: { build: boolean; moralis: boolean }) => {
  try {
    const config = getConfig();
    const apiKey = config.get('apiKey', { moralis: '', web3Storage: '' });
    const cliConfig: Web3DeployConfig = {
      folderPath: '',
      appType: '',
      apiKey,
    };
    await buildConfig(cliConfig);
    await checkConfig(cliConfig, options.moralis);
    if (options.build) {
      await buildApp(cliConfig);
    } else {
      logger.info('Deploying without building the app...');
    }
    await deployWithConfig(cliConfig, options.moralis);
  } catch (e) {
    console.log(e);
    logger.error(e?.message ?? e);
  }
};

export const deployments = () => {
  getDb(true, 'deployments');
};

export const capture = async (url: string, options: { moralis: boolean }) => {
  logger.info(`Capturing url: ${url}`);
  const config = getConfig();
  const apiKey = config.get('apiKey');
  const cliConfig: Web3CaptureConfig = {
    apiKey,
  };
  await checkConfig(cliConfig);
  const { status, message, contentID, title } = await captureUrl(
    cliConfig,
    url,
    options.moralis
  );
  if (status === 'success') {
    const db = getDb();
    const capturedUrl = `https://w3s.link/ipfs/${contentID}`;
    let captures = db.getCollection('captures');
    if (captures === null) {
      captures = db.addCollection('captures');
    }
    captures.insert({
      id: uuidv4(),
      url,
      title,
      capturedUrl,
      timestamp: new Date().getTime(),
    });
    logger.info(`${url} captured to ${capturedUrl}`);
    db.close();
  } else {
    logger.error(message);
  }
};

export const captures = () => {
  getDb(true, 'captures');
};
