import fsPromises from 'node:fs/promises';
import { resolve } from 'path';

import { directory } from 'tempy';
import { getFilesFromPath, Web3Storage } from 'web3.storage';

import { Web3CaptureConfig } from './config';
import { runBrowser } from './single-file';
import { getChromeExecutablePath, moralisIPFSUpload } from './utils';

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
