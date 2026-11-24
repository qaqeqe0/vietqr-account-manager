// Background service worker: keeps Google Sheet / Drive in sync without the popup open.
//  - a few seconds after any change to the account book, run a sync round;
//  - every 30 minutes, pull changes made on other devices;
//  - answer {type: 'sync-now'} messages from the popup and settings.
import { STORAGE_KEY } from './storage.js';
import { stateFingerprint } from './sync-merge.js';
import { syncNow, lastSavedFingerprint } from './sync-engine.js';
import { loadSyncConfig, hasAnySyncTarget } from './sync-config.js';

const DEBOUNCE_MS = 4000;
const ALARM = 'vietqr-periodic-sync';
let timer = null;

async function scheduleAutoSync() {
  const config = await loadSyncConfig();
  if (!config.autoSync || !hasAnySyncTarget(config)) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(), DEBOUNCE_MS);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const value = changes[STORAGE_KEY].newValue;
  if (value && stateFingerprint(value) === lastSavedFingerprint) return; // our own merge result
  scheduleAutoSync();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 30 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 30 });
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const config = await loadSyncConfig();
  if (config.autoSync && hasAnySyncTarget(config)) syncNow();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'sync-now' || sender.id !== chrome.runtime.id) return false;
  syncNow().then(sendResponse);
  return true; // keep the channel open for the async reply
});
