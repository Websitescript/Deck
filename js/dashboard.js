// ============================================================================
// RENDERING
// ============================================================================

function renderDashboard() {
  if (!state.data) return;
  renderDashHeader();
  renderDashStats();
  renderDashLinks();
  renderDashFolders();
  renderDashReminders();
  renderDashNotes();
  renderDashCalendar();
}

function renderDashHeader() {
  const username = state.data.auth ? state.data.auth.username : "guest";
  const avatar = document.getElementById("dash-avatar");
  const nameEl = document.getElementById("dash-username");
  const dateEl = document.getElementById("dash-date");
  if (!avatar) return;
  avatar.textContent = username.charAt(0).toUpperCase();
  nameEl.textContent = username;
  dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function renderDashStats() {
  const el = document.getElementById("dash-stats");
  if (!el) return;
  const dueSoon = state.data.reminders.filter((r) => !r.done && new Date(r.dueAt).getTime() - Date.now() < 24 * 3600000).length;
  const openNotes = state.data.notes.filter((n) => !n.done).length;
  const cards = [
    ["blue", "🔗", state.data.links.length, "Quick Links"],
    ["gold", "📁", state.data.folders.length, "Folders"],
    ["coral", "⏰", dueSoon, "Due Soon"],
    ["teal", "📝", openNotes, "Open Notes"],
  ];
  el.innerHTML = cards
    .map(
      ([cls, icon, num, label]) =>
        `<div class="stat-card"><div class="stat-icon ${cls}">${icon}</div>` +
        `<div><div class="stat-num">${num}</div><div class="stat-label">${label}</div></div></div>`
    )
    .join("");
}

function renderDashLinks() {
  const el = document.getElementById("dash-links-body");
  const links = state.data.links;
  el.innerHTML = links.length
    ? links
        .map(
          (l) =>
            `<div class="link-tile">` +
            `<span class="tile-actions"><button class="icon-btn" data-edit-link="${escapeAttr(l.id)}" title="Edit">✎</button>` +
            `<button class="icon-btn danger" data-delete-link="${escapeAttr(l.id)}" title="Delete">×</button></span>` +
            `<span class="tile-open" data-open-url="${escapeAttr(normalizeUrl(l.url))}">` +
            `<img src="${faviconFor(l.url)}" alt="" /><span>${escapeHtml(l.name)}</span></span></div>`
        )
        .join("")
    : `<div class="dash-empty">No quick links yet — click + above to add one.</div>`;
}

function renderDashFolders() {
  const el = document.getElementById("dash-folders-body");
  const folders = state.data.folders;
  el.innerHTML = folders.length ? folders.map(dashFolderCard).join("") : `<div class="dash-empty">No folders yet — click + above to add one.</div>`;
}

function dashFolderCard(f) {
  const rows = f.links.length
    ? f.links
        .map(
          (l) =>
            `<div class="dash-row indent">` +
            `<img class="fav" src="${faviconFor(l.url)}" alt="" />` +
            `<span class="dash-link" data-open-url="${escapeAttr(normalizeUrl(l.url))}">${escapeHtml(l.name)}</span>` +
            `<button class="icon-btn" data-edit-folder-link="${f.id}:${l.id}" title="Edit">✎</button>` +
            `<button class="icon-btn danger" data-delete-folder-link="${f.id}:${l.id}" title="Delete">×</button></div>`
        )
        .join("")
    : `<div class="dash-empty indent">empty</div>`;
  return (
    `<div class="folder-card">` +
    `<div class="folder-head">` +
    `<button class="icon-btn caret collapsed" data-toggle-folder-collapse="${f.id}" title="Expand / collapse">▾</button>` +
    `<span class="dash-link" data-open-folder="${escapeAttr(f.name)}">📁 ${escapeHtml(f.name)}</span>` +
    `<span class="dash-count muted">${f.links.length}</span>` +
    `<button class="icon-btn" data-add-folder-link="${f.id}" title="Add link">+</button>` +
    `<button class="icon-btn" data-edit-folder="${f.id}" title="Rename">✎</button>` +
    `<button class="icon-btn danger" data-delete-folder="${f.id}" title="Delete folder">×</button></div>` +
    `<div class="folder-links collapsed" data-folder-links="${f.id}">${rows}</div></div>`
  );
}

function renderDashReminders() {
  const el = document.getElementById("dash-reminders-body");
  const reminders = [...state.data.reminders].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  el.innerHTML = reminders.length ? reminders.map(dashReminderRow).join("") : `<div class="dash-empty">Nothing set — click + above to add one.</div>`;
}

function dashReminderRow(r) {
  const due = new Date(r.dueAt).getTime();
  const overdue = !r.done && due < Date.now();
  const soon = !r.done && !overdue && due - Date.now() < 24 * 3600000;
  const urgency = r.done ? " muted" : overdue ? " overdue" : soon ? " soon" : "";
  const box = r.done ? "[x]" : overdue ? "[!]" : "[ ]";
  return (
    `<div class="dash-row${urgency}">` +
    `<span class="note-box" data-toggle-reminder="${escapeAttr(r.id)}">${box}</span>` +
    `<span class="dash-text">${escapeHtml(r.text)}</span>` +
    `<span class="rem-when">${escapeHtml(formatDue(r.dueAt))}</span>` +
    `<button class="icon-btn" data-copy-text="${escapeAttr(r.text)}" title="Copy">⧉</button>` +
    `<button class="icon-btn" data-edit-reminder="${escapeAttr(r.id)}" title="Edit">✎</button>` +
    `<button class="icon-btn danger" data-delete-reminder="${escapeAttr(r.id)}" title="Delete">×</button></div>`
  );
}

function renderDashNotes() {
  const el = document.getElementById("dash-notes-body");
  const notes = state.data.notes;
  el.innerHTML = notes.length ? notes.map(dashNoteRow).join("") : `<div class="dash-empty">No notes yet — click + above to add one.</div>`;
}

function dashNoteRow(n) {
  return (
    `<div class="dash-row${n.done ? " muted" : ""}">` +
    `<span class="note-box" data-toggle-note="${escapeAttr(n.id)}">${n.done ? "[x]" : "[ ]"}</span>` +
    `<span class="dash-text">${escapeHtml(n.text)}</span>` +
    `<button class="icon-btn" data-copy-text="${escapeAttr(n.text)}" title="Copy">⧉</button>` +
    `<button class="icon-btn" data-edit-note="${escapeAttr(n.id)}" title="Edit">✎</button>` +
    `<button class="icon-btn danger" data-delete-note="${escapeAttr(n.id)}" title="Delete">×</button></div>`
  );
}

// One unified grid (headers + day cells together) so columns can't
// possibly drift out of alignment the way two separate grids could.
function renderDashCalendar() {
  const monthLabel = document.getElementById("dash-calendar-month");
  const body = document.getElementById("dash-calendar-body");
  if (!monthLabel) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  monthLabel.textContent = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dueDays = new Set(
    state.data.reminders
      .filter((r) => !r.done)
      .map((r) => new Date(r.dueAt))
      .filter((d) => d.getFullYear() === year && d.getMonth() === month)
      .map((d) => d.getDate())
  );

  let cells = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => `<div class="cal-cell head">${d}</div>`).join("");
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const cls = (d === now.getDate() ? " today" : "") + (dueDays.has(d) ? " has-reminder" : "");
    cells += `<div class="cal-cell${cls}">${d}</div>`;
  }

  body.innerHTML = `<div class="cal-grid">${cells}</div>`;
}

