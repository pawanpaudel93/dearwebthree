import path from 'path';

import Conf from 'conf';
import { getCollection, getDB, initDB } from 'lokijs-promise';
import { Logger } from 'tslog';

export const CLI_NAME = 'dearwebthree';
export const CLI_VERSION = '0.0.1';

export type Web3DeployConfig = {
  folderPath: string;
  appType: 'react' | 'next' | 'vue' | 'nuxt' | 'vite' | '';
  apiKey: {
    web3Storage?: string;
    moralis?: string;
  };
};

export type Web3CaptureConfig = {
  apiKey: {
    web3Storage?: string;
    moralis?: string;
  };
};

export const logger: Logger = new Logger({
  name: 'dearwebthree',
  displayFilePath: 'hidden',
  displayFunctionName: false,
  displayDateTime: false,
});

export function getConfig() {
  return new Conf({
    projectName: CLI_NAME,
    projectVersion: CLI_VERSION,
  });
}

export async function getDb() {
  const config = getConfig();
  initDB(
    path.resolve(path.dirname(path.resolve(config.path)), 'database.json'),
    4000
  );
  return await getDB();
}

export async function getDbData(type?: string) {
  const db = await getDb();
  let collection = await getCollection(type);
  collection = collection.find();
  let output: (string | boolean)[];
  if (collection.length > 0) {
    output = [
      JSON.stringify(
        type === 'deployments'
          ? collection.map((deployment) => ({
              id: deployment.id,
              name: deployment.name,
              url: deployment.url,
              timestamp: deployment.timestamp,
            }))
          : collection.map((capture) => ({
              id: capture.id,
              url: capture.url,
              title: capture.title,
              capturedUrl: capture.capturedUrl,
              timestamp: capture.timestamp,
            })),
        null,
        2
      ),
      true,
    ];
  } else {
    output = [`No ${type} yet.`, false];
  }
  db.close();
  return output;
}
