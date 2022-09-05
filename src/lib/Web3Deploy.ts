import fsPromises from 'fs/promises';

import glob from 'glob';
import { Logger } from 'tslog';
import { getFilesFromPath, Web3Storage } from 'web3.storage';

export type Web3DeployConfig = {
  folderPath: string;
  appType: 'react' | 'next' | 'vue' | 'nuxt' | 'vite' | '';
  apiKey: string;
};

export const logger: Logger = new Logger({
  name: 'web3-deploy',
  displayFilePath: 'hidden',
  displayFunctionName: false,
  displayDateTime: false,
});

export class Web3Deploy {
  readonly folderPath: string;
  readonly appType: string;
  readonly #client: Web3Storage;

  /**
   * Constructs a new Web3Deploy instance
   * @param folderPath - Path to the folder to be deployed
   * @param appType - Type of app to be deployed
   */
  constructor(config: Web3DeployConfig) {
    this.folderPath = config.folderPath;
    this.appType = config.appType;
    this.#client = new Web3Storage({ token: config.apiKey });
  }

  private modifyFiles(path: string) {
    const files = glob.sync(path + '/**/*.*');
    for (let i = 0; i < files.length; i++) {
      this.modifyFile(files[i]);
    }
  }

  private async modifyFile(path: string) {
    const content = await fsPromises.readFile(path, 'utf8');
    if (
      /["'](\/.*?\..*?)["']/g.test(content) ||
      /["'](\/.*?\..*?)["']/g.test(content)
    ) {
      const modifiedContent = content
        .replace(/["'](\/.*?\..*?)["']/g, 'src=".$1"')
        .replace(/["'](\/.*?\..*?)["']/g, 'href=".$1"');
      await fsPromises.writeFile(path, modifiedContent);
    }
  }

  public async uploadFolder(): Promise<string> {
    if (this.appType !== 'next') {
      this.modifyFiles(this.folderPath);
    }
    const files = await getFilesFromPath(this.folderPath);
    // show the root cid as soon as it's ready
    const onRootCidReady = (cid) => {
      logger.info('Uploading files with cid:', cid);
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
      logger.info(`Uploading... ${pct.toFixed(2)}% complete`);
    };
    return await this.#client.put(files, {
      onRootCidReady,
      onStoredChunk,
      wrapWithDirectory: false,
    });
  }
}
