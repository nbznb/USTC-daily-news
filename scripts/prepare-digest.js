#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const USER_DIR = join(homedir(), '.openclaw', 'skills', 'ustc-daily-news');
const CONFIG_PATH = join(USER_DIR, 'config.json');
const execFileAsync = promisify(execFile);

const REMOTE_BASE = 'https://raw.githubusercontent.com/nbznb/USTC-daily-news/main';
const FEED_URLS = {
  official: `${REMOTE_BASE}/feed-official.json`,
  departments: `${REMOTE_BASE}/feed-departments.json`,
  jobs: `${REMOTE_BASE}/feed-jobs.json`,
  tech: `${REMOTE_BASE}/feed-tech.json`
};

const PROMPTS_BASE = `${REMOTE_BASE}/prompts`;
const PROMPT_FILES = [
  'summarize-announcements.md',
  'summarize-tech-news.md',
  'digest-intro.md',
  'translate.md'
];
const DIGEST_FOOTER_NOTE =
  'Reminder: no departments are currently selected. Add formal department names to selectedDepartments in ~/.openclaw/skills/ustc-daily-news/config.json if you want department updates in this digest.';

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

async function loadLocalFeeds(localFeedPaths) {
  const [
    official,
    departments,
    jobs,
    tech
  ] = await Promise.all([
    loadLocalJSON(localFeedPaths.official),
    loadLocalJSON(localFeedPaths.departments),
    loadLocalJSON(localFeedPaths.jobs),
    loadLocalJSON(localFeedPaths.tech)
  ]);

  return { official, departments, jobs, tech };
}

function hasMissingFeeds(feeds) {
  return Object.values(feeds).some(feed => !feed);
}

function countFeedItems(feed, key) {
  if (!feed || !Array.isArray(feed[key])) return 0;
  return feed[key].length;
}

function hasUsableFeeds(feeds) {
  const total =
    countFeedItems(feeds.official, 'official') +
    countFeedItems(feeds.departments, 'departments') +
    countFeedItems(feeds.jobs, 'jobs') +
    countFeedItems(feeds.tech, 'tech');
  return total > 0;
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
  const requested = Array.isArray(rawSelection)
    ? [...new Set(rawSelection.map(item => String(item).trim()).filter(Boolean))]
    : [];
  const available = new Set(availableDepartments);
  const selected = requested.filter(name => available.has(name));
  const unmatched = requested.filter(name => !available.has(name));

  if (requested.length === 0) {
    return {
      hasExplicitSelection: false,
      requested,
      selected: [],
      unmatched
    };
  }

  return {
    hasExplicitSelection: true,
    requested,
    selected: [...new Set(selected)],
    unmatched
  };
}

async function main() {
  const errors = [];

  let config = {
    language: 'zh',
    frequency: 'daily',
    delivery: { method: 'stdout' },
    selectedDepartments: [],
    allowDuplicatePush: true
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
    tech: join(localRootDir, 'feed-tech.json')
  };

  const cachedLocalFeeds = await loadLocalFeeds(localFeedPaths);
  let localFeeds = cachedLocalFeeds;

  const generatedLocally = await runLocalGenerate(scriptDir);
  if (generatedLocally) {
    const refreshedLocalFeeds = await loadLocalFeeds(localFeedPaths);
    if (hasUsableFeeds(refreshedLocalFeeds)) {
      localFeeds = refreshedLocalFeeds;
    } else if (hasUsableFeeds(cachedLocalFeeds)) {
      localFeeds = cachedLocalFeeds;
      errors.push('Local feed refresh returned empty content, falling back to previous local feeds');
    } else {
      localFeeds = refreshedLocalFeeds;
      errors.push('Local feed refresh returned empty content, falling back to remote feeds where available');
    }
  } else if (hasMissingFeeds(localFeeds)) {
    errors.push('Local feed generation failed, falling back to GitHub feeds where available');
  } else {
    errors.push('Local feed refresh failed, falling back to cached or remote feeds where available');
  }

  let {
    official: feedOfficial,
    departments: feedDepartments,
    jobs: feedJobs,
    tech: feedTech
  } = localFeeds;

  [
    feedOfficial,
    feedDepartments,
    feedJobs,
    feedTech
  ] = await Promise.all([
    feedOfficial ?? loadFeedWithFallback(FEED_URLS.official, localFeedPaths.official),
    feedDepartments ?? loadFeedWithFallback(FEED_URLS.departments, localFeedPaths.departments),
    feedJobs ?? loadFeedWithFallback(FEED_URLS.jobs, localFeedPaths.jobs),
    feedTech ?? loadFeedWithFallback(FEED_URLS.tech, localFeedPaths.tech)
  ]);

  if (!feedOfficial) errors.push('Could not fetch official feed');
  if (!feedDepartments) errors.push('Could not fetch departments feed');
  if (!feedJobs) errors.push('Could not fetch jobs feed');
  if (!feedTech) errors.push('Could not fetch tech feed');

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
  const departmentSelection = normalizeSelectedDepartments(config.selectedDepartments, availableDepartments);
  const selectedDepartments = departmentSelection.selected;
  const selectedSet = new Set(selectedDepartments);
  const departments = (feedDepartments?.departments || []).filter(item => selectedSet.has(item.departmentName || item.sourceName));
  const digestFooterNote = departmentSelection.hasExplicitSelection ? null : DIGEST_FOOTER_NOTE;

  if (departmentSelection.hasExplicitSelection && departmentSelection.selected.length === 0) {
    errors.push(`selectedDepartments did not match any available departments: ${departmentSelection.requested.join(', ')}`);
  } else if (departmentSelection.hasExplicitSelection && departmentSelection.unmatched.length > 0) {
    errors.push(`Some selectedDepartments were ignored because they are unavailable: ${departmentSelection.unmatched.join(', ')}`);
  }

  const generatedCandidates = [
    feedOfficial?.generatedAt,
    feedDepartments?.generatedAt,
    feedJobs?.generatedAt,
    feedTech?.generatedAt
  ].filter(Boolean).sort();

  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    config: {
      language: config.language || 'zh',
      frequency: config.frequency || 'daily',
      delivery: config.delivery || { method: 'stdout' },
      selectedDepartments,
      allowDuplicatePush: config.allowDuplicatePush !== false
    },
    departmentSelection: {
      selected: selectedDepartments,
      requested: departmentSelection.requested,
      available: availableDepartments
    },
    digestFooterNote,
    official: feedOfficial?.official || [],
    departments,
    jobs: feedJobs?.jobs || [],
    tech: feedTech?.tech || [],
    stats: {
      officialItems: feedOfficial?.official?.length || 0,
      departmentItems: departments.length,
      jobItems: feedJobs?.jobs?.length || 0,
      techItems: feedTech?.tech?.length || 0,
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
