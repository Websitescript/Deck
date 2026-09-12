// Shared by both pages — loads state.data from the linked file (if one's
// connected and permission is still granted) or localStorage, falling back
// to a fresh empty dashboard. Each page calls this itself on load since
// there's no shared JS state across a real page navigation; it's what lets
// two plain HTML pages act like one app.
async function loadAppData() {
  let loaded = null;
  const handle = await persist.loadHandle();
  if (handle) {
    try {
      const perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm === "granted") {
        loaded = await persist.readFromHandle(handle);
        if (loaded) state.fileHandle = handle;
      }
    } catch {
      /* couldn't reach the file — fall back below */
    }
  }

  if (!loaded) loaded = persist.loadLocal();
  if (!loaded) loaded = defaultData();

  state.data = loaded;
  if (state.data.autosave === undefined) state.data.autosave = true;
  if (!Array.isArray(state.data.reminders)) state.data.reminders = []; // back-compat with dashboards saved before reminders existed
  state.loggedIn = localStorage.getItem(CONFIG.LS_LOGIN_KEY) === "1" && !!state.data.auth;
}

function wireWindowControls() {
  document.getElementById("ctrl-min").addEventListener("click", () => {
    document.body.classList.toggle("collapsed");
  });
  document.getElementById("ctrl-max").addEventListener("click", () => {
    document.body.classList.toggle("windowed");
  });
  document.getElementById("ctrl-close").addEventListener("click", () => {
    document.body.classList.remove("collapsed");
    showToast("Can't close this from here — it's your browser's new tab page.");
  });
}
