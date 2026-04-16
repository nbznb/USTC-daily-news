#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(SCRIPT_DIR, '..', 'state-feed.json');
const SOURCES_PATH = join(SCRIPT_DIR, '..', 'config', 'default-sources.json');
const USER_CONFIG_PATH = join(homedir(), '.openclaw', 'ustc-daily-news', 'config.json');
const TECH_FEED_PATH = join(SCRIPT_DIR, '..', 'feed-tech.json');
const DEFAULT_LOOKBACK_HOURS = 168;
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_ITEMS_PER_FEED = 50;
const STATE_RETENTION_DAYS = 14;
const USER_AGENT = 'USTCDailyNewsDirect/1.0 (tech rss aggregator)';

function parseArgs(argv) {
  const args = { validate: false, reportPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--validate') {
      args.validate = true;
    } else if (token === '--report' && argv[index + 1]) {
      args.reportPath = argv[index + 1];
      index += 1;
    }
  }
  if (!args.reportPath && args.validate) {
    args.reportPath = join(SCRIPT_DIR, '..', 'source-validation-report.json');
  }
  return args;
}

async function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { seenItems: {} };
  }
  try {
    const state = JSON.parse(await readFile(STATE_PATH, 'utf-8'));
    return { seenItems: state.seenItems || {} };
  } catch {
    return { seenItems: {} };
  }
}

async function saveState(state) {
  const cutoff = Date.now() - STATE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const [id, ts] of Object.entries(state.seenItems)) {
    if (!Number.isFinite(ts) || ts < cutoff) {
      delete state.seenItems[id];
    }
  }
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

async function loadSources() {
  return JSON.parse(await readFile(SOURCES_PATH, 'utf-8'));
}

