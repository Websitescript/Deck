// This only fires while a "Deck | New Tab" tab is actually open
// somewhere — it's a plain webpage, not a browser extension, so there's
// no background/service-worker alarm that can wake it up. A reminder that
// comes due while every tab is closed just shows up (and notifies) the
// next time one is opened, via the immediate checkReminders() call in boot().
function ensureNotificationPermission() {
  if (window.Notification && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

// Browsers won't let a page play audio until the user has interacted with
// it at least once, so the AudioContext is created lazily on the first
// click/keydown anywhere on the page and reused after that.
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

// Three short beeps — no audio file needed, just a couple of oscillator
// tones. If the page hasn't been interacted with yet (so audioCtx never
// unlocked), this just quietly does nothing; the terminal line and
// Notification still fire either way.
function playAlarmSound() {
  if (!audioCtx) unlockAudio();
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [0, 0.3, 0.6].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
  } catch {
    /* Web Audio failed for some other reason — not critical, skip the sound */
  }
}

function checkReminders() {
  if (!state.loggedIn || !state.data) return;
  const now = Date.now();
  let changed = false;

  state.data.reminders.forEach((r) => {
    if (!r.done && !r.notified && new Date(r.dueAt).getTime() <= now) {
      r.notified = true;
      changed = true;
      term.print(`⏰ Reminder: ${r.text}`, "due-alert");
      playAlarmSound();
      if (window.Notification && Notification.permission === "granted") {
        new Notification("Reminder", { body: r.text });
      }
    }
  });

  if (changed) saveState();
}

setInterval(checkReminders, 30000);
