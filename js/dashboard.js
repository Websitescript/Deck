// Renders the full dashboard view — greeting header, stat cards, quick-link
// tiles, folder cards, a mini calendar, and reminders/notes with clickable
// done-checkboxes. Called from saveState() (see state.js) so it stays
// current, plus once explicitly right after login where state changes
// without going through saveState().
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
            `<div class="link-tile" data-open-url="${escapeAttr(normalizeUrl(l.url))}">` +
            `<img src="${faviconFor(l.url)}" alt="" /><span>${escapeHtml(l.name)}</span></div>`
        )
        .join("")
    : `<div class="dash-empty">No quick links yet — open the terminal and try /addl.</div>`;
}

function renderDashFolders() {
  const el = document.getElementById("dash-folders-body");
  const folders = state.data.folders;
  el.innerHTML = folders.length
    ? folders
        .map((f) => {
          const rows = f.links.length
            ? f.links
                .map(
                  (l) =>
                    `<div class="dash-row indent"><img class="fav" src="${faviconFor(l.url)}" alt="" />` +
                    `<span class="dash-link" data-open-url="${escapeAttr(normalizeUrl(l.url))}">${escapeHtml(l.name)}</span></div>`
                )
                .join("")
            : `<div class="dash-empty indent">empty</div>`;
          return (
            `<div class="folder-card">` +
            `<div class="folder-head"><span class="dash-link" data-open-folder="${escapeAttr(f.name)}">📁 ${escapeHtml(f.name)}</span>` +
            `<span class="dash-count muted">${f.links.length}</span></div>${rows}</div>`
          );
        })
        .join("")
    : `<div class="dash-empty">No folders yet — open the terminal and try /addf.</div>`;
}

function renderDashReminders() {
  const el = document.getElementById("dash-reminders-body");
  const reminders = [...state.data.reminders].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  el.innerHTML = reminders.length
    ? reminders.map(dashReminderRow).join("")
    : `<div class="dash-empty">Nothing set — open the terminal and try /remind.</div>`;
}

function renderDashNotes() {
  const el = document.getElementById("dash-notes-body");
  const notes = state.data.notes;
  el.innerHTML = notes.length
    ? notes.map(dashNoteRow).join("")
    : `<div class="dash-empty">No notes yet — open the terminal and try /addnote.</div>`;
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
    `<button type="button" class="copy-btn" data-copy-text="${escapeAttr(r.text)}">copy</button></div>`
  );
}

function dashNoteRow(n) {
  const box = n.done ? "[x]" : "[ ]";
  return (
    `<div class="dash-row${n.done ? " muted" : ""}">` +
    `<span class="note-box" data-toggle-note="${escapeAttr(n.id)}">${box}</span>` +
    `<span class="dash-text">${escapeHtml(n.text)}</span>` +
    `<button type="button" class="copy-btn" data-copy-text="${escapeAttr(n.text)}">copy</button></div>`
  );
}

// A compact current-month calendar with a dot on any day that has an
// open (not-done) reminder due, and today's date highlighted.
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

  let cells = "";
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const cls = (d === now.getDate() ? " today" : "") + (dueDays.has(d) ? " has-reminder" : "");
    cells += `<div class="cal-cell${cls}">${d}</div>`;
  }

  body.innerHTML =
    `<div class="cal-weekdays"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>` +
    `<div class="cal-grid">${cells}</div>`;
}