// ============================================================================
// GENERIC ADD/EDIT DIALOG — a real <dialog> element, so open/close, the
// backdrop, and Escape are all handled natively by the browser rather than
// hand-rolled show/hide state.
// ============================================================================

let _formSubmitHandler = null;

function openForm(title, fields, onSubmit) {
  const dialog = document.getElementById("formDialog");
  const form = document.getElementById("formDialogForm");
  document.getElementById("formDialogTitle").textContent = title;
  const fieldsEl = document.getElementById("formDialogFields");

  fieldsEl.innerHTML = fields
    .map(
      (f, i) =>
        `<label class="form-field"><span>${escapeHtml(f.label)}</span>` +
        `<input type="${f.type || "text"}" data-field="${i}" value="${escapeAttr(f.value || "")}" placeholder="${escapeAttr(f.placeholder || "")}" /></label>`
    )
    .join("");

  if (_formSubmitHandler) form.removeEventListener("submit", _formSubmitHandler);
  _formSubmitHandler = (e) => {
    e.preventDefault();
    const values = {};
    fields.forEach((f, i) => {
      values[f.key] = fieldsEl.querySelector(`[data-field="${i}"]`).value.trim();
    });
    const result = onSubmit(values);
    if (result !== false) dialog.close();
  };
  form.addEventListener("submit", _formSubmitHandler);

  dialog.showModal();
  const firstInput = fieldsEl.querySelector("input");
  if (firstInput) firstInput.focus();
}

