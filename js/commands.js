// Commands usable before an account is logged in.
const PRELOGIN_ALLOWED = new Set(["login", "cls", "/help", "/linkfile", "/save"]);

// While one of these is the pending command, /name /url /delete keep
// referring to it. Anything else clears the current selection.
const EDIT_CHAIN = new Set(["/name", "/url", "/delete", "/exit"]);

function requestConfirm(message, onConfirm) {
  state.pendingConfirm = { onConfirm };
  term.print(`${message} (y/n)`, "warn");
}

const commands = {
  resolveConfirm(raw) {
    const v = raw.trim().toLowerCase();
    const confirm = state.pendingConfirm;
    state.pendingConfirm = null;
    if (v === "y" || v === "yes") {
      confirm.onConfirm();
    } else {
      term.print("Cancelled.");
    }
  },

  async run(raw) {
    const [cmd, rest] = splitFirst(raw);
    const key = cmd.toLowerCase();

    if (!state.loggedIn && !PRELOGIN_ALLOWED.has(key)) {
      term.printError(
        state.data.auth
          ? `Locked. Run: login ${state.data.auth.username} <password>`
          : "Run: login <username> <password> to create your account."
      );
      return;
    }

    if (!EDIT_CHAIN.has(key)) state.editTarget = null;

    const handler = registry[key];
    if (!handler) {
      term.printError(`Command not found: ${cmd} — type /help to see available commands.`);
      return;
    }
    await handler(rest);
  },
};

