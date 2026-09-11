const state = {
  data: null, // { version, auth, autosave, links, folders, notes, reminders } — see config.js
  fileHandle: null, // FileSystemFileHandle | null — set once /linkfile succeeds
  loggedIn: false, // device-local, kept out of the portable .dashboard file
  mode: "link", // "link" | "folder" — set by `cd /l` / `cd /f`
  editTarget: null, // { scope: "link"|"folderlink", linkId, folderId? }
  pendingConfirm: null, // { message, onConfirm } — set while awaiting y/n
  history: [], // command history for ↑ / ↓, this session only
  historyIdx: 0,
  terminalOpen: false, // whether the terminal popup is showing, this session only
};

async function saveState() {
  persist.saveLocal(state.data);
  if (state.fileHandle && state.data.autosave) {
    try {
      await persist.writeToHandle(state.fileHandle, state.data);
    } catch (e) {
      term.printError(`Couldn't write to the linked file: ${e.message}`);
    }
  }
  renderDashboard();
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
