import fsPromises from 'fs/promises';

import { getDbData } from './config';

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