function initFormDialog() {
  const dialog = document.getElementById("formDialog");
  document.getElementById("formDialogCancel").addEventListener("click", () => dialog.close());
  // Clicking the backdrop (outside the visible box) closes it too.
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });
}

// ============================================================================
// CRUD actions — one function per button, each just mutates state.data and
// calls saveState() (which re-renders). Deletes use the native confirm(),
// same reasoning as the dialog: no custom state to get stuck.
// ============================================================================

function addLinkFlow() {
  openForm("Add Quick Link", [{ key: "name", label: "Name" }, { key: "url", label: "URL" }], (v) => {
    if (!v.name || !v.url) return false;
    state.data.links.push({ id: uid(), name: v.name, url: normalizeUrl(v.url) });
    saveState();
  });
}

function editLinkFlow(link) {
  openForm(
    "Edit Link",
    [{ key: "name", label: "Name", value: link.name }, { key: "url", label: "URL", value: link.url }],
    (v) => {
      if (!v.name || !v.url) return false;
      link.name = v.name;
      link.url = normalizeUrl(v.url);
      saveState();
    }
  );
}

function deleteLinkFlow(link) {
  if (confirm(`Delete quick link "${link.name}"?`)) {
    state.data.links = state.data.links.filter((l) => l.id !== link.id);
    saveState();
  }
}

function addFolderFlow() {
  openForm("Add Folder", [{ key: "name", label: "Folder name" }], (v) => {
    if (!v.name) return false;
    state.data.folders.push({ id: uid(), name: v.name, links: [] });
    saveState();
  });
}

function editFolderFlow(folder) {
  openForm("Rename Folder", [{ key: "name", label: "Folder name", value: folder.name }], (v) => {
    if (!v.name) return false;
    folder.name = v.name;
    saveState();
  });
}

function deleteFolderFlow(folder) {
  if (confirm(`Delete folder "${folder.name}" and all ${folder.links.length} link(s) inside it?`)) {
    state.data.folders = state.data.folders.filter((f) => f.id !== folder.id);
    saveState();
  }
}

function addFolderLinkFlow(folder) {
  openForm(`Add Link to "${folder.name}"`, [{ key: "name", label: "Name" }, { key: "url", label: "URL" }], (v) => {
    if (!v.name || !v.url) return false;
    folder.links.push({ id: uid(), name: v.name, url: normalizeUrl(v.url) });
    saveState();
  });
}

function editFolderLinkFlow(folder, link) {
  openForm(
    "Edit Link",
    [{ key: "name", label: "Name", value: link.name }, { key: "url", label: "URL", value: link.url }],
    (v) => {
      if (!v.name || !v.url) return false;
      link.name = v.name;
      link.url = normalizeUrl(v.url);
      saveState();
    }
  );
}

function deleteFolderLinkFlow(folder, link) {
  if (confirm(`Delete link "${link.name}" from "${folder.name}"?`)) {
    folder.links = folder.links.filter((l) => l.id !== link.id);
    saveState();
  }
}

function addReminderFlow() {
  const defaultWhen = new Date(Date.now() + 3600000); // an hour from now — a reasonable starting point
  openForm(
    "Add Reminder",
    [
      { key: "text", label: "Reminder" },
      { key: "when", label: "When", type: "datetime-local", value: isoToDatetimeLocal(defaultWhen) },
    ],
    (v) => {
      if (!v.text || !v.when) return false;
      const due = new Date(v.when);
      if (isNaN(due.getTime())) {
        alert("Please pick a valid date and time.");
        return false;
      }
      state.data.reminders.push({ id: uid(), text: v.text, dueAt: due.toISOString(), done: false, notified: false });
      state.data.reminders.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
      saveState();
    }
  );
}

