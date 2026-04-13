#!/usr/bin/env node

import { cp, mkdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, dirname, join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(SCRIPT_DIR, '..');
const DEFAULT_OUTPUT_DIR = join(ROOT_DIR, 'versions');
const ROOT_FILES = [
  'README.md',
  'README.zh-CN.md',
  'install.sh'
];
const ROOT_DIRS = [
  'config',
  'examples',
  'prompts',
  'scripts'
];
const EXCLUDED_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'versions'
]);
const EXCLUDED_FILE_NAMES = new Set([
  '.DS_Store',
  'Thumbs.db',
  'feed-official.json',
  'feed-departments.json',
  'feed-jobs.json',
  'feed-tech.json',
  'source-validation-report.json',
  'state-feed.json'
]);

function parseArgs(argv) {
  const args = {
    name: null,
    outputDir: DEFAULT_OUTPUT_DIR,
    overwrite: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--name' && argv[index + 1]) {
      args.name = argv[index + 1];
      index += 1;
    } else if (token === '--output-dir' && argv[index + 1]) {
      args.outputDir = resolve(ROOT_DIR, argv[index + 1]);
      index += 1;
    } else if (token === '--overwrite') {
      args.overwrite = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function formatTimestampPart(value) {
  return String(value).padStart(2, '0');
}

function buildDefaultReleaseName(now = new Date()) {
  const year = now.getFullYear();
  const month = formatTimestampPart(now.getMonth() + 1);
  const day = formatTimestampPart(now.getDate());
  const hours = formatTimestampPart(now.getHours());
  const minutes = formatTimestampPart(now.getMinutes());
  const seconds = formatTimestampPart(now.getSeconds());
  return `ustc-daily-news-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function sanitizeReleaseName(name) {
  const cleaned = String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!cleaned) {
    throw new Error('Release name cannot be empty');
  }

  return cleaned;
}

function isTemporaryFile(name) {
  return (
    name.endsWith('~') ||
    name.endsWith('.tmp') ||
    name.endsWith('.temp') ||
    name.endsWith('.swp') ||
    name.endsWith('.swo')
  );
}

function shouldCopy(sourcePath) {
  const relativePath = relative(ROOT_DIR, sourcePath);
  if (!relativePath || relativePath === '.') {
    return true;
  }

  const segments = relativePath.split(sep);
  if (segments.some(segment => EXCLUDED_DIR_NAMES.has(segment))) {
    return false;
  }

  const filename = basename(sourcePath);
  if (EXCLUDED_FILE_NAMES.has(filename) || isTemporaryFile(filename)) {
    return false;
  }

  return true;
}

async function copyTarget(relativePath, releaseDir) {
  const sourcePath = join(ROOT_DIR, relativePath);
  if (!existsSync(sourcePath)) {
    return;
  }

  const destinationPath = join(releaseDir, relativePath);
  await cp(sourcePath, destinationPath, {
    recursive: true,
    force: true,
    filter: shouldCopy
  });
}

async function writeManifest(releaseDir, releaseName) {
  const manifest = {
    name: releaseName,
    createdAt: new Date().toISOString(),
    sourceRoot: ROOT_DIR,
    includedRootFiles: ROOT_FILES,
    includedRootDirs: ROOT_DIRS,
    excludedNames: [...EXCLUDED_DIR_NAMES, ...EXCLUDED_FILE_NAMES]
  };

  await writeFile(
    join(releaseDir, 'release-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

function isNestedPath(parentPath, childPath) {
  const relation = relative(parentPath, childPath);
  return relation !== '' && !relation.startsWith('..') && relation !== '.';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseName = sanitizeReleaseName(args.name || buildDefaultReleaseName());
  const outputDir = args.outputDir;
  const releaseDir = join(outputDir, releaseName);

  if (relative(ROOT_DIR, outputDir).split(sep).includes('.git')) {
    throw new Error('Output directory cannot be inside .git');
  }

  for (const dir of ROOT_DIRS) {
    const sourceDir = join(ROOT_DIR, dir);
    if (isNestedPath(sourceDir, outputDir)) {
      throw new Error(`Output directory cannot be inside ${sourceDir}`);
    }
  }

  if (existsSync(releaseDir) && !args.overwrite) {
    throw new Error(`Release directory already exists: ${releaseDir}`);
  }

  if (args.overwrite) {
    await rm(releaseDir, { recursive: true, force: true });
  }

  await mkdir(releaseDir, { recursive: true });

  for (const file of ROOT_FILES) {
    await copyTarget(file, releaseDir);
  }

  for (const dir of ROOT_DIRS) {
    await copyTarget(dir, releaseDir);
  }

  await writeManifest(releaseDir, releaseName);

  console.log(JSON.stringify({
    status: 'ok',
    releaseDir
  }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({
    status: 'error',
    message: error.message
  }, null, 2));
  process.exit(1);
});
