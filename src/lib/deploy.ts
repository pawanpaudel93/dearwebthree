import { getFilesFromPath, Web3Storage } from 'web3.storage';

import { logger, Web3DeployConfig } from './config';
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
