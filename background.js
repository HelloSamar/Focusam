const DASHBOARD_URL = chrome.runtime.getURL("dashboard.html");
const FOCUS_MINUTES = 30;
const NOTIF_ID = "focus-notif";
const MAX_BLOCKLIST = 500;

let focusTimer = null; // retained for compatibility but we use alarms
let focusEndTime = null;
let sessionsToday = 0;
let todayKey = new Date().toDateString();

let _applyRunning = false;
let _applyPending = false;

function normalizeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Storage helpers for consistent async/await usage
function getStorage(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}
function setStorage(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}

function _showNotification(options) {
  // reuse the same notification id to avoid clutter
  chrome.notifications.create(NOTIF_ID, options);
}

function completeFocus() {
  // Clear any alarm/timer state
  chrome.alarms.clear("focusComplete");
  focusTimer = null;
  focusEndTime = null;
  sessionsToday++;

  setStorage({
    focusActive: false,
    focusEndTime: null,
    sessionsToday
  });

  _showNotification({
    type: "basic",
    iconUrl: "icon.png",
    title: "Focus Complete",
    message: `${FOCUS_MINUTES} minutes completed.`
  });
}

function startFocusTimer() {
  const now = new Date();

  if (now.toDateString() !== todayKey) {
    sessionsToday = 0;
    todayKey = now.toDateString();
  }

  focusEndTime = Date.now() + FOCUS_MINUTES * 60 * 1000;

  setStorage({
    focusActive: true,
    focusEndTime,
    sessionsToday
  });

  _showNotification({
    type: "basic",
    iconUrl: "icon.png",
    title: "Focus Started",
    message: "Focus started."
  });

  // Use alarms API instead of long-running setTimeout so service worker unloads don't break timers
  chrome.alarms.clear("focusComplete", () => {
    chrome.alarms.create("focusComplete", { when: focusEndTime });
  });
}

function stopFocusTimer() {
  // Clear alarm
  chrome.alarms.clear("focusComplete");
  if (focusTimer) {
    clearTimeout(focusTimer);
    focusTimer = null;
  }

  focusEndTime = null;

  setStorage({
    focusActive: false,
    focusEndTime: null
  });
}

function _normalizeRuleForCompare(r) {
  return {
    id: r.id,
    priority: r.priority,
    action: (r.action && r.action.redirect && r.action.redirect.url) || null,
    condition: {
      urlFilter: r.condition && r.condition.urlFilter,
      resourceTypes: r.condition && r.condition.resourceTypes
    }
  };
}

function buildRules(blocklist, keywords) {
  const domainRules = (blocklist || []).slice(0, MAX_BLOCKLIST).map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: DASHBOARD_URL }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame"]
    }
  }));

  const keywordRules = (keywords || [])
    .map(w => (w || "").trim())
    .filter(w => w && w.length > 1)
    .map((word, i) => ({
      id: 1000 + i + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: DASHBOARD_URL }
      },
      condition: {
        // keep keywords conservative; ignore trivially short strings
        urlFilter: word,
        resourceTypes: ["main_frame"]
      }
    }));

  return [...domainRules, ...keywordRules];
}

// Apply rules but avoid redundant updates and coalesce rapid calls
async function applyRules() {
  if (_applyRunning) {
    _applyPending = true;
    return;
  }

  _applyRunning = true;
  try {
    const { blocklist = [], keywords = [] } = await getStorage(["blocklist", "keywords"]);
    const newRules = buildRules(blocklist, keywords);

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();

    // Normalize for comparison
    const normNew = newRules.map(_normalizeRuleForCompare).sort((a, b) => a.id - b.id);
    const normOld = (oldRules || []).map(_normalizeRuleForCompare).sort((a, b) => a.id - b.id);

    const newJson = JSON.stringify(normNew);
    const oldJson = JSON.stringify(normOld);

    if (newJson === oldJson) {
      // no change, skip update
      return;
    }

    const oldIds = (oldRules || []).map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: newRules
    });
  } finally {
    _applyRunning = false;
    if (_applyPending) {
      _applyPending = false;
      // call again to pick up any changes that happened while running
      applyRules();
    }
  }
}

chrome.runtime.onInstalled.addListener(() => applyRules());
chrome.runtime.onStartup.addListener(() => applyRules());

// Listen for alarms (used for focus completion)
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm && alarm.name === "focusComplete") {
    // When alarm fires, double-check stored end time
    getStorage(["focusEndTime"]).then(data => {
      const end = data.focusEndTime;
      if (end && end <= Date.now()) {
        completeFocus();
      } else if (end) {
        // if end moved in future, reschedule
        chrome.alarms.create("focusComplete", { when: end });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "addCurrentSite") {
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        sendResponse({ ok: false, error: "Unable to get active tab URL" });
        return;
      }

      const domain = normalizeDomain(tabs[0].url);
      if (!domain) {
        sendResponse({ ok: false, error: "Invalid URL" });
        return;
      }

      const { blocklist = [] } = await getStorage(["blocklist"]);

      if (!blocklist.includes(domain)) {
        blocklist.push(domain);
        // enforce max size
        const trimmed = blocklist.slice(0, MAX_BLOCKLIST);
        await setStorage({ blocklist: trimmed });
        await applyRules();
      }

      startFocusTimer();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === "startFocus") startFocusTimer();
  if (msg.type === "stopFocus") stopFocusTimer();

  if (msg.type === "getBlocklist") {
    getStorage(["blocklist"]).then(data => {
      sendResponse({ blocklist: data.blocklist || [] });
    });
    return true;
  }

  if (msg.type === "refreshRules") {
    // coalesce rapid calls by delegating to applyRules which handles pending
    applyRules();
  }

  if (msg.type === "getFocusState") {
    getStorage(["focusActive", "focusEndTime", "sessionsToday"]).then(data => sendResponse(data));
    return true;
  }
});

/* Restore timer after service worker sleeps */
(async function restoreTimer() {
  try {
    const data = await getStorage(["focusActive", "focusEndTime", "sessionsToday"]);
    if (data.sessionsToday) sessionsToday = data.sessionsToday;

    if (data.focusActive && data.focusEndTime) {
      const remaining = data.focusEndTime - Date.now();

      if (remaining > 0) {
        focusEndTime = data.focusEndTime;
        // schedule via alarms for reliability
        chrome.alarms.clear("focusComplete", () => {
          chrome.alarms.create("focusComplete", { when: focusEndTime });
        });
      } else {
        completeFocus();
      }
    }
  } catch (e) {
    // Non-fatal: log to console for debugging during development only
    // console.error("restoreTimer error", e);
  }
})();
