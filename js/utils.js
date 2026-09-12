function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Same as escapeHtml but also safe to sit inside a "..." HTML attribute.
function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

function normalizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

function faviconFor(url) {
  try {
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
  } catch {
    return "";
  }
}

// Splits "cmd rest of the line" into ["cmd", "rest of the line"].
function splitFirst(raw) {
  const m = raw.match(/^(\S+)(?:\s+([\s\S]*))?$/);
  if (!m) return [raw, ""];
  return [m[1], m[2] || ""];
}

// Tokenizes a string, honoring "quoted phrases" and 'single quoted' as one token.
function tokenize(str) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

// For "<name...> <url>" style commands: the URL is always the last token,
// everything before it (space-joined) is the name. Quotes are optional.
function parseNameUrl(remainder) {
  const tokens = tokenize(remainder.trim());
  if (tokens.length < 2) return null;
  const url = tokens[tokens.length - 1];
  const name = tokens.slice(0, -1).join(" ");
  if (!name) return null;
  return { name, url: normalizeUrl(url) };
}

// Not real security — there's no server and no secret to protect. This just
// keeps a password out of plain sight in the .dashboard file. SHA-256 when
// available (needs a secure context), a small fallback hash otherwise so
// login still works when the dashboard is opened straight from disk.
async function hashPass(str) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return "sha256:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      /* fall through to the plain fallback below */
    }
  }
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return "fnv:" + (h >>> 0).toString(16);
}

// navigator.clipboard needs a secure context (https, or a served localhost)
// and isn't available at all from a plain file:// page in every browser, so
// fall back to the old textarea + execCommand trick rather than failing silently.
async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the fallback below */
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Parses the "<when>" half of /remind. Supports:
//   "in 2 hours" / "in 30 minutes" / "in 3 days"
//   "today 18:00" / "tomorrow" / "tomorrow 9:30"  (default time 09:00)
//   "2026-09-20" / "2026-09-20 14:00"
// Returns a Date, or null if none of these patterns match.
function parseWhen(text) {
  const t = text.trim().toLowerCase();
  const now = new Date();

  let m = t.match(/^in\s+(\d+)\s*(minute|min|hour|hr|day)s?$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    const ms = unit.startsWith("min") ? n * 60000 : unit.startsWith("hour") || unit === "hr" ? n * 3600000 : n * 86400000;
    return new Date(now.getTime() + ms);
  }

  m = t.match(/^(today|tomorrow)(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const d = new Date(now);
    if (m[1] === "tomorrow") d.setDate(d.getDate() + 1);
    d.setHours(m[2] ? parseInt(m[2], 10) : 9, m[3] ? parseInt(m[3], 10) : 0, 0, 0);
    return d;
  }

  m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2}):(\d{2}))?$/);
  if (m) {
    const [, y, mo, da, hh, mi] = m;
    return new Date(Number(y), Number(mo) - 1, Number(da), hh ? Number(hh) : 9, mi ? Number(mi) : 0, 0, 0);
  }

  return null;
}

// Human-friendly rendering of a reminder's due time for listings.
function formatDue(dueAt) {
  const d = new Date(dueAt);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  if (d.toDateString() === now.toDateString()) return `today ${hh}:${mi}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${hh}:${mi}`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${hh}:${mi}`;
}

// Converts a stored ISO dueAt back into a "YYYY-MM-DD HH:MM" string —
// the one parseWhen() format that round-trips losslessly, so editing a
// reminder always starts from something parseWhen can read back in,
// regardless of how the original "when" was phrased.
function isoToInputWhen(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A small, dependency-free status message that appears briefly at the
// bottom of the screen. Used on both pages for things like "can't close
// this" or save errors — plain DOM show/hide, not a dialog, so there's
// nothing to get stuck open.
function showToast(text) {
  let toast = document.getElementById("app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "app-toast";
    toast.className = "app-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}
