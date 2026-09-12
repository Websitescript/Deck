document.addEventListener("DOMContentLoaded", async () => {
  term.init();
  startClock();
  wireWindowControls();
  await loadAppData();
  await boot();
});

async function boot() {
  term.print(`${CONFIG.APP_NAME}  v${CONFIG.VERSION}`, "banner-title");
  term.printMuted("Type /help to see every command. /dashboard goes back to the dashboard.");
  term.printMuted("─".repeat(46));

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
  checkReminders();
}