const registry = {
  // ---- account -----------------------------------------------------
  async login(rest) {
    const tokens = tokenize(rest);
    if (tokens.length < 2) {
      term.printError("Usage: login <username> <password>");
      return;
    }
    const [username, password] = tokens;
    if (!state.data.auth) {
      state.data.auth = { username, passHash: await hashPass(password) };
      state.loggedIn = true;
      localStorage.setItem(CONFIG.LS_LOGIN_KEY, "1");
      await saveState();
      term.printOk(`Account created. Welcome, ${username}.`);
    } else if (username === state.data.auth.username && (await hashPass(password)) === state.data.auth.passHash) {
      state.loggedIn = true;
      localStorage.setItem(CONFIG.LS_LOGIN_KEY, "1");
      term.printOk(`Welcome back, ${username}.`);
    } else {
      term.printError("Incorrect username or password.");
      return;
    }
    term.updatePrompt();
    term.printOk("Heading back to the dashboard…");
    setTimeout(() => (window.location.href = "index.html"), 400);
  },

  "/logout"() {
    state.loggedIn = false;
    localStorage.removeItem(CONFIG.LS_LOGIN_KEY);
    term.updatePrompt();
    term.print("Logged out.");
  },

  async "/edituser"(rest) {
    const newUsername = rest.trim();
    if (!newUsername) return term.printError("Usage: /edituser <new username>");
    state.data.auth.username = newUsername;
    await saveState();
    term.printOk(`Username changed to "${newUsername}".`);
    term.updatePrompt();
  },

  async "/editpass"(rest) {
    const newPassword = rest.trim();
    if (!newPassword) return term.printError("Usage: /editpass <new password>");
    state.data.auth.passHash = await hashPass(newPassword);
    await saveState();
    term.printOk("Password updated.");
  },

  // ---- search ---------------------------------------------------------
  "/search"(rest) {
    const q = rest.trim();
    if (!q) return term.printError("Usage: /search <topic>");
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
  },

  "/ytsearch"(rest) {
    const q = rest.trim();
    if (!q) return term.printError("Usage: /ytsearch <topic>");
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, "_blank");
  },

  // ---- context switch ---------------------------------------------
  cd(rest) {
    const v = rest.trim();
    if (v === "/f") {
      state.mode = "folder";
      term.print("Context: folders (/f).");
    } else if (v === "/l") {
      state.mode = "link";
      term.print("Context: quick links (/l).");
    } else {
      term.printError("Usage: cd /l | cd /f");
      return;
    }
    term.updatePrompt();
  },

  // ---- quick links -------------------------------------------------
  "/addl"(rest) {
    const parsed = parseNameUrl(rest);
    if (!parsed) return term.printError("Usage: /addl <name> <url>");
    state.data.links.push({ id: uid(), name: parsed.name, url: parsed.url });
    saveState();
    term.printOk(`Added "${parsed.name}".`);
  },

  "/editl"(rest) {
    const name = rest.trim();
    const link = findLink(name);
    if (!link) return term.printError(`Link "${name}" not found. Try /list /l.`);
    state.editTarget = { scope: "link", linkId: link.id };
    term.print(`Editing "${link.name}" — use /name <new name>, /url <new url>, or /exit.`);
  },

  // Edits a link that lives inside a folder (cd /f).
  "/editfd"(rest) {
    const tokens = tokenize(rest);
    if (tokens.length < 2) return term.printError("Usage: /editfd <folder name> <link name>");
    // Folder and link names can both contain spaces, so match against
    // real folder names: try the longest leading chunk of tokens first.
    const match = matchFolderPrefix(tokens);
    if (!match) return term.printError(`Folder not found. Try /list /f, or quote the name: /editfd "Folder Name" <link>.`);
    const { folder, rest: linkName } = match;
    const link = findLinkIn(folder.links, linkName);
    if (!link) return term.printError(`Link "${linkName}" not found in "${folder.name}".`);
    state.editTarget = { scope: "folderlink", folderId: folder.id, linkId: link.id };
    term.print(`Editing "${link.name}" in "${folder.name}" — use /name, /url, /delete, or /exit.`);
  },

  "/name"(rest) {
    if (!state.editTarget) return term.printError("Nothing selected. Use /editl, /editf, or /editfd first.");
    const newName = rest.trim();
    if (!newName) return term.printError("Usage: /name <new name>");
    const target = resolveEditTarget();
    target.name = newName;
    saveState();
    term.printOk(`Renamed to "${newName}".`);
  },

  "/url"(rest) {
    if (!state.editTarget) return term.printError("Nothing selected. Use /editl or /editfd first.");
    if (state.editTarget.scope === "folder") {
      return term.printError("Folders don't have a URL — did you mean to edit a link inside it?");
    }
    const newUrl = rest.trim();
    if (!newUrl) return term.printError("Usage: /url <new url>");
    const link = resolveEditTarget();
    link.url = normalizeUrl(newUrl);
    saveState();
    term.printOk(`URL updated for "${link.name}".`);
  },

  "/exit"() {
    if (!state.editTarget) return term.print("Nothing was being edited.");
    state.editTarget = null;
    term.print("Done editing.");
  },

  "/delete"() {
    // Only meaningful inside a folder-link edit (/editfd <folder> <link>).
    if (state.editTarget && state.editTarget.scope === "folder") {
      return term.printError("Use /deletef <folder name> to delete a whole folder.");
    }
    if (!state.editTarget || state.editTarget.scope !== "folderlink") {
      return term.printError("Select a link in a folder first: /editfd <folder name> <link name>.");
    }
    const folder = state.data.folders.find((f) => f.id === state.editTarget.folderId);
    const link = folder.links.find((l) => l.id === state.editTarget.linkId);
    requestConfirm(`Delete link "${link.name}" from "${folder.name}"?`, () => {
      folder.links = folder.links.filter((l) => l.id !== link.id);
      state.editTarget = null;
      saveState();
      term.printOk("Deleted.");
    });
  },

  "/deletel"(rest) {
    const name = rest.trim();
    const link = findLink(name);
    if (!link) return term.printError(`Link "${name}" not found.`);
    requestConfirm(`Delete quick link "${link.name}"?`, () => {
      state.data.links = state.data.links.filter((l) => l.id !== link.id);
      saveState();
      term.printOk("Deleted.");
    });
  },

  "/openl"(rest) {
    const name = rest.trim();
    const link = findLink(name);
    if (!link) return term.printError(`Link "${name}" not found. Try /list /l.`);
    window.open(normalizeUrl(link.url), "_blank");
  },

  // ---- folders -------------------------------------------------------
  "/addf"(rest) {
    const parts = rest.split("|").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return term.printError("Usage: /addf <folder name> | <link name> <url> | ...");
    const folderName = parts[0];
    const links = [];
    for (let i = 1; i < parts.length; i++) {
      const parsed = parseNameUrl(parts[i]);
      if (!parsed) {
        term.printError(`Skipped invalid link: "${parts[i]}"`);
        continue;
      }
      links.push({ id: uid(), name: parsed.name, url: parsed.url });
    }
    state.data.folders.push({ id: uid(), name: folderName, links });
    saveState();
    term.printOk(`Folder "${folderName}" created with ${links.length} link(s).`);
  },

  // Renames the folder itself (not a link inside it) — pairs with /name, /exit.
  "/editf"(rest) {
    const name = rest.trim();
    const folder = findFolder(name);
    if (!folder) return term.printError(`Folder "${name}" not found. Try /list /f.`);
    state.editTarget = { scope: "folder", folderId: folder.id };
    term.print(`Editing folder "${folder.name}" — use /name <new name>, or /exit.`);
  },

  "/deletef"(rest) {
    const name = rest.trim();
    const folder = findFolder(name);
    if (!folder) return term.printError(`Folder "${name}" not found.`);
    requestConfirm(`Delete folder "${folder.name}" and all ${folder.links.length} link(s) inside it?`, () => {
      state.data.folders = state.data.folders.filter((f) => f.id !== folder.id);
      saveState();
      term.printOk("Deleted.");
    });
  },

  "/openf"(rest) {
    const name = rest.trim();
    const folder = findFolder(name);
    if (!folder) return term.printError(`Folder "${name}" not found.`);
    if (!folder.links.length) return term.print(`"${folder.name}" is empty.`);
    term.print(`Opening ${folder.links.length} link(s) from "${folder.name}"…`);
    folder.links.forEach((l, i) => setTimeout(() => window.open(normalizeUrl(l.url), "_blank"), i * 150));
    term.printMuted("Tip: allow pop-ups for this page if some tabs were blocked.");
  },

  // ---- listing ---------------------------------------------------------
  "/list"(rest) {
    const v = rest.trim();
    if (v === "/l") return listLinks();
    if (v === "/f") return listFolders();
    term.printError("Usage: /list /l | /list /f");
  },

  // ---- notes / saved links (custom command) --------------------------
  "/addnote"(rest) {
    const text = rest.trim();
    if (!text) return term.printError("Usage: /addnote <text or link>");
    state.data.notes.unshift({ id: uid(), text, done: false });
    saveState();
    term.printOk("Saved.");
  },

  "/notes"() {
    const notes = state.data.notes;
    if (!notes.length) return term.print("No saved notes yet. Add one: /addnote <text or link>");
    term.print("Saved Links / Notes:");
    notes.forEach((n, i) => term.printNoteLine(i + 1, n));
  },

  "/done"(rest) {
    const n = parseInt(rest.trim(), 10);
    const note = state.data.notes[n - 1];
    if (!note) return term.printError(`No note #${rest.trim()}. Try /notes.`);
    toggleNoteDone(note);
    term.printOk(note.done ? "Marked done." : "Marked not done.");
  },

  "/delnote"(rest) {
    const n = parseInt(rest.trim(), 10);
    const note = state.data.notes[n - 1];
    if (!note) return term.printError(`No note #${rest.trim()}. Try /notes.`);
    requestConfirm(`Delete note "${note.text}"?`, () => {
      state.data.notes = state.data.notes.filter((x) => x.id !== note.id);
      saveState();
      term.printOk("Deleted.");
    });
  },

  // ---- reminders --------------------------------------------------------
  "/remind"(rest) {
    const parts = rest.split("|").map((s) => s.trim());
    const [text, whenText] = parts;
    if (!text || !whenText) {
      return term.printError("Usage: /remind <text> | <when>   e.g. /remind Submit CMA form | tomorrow 18:00");
    }
    const due = parseWhen(whenText);
    if (!due) {
      return term.printError(
        `Couldn't understand "${whenText}". Try: 2026-09-20, 2026-09-20 14:00, today 18:00, tomorrow, or in 2 hours.`
      );
    }
    state.data.reminders.push({ id: uid(), text, dueAt: due.toISOString(), done: false, notified: false });
    state.data.reminders.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    saveState();
    term.printOk(`Reminder set for ${formatDue(due)}.`);
    ensureNotificationPermission();
  },

  "/reminders"() {
    const items = state.data.reminders;
    if (!items.length) return term.print("No reminders yet. Add one: /remind <text> | <when>");
    term.print("Reminders:");
    items.forEach((r, i) => term.printReminderLine(i + 1, r));
  },

  "/remdone"(rest) {
    const n = parseInt(rest.trim(), 10);
    const r = state.data.reminders[n - 1];
    if (!r) return term.printError(`No reminder #${rest.trim()}. Try /reminders.`);
    toggleReminderDone(r);
    term.printOk(r.done ? "Marked done." : "Marked not done.");
  },

  "/remdel"(rest) {
    const n = parseInt(rest.trim(), 10);
    const r = state.data.reminders[n - 1];
    if (!r) return term.printError(`No reminder #${rest.trim()}. Try /reminders.`);
    requestConfirm(`Delete reminder "${r.text}"?`, () => {
      state.data.reminders = state.data.reminders.filter((x) => x.id !== r.id);
      saveState();
      term.printOk("Deleted.");
    });
  },

  // ---- file + session --------------------------------------------------
  async "/linkfile"() {
    if (!persist.supportsFS) {
      return term.printError(
        "File linking needs a Chromium browser (Chrome/Edge/Opera). Your data still saves fine in this browser."
      );
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: CONFIG.FILE_SUGGESTED_NAME,
        types: [{ description: "Dashboard data", accept: { "application/json": [".dashboard", ".json"] } }],
      });
      let existing = null;
      try {
        existing = await persist.readFromHandle(handle);
      } catch {
        /* new or unreadable file — fine, we'll write a fresh one */
      }
      state.fileHandle = handle;
      await persist.saveHandle(handle);
      if (existing && Array.isArray(existing.links)) {
        state.data = existing;
        if (!Array.isArray(state.data.reminders)) state.data.reminders = []; // back-compat with older .dashboard files
        state.loggedIn = localStorage.getItem(CONFIG.LS_LOGIN_KEY) === "1" && !!existing.auth;
        term.printOk("Found existing data in that file — loaded it.");
        if (state.loggedIn) {
          term.printOk("Heading back to the dashboard…");
          setTimeout(() => (window.location.href = "index.html"), 400);
        }
      } else {
        await saveState();
        term.printOk("Linked. Saving to this file from now on.");
      }
      term.updatePrompt();
    } catch (e) {
      if (e.name !== "AbortError") term.printError(`Couldn't link file: ${e.message}`);
    }
  },

  "/autosave"(rest) {
    const v = rest.trim().toLowerCase();
    if (v !== "on" && v !== "off") return term.printError("Usage: /autosave on|off");
    state.data.autosave = v === "on";
    saveState();
    term.printOk(`Autosave ${state.data.autosave ? "enabled" : "disabled"}.`);
  },

  async "/save"() {
    await saveState();
    term.printOk(state.fileHandle ? "Saved to browser storage and the linked file." : "Saved to browser storage.");
  },

  async "/unlink"() {
    state.fileHandle = null;
    await persist.clearHandle();
    term.print("Unlinked. Saving to browser storage only from now on.");
  },

  cls() {
    term.clear();
  },

  "/dashboard"() {
    term.print("Heading back to the dashboard…");
    setTimeout(() => (window.location.href = "index.html"), 300);
  },

  "/help"() {
    printHelp();
  },
};

