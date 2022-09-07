import path from 'path';

import Conf from 'conf';
import loki from 'lokijs';
import lfsa from 'lokijs/src/loki-fs-structured-adapter.js';

import { logger } from './deploy';

export const CLI_NAME = 'dearwebthree';
export const CLI_VERSION = '0.0.1';

export type Web3DeployConfig = {
  folderPath: string;
  appType: 'react' | 'next' | 'vue' | 'nuxt' | 'vite' | '';
  apiKey: string;
};

export function getConfig() {
  return new Conf({
    projectName: CLI_NAME,
    projectVersion: CLI_VERSION,
  });
}

export function getDb(deploymentsCallback?: boolean) {
  const config = getConfig();
  const adapter = new lfsa();
  const defaultLokiConfig = {
    adapter,
    autosave: true,
    autosaveInterval: 4000,
  };
  const db = new loki(
    path.resolve(path.dirname(path.resolve(config.path)), 'database.json'),
    deploymentsCallback
      ? {
          ...defaultLokiConfig,
          autoload: true,
          autoloadCallback: () => {
            let deployments = db.getCollection('deployments');
            if (deployments === null) {
              deployments = db.addCollection('deployments');
            }
            deployments = deployments.find();
            if (deployments.length > 0) {
              logger.info(
                JSON.stringify(
                  deployments.map((deployment) => ({
                    name: deployment.name,
                    URL: deployment.URL,
                    timestamp: deployment.timestamp,
                  })),
                  null,
                  2
                )
              );
            } else {
              logger.info('No deployments yet.');
            }
            db.close();
          },
        }
      : defaultLokiConfig
  );
  return db;
}
