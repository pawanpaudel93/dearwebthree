import fs from 'fs';
import path from 'path';

import { listFrameworks } from '@netlify/framework-info';
import glob from 'glob';
import Moralis from 'moralis';
import which from 'which';

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

// Return location of chrome.exe file for a given Chrome directory (available: "Chrome", "Chrome SxS").
function getChromeExe(chromeDirName) {
  let windowsChromeDirectory, i, prefix;
  const suffix = '\\Google\\' + chromeDirName + '\\Application\\chrome.exe';
  const prefixes = [
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
  ];

  for (i = 0; i < prefixes.length; i++) {
    prefix = prefixes[i];
    try {
      windowsChromeDirectory = path.join(prefix, suffix);
      fs.accessSync(windowsChromeDirectory);
      return windowsChromeDirectory;
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  return windowsChromeDirectory;
}

function getBin(commands) {
  let bin, i;
  for (i = 0; i < commands.length; i++) {
    try {
      if (which.sync(commands[i])) {
        bin = commands[i];
        break;
      }
    } catch (e) {
      //
    }
  }
  return bin;
}

function getChromeDarwin(defaultPath) {
  try {
    const homePath = path.join(process.env.HOME, defaultPath);
    fs.accessSync(homePath);
    return homePath;
  } catch (e) {
    return defaultPath;
  }
}

export function getChromeExecutablePath() {
  const platform = process.platform;
  if (platform === 'linux') {
    return getBin(['google-chrome', 'google-chrome-stable']);
  } else if (platform === 'darwin') {
    getChromeDarwin(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    );
  } else {
    return getChromeExe('Chrome');
  }
}

function pad(n: string, width: number, z = '0'): string {
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

export function arrayBufferToHexString(buf: Iterable<number>): string {
  const view = new Uint8Array(buf);
  const hex = Array.from(view).map((v) => pad(v.toString(16), 2));
  return hex.join('');
}

export async function checkFileExists(file) {
  try {
    await fs.promises.access(file, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

export const detectFramework = async () => {
  const frameworks = await listFrameworks('.');
  if (frameworks.length > 0) {
    if (
      frameworks.length === 2 &&
      ((/[svelte|vite]/g.test(frameworks[0].id) &&
        /[svelte|vite]/g.test(frameworks[1].id)) ||
        (/[svelte-kit|vite]/g.test(frameworks[0].id) &&
          /[svelte-kit|vite]/g.test(frameworks[1].id)))
    ) {
      return 'vite';
    }
    return frameworks[0].id;
  }
  return '';
};

export const getFolderName = () => {
  return path.basename(path.resolve(process.cwd()));
};

export async function moralisIPFSUpload(
  folderPath: string,
  apiKey: string
): Promise<string> {
  const files = glob.sync(path.join(folderPath, `/**/*.*`));
  const abi = files.map((file) => ({
    path: file.replace(path.join(folderPath, '/').toString(), ''),
    content: fs.readFileSync(file, { encoding: 'base64' }),
  }));
  await Moralis.start({
    apiKey,
  });

  const response = await Moralis.EvmApi.ipfs.uploadFolder({
    abi,
  });
  return response.result[0].path.match('/ipfs/(.*?)/')[1];
}
