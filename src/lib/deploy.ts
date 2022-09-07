import { Logger } from 'tslog';
import { getFilesFromPath, Web3Storage } from 'web3.storage';

export type Web3DeployConfig = {
  folderPath: string;
  appType: 'react' | 'next' | 'vue' | 'nuxt' | 'vite' | '';
  apiKey: string;
};

export const logger: Logger = new Logger({
  name: 'dearwebthree',
  displayFilePath: 'hidden',
  displayFunctionName: false,
  displayDateTime: false,
});

export async function web3StorageDeploy(
  config: Web3DeployConfig
): Promise<string> {
  const client = new Web3Storage({ token: config.apiKey });
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
