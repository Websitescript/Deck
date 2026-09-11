const term = {
  outputEl: null,
  inputEl: null,
  promptEl: null,

  init() {
    this.outputEl = document.getElementById("term-output");
    this.inputEl = document.getElementById("term-input");
    this.promptEl = document.getElementById("term-prompt");

    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = this.inputEl.value;
        this.inputEl.value = "";
        this.handleSubmit(raw);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.historyStep(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.historyStep(1);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.terminalOpen) this.closeTerminal();
    });

    // Delegated click handling for interactive bits printed into the output
    // or rendered in the dashboard — links, copy buttons, "open all" on a
    // folder, the done/not-done checkboxes on notes & reminders, and the
    // buttons that open/close the terminal popup.
    document.addEventListener("click", (e) => {
      const openTarget = e.target.closest("[data-open-url]");
      if (openTarget) {
        window.open(openTarget.getAttribute("data-open-url"), "_blank");
        return;
      }

      const copyTarget = e.target.closest("[data-copy-text]");
      if (copyTarget) {
        const original = copyTarget.textContent;
        copyToClipboard(copyTarget.getAttribute("data-copy-text")).then((ok) => {
          copyTarget.textContent = ok ? "copied" : "failed";
          copyTarget.classList.add(ok ? "copied" : "copy-failed");
          setTimeout(() => {
            copyTarget.textContent = original;
            copyTarget.classList.remove("copied", "copy-failed");
          }, 1200);
        });
        return;
      }

      const folderTarget = e.target.closest("[data-open-folder]");
      if (folderTarget) {
        commands.run(`/openf ${folderTarget.getAttribute("data-open-folder")}`);
        return;
      }

      const noteToggle = e.target.closest("[data-toggle-note]");
      if (noteToggle) {
        const note = state.data.notes.find((n) => n.id === noteToggle.getAttribute("data-toggle-note"));
        if (note) {
          toggleNoteDone(note);
          noteToggle.textContent = note.done ? "[x]" : "[ ]";
          const line = noteToggle.closest(".note-line, .dash-row");
          if (line) line.classList.toggle("muted", note.done);
        }
        return;
      }

      const remToggle = e.target.closest("[data-toggle-reminder]");
      if (remToggle) {
        const r = state.data.reminders.find((x) => x.id === remToggle.getAttribute("data-toggle-reminder"));
        if (r) {
          toggleReminderDone(r);
          const due = new Date(r.dueAt).getTime();
          const overdue = !r.done && due < Date.now();
          const soon = !r.done && !overdue && due - Date.now() < 24 * 3600000;
          remToggle.textContent = r.done ? "[x]" : overdue ? "[!]" : "[ ]";
          const line = remToggle.closest(".note-line, .dash-row");
          if (line) {
            line.classList.toggle("muted", r.done);
            line.classList.toggle("overdue", overdue);
            line.classList.toggle("soon", soon);
          }
        }
        return;
      }

      if (e.target.closest("[data-open-terminal]")) {
        this.openTerminal();
        return;
      }

      if (e.target.closest("[data-close-terminal]")) {
        this.closeTerminal();
        return;
      }

      // clicking the dimmed backdrop (not the popup itself) also closes it
      if (e.target.id === "termModalOverlay") this.closeTerminal();
    });

    // The line above handles this too (delegation), but the open/close
    // controls are critical enough — and always present in the page from
    // the start, never dynamically added — that they get their own direct
    // listeners as well. Belt and suspenders: if delegation ever fails to
    // catch a click for some reason, these still work independently.
    document.querySelectorAll("[data-open-terminal]").forEach((el) => {
      el.addEventListener("click", () => this.openTerminal());
    });
    const closeBtn = document.querySelector("[data-close-terminal]");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeTerminal());
    const overlay = document.getElementById("termModalOverlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeTerminal();
      });
    }
  },

  openTerminal() {
    state.terminalOpen = true;
    document.getElementById("termModalOverlay").hidden = false;
    document.body.classList.remove("collapsed");
    this.scrollToBottom();
    this.focusInput();
  },

  closeTerminal() {
    state.terminalOpen = false;
    document.getElementById("termModalOverlay").hidden = true;
  },

  focusInput() {
    this.inputEl.focus();
  },

  scrollToBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  },

  print(text, cls = "") {
    const div = document.createElement("div");
    div.className = `line${cls ? " " + cls : ""}`;
    div.textContent = text;
    this.outputEl.appendChild(div);
    this.scrollToBottom();
  },

  printOk(text) {
    this.print(text, "ok");
  },

  printError(text) {
    this.print(text, "err");
  },

  printMuted(text) {
    this.print(text, "muted");
  },

  // Only ever called with markup we built ourselves (never raw user text).
  printRaw(html, cls = "") {
    const div = document.createElement("div");
    div.className = `line${cls ? " " + cls : ""}`;
    div.innerHTML = html;
    this.outputEl.appendChild(div);
    this.scrollToBottom();
  },

  printLinkLine(index, name, url, indent = false) {
    const idx = index ? `<span class="idx">${index}.</span>` : "";
    const ind = indent ? " indent" : "";
    this.printRaw(
      `${idx}<img class="fav" src="${faviconFor(url)}" alt="" />` +
        `<span class="link-name" data-open-url="${escapeAttr(normalizeUrl(url))}">${escapeHtml(name)}</span>` +
        `<span class="link-url muted">${escapeHtml(url)}</span>`,
      `link-line${ind}`
    );
  },

  printNoteLine(index, note) {
    const box = note.done ? "[x]" : "[ ]";
    this.printRaw(
      `<span class="idx">${index}.</span>` +
        `<span class="note-box" data-toggle-note="${escapeAttr(note.id)}">${box}</span>` +
        `<span class="note-text">${escapeHtml(note.text)}</span>` +
        `<button type="button" class="copy-btn" data-copy-text="${escapeAttr(note.text)}">copy</button>`,
      `note-line${note.done ? " muted" : ""}`
    );
  },

  printReminderLine(index, reminder) {
    const due = new Date(reminder.dueAt).getTime();
    const overdue = !reminder.done && due < Date.now();
    const soon = !reminder.done && !overdue && due - Date.now() < 24 * 3600000;
    const urgency = reminder.done ? " muted" : overdue ? " overdue" : soon ? " soon" : "";
    const box = reminder.done ? "[x]" : overdue ? "[!]" : "[ ]";
    this.printRaw(
      `<span class="idx">${index}.</span>` +
        `<span class="note-box" data-toggle-reminder="${escapeAttr(reminder.id)}">${box}</span>` +
        `<span class="note-text">${escapeHtml(reminder.text)}</span>` +
        `<span class="rem-when">${escapeHtml(formatDue(reminder.dueAt))}</span>` +
        `<button type="button" class="copy-btn" data-copy-text="${escapeAttr(reminder.text)}">copy</button>`,
      `note-line${urgency}`
    );
  },

  echo(raw) {
    this.printRaw(
      `<span class="echo-prompt">${escapeHtml(this.promptEl.textContent)}</span> <span class="echo-cmd">${escapeHtml(raw)}</span>`,
      "echo"
    );
  },

  clear() {
    this.outputEl.innerHTML = "";
  },

  updatePrompt() {
    const user = state.data && state.data.auth ? state.data.auth.username : "guest";
    const path = state.mode === "folder" ? "folders" : "links";
    this.promptEl.textContent = `PS C:\\Users\\${user}\\Dashboard\\${path}>`;
  },

  handleSubmit(raw) {
    this.echo(raw);
    if (raw.trim()) {
      state.history.push(raw);
      state.historyIdx = state.history.length;
    }
    if (state.pendingConfirm) {
      commands.resolveConfirm(raw);
      return;
    }
    if (!raw.trim()) return;
    commands.run(raw.trim());
  },

  historyStep(dir) {
    if (!state.history.length) return;
    state.historyIdx = Math.max(0, Math.min(state.history.length, state.historyIdx + dir));
    this.inputEl.value = state.history[state.historyIdx] || "";
    // place caret at the end
    requestAnimationFrame(() => {
      this.inputEl.selectionStart = this.inputEl.selectionEnd = this.inputEl.value.length;
    });
  },
};

// Safety net only — everything in this file calls term.openTerminal() /
// term.closeTerminal(). These bare aliases exist purely so a stale cached
// copy of some other file (or a browser extension, or anything else)
// calling a bare openTerminal()/closeTerminal() can't throw.
window.openTerminal = () => term.openTerminal();
window.closeTerminal = () => term.closeTerminal();
