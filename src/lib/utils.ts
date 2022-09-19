import fs from 'fs';
import path from 'path';

import which from 'which';

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
