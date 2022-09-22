import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import prompts from 'prompts';
import * as Name from 'w3name';

import { buildCommands } from './config';
import { getDeploymentFolder, logger } from './config';
import {
  arrayBufferToHexString,
  checkFileExists,
  detectFramework,
  getErrorMessage,
  getFolderName,
} from './utils';

const W3NAME_JSON = 'w3name.json';
const GITIGNORE = '.gitignore';
type SERVICE = 'moralis' | 'web3.storage';

export const createName = async () => {
  try {
    if (!(await checkFileExists(W3NAME_JSON))) {
      const name = await Name.create();
      const signingKey = arrayBufferToHexString(name.key.bytes);
      await fsPromises.writeFile(
        W3NAME_JSON,
        JSON.stringify(
          {
            name: name.toString(),
            signingKey,
          },
          null,
          2
        )
      );
      logger.info(`${W3NAME_JSON} file created.`);
    }
    logger.info(`${W3NAME_JSON} file already exists`);
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

const updateGitIgnore = async () => {
  try {
    if (!(await checkFileExists('.gitignore'))) {
      await fsPromises.writeFile(GITIGNORE, 'w3name.json');
    } else {
      const gitIgnoreContent = await (
        await fsPromises.readFile(GITIGNORE)
      ).toString();
      if (!/w3name\.json/g.test(gitIgnoreContent)) {
        await fsPromises.writeFile(GITIGNORE, '\nw3name.json', {
          flag: 'a+',
        });
      }
    }
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initDeploymentAction = async (service: SERVICE) => {
  try {
    const response = await prompts({
      type: 'confirm',
      name: 'isIPNS',
      message: 'Use w3name for IPNS?',
      initial: false,
    });
    logger.info('Saving deployments github action...');
    const savePath = '.github/workflows/';
    const appType: string = await detectFramework();
    const buildFolder = await getDeploymentFolder(appType);
    const commands = (buildCommands[appType] as string).split('&&');
    let DEPLOYMENT_ACTION = (
      await fsPromises.readFile(
        path.join(
          path.dirname(fs.realpathSync(__dirname)),
          `actions/${
            response.isIPNS ? 'deployment' : 'deployment_without_ipns'
          }.yml`
        )
      )
    ).toString();
    if (commands.length === 1) {
      DEPLOYMENT_ACTION = DEPLOYMENT_ACTION.replace(
        /BUILD_COMMANDS/g,
        commands[0]
      );
    } else if (commands.length === 2) {
      DEPLOYMENT_ACTION = DEPLOYMENT_ACTION.replace(
        /BUILD_COMMANDS/g,
        `|\n\t\t\t\t\t${commands[0]}\n\t\t\t\t ${commands[1]}`
      );
    }
    DEPLOYMENT_ACTION = DEPLOYMENT_ACTION.replace(
      /DEPLOYMENT_FOLDER/g,
      buildFolder
    )
      .replace(/PROJECT_NAME/g, getFolderName())
      .replace(/SERVICE/g, service);
    if (!(await checkFileExists(savePath))) {
      await fsPromises.mkdir(savePath, {
        recursive: true,
      });
    }
    await fsPromises.writeFile(savePath + 'deployment.yml', DEPLOYMENT_ACTION);

    if (response.isIPNS) {
      await createName();
      await updateGitIgnore();
      logger.info(
        '\n' +
          [
            '1. Set github action secrets with key WEB3_TOKEN for web3.storage API key',
            '2. Set github action secrets with key W3NAME_SIGNING_KEY for w3name from w3name.json',
          ].join('\n')
      );
    } else {
      logger.info(
        '\n' +
          [
            '1. Set github action secrets with key WEB3_TOKEN for web3.storage API key',
          ].join('\n')
      );
    }
    logger.info('Saved successfully...');
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initCaptureAction = async (service: SERVICE) => {
  try {
    const response = await prompts({
      type: 'text',
      name: 'value',
      message:
        'Cron Expression for schedule. Default runs everyday at 00:00 AM',
      initial: '0 0 * * *',
      validate: (value) =>
        typeof value === 'string' && value.trim() !== ''
          ? true
          : 'Cron Expression is Required',
    });
    if (!response.value) throw Error(`Cron Expression is Required!!!`);
    logger.info('Saving Capture github action...');
    const savePath = '.github/workflows/';
    let CAPTURE_ACTION = (
      await fsPromises.readFile(
        path.join(
          path.dirname(fs.realpathSync(__dirname)),
          'actions/capture.yml'
        )
      )
    ).toString();

    if (!(await checkFileExists(savePath))) {
      await fsPromises.mkdir(savePath, {
        recursive: true,
      });
    }
    CAPTURE_ACTION = CAPTURE_ACTION.replace(
      /CRON_EXPRESSION/g,
      response.value
    ).replace(/SERVICE/g, service);
    await fsPromises.writeFile(savePath + 'capture.yml', CAPTURE_ACTION);
    logger.info(
      '\n' +
        [
          '1. Set github action secrets with key WEB3_TOKEN for web3.storage API key',
        ].join('\n')
    );
    logger.info('Saved successfully');
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initAction = async (type: 'deployment' | 'capture') => {
  const response = await prompts({
    type: 'select',
    name: 'service',
    message: 'Select a service',
    choices: [
      { title: 'web3.storage', value: 'web3.storage' },
      { title: 'Moralis', value: 'moralis' },
    ],
    initial: 0,
  });
  if (type === 'deployment') {
    await initDeploymentAction(response.service);
  } else if (type === 'capture') {
    await initCaptureAction(response.service);
  }
};
