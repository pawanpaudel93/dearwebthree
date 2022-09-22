import path from 'path';

import chalk from 'chalk';
import Conf from 'conf';
import glob from 'glob';
import createJITI from 'jiti';
import { getCollection, getDB, initDB } from 'lokijs-promise';
import prompts from 'prompts';
import { Logger } from 'tslog';
const jiti = createJITI(__filename);

export const CLI_NAME = 'dearwebthree';
export const CLI_VERSION = '0.0.2';

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

export const buildCommands = {
  react: 'npx react-scripts build',
  next: 'npx next build && npx next export',
  vue: 'npx vue-cli-service build',
  nuxt: 'npx nuxt generate',
  vite: 'npx vite build',
};

export function getConfig() {
  return new Conf({
    projectName: CLI_NAME,
    projectVersion: CLI_VERSION,
  });
}

export const setup = (options: { apiKey: string; service: string }) => {
  const service = options.service === 'moralis' ? 'Moralis' : 'Web3.Storage';
  const key = options.service === 'moralis' ? 'moralis' : 'web3Storage';
  logger.info(`Setting up ${service} API Key`);
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
  logger.info(`${service} API Key is saved`);
};

export const checkConfig = async (
  cliConfig: Web3DeployConfig | Web3CaptureConfig,
  service: string
) => {
  const errors: string[] = [];
  const key = service === 'moralis' ? 'moralis' : 'web3Storage';
  if (!cliConfig?.apiKey?.[key]) {
    errors.push(`${service} API Key is not saved`);
  }

  if (errors.length > 0) {
    logger.error(chalk.red('-> ') + errors.join('\n' + chalk.red('-> ')));
    const response = await prompts({
      type: 'text',
      name: 'apiKey',
      message: `Enter your ${service} API Key:`,
      validate: (value) =>
        typeof value === 'string' && value.trim() !== ''
          ? true
          : 'Enter a valid API Key',
    });
    if (!response.apiKey) throw Error(`${service} API Key is not provided`);
    setup({ apiKey: response.apiKey, service });
  }
};

const getAppConfig = (pattern: string) => {
  const configFiles = glob.sync(path.join(process.cwd(), pattern));
  if (configFiles.length > 0) {
    const appConfig = jiti(configFiles[0]);
    return appConfig.default ? appConfig.default : appConfig;
  }
  return {};
};

export const getDeploymentFolder = async (appType: string) => {
  if (appType === 'react') {
    return 'build';
  } else if (appType === 'next') {
    const appConfig = getAppConfig('next.config.{js,ts}');
    return appConfig.outDir ? appConfig.outDir : 'out';
  } else if (appType === 'vue') {
    const appConfig = getAppConfig('vue.config.{js,ts}');
    return appConfig.outputDir ? appConfig.outputDir : 'dist';
  } else if (appType === 'nuxt') {
    const appConfig = getAppConfig('nuxt.config.{js,ts}');
    return appConfig?.generate?.dir ? appConfig?.generate?.dir : 'dist';
  } else if (appType === 'vite') {
    const appConfig = getAppConfig('vite.config.{js,ts}');
    return appConfig?.build?.outDir ? appConfig?.build?.outDir : 'dist';
  }
  return 'dist';
};

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
