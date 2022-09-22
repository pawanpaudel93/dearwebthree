import fsPromises from 'node:fs/promises';
import { resolve } from 'path';

import { directory } from 'tempy';
import { v4 as uuidv4 } from 'uuid';
import { getFilesFromPath, Web3Storage } from 'web3.storage';

import {
  checkConfig,
  getConfig,
  getDb,
  getDbData,
  logger,
  Web3CaptureConfig,
} from './config';
import { runBrowser } from './single-file';
import {
  getChromeExecutablePath,
  getErrorMessage,
  moralisIPFSUpload,
} from './utils';

export const captureUrl = async (
  cliConfig: Web3CaptureConfig,
  url: string,
  isMoralis: boolean
) => {
  const tempDirectory = directory();
  try {
    let cid: string;
    await runBrowser({
      browserArgs:
        '["--no-sandbox", "--window-size=1920,1080", "--start-maximized"]',
      browserExecutablePath: getChromeExecutablePath(),
      url,
      basePath: tempDirectory,
      output: resolve(tempDirectory, 'index.html'),
    });
    if (isMoralis) {
      cid = await moralisIPFSUpload(tempDirectory, cliConfig.apiKey.moralis);
    } else {
      const client = new Web3Storage({
        token: cliConfig.apiKey.web3Storage,
        endpoint: new URL('https://api.web3.storage'),
      });
      const files = await getFilesFromPath(tempDirectory);
      // console.log(files);
      cid = await client.put(files, {
        wrapWithDirectory: false,
        maxRetries: 3,
      });
    }
    const data = await (
      await fsPromises.readFile(resolve(tempDirectory, 'metadata.json'))
    ).toString();
    const { title } = JSON.parse(data);
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
    return {
      status: 'success',
      message: 'Uploaded to Web3.Storage!',
      contentID: cid,
      title,
    };
  } catch (error) {
    console.error(error);
    if (tempDirectory) {
      await fsPromises.rm(tempDirectory, { recursive: true, force: true });
    }
    return {
      status: 'error',
      message: error.message,
      contentID: '',
      title: '',
    };
  }
};

export const capture = async (url: string, options: { service: string }) => {
  logger.info(`Capturing url: ${url}`);
  const config = getConfig();
  const apiKey = config.get('apiKey');
  const cliConfig: Web3CaptureConfig = {
    apiKey,
  };
  const isMoralis = options.service === 'moralis';
  await checkConfig(cliConfig, options.service);
  const { status, message, contentID, title } = await captureUrl(
    cliConfig,
    url,
    isMoralis
  );
  if (status === 'success') {
    const db = await getDb();
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

export const captures = async () => {
  try {
    const data = await getDbData('captures');
    logger.info(data[0]);
  } catch (error) {
    logger.info(getErrorMessage(error));
  }
};
