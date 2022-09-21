#!/usr/bin/env node

import { Argument, Command, Option } from 'commander';

import { backup } from './lib/backup';
import { capture, captures } from './lib/capture';
import { CLI_NAME, CLI_VERSION, getConfig, logger, setup } from './lib/config';
import { deploy, deployments } from './lib/deploy';
import { initAction } from './lib/ghaction';

const program = new Command();
program
  .name(CLI_NAME)
  .description(
    'A CLI tool to deploy web apps to IPFS & Filecoin using web3.storage and Moralis'
  )
  .version(CLI_VERSION, '-v, --version', 'output the version number');

program
  .command('setup')
  .description('setup web3.storage and Moralis API Keys')
  .argument('<api-key>', 'web3.storage or Moralis API Key')
  .addOption(
    new Option('-s, --service <service>', 'select setup service')
      .default('web3.storage')
      .choices(['web3.storage', 'moralis'])
  )
  .action(setup);

program
  .command('deploy')
  .option(
    '-n, --no-build',
    'deploy without building the app if it is already build'
  )
  .addOption(
    new Option('-s, --service <service>', 'select service')
      .default('web3.storage')
      .choices(['web3.storage', 'moralis'])
  )
  .description('deploy web app to web3.storage')
  .action(deploy);

program
  .command('capture')
  .description('capture url single page webpage, screenshot and metadata')
  .argument('<url>', 'capture url to web3.storage or moralis')
  .addOption(
    new Option('-s, --service <service>', 'select service')
      .default('web3.storage')
      .choices(['web3.storage', 'moralis'])
  )
  .action(capture);

program
  .command('backup')
  .description('backup deployments and captures information')
  .requiredOption('-p, --path <path>', 'save to local path')
  .option(
    '-t, --type <type>',
    'deployments or captures to backup',
    'deployments'
  )
  .action(backup);

program
  .command('init-action')
  .description('initialize deployment or capture github action')
  .addArgument(
    new Argument('<type>', 'type of github action to initialize').choices([
      'capture',
      'deployment',
    ])
  )
  .action(initAction);

program
  .command('deployments')
  .description('print all your deployments')
  .action(deployments);

program
  .command('captures')
  .description('print all your captures')
  .action(captures);

program
  .command('config-path')
  .description('print config path')
  .action(() => {
    const config = getConfig();
    logger.info('Config path: ' + config.path);
  });

program.parse(process.argv);
