#!/usr/bin/env node

import fs from 'fs';

import { Command } from 'commander';

import { deploy, deployments, setup } from './lib/utils';
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const program = new Command();
program
  .name(packageJson.name)
  .description(
    'A CLI tool to deploy web apps to IPFS & Filecoin using web3.storage'
  )
  .version(packageJson.version, '-v, --version', 'output the version number');
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