function editReminderFlow(reminder) {
  openForm(
    "Edit Reminder",
    [
      { key: "text", label: "Reminder", value: reminder.text },
      { key: "when", label: "When", type: "datetime-local", value: isoToDatetimeLocal(reminder.dueAt) },
    ],
    (v) => {
      if (!v.text || !v.when) return false;
      const due = new Date(v.when);
      if (isNaN(due.getTime())) {
        alert("Please pick a valid date and time.");
        return false;
      }
      reminder.text = v.text;
      reminder.dueAt = due.toISOString();
      reminder.notified = due.getTime() > Date.now() ? false : reminder.notified;
      state.data.reminders.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
      saveState();
    }
  );
}

function deleteReminderFlow(reminder) {
  if (confirm(`Delete reminder "${reminder.text}"?`)) {
    state.data.reminders = state.data.reminders.filter((r) => r.id !== reminder.id);
    saveState();
  }
}

function addNoteFlow() {
  openForm("Add Note", [{ key: "text", label: "Note or link" }], (v) => {
    if (!v.text) return false;
    state.data.notes.unshift({ id: uid(), text: v.text, done: false });
    saveState();
  });
}

function editNoteFlow(note) {
  openForm("Edit Note", [{ key: "text", label: "Note or link", value: note.text }], (v) => {
    if (!v.text) return false;
    note.text = v.text;
    saveState();
  });
}

function deleteNoteFlow(note) {
  if (confirm(`Delete note "${note.text}"?`)) {
    state.data.notes = state.data.notes.filter((n) => n.id !== note.id);
    saveState();
  }
}

// ============================================================================
// SEARCH BAR — Google / YouTube toggle, defaults to Google.
// ============================================================================

function wireSearchBar() {
  const wrap = document.getElementById("dashSearch");
  const toggle = document.getElementById("searchToggle");
  const input = document.getElementById("dashSearchInput");
  const form = document.getElementById("dashSearchForm");
  if (!wrap) return;

  function setMode(mode) {
    wrap.dataset.mode = mode;
    input.placeholder = mode === "youtube" ? "Search YouTube…" : "Search Google…";
    toggle.setAttribute("aria-label", `Currently searching ${mode === "youtube" ? "YouTube" : "Google"} — click to switch`);
  }

  toggle.addEventListener("click", () => setMode(wrap.dataset.mode === "youtube" ? "google" : "youtube"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const url =
      wrap.dataset.mode === "youtube"
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
        : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    window.open(url, "_blank");
    input.value = "";
  });

  setMode("google");
}

// ============================================================================
// CLICK DELEGATION — every icon button and clickable row above is handled
// here, keyed off its data-* attribute.
// ============================================================================

