#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const USER_DIR = join(homedir(), '.openclaw', 'ustc-daily-news');
const CONFIG_PATH = join(USER_DIR, 'config.json');
const execFileAsync = promisify(execFile);

const REMOTE_BASE = 'https://raw.githubusercontent.com/nbznb/USTC-daily-news/main/versions/version-direct';
const FEED_URLS = {
  tech: `${REMOTE_BASE}/feed-tech.json`
};

const PROMPTS_BASE = `${REMOTE_BASE}/prompts`;
const PROMPT_FILES = [
  'summarize-announcements.md',
  'summarize-tech-news.md',
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

function hasUsableTechFeed(feed) {
  return Array.isArray(feed?.tech) && feed.tech.length > 0;
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

function normalizeHtmlSource(source) {
  return {
    name: source.name,
    category: source.category,
    indexUrl: source.indexUrl,
    siteUrl: source.siteUrl,
    departmentName: source.departmentName || undefined,
    lookbackHours: source.lookbackHours,
    maxItems: source.maxItems,
    sectionKeywords: Array.isArray(source.sectionKeywords) ? source.sectionKeywords : undefined
  };
}

async function loadSourcesConfig(localRootDir) {
  const path = join(localRootDir, 'config', 'default-sources.json');
  return JSON.parse(await readFile(path, 'utf-8'));
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
  const sourcesConfig = await loadSourcesConfig(localRootDir);

  const localTechFeedPath = join(localRootDir, 'feed-tech.json');
  const cachedLocalTechFeed = await loadLocalJSON(localTechFeedPath);
  let techFeed = cachedLocalTechFeed;

  const generatedLocally = await runLocalGenerate(scriptDir);
  if (generatedLocally) {
    const refreshedLocalTechFeed = await loadLocalJSON(localTechFeedPath);
    if (hasUsableTechFeed(refreshedLocalTechFeed)) {
      techFeed = refreshedLocalTechFeed;
    } else if (hasUsableTechFeed(cachedLocalTechFeed)) {
      techFeed = cachedLocalTechFeed;
      errors.push('Local tech feed refresh returned empty content, falling back to previous local tech feed');
    } else {
      techFeed = refreshedLocalTechFeed;
      errors.push('Local tech feed refresh returned empty content, falling back to remote tech feed where available');
    }
  } else if (!techFeed) {
    errors.push('Local tech feed generation failed, falling back to GitHub tech feed where available');
  } else {
    errors.push('Local tech feed refresh failed, falling back to cached or remote tech feed where available');
  }

  techFeed = techFeed ?? await loadFeedWithFallback(FEED_URLS.tech, localTechFeedPath);
  if (!techFeed) {
    errors.push('Could not fetch tech feed');
  }

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

  const officialHtmlSources = (sourcesConfig.official || [])
    .filter(source => source.type === 'html')
    .map(normalizeHtmlSource);
  const availableDepartments = [...new Set((sourcesConfig.departments || []).map(source => source.departmentName || source.name))];
  const departmentSelection = normalizeSelectedDepartments(config.selectedDepartments, availableDepartments);
  const selectedSet = new Set(departmentSelection.selected);
  const departmentHtmlSources = (sourcesConfig.departments || [])
    .filter(source => source.type === 'html')
    .filter(source => selectedSet.has(source.departmentName || source.name))
    .map(normalizeHtmlSource);
  const jobHtmlSources = (sourcesConfig.jobs || [])
    .filter(source => source.type === 'html')
    .map(normalizeHtmlSource);

  if (departmentSelection.hasExplicitSelection && departmentSelection.selected.length === 0) {
    errors.push(`selectedDepartments did not match any available departments: ${departmentSelection.requested.join(', ')}`);
  } else if (departmentSelection.hasExplicitSelection && departmentSelection.unmatched.length > 0) {
    errors.push(`Some selectedDepartments were ignored because they are unavailable: ${departmentSelection.unmatched.join(', ')}`);
  }

  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),
    config: {
      language: config.language || 'zh',
      frequency: config.frequency || 'daily',
      delivery: config.delivery || { method: 'stdout' },
      selectedDepartments: departmentSelection.selected,
      allowDuplicatePush: config.allowDuplicatePush !== false
    },
    departmentSelection: {
      selected: departmentSelection.selected,
      requested: departmentSelection.requested,
      available: availableDepartments
    },
    official: [],
    departments: [],
    jobs: [],
    tech: techFeed?.tech || [],
    officialHtmlSources,
    departmentHtmlSources,
    jobHtmlSources,
    stats: {
      officialHtmlSourceCount: officialHtmlSources.length,
      departmentHtmlSourceCount: departmentHtmlSources.length,
      jobHtmlSourceCount: jobHtmlSources.length,
      techItems: techFeed?.tech?.length || 0,
      feedGeneratedAt: techFeed?.generatedAt || null
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