// Finds which leading run of tokens names an existing folder, longest
// match first, so multi-word folder AND link names both work unquoted
// (e.g. "Dev Tools GitHub" -> folder "Dev Tools", link "GitHub").
function matchFolderPrefix(tokens) {
  for (let i = tokens.length - 1; i >= 1; i--) {
    const folder = findFolder(tokens.slice(0, i).join(" "));
    if (folder) return { folder, rest: tokens.slice(i).join(" ") };
  }
  return null;
}

function resolveEditTarget() {
  const t = state.editTarget;
  if (t.scope === "link") return state.data.links.find((l) => l.id === t.linkId);
  if (t.scope === "folder") return state.data.folders.find((f) => f.id === t.folderId);
  const folder = state.data.folders.find((f) => f.id === t.folderId);
  return folder.links.find((l) => l.id === t.linkId);
}

function listLinks() {
  const links = state.data.links;
  if (!links.length) return term.print("No quick links yet. Add one: /addl <name> <url>");
  term.print("Quick Links:");
  links.forEach((l, i) => term.printLinkLine(i + 1, l.name, l.url));
}

function listFolders() {
  const folders = state.data.folders;
  if (!folders.length) return term.print("No folders yet. Add one: /addf <name> | <link> <url> | ...");
  folders.forEach((f) => {
    term.print(`📁 ${f.name}  (${f.links.length})`);
    if (!f.links.length) term.printMuted("   — empty —");
    f.links.forEach((l) => term.printLinkLine(null, l.name, l.url, true));
  });
}

