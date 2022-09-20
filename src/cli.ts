#!/usr/bin/env node

import { Command } from 'commander';

import { capture, captures, deploy, deployments, setup } from './lib/common';
import { CLI_NAME, CLI_VERSION, getConfig, logger } from './lib/config';

const program = new Command();
program
  .name(CLI_NAME)
  .description(
    'A CLI tool to deploy web apps to IPFS & Filecoin using web3.storage'
  )
  .version(CLI_VERSION, '-v, --version', 'output the version number');

program
  .command('setup')
  .option('-k, --apiKey <key>', 'web3.storage API Key')
  .option('--moralis', 'setup Moralis API Key')
  .action(setup);

program
  .command('deploy')
  .option(
    '-n, --no-build',
    'deploy without building the app if it is already build'
  )
  .option('--moralis', 'deploy to IPFS using Moralis.')
  .description('deploy web app to web3.storage')
  .action(deploy);

program
  .command('deployments')
  .description('print all your deployments')
  .action(deployments);

program
  .command('capture')
  .argument('<url>', 'capture url to web3.storage')
  .option('--moralis', 'capture url to IPFS using Moralis')
  .action(capture);

program
  .command('captures')
  .description('print all your captures')
  .action(captures);

program
  .command('config-path')
  .description('print config path')
  .action(() => {
    const config = getConfig();
    logger.info('Config is saved at: ' + config.path);
  });

program.parse(process.argv);
