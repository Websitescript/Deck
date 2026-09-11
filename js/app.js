document.addEventListener("DOMContentLoaded", async () => {
  term.init();
  startClock();
  wireWindowControls();
  const versionEl = document.getElementById("dash-version");
  if (versionEl) versionEl.textContent = `v${CONFIG.VERSION}`;
  await boot();
});

async function boot() {
  term.print(`${CONFIG.APP_NAME}  v${CONFIG.VERSION}`, "banner-title");
  term.printMuted("A command-line dashboard. Type /help to see every command.");
  term.printMuted("─".repeat(46));

  let loaded = null;
  const handle = await persist.loadHandle();
  if (handle) {
    try {
      const perm = await handle.queryPermission({ mode: "readwrite" });
      if (perm === "granted") {
        loaded = await persist.readFromHandle(handle);
        if (loaded) state.fileHandle = handle;
      } else {
        term.printMuted("Linked file needs permission again — run /linkfile to reconnect.");
      }
    } catch {
      term.printMuted("Couldn't reach the previously linked file — run /linkfile to relink.");
    }
  }

  if (!loaded) loaded = persist.loadLocal();
  if (!loaded) loaded = defaultData();
  state.data = loaded;
  if (state.data.autosave === undefined) state.data.autosave = true;
  if (!Array.isArray(state.data.reminders)) state.data.reminders = []; // back-compat with dashboards saved before reminders existed
  state.loggedIn = localStorage.getItem(CONFIG.LS_LOGIN_KEY) === "1" && !!state.data.auth;

  term.print(
    `quick links: ${state.data.links.length}   folders: ${state.data.folders.length}   notes: ${state.data.notes.length}   reminders: ${state.data.reminders.length}`,
    "muted"
  );
  term.printMuted(
    state.fileHandle
      ? `data source: linked file (${state.data.autosave ? "autosave on" : "autosave off"})`
      : "data source: browser storage — run /linkfile to save to a .dashboard file on disk"
  );
  term.printMuted("─".repeat(46));

  if (!state.data.auth) {
    term.print("No account yet. Run: login <username> <password> to create one.");
  } else if (!state.loggedIn) {
    term.print(`Locked. Run: login ${state.data.auth.username} <password> to continue.`);
  } else {
    term.printOk(`Welcome back, ${state.data.auth.username}.`);
  }

  term.updatePrompt();
  renderDashboard();
  // Dashboard is what you land on, always — the terminal only opens when
  // you ask for it (the tab, the Terminal button, or /dashboard to close it).
  checkReminders();
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
    term.openTerminal();
    term.print("Can't close this from here — it's your browser's new tab page.", "muted");
  });
}
