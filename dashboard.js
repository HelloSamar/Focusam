function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function updateWithState(res) {
  const timerEl = document.getElementById("timer");
  const sessionsEl = document.getElementById("sessions");
  if (!timerEl || !sessionsEl) return;

  sessionsEl.textContent = `Sessions today: ${res.sessionsToday || 0}`;

  if (res.focusActive && res.focusEndTime) {
    const remaining = res.focusEndTime - Date.now();
    timerEl.textContent = formatTime(remaining > 0 ? remaining : 0);
  } else {
    timerEl.textContent = "Stay Focused";
  }
}

// initial fetch
chrome.runtime.sendMessage({ type: "getFocusState" }, res => updateWithState(res));

// listen for storage changes to update UI (avoids tight polling)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.focusEndTime || changes.focusActive || changes.sessionsToday) {
    chrome.runtime.sendMessage({ type: "getFocusState" }, res => updateWithState(res));
  }
});
