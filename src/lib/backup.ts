import fsPromises from 'fs/promises';
import { join } from 'path';

import { getDbData, logger } from './config';
import { getErrorMessage } from './utils';

export const saveToLocal = async ({
  path,
  type,
}: {
  path: string;
  type: string;
}) => {
  const [data, dataPresent] = await getDbData(type);
  if (dataPresent) {
    await fsPromises.writeFile(path, data as string);
  }
  return [data, dataPresent];
};

export const backup = async (options: { path: string; type: string }) => {
  options.path = /json/gi.test(options.path)
    ? options.path
    : join(options.path, `${options.type}.json`);
  logger.info(`Saving ${options.type} to ${options.path}`);
  try {
    const [data, dataPresent] = await saveToLocal(options);
    if (!dataPresent) {
      logger.info(data);
    } else {
      logger.info('Saved!!!');
    }
  } catch (error) {
    logger.error(getErrorMessage(error));
  }
};