async function loadUserConfig() {
  if (!existsSync(USER_CONFIG_PATH)) {
    return {};
  }
  try {
    return JSON.parse(await readFile(USER_CONFIG_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function isAllowDuplicatePushEnabled(config) {
  return config?.allowDuplicatePush !== false;
}

function toIsoDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .trim();
}

function stripTags(html) {
  return decodeHtml(String(html || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u200b\ufeff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanTitle(title, sourceName = '') {
  let cleaned = stripTags(title)
    .replace(/\s*[:：|-]\s*中国科学技术大学教务处$/i, '')
    .replace(/\s*[-|—]\s*中国科大新闻网$/i, '')
    .replace(/\s*[-|—]\s*中国科学技术大学新闻网$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (sourceName) {
    const suffix = new RegExp(`\\s*[-|—|｜|·]\\s*${escapeRegExp(sourceName)}$`, 'i');
    cleaned = cleaned.replace(suffix, '').trim();
  }

  return cleaned;
}

function parseRssFeed(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const block = itemMatch[1];
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
    const title = titleMatch ? decodeHtml(titleMatch[1]) : 'Untitled';
    const url = linkMatch ? decodeHtml(linkMatch[1]) : null;
    const guid = guidMatch ? decodeHtml(guidMatch[1]) : url || title;
    const publishedAt = pubDateMatch ? toIsoDateOrNull(decodeHtml(pubDateMatch[1])) : null;
    const summary = descMatch ? stripTags(descMatch[1]) : '';
    if (url || guid) {
      items.push({ title, url, guid, publishedAt, summary });
    }
  }
  return items;
}

function parseAtomFeed(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let entryMatch;
  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const idMatch = block.match(/<id>([\s\S]*?)<\/id>/i);
    const updatedMatch = block.match(/<updated>([\s\S]*?)<\/updated>/i);
    const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || block.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const linkMatch = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?/i);
    const title = titleMatch ? decodeHtml(titleMatch[1]) : 'Untitled';
    const url = linkMatch ? decodeHtml(linkMatch[1]) : null;
    const guid = idMatch ? decodeHtml(idMatch[1]) : url || title;
    const publishedAt = updatedMatch ? toIsoDateOrNull(decodeHtml(updatedMatch[1])) : null;
    const summary = summaryMatch ? stripTags(summaryMatch[1]) : '';
    if (url || guid) {
      entries.push({ title, url, guid, publishedAt, summary });
    }
  }
  return entries;
}

function withinLookback(item, hours) {
  if (!item?.publishedAt) return true;
  const timestamp = new Date(item.publishedAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return timestamp >= cutoff;
}

function normalizeErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (error.name === 'TimeoutError') return `Request timed out after ${DEFAULT_TIMEOUT_MS}ms`;
  return error.message || String(error);
}

async function fetchResponse(url) {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });
}

function makeUniqueId(source, rawId) {
  if (!rawId) return null;
  return `${source.category}:${source.name}:${rawId}`;
}

function markSeen(state, uniqueId, enabled) {
  if (enabled && uniqueId) {
    state.seenItems[uniqueId] = Date.now();
  }
}

function initSourceReport(source) {
  return {
    name: source.name,
    category: source.category,
    type: source.type,
    indexUrl: source.feedUrl || source.indexUrl,
    status: 'ok',
    candidateCount: 0,
    selectedCount: 0,
    skippedSeen: 0,
    sampleTitles: [],
    warnings: []
  };
}

async function fetchFeedItems(source, state, options) {
  const report = initSourceReport(source);
  const res = await fetchResponse(source.feedUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = source.type === 'atom' ? parseAtomFeed(xml) : parseRssFeed(xml);
  const lookbackHours = source.lookbackHours || DEFAULT_LOOKBACK_HOURS;
  const maxItems = source.maxItems || 5;

  report.candidateCount = items.length;

  const selected = [];
  for (const item of items) {
    const uniqueId = makeUniqueId(source, item.guid || item.url || item.title);
    if (!uniqueId) continue;
    if (options.useState && state.seenItems[uniqueId]) {
      report.skippedSeen += 1;
      continue;
    }
    if (!withinLookback(item, lookbackHours)) continue;

    selected.push({
      source: source.category,
      sourceName: source.name,
      sourcePriority: source.priority || 0,
      title: cleanTitle(item.title, source.name),
      url: item.url,
      publishedAt: item.publishedAt,
      summary: item.summary
    });

    markSeen(state, uniqueId, options.updateState);
    if (selected.length >= maxItems) break;
  }

  report.selectedCount = selected.length;
  report.status = selected.length > 0 ? 'ok' : 'empty';
  report.sampleTitles = selected.slice(0, 3).map(item => item.title);

  return { items: selected, report };
}

async function fetchSourceItems(source, state, options) {
  if (source.type === 'rss' || source.type === 'atom') {
    return fetchFeedItems(source, state, options);
  }
  if (source.type === 'html') {
    return {
      items: [],
      report: {
        ...initSourceReport(source),
        status: 'skipped',
        warnings: ['HTML sources are passed through to prepare-digest and are not fetched here']
      }
    };
  }
  throw new Error(`Unsupported source type: ${source.type}`);
}

function shuffleItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

async function fetchCategoryContent(categoryKey, sources, state, options, errors) {
  const results = [];
  const reports = [];

  for (const source of sources) {
    try {
      const { items, report } = await fetchSourceItems(source, state, options);
      results.push(...items.filter(item => withinLookback(item, source.lookbackHours || DEFAULT_LOOKBACK_HOURS)));
      reports.push(report);
    } catch (error) {
      const message = `${source.category}: ${source.name}: ${normalizeErrorMessage(error)}`;
      errors.push(message);
      reports.push({
        ...initSourceReport(source),
        status: 'error',
        error: normalizeErrorMessage(error)
      });
    }
  }

  const orderedResults = categoryKey === 'tech'
    ? shuffleItems(results)
    : [...results];

  return { items: orderedResults.slice(0, MAX_ITEMS_PER_FEED), reports };
}

function buildFeedPayload(items, errors, sources) {
  const categoryErrors = errors.filter(message => message.startsWith('tech:'));
  return {
    generatedAt: new Date().toISOString(),
    tech: items,
    stats: {
      techItems: items.length
    },
    meta: {
      sourceCount: sources.length
    },
    errors: categoryErrors.length > 0 ? categoryErrors : undefined
  };
}

function buildCategorySummary(items, reports) {
  const okSources = reports.filter(report => report.status === 'ok').length;
  const emptySources = reports.filter(report => report.status === 'empty').length;
  const skippedSources = reports.filter(report => report.status === 'skipped').length;
  const errorSources = reports.filter(report => report.status === 'error').length;
  return {
    itemCount: items.length,
    okSources,
    emptySources,
    skippedSources,
    errorSources
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceConfig = await loadSources();
  const techSources = sourceConfig.tech || [];
  const userConfig = await loadUserConfig();
  const state = args.validate ? { seenItems: {} } : await loadState();
  const allowDuplicatePush = isAllowDuplicatePushEnabled(userConfig);
  const errors = [];
  const options = {
    useState: !args.validate && !allowDuplicatePush,
    updateState: !args.validate
  };

  const report = {
    status: 'ok',
    mode: args.validate ? 'validate' : 'generate',
    generatedAt: new Date().toISOString(),
    settings: {
      allowDuplicatePush,
      dedupeEnabled: options.useState
    },
    categories: {}
  };

  const { items, reports } = await fetchCategoryContent('tech', techSources, state, options, errors);
  report.categories.tech = {
    ...buildCategorySummary(items, reports),
    sourceCount: techSources.length,
    sources: reports
  };
  report.summary = {
    tech: report.categories.tech.itemCount
  };

  if (!args.validate) {
    if (items.length === 0 && errors.length > 0) {
      throw new Error('Tech feed generation produced zero items with fetch errors; existing feed file was kept unchanged');
    }
    const payload = buildFeedPayload(items, errors, techSources);
    await writeFile(TECH_FEED_PATH, JSON.stringify(payload, null, 2));
    await saveState(state);
  }

  if (args.reportPath) {
    await writeFile(args.reportPath, JSON.stringify(report, null, 2));
  }

  if (args.validate) {
    console.log(JSON.stringify({
      status: 'ok',
      mode: 'validate',
      reportPath: args.reportPath,
      summary: report.summary,
      errorCount: errors.length
    }, null, 2));
  }
}

main().catch(error => {
  console.error(JSON.stringify({
    status: 'error',
    message: normalizeErrorMessage(error)
  }, null, 2));
  process.exit(1);
});
