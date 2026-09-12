const state = {
  data: null, // { version, auth, autosave, links, folders, notes, reminders } — see config.js
  fileHandle: null, // FileSystemFileHandle | null — set once /linkfile succeeds
  loggedIn: false, // device-local, kept out of the portable .dashboard file
  mode: "link", // "link" | "folder" — set by `cd /l` / `cd /f` (terminal page only)
  editTarget: null, // { scope: "link"|"folderlink", linkId, folderId? } (terminal page only)
  pendingConfirm: null, // { message, onConfirm } — set while awaiting y/n (terminal page only)
  history: [], // command history for ↑ / ↓, this session only (terminal page only)
  historyIdx: 0,
};

// Dashboard and Terminal are separate pages now (separate JS realms), so this
// runs after every mutation regardless of which page made it. `term` and
// `renderDashboard` only exist on the page that defines them — guard both
// so this file works unmodified on either page.
async function saveState() {
  persist.saveLocal(state.data);
  if (state.fileHandle && state.data.autosave) {
    try {
      await persist.writeToHandle(state.fileHandle, state.data);
    } catch (e) {
      const msg = `Couldn't write to the linked file: ${e.message}`;
      if (typeof term !== "undefined") term.printError(msg);
      else if (typeof showToast === "function") showToast(msg);
    }
  }
  if (typeof renderDashboard === "function") renderDashboard();
}

function findLink(name) {
  const n = name.trim().toLowerCase();
  return state.data.links.find((l) => l.name.toLowerCase() === n);
}

function findFolder(name) {
  const n = name.trim().toLowerCase();
  return state.data.folders.find((f) => f.name.toLowerCase() === n);
}

function findLinkIn(list, name) {
  const n = name.trim().toLowerCase();
  return list.find((l) => l.name.toLowerCase() === n);
}

function openFolder(folder) {
  if (!folder.links.length) return false;
  folder.links.forEach((l, i) => setTimeout(() => window.open(normalizeUrl(l.url), "_blank"), i * 150));
  return true;
}

function toggleNoteDone(note) {
  note.done = !note.done;
  saveState();
}

function toggleReminderDone(reminder) {
  reminder.done = !reminder.done;
  saveState();
}
