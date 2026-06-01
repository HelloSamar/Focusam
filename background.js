const DASHBOARD_URL = chrome.runtime.getURL("dashboard.html");
const FOCUS_MINUTES = 30;

let focusTimer = null;
let focusEndTime = null;
let sessionsToday = 0;
let todayKey = new Date().toDateString();

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

function completeFocus() {
  focusTimer = null;
  focusEndTime = null;
  sessionsToday++;

  setStorage({
    focusActive: false,
    focusEndTime: null,
    sessionsToday
  });

  chrome.notifications.create({
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

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Focus Started",
    message: "Focus started."
  });

  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(() => completeFocus(), FOCUS_MINUTES * 60 * 1000);
}

function stopFocusTimer() {
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

function buildRules(blocklist, keywords) {
  const domainRules = (blocklist || []).map((domain, i) => ({
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

  const keywordRules = (keywords || []).map((word, i) => ({
    id: 1000 + i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: DASHBOARD_URL }
    },
    condition: {
      urlFilter: word,
      resourceTypes: ["main_frame"]
    }
  }));

  return [...domainRules, ...keywordRules];
}

async function applyRules() {
  const { blocklist = [], keywords = [] } = await getStorage(["blocklist", "keywords"]);
  const newRules = buildRules(blocklist, keywords);

  const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
  const oldIds = (oldRules || []).map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldIds,
    addRules: newRules
  });
}

chrome.runtime.onInstalled.addListener(applyRules);
chrome.runtime.onStartup.addListener(applyRules);

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
        await setStorage({ blocklist });
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
        focusTimer = setTimeout(() => completeFocus(), remaining);
      } else {
        completeFocus();
      }
    }
  } catch (e) {
    // Non-fatal: log to console for debugging during development only
    // console.error("restoreTimer error", e);
  }
})();