function printHelp() {
  const rows = [
    ["ACCOUNT", ""],
    ["login <username> <password>", "create your account, or sign back in"],
    ["/logout", "lock the terminal again"],
    ["/edituser <new username>", "change your username"],
    ["/editpass <new password>", "change your password"],
    ["", ""],
    ["SEARCH", ""],
    ["/search <topic>", "search Google in a new tab"],
    ["/ytsearch <topic>", "search YouTube in a new tab"],
    ["", ""],
    ["QUICK LINKS  (cd /l)", ""],
    ["/addl <name> <url>", "add a quick link"],
    ["/editl <name>", "select a link, then /name, /url, /exit"],
    ["/deletel <name>", "delete a quick link *confirm"],
    ["/openl <name>", "open a quick link"],
    ["/list /l", "list all quick links"],
    ["", ""],
    ["FOLDERS  (cd /f)", ""],
    ["/addf <folder> | <name> <url> | ...", "create a folder with links"],
    ["/editf <folder>", "select a folder, then /name, /exit (renames the folder)"],
    ["/editfd <folder> <name>", "select a link inside a folder, then /name, /url, /delete, /exit"],
    ["/deletef <folder>", "delete a folder and its links *confirm"],
    ["/openf <folder>", "open every link in a folder"],
    ["/list /f", "list all folders and their links"],
    ["", ""],
    ["NOTES / SAVED LINKS", ""],
    ["/addnote <text>", "save a note or link"],
    ["/notes", "list saved notes"],
    ["/done <#>", "toggle a note done/not done"],
    ["/delnote <#>", "delete a note *confirm"],
    ["", ""],
    ["REMINDERS", ""],
    ["/remind <text> | <when>", "e.g. /remind Renew domain | tomorrow 9:00"],
    ["", "when: 2026-09-20, 2026-09-20 14:00, today 18:00, tomorrow, in 2 hours"],
    ["/reminders", "list reminders, soonest first"],
    ["/remdone <#>", "toggle a reminder done/not done"],
    ["/remdel <#>", "delete a reminder *confirm"],
    ["", "a due reminder plays a short alarm + a browser notification"],
    ["", ""],
    ["FILE + SESSION", ""],
    ["/linkfile", "link a .dashboard file on disk (Chrome/Edge)"],
    ["/autosave on|off", "save to the linked file after every change"],
    ["/save", "save right now"],
    ["/unlink", "stop using the linked file"],
    ["/dashboard", "go back to the dashboard page"],
    ["cd /l | cd /f", "switch context between links and folders"],
    ["cls", "clear the screen"],
    ["/help", "show this list"],
  ];
  term.printRaw(
    rows
      .map(([cmd, desc]) => {
        if (!cmd && !desc) return `<div class="help-gap"></div>`;
        if (!cmd) return `<div class="help-note muted">${escapeHtml(desc)}</div>`;
        if (!desc) return `<div class="help-head">${escapeHtml(cmd)}</div>`;
        return `<div class="help-row"><span class="help-cmd">${escapeHtml(cmd)}</span><span class="help-desc muted">${escapeHtml(desc)}</span></div>`;
      })
      .join(""),
    "help-block"
  );
}
