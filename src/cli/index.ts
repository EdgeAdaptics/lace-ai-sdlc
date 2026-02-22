#!/usr/bin/env node
import { runEvaluateCommand } from './commands/evaluate';
import { runValidateConfig } from './commands/validateConfig';
import { CliEvaluator } from './utils/cliEvaluator';
import { findLaceConfig } from '../services/config/laceConfig';
import { runPrSummary } from './commands/prSummary';
import * as path from 'path';

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'evaluate':
      await handleEvaluate(args);
      break;
    case 'health':
      await handleEvaluate(args);
      break;
    case 'validate-config':
      await handleValidate();
      break;
    case 'pr-summary':
      await handlePrSummary(args);
      break;
    default:
      console.error('Unknown command. Available: evaluate, validate-config, pr-summary');
      process.exit(1);
  }
}

async function handleEvaluate(args: string[]): Promise<void> {
  const { files, flags } = parseArgs(args);
  const result = await runEvaluateCommand({
    files,
    strictOnly: flags.has('--strict-only'),
    json: flags.has('--json')
  });
  if (result.json) {
    console.log(result.json);
  } else if (result.text) {
    console.log(result.text);
  }
  process.exit(result.exitCode);
}

async function handleValidate(): Promise<void> {
  const result = await runValidateConfig();
  if (result.ok) {
    console.log('Configuration valid.');
    process.exit(0);
  }
  for (const error of result.errors) {
    console.error(error);
  }
  process.exit(3);
}

async function handlePrSummary(args: string[]): Promise<void> {
  const files = collectChangedFiles(args);
  if (files.length === 0) {
    console.error('pr-summary requires --changed-files');
    process.exit(1);
  }
  const laceConfig = await findLaceConfig([process.cwd()]);
  if (!laceConfig) {
    throw new Error('Unable to locate .lace directory');
  }
  const evaluator = await CliEvaluator.create(laceConfig.rootDir, laceConfig.policyFile);
  const absoluteFiles = files.map(file => path.resolve(process.cwd(), file));
  const output = await runPrSummary({ files: absoluteFiles, evaluator });
  console.log(output);
}

function parseArgs(args: string[]): { files: string[]; flags: Set<string> } {
  const files: string[] = [];
  const flags = new Set<string>();
  for (const arg of args) {
    if (arg.startsWith('--')) {
      flags.add(arg);
    } else {
      files.push(arg);
    }
  }
  return { files, flags };
}

function collectChangedFiles(args: string[]): string[] {
  const files: string[] = [];
  let capture = false;
  for (const arg of args) {
    if (arg === '--changed-files') {
      capture = true;
      continue;
    }
    if (capture) {
      files.push(arg);
    }
  }
  return files;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
