const blockBtn = document.getElementById("blockCurrent");
const openListBtn = document.getElementById("openList");
const statusDiv = document.getElementById("status");
const startFocusBtn = document.getElementById("startFocus");
const stopFocusBtn = document.getElementById("stopFocus");

function safeText(el, text) {
  if (el) el.textContent = text;
}

function loadStatus() {
  chrome.runtime.sendMessage({ type: "getBlocklist" }, res => {
    const list = (res && res.blocklist) || [];
    safeText(statusDiv, list.length ? `${list.length} site(s) blocked` : "No sites blocked");
  });
}

if (blockBtn) {
  blockBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "addCurrentSite" }, resp => {
      if (resp && resp.ok) {
        safeText(statusDiv, "Site blocked. Refresh the page.");
      } else {
        safeText(statusDiv, "Failed to block site.");
      }
    });
  });
}

if (openListBtn) openListBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
if (startFocusBtn) startFocusBtn.addEventListener("click", () => chrome.runtime.sendMessage({ type: "startFocus" }));
if (stopFocusBtn) stopFocusBtn.addEventListener("click", () => chrome.runtime.sendMessage({ type: "stopFocus" }));

loadStatus();
