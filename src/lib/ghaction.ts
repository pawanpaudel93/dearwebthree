import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import * as Name from 'w3name';

import { getDeploymentFolder, logger } from './config';
import { checkFileExists, detectFramework, getFolderName } from './utils';
import { arrayBufferToHexString, getErrorMessage } from './utils';
const W3NAME_JSON = 'w3name.json';

export const createName = async () => {
  try {
    if (!checkFileExists(W3NAME_JSON)) {
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
    const savePath = '.github/workflows/';
    const appType = await detectFramework();
    const buildFolder = await getDeploymentFolder(appType);
    let DEPLOYMENT_ACTION = (
      await fsPromises.readFile(
        path.join(
          path.dirname(fs.realpathSync(__dirname)),
          'actions/deployment.yml'
        )
      )
    ).toString();
    DEPLOYMENT_ACTION = DEPLOYMENT_ACTION.replace(
      'DEPLOYMENT_FOLDER',
      buildFolder
    ).replace('PROJECT_NAME', getFolderName());
    if (!checkFileExists(savePath)) {
      await fsPromises.mkdir(savePath, {
        recursive: true,
      });
    }
    await fsPromises.writeFile(savePath + 'deployment.yml', DEPLOYMENT_ACTION);
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};

export const initCaptureAction = async () => {
  try {
    const savePath = '.github/workflows/';
    const CAPTURE_ACTION = (
      await fsPromises.readFile(
        path.join(
          path.dirname(fs.realpathSync(__dirname)),
          'actions/capture.yml'
        )
      )
    ).toString();

    if (!checkFileExists(savePath)) {
      await fsPromises.mkdir(savePath, {
        recursive: true,
      });
    }
    await fsPromises.writeFile(savePath + 'capture.yml', CAPTURE_ACTION);
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
