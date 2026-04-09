#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const USER_DIR = join(homedir(), '.ustc-dailynews');
const CONFIG_PATH = join(USER_DIR, 'config.json');
const execFileAsync = promisify(execFile);

const REMOTE_BASE = 'https://raw.githubusercontent.com/your-org/USTC-dailynews/main';
const FEED_URLS = {
  official: `${REMOTE_BASE}/feed-official.json`,
  departments: `${REMOTE_BASE}/feed-departments.json`,
  jobs: `${REMOTE_BASE}/feed-jobs.json`,
  tech: `${REMOTE_BASE}/feed-tech.json`,
  papers: `${REMOTE_BASE}/feed-papers.json`
};

const PROMPTS_BASE = `${REMOTE_BASE}/prompts`;
const PROMPT_FILES = [
  'summarize-announcements.md',
  'summarize-tech-news.md',
  'summarize-papers.md',
  'digest-intro.md',
  'translate.md'
];

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function loadLocalJSON(localPath) {
  if (existsSync(localPath)) {
    try {
      return JSON.parse(await readFile(localPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

async function runLocalGenerate(scriptDir) {
  try {
    await execFileAsync(process.execPath, [join(scriptDir, 'generate-feed.js')], {
      cwd: scriptDir
    });
    return true;
  } catch {
    return false;
  }
}

async function loadFeedWithFallback(remoteUrl, localPath) {
  const local = await loadLocalJSON(localPath);
  if (local) return local;

  const remote = await fetchJSON(remoteUrl);
  if (remote) return remote;

  return null;
}

async function loadPromptWithFallback(userPath, localPath, remoteUrl) {
  if (existsSync(userPath)) {
    return readFile(userPath, 'utf-8');
  }

  if (existsSync(localPath)) {
    return readFile(localPath, 'utf-8');
  }

  return fetchText(remoteUrl);
}

function normalizeSelectedDepartments(rawSelection, availableDepartments) {
  const requested = Array.isArray(rawSelection) ? rawSelection.map(item => String(item).trim()).filter(Boolean) : [];
  const available = new Set(availableDepartments);
  const selected = requested.filter(name => available.has(name));

  if (selected.length > 0) {
    return [...new Set(selected)];
  }

  if (availableDepartments.includes('少年班学院')) {
    return ['少年班学院'];
  }

  return availableDepartments.length > 0 ? [availableDepartments[0]] : [];
}

async function main() {
  const errors = [];

  let config = {
    language: 'zh',
    frequency: 'daily',
    delivery: { method: 'stdout' },
    selectedDepartments: ['少年班学院']
  };

  if (existsSync(CONFIG_PATH)) {
    try {
      config = {
        ...config,
        ...JSON.parse(await readFile(CONFIG_PATH, 'utf-8'))
      };
    } catch (error) {
      errors.push(`Could not read config: ${error.message}`);
    }
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const localRootDir = join(scriptDir, '..');
  const localPromptsDir = join(localRootDir, 'prompts');
  const userPromptsDir = join(USER_DIR, 'prompts');

  const localFeedPaths = {
    official: join(localRootDir, 'feed-official.json'),
    departments: join(localRootDir, 'feed-departments.json'),
    jobs: join(localRootDir, 'feed-jobs.json'),
    tech: join(localRootDir, 'feed-tech.json'),
    papers: join(localRootDir, 'feed-papers.json')
  };

  let [
    feedOfficial,
    feedDepartments,
    feedJobs,
    feedTech,
    feedPapers
  ] = await Promise.all([
    loadLocalJSON(localFeedPaths.official),
    loadLocalJSON(localFeedPaths.departments),
    loadLocalJSON(localFeedPaths.jobs),
    loadLocalJSON(localFeedPaths.tech),
    loadLocalJSON(localFeedPaths.papers)
  ]);

  if (!feedOfficial || !feedDepartments || !feedJobs || !feedTech || !feedPapers) {
    const generatedLocally = await runLocalGenerate(scriptDir);
    if (generatedLocally) {
      [
        feedOfficial,
        feedDepartments,
        feedJobs,
        feedTech,
        feedPapers
      ] = await Promise.all([
        loadLocalJSON(localFeedPaths.official),
        loadLocalJSON(localFeedPaths.departments),
        loadLocalJSON(localFeedPaths.jobs),
        loadLocalJSON(localFeedPaths.tech),
        loadLocalJSON(localFeedPaths.papers)
      ]);
    } else {
      errors.push('Local feed generation failed, falling back to GitHub feeds where available');
    }
  }

  [
    feedOfficial,
    feedDepartments,
    feedJobs,
    feedTech,
    feedPapers
  ] = await Promise.all([
    feedOfficial ?? loadFeedWithFallback(FEED_URLS.official, localFeedPaths.official),
    feedDepartments ?? loadFeedWithFallback(FEED_URLS.departments, localFeedPaths.departments),
    feedJobs ?? loadFeedWithFallback(FEED_URLS.jobs, localFeedPaths.jobs),
    feedTech ?? loadFeedWithFallback(FEED_URLS.tech, localFeedPaths.tech),
    feedPapers ?? loadFeedWithFallback(FEED_URLS.papers, localFeedPaths.papers)
  ]);

  if (!feedOfficial) errors.push('Could not fetch official feed');
  if (!feedDepartments) errors.push('Could not fetch departments feed');
  if (!feedJobs) errors.push('Could not fetch jobs feed');
  if (!feedTech) errors.push('Could not fetch tech feed');
  if (!feedPapers) errors.push('Could not fetch paper feed');

  const prompts = {};
  for (const filename of PROMPT_FILES) {
    const key = filename.replace('.md', '').replace(/-/g, '_');
    const userPath = join(userPromptsDir, filename);
    const localPath = join(localPromptsDir, filename);

    const prompt = await loadPromptWithFallback(userPath, localPath, `${PROMPTS_BASE}/${filename}`);
    if (prompt) {
      prompts[key] = prompt;
    } else {
      errors.push(`Could not load prompt: ${filename}`);
    }
  }

  const availableDepartments = feedDepartments?.meta?.availableDepartments || [];
  const selectedDepartments = normalizeSelectedDepartments(config.selectedDepartments, availableDepartments);
  const departments = (feedDepartments?.departments || []).filter(item => selectedDepartments.includes(item.departmentName || item.sourceName));

  const generatedCandidates = [
    feedOfficial?.generatedAt,
    feedDepartments?.generatedAt,
    feedJobs?.generatedAt,
    feedTech?.generatedAt,
    feedPapers?.generatedAt
  ].filter(Boolean).sort();

  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    config: {
      language: config.language || 'zh',
      frequency: config.frequency || 'daily',
      delivery: config.delivery || { method: 'stdout' },
      selectedDepartments
    },
    departmentSelection: {
      selected: selectedDepartments,
      available: availableDepartments
    },
    official: feedOfficial?.official || [],
    departments,
    jobs: feedJobs?.jobs || [],
    tech: feedTech?.tech || [],
    papers: feedPapers?.papers || [],
    stats: {
      officialItems: feedOfficial?.official?.length || 0,
      departmentItems: departments.length,
      jobItems: feedJobs?.jobs?.length || 0,
      techItems: feedTech?.tech?.length || 0,
      paperItems: feedPapers?.papers?.length || 0,
      feedGeneratedAt: generatedCandidates.at(-1) || null
    },
    prompts,
    errors: errors.length > 0 ? errors : undefined
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({
    status: 'error',
    message: error.message
  }, null, 2));
  process.exit(1);
});
