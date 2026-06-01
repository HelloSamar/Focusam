# Focus Web Blocker Chrome Extension
---

## Overview

**Focus Web Blocker** helps you stay focused—especially if you're preparing for competitive exams like SSC CGL—by blocking distracting websites and keywords for fixed periods. Set up your custom blocklists, run focus sessions, and manage editing security via password protection.

---

## Features

- ✅ Block distracting sites and keywords (customizable lists)
- ✅ Focus timer (default 30-minute Pomodoro)
- ✅ Lock blocklist editing during active focus sessions (optional password)
- ✅ Motivational dashboard and simple popup controls
- ✅ Session progress tracking

---

## How It Works

1. **Add Domains/Keywords:**  
   Use the options page to list distracting sites/domains or keywords you want to block.
2. **(Optional) Set Password:**  
   Protect your blocklist from tampering by setting a password.
3. **Start Focus Session:**  
   Launch a session (e.g., 30 minutes). Editing is locked during the session.
4. **View Progress:**  
   The dashboard and popup show your current focus, blocklist, and remaining session time.
5. **Session End:**  
   You're notified, editing unlocks, and you can adjust blocklists as needed.

---

## Getting Started

1. **Install the Extension:**  
   Clone/download the repo and load it as an unpacked extension in Chrome.

2. **Setup:**
    - Click the extension icon.
    - Add websites/domains or keywords you want to block on the options/settings page.
    - (Optionally) Set a lock password.

3. **Start Using:**
    - Use the popup to quickly block/unblock the current site, view status, and start/stop focus sessions.
    - Launch the dashboard to see progress or motivational stats.

---

## Main Files and Structure

- `background.js`: Handles session logic, rules, notifications.
- `popup.js` / `popup-enhanced.js`: Popup interface for fast controls.
- `options.js`: Blocklist, password, and keyword management UI.
- `dashboard.js`: (Optional) Motivational dashboard with timer & session info.

**Note:** You will also find `messaging.js` (for custom message handling—expand as needed) and blanked/legacy cleaned files as part of automated cleanup.

---

## Customization

- Adjust session lengths and blocklist rules as needed in the code.
- Extend blocklist logic for more complex needs (e.g., scheduled blocking, wildcards).

---

## Installation (for Users)

```bash
# Clone the repository
git clone https://github.com/HelloSamar/ssc-focus-blocker.git

# In Chrome:
# 1. Go to chrome://extensions
# 2. Enable Developer mode (top right)
# 3. Click "Load unpacked" and select the cloned folder
# 4. The extension icon will appear in your toolbar—click to launch!
```

*No tracking, no data sharing—just pure focus!*

---

## 🚀 Launch Checklist

- [ ] Rename the repo in [GitHub Settings](https://github.com/HelloSamar/ssc-focus-blocker/settings) to `focus-web-blocker` or `ssc-focus-web-blocker`
- [ ] Verify `manifest.json` exists and points to correct files (`background.js`, `popup.js`, `options.html`)
- [ ] Test the extension locally by loading into Chrome via `chrome://extensions/`
- [ ] Verify blocklist, focus timer, and session locking work correctly
- [ ] (Optional) Add screenshots/GIFs of extension in action to the README
- [ ] Push all changes to GitHub
- [ ] (Optional) Submit to [Chrome Web Store](https://chrome.google.com/webstore/developer/dashboard)

---

## Contributing

Found a bug? Have an idea or want to help support exam-takers everywhere?  
[Open an issue](https://github.com/HelloSamar/ssc-focus-blocker/issues) or fork the repo and make a pull request!

---

## License

This project is licensed under the MIT License.

---

**Good luck with your studies and focus!** 🎯
