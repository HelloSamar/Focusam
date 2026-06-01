const listEl = document.getElementById("blocklist");

const bulkInput = document.getElementById("bulkInput");
const saveBtn = document.getElementById("saveBulk");

const keywordInput = document.getElementById("keywordInput");
const saveKeywordsBtn = document.getElementById("saveKeywords");

const passwordInput = document.getElementById("passwordInput");
const unlockBtn = document.getElementById("unlockBtn");
const setPasswordBtn = document.getElementById("setPasswordBtn");
const lockStatus = document.getElementById("lockStatus");

let unlocked = false;

function setEditingEnabled(enabled) {
  bulkInput.disabled = !enabled;
  saveBtn.disabled = !enabled;
  keywordInput.disabled = !enabled;
  saveKeywordsBtn.disabled = !enabled;
}

function renderLists() {
  chrome.storage.local.get(["blocklist", "keywords"], data => {
    const sites = data.blocklist || [];
    const words = data.keywords || [];

    listEl.innerHTML = sites.length
      ? sites.map(d => `<li>${d}</li>`).join("")
      : "<li>No blocked sites</li>";

    bulkInput.value = sites.join("\n");
    keywordInput.value = words.join("\n");
  });
}

function checkFocusLock() {
  chrome.runtime.sendMessage({ type: "getFocusState" }, res => {
    const focusActive = res && res.focusActive;

    const canEdit = unlocked && !focusActive;
    setEditingEnabled(canEdit);

    if (focusActive) {
      lockStatus.textContent = "Locked during focus";
    } else if (!unlocked) {
      lockStatus.textContent = "Locked";
    } else {
      lockStatus.textContent = "Unlocked";
    }
  });
}

// simple debounce helper
function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Send refreshRules but debounce to avoid spamming background
const sendRefreshDebounced = debounce(() => {
  chrome.runtime.sendMessage({ type: "refreshRules" });
}, 300);

unlockBtn.addEventListener("click", () => {
  chrome.storage.local.get(["password"], data => {
    if (!data.password) {
      lockStatus.textContent = "No password set";
      return;
    }

    if (passwordInput.value === data.password) {
      unlocked = true;
      passwordInput.value = "";
      checkFocusLock();
    } else {
      lockStatus.textContent = "Wrong password";
    }
  });
});

setPasswordBtn.addEventListener("click", () => {
  const newPass = passwordInput.value.trim();
  if (!newPass) return;

  chrome.storage.local.set({ password: newPass }, () => {
    passwordInput.value = "";
    lockStatus.textContent = "Password saved";
  });
});

saveBtn.addEventListener("click", async () => {
  if (!unlocked) return;

  const domains = bulkInput.value
    .split("\n")
    .map(d => d.trim().replace(/^www\./, ""))
    .filter(Boolean);

  await chrome.storage.local.set({ blocklist: domains });
  sendRefreshDebounced();

  renderLists();
});

saveKeywordsBtn.addEventListener("click", async () => {
  if (!unlocked) return;

  const words = keywordInput.value
    .split("\n")
    .map(w => w.trim())
    .filter(Boolean);

  await chrome.storage.local.set({ keywords: words });
  sendRefreshDebounced();
});

renderLists();
checkFocusLock();

// react to storage changes instead of polling
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  // if blocklist/keywords or focus state changed, update UI
  if (changes.blocklist || changes.keywords) renderLists();
  if (changes.focusActive || changes.focusEndTime || changes.sessionsToday) checkFocusLock();
});
