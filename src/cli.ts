#!/usr/bin/env node

import { Command } from 'commander';

import { CLI_NAME, CLI_VERSION } from './lib/config';
import { deploy, deployments, setup } from './lib/utils';

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
  .action(setup);

program
  .command('deploy')
  .option(
    '-n, --no-build',
    'deploy without building the app if it is already build'
  )
  .description('deploy web app to web3.storage')
  .action(deploy);

program
  .command('deployments')
  .description('print all your deployments')
  .action(deployments);

program.parse(process.argv);