function initDashboardInteractions() {
  initFormDialog();
  wireSearchBar();

  document.addEventListener("click", (e) => {
    const openUrl = e.target.closest("[data-open-url]");
    if (openUrl) return void window.open(openUrl.getAttribute("data-open-url"), "_blank");

    const copyBtn = e.target.closest("[data-copy-text]");
    if (copyBtn) {
      const original = copyBtn.textContent;
      copyToClipboard(copyBtn.getAttribute("data-copy-text")).then((ok) => {
        copyBtn.textContent = ok ? "✓" : "×";
        setTimeout(() => (copyBtn.textContent = original), 1200);
      });
      return;
    }

    const openFolderBtn = e.target.closest("[data-open-folder]");
    if (openFolderBtn) {
      const folder = findFolder(openFolderBtn.getAttribute("data-open-folder"));
      if (folder) openFolder(folder);
      return;
    }

    const collapseBtn = e.target.closest("[data-toggle-folder-collapse]");
    if (collapseBtn) {
      const id = collapseBtn.getAttribute("data-toggle-folder-collapse");
      const body = document.querySelector(`[data-folder-links="${id}"]`);
      if (body) body.classList.toggle("collapsed");
      collapseBtn.classList.toggle("collapsed");
      return;
    }

    const noteToggle = e.target.closest("[data-toggle-note]");
    if (noteToggle) {
      const note = state.data.notes.find((n) => n.id === noteToggle.getAttribute("data-toggle-note"));
      if (note) toggleNoteDone(note);
      return;
    }

    const remToggle = e.target.closest("[data-toggle-reminder]");
    if (remToggle) {
      const r = state.data.reminders.find((x) => x.id === remToggle.getAttribute("data-toggle-reminder"));
      if (r) toggleReminderDone(r);
      return;
    }

    if (e.target.closest("[data-add-link]")) return void addLinkFlow();
    const editLink = e.target.closest("[data-edit-link]");
    if (editLink) {
      const link = state.data.links.find((l) => l.id === editLink.getAttribute("data-edit-link"));
      if (link) editLinkFlow(link);
      return;
    }
    const deleteLink = e.target.closest("[data-delete-link]");
    if (deleteLink) {
      const link = state.data.links.find((l) => l.id === deleteLink.getAttribute("data-delete-link"));
      if (link) deleteLinkFlow(link);
      return;
    }

    if (e.target.closest("[data-add-folder]")) return void addFolderFlow();
    const editFolder = e.target.closest("[data-edit-folder]");
    if (editFolder) {
      const folder = state.data.folders.find((f) => f.id === editFolder.getAttribute("data-edit-folder"));
      if (folder) editFolderFlow(folder);
      return;
    }
    const deleteFolder = e.target.closest("[data-delete-folder]");
    if (deleteFolder) {
      const folder = state.data.folders.find((f) => f.id === deleteFolder.getAttribute("data-delete-folder"));
      if (folder) deleteFolderFlow(folder);
      return;
    }
    const addFolderLink = e.target.closest("[data-add-folder-link]");
    if (addFolderLink) {
      const folder = state.data.folders.find((f) => f.id === addFolderLink.getAttribute("data-add-folder-link"));
      if (folder) addFolderLinkFlow(folder);
      return;
    }
    const editFolderLink = e.target.closest("[data-edit-folder-link]");
    if (editFolderLink) {
      const [folderId, linkId] = editFolderLink.getAttribute("data-edit-folder-link").split(":");
      const folder = state.data.folders.find((f) => f.id === folderId);
      const link = folder && folder.links.find((l) => l.id === linkId);
      if (folder && link) editFolderLinkFlow(folder, link);
      return;
    }
    const deleteFolderLink = e.target.closest("[data-delete-folder-link]");
    if (deleteFolderLink) {
      const [folderId, linkId] = deleteFolderLink.getAttribute("data-delete-folder-link").split(":");
      const folder = state.data.folders.find((f) => f.id === folderId);
      const link = folder && folder.links.find((l) => l.id === linkId);
      if (folder && link) deleteFolderLinkFlow(folder, link);
      return;
    }

    if (e.target.closest("[data-add-reminder]")) return void addReminderFlow();
    const editReminder = e.target.closest("[data-edit-reminder]");
    if (editReminder) {
      const r = state.data.reminders.find((x) => x.id === editReminder.getAttribute("data-edit-reminder"));
      if (r) editReminderFlow(r);
      return;
    }
    const deleteReminder = e.target.closest("[data-delete-reminder]");
    if (deleteReminder) {
      const r = state.data.reminders.find((x) => x.id === deleteReminder.getAttribute("data-delete-reminder"));
      if (r) deleteReminderFlow(r);
      return;
    }

    if (e.target.closest("[data-add-note]")) return void addNoteFlow();
    const editNote = e.target.closest("[data-edit-note]");
    if (editNote) {
      const n = state.data.notes.find((x) => x.id === editNote.getAttribute("data-edit-note"));
      if (n) editNoteFlow(n);
      return;
    }
    const deleteNote = e.target.closest("[data-delete-note]");
    if (deleteNote) {
      const n = state.data.notes.find((x) => x.id === deleteNote.getAttribute("data-delete-note"));
      if (n) deleteNoteFlow(n);
      return;
    }
  });
}
