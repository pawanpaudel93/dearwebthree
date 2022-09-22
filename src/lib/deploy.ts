import fs from 'fs';

import chalk from 'chalk';
import { exec } from 'promisify-child-process';
import { v4 as uuidv4 } from 'uuid';
import { getFilesFromPath, Web3Storage } from 'web3.storage';

import {
  buildCommands,
  checkConfig,
  getConfig,
  getDb,
  getDbData,
  getDeploymentFolder,
  logger,
  Web3DeployConfig,
} from './config';
import { detectFramework, getErrorMessage, getFolderName } from './utils';
import { moralisIPFSUpload } from './utils';

export async function web3StorageDeploy(
  config: Web3DeployConfig
): Promise<string> {
  const client = new Web3Storage({ token: config.apiKey.web3Storage });
  const files = await getFilesFromPath(config.folderPath);
  // show the root cid as soon as it's ready
  const onRootCidReady = (cid) => {
    logger.info('Deploying app with cid:', cid);
  };

  // when each chunk is stored, update the percentage complete and display
  const totalSize = files
    .map(
      (f: {
        name: string;
        stream: () => any;
        mode: any;
        mtime: any;
        size: any;
      }) => f.size
    )
    .reduce((a, b) => a + b, 0);
  let uploaded = 0;

  const onStoredChunk = (size) => {
    uploaded += size;
    const pct = totalSize / uploaded;
    logger.info(`Deploying... ${(pct * 100).toFixed(2)}% complete`);
  };
  return await client.put(files, {
    onRootCidReady,
    onStoredChunk,
    wrapWithDirectory: false,
  });
}

export async function moralisIPFSDeploy(
  config: Web3DeployConfig
): Promise<string> {
  return await moralisIPFSUpload(config.folderPath, config.apiKey.moralis);
}

const runCommand = async (command: string) => {
  logger.info('Running command: ' + chalk.gray(command));
  const child = exec(command);
  child.stdout.pipe(process.stdout);
  child.stderr.on('data', (data) => console.log(data));
  await child;
};

const buildConfig = async (cliConfig: Web3DeployConfig) => {
  const appType = await detectFramework();
  cliConfig.appType = appType === 'create-react-app' ? 'react' : appType;
  cliConfig.folderPath = await getDeploymentFolder(appType);
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
      const db = await getDb();
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
        name: getFolderName(),
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

export const deploy = async (options: { build: boolean; service: string }) => {
  try {
    const isMoralis = options.service === 'moralis';
    const config = getConfig();
    const apiKey = config.get('apiKey');
    const cliConfig: Web3DeployConfig = {
      folderPath: '',
      appType: '',
      apiKey,
    };
    await buildConfig(cliConfig);
    await checkConfig(cliConfig, options.service);
    if (options.build) {
      await buildApp(cliConfig);
    } else {
      logger.info('Deploying without building the app...');
    }
    await deployWithConfig(cliConfig, isMoralis);
  } catch (e) {
    console.log(e);
    logger.error(e?.message ?? e);
  }
};

export const deployments = async () => {
  try {
    const data = await getDbData('deployments');
    logger.info(data[0]);
  } catch (error) {
    logger.info(getErrorMessage(error));
  }
};
