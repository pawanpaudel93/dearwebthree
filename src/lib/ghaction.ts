import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

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
    }
    logger.info(`${W3NAME_JSON} file already exists`);
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initDeploymentAction = async () => {
  try {
    logger.info('Saving deployments github action...');
    const savePath = '.github/workflows/';
    const appType: string = await detectFramework();
    const buildFolder = await getDeploymentFolder(appType);
    const commands = (buildCommands[appType] as string).split('&&');
    let DEPLOYMENT_ACTION = (
      await fsPromises.readFile(
        path.join(
          path.dirname(fs.realpathSync(__dirname)),
          'actions/deployment.yml'
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
    ).replace(/PROJECT_NAME/g, getFolderName());
    if (!(await checkFileExists(savePath))) {
      await fsPromises.mkdir(savePath, {
        recursive: true,
      });
    }
    await fsPromises.writeFile(savePath + 'deployment.yml', DEPLOYMENT_ACTION);
    logger.info('Saved successfully...');
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initCaptureAction = async () => {
  try {
    logger.info('Saving Capture github action...');
    const savePath = '.github/workflows/';
    const CAPTURE_ACTION = (
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
    await fsPromises.writeFile(savePath + 'capture.yml', CAPTURE_ACTION);
    logger.info('Saved successfully');
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initAction = async (type: 'deployment' | 'capture') => {
  if (type === 'deployment') {
    await initDeploymentAction();
  } else if (type === 'capture') {
    await initCaptureAction();
  }
};
