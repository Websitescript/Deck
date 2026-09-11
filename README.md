# Deck | New Tab

A personal new-tab page styled like Windows Terminal — but what you land
on is a real dashboard (quick-link tiles, folder cards, a mini calendar,
reminders and notes with clickable checkboxes), not a wall of text. The
full command line is still there — it opens as a popup over the dashboard
whenever you need it, for anything that doesn't have a click target yet.

No backend, no build step: open `index.html`, or host the folder anywhere
static (GitHub Pages, Netlify, or just a browser "custom new tab" extension
pointed at the file). It fills the whole browser tab by default; the
restore button (□) in the title bar shrinks it down to a smaller
floating window if you'd rather have that look.

## Getting started

1. Open `index.html` — you'll land on an empty dashboard since there's
   nothing in it yet. Click the `Deck | New Tab` tab (or the `>_
   Terminal` button) to open the command line.
2. Create your account: `login <username> <password>`
3. Type `/help` any time to see the full command list.

## Commands

**Account**
| Command | Does |
|---|---|
| `login <username> <password>` | create your account, or sign back in |
| `/logout` | lock the terminal again |
| `/edituser <new username>` | change your username |
| `/editpass <new password>` | change your password |

**Search**
| Command | Does |
|---|---|
| `/search <topic>` | Google search, opens a new tab |
| `/ytsearch <topic>` | YouTube search, opens a new tab |

**Quick links** — use these while in `cd /l` (the default context)
| Command | Does |
|---|---|
| `/addl <name> <url>` | add a quick link |
| `/editl <name>` | select a link — then use `/name`, `/url`, `/exit` |
| `/deletel <name>` | delete a quick link *(asks to confirm)* |
| `/openl <name>` | open a quick link |
| `/list /l` | list all quick links |

**Folders** — use these while in `cd /f`
| Command | Does |
|---|---|
| `/addf <folder> \| <name> <url> \| <name> <url> ...` | create a folder with links |
| `/editf <folder>` | select a folder — then `/name`, `/exit` (renames the folder itself) |
| `/editfd <folder> <name>` | select a link inside a folder — then `/name`, `/url`, `/delete`, `/exit` |
| `/deletef <folder>` | delete a folder and everything in it *(asks to confirm)* |
| `/openf <folder>` | open every link in a folder, each in a new tab |
| `/list /f` | list all folders and their links |

`cd /l` and `cd /f` set which directory the prompt shows you're in (a
visual cue, matching the rest of the terminal metaphor). Folder and link
names can have spaces without quotes — the terminal matches the longest
existing folder name it can find at the start of what you typed, so
`/editfd Dev Tools GitHub` correctly means "the GitHub link inside the
Dev Tools folder."

**Notes / saved links** *(a couple of extra commands added for this,
since the spec asked for "one of your own")*
| Command | Does |
|---|---|
| `/addnote <text>` | save a note or link |
| `/notes` | list saved notes, numbered |
| `/done <#>` | toggle a note done / not done |
| `/delnote <#>` | delete a note *(asks to confirm)* |

Each note (and each reminder, below) has a small **copy** button next to
it — copies just that item's text to your clipboard.

**Reminders**
| Command | Does |
|---|---|
| `/remind <text> \| <when>` | e.g. `/remind Renew domain \| tomorrow 9:00` |
| `/reminders` | list reminders, soonest first |
| `/remdone <#>` | toggle a reminder done / not done |
| `/remdel <#>` | delete a reminder *(asks to confirm)* |

`<when>` accepts: `2026-09-20`, `2026-09-20 14:00`, `today 18:00`,
`tomorrow`, `tomorrow 9:30`, or `in 2 hours` / `in 30 minutes` / `in 3 days`.

A reminder that comes due shows up in the terminal output and (if you've
allowed notifications) as a browser notification. This only works while a
"Deck | New Tab" tab is actually open somewhere — it's a plain
webpage, not a browser extension, so there's no background alarm that can
wake it up while every tab is closed. A reminder that came due while
nothing was open just shows up the next time you open a tab.

**File + session**
| Command | Does |
|---|---|
| `/linkfile` | link this terminal to a `.dashboard` file on disk |
| `/autosave on\|off` | write to the linked file after every change |
| `/save` | save right now |
| `/unlink` | stop using the linked file, go back to browser storage only |
| `/dashboard` | show/hide the pinned dashboard panel |
| `cls` | clear the screen |
| `/help` | show every command |

Locked out and forgot the shape of a command? `/help` always works, even
before logging in.

## The dashboard

Logging in shows the dashboard: a greeting header, four stat cards, quick
links as clickable tiles, folders as cards (with their links nested
inside — click the folder name to open everything in it), a mini
calendar (today highlighted, a dot on any day with an open reminder),
and reminders/notes with a checkbox you can click to mark done plus a
copy button on each. It updates itself automatically whenever the
underlying data changes.

The command line lives in a **popup** over the dashboard rather than a
separate page — click the `Deck | New Tab` tab up in the title bar,
or the **`>_ Terminal`** button next to the greeting, to open it. Inside,
`/dashboard` (or the **✕** in its corner, clicking outside it, or Esc)
closes it again. The dashboard is always what you land on — there's no
account yet on a first visit, so it'll be empty until you open the
terminal and run `login`.

## Reminders

`/remind <text> | <when>` creates one — see the REMINDERS section in
`/help` for the accepted `<when>` formats. When one comes due: it prints
in the terminal, shows a browser notification (if you've allowed them),
and plays three short beeps. The beeps use the Web Audio API directly —
no sound file — but browsers won't let a page play audio before you've
clicked or typed something on it at least once, so the very first
reminder in a fresh tab might arrive silently if you haven't interacted
with the page yet; everything after that plays normally.

## How data is saved

Everything (links, folders, notes, your account) lives in one JSON object.
It's always mirrored to the browser's `localStorage`, so the dashboard
works immediately with zero setup.

Run `/linkfile` to also save that same object to an actual `.dashboard`
file on your disk (put it in the same folder as `index.html` if you want
it to travel with the project). Browsers won't let a webpage read or write
files silently — `/linkfile` opens the browser's native "Save As" picker
once so you can create or choose that file, and from then on:

- If the file you pick already has dashboard data in it, that data is
  loaded immediately (this is how "get data from the file by default"
  works after the first link — point `/linkfile` at an existing
  `.dashboard` and it takes over).
- With autosave on (the default once linked), every change is written to
  that file right away, no extra command needed.
- The dashboard remembers the linked file across visits. If your browser
  ever needs you to re-confirm permission for it, the terminal will tell
  you to run `/linkfile` again to reconnect.

This only works in Chromium-based browsers (Chrome, Edge, Opera) — it uses
the File System Access API, which Firefox and Safari don't implement yet.
Everywhere else, the dashboard quietly falls back to `localStorage` only.

**On `login`:** this is a soft, local gate for your own use — there's no
server, so there's nothing to actually secure. The password is hashed
before it's stored (not kept in plain text), but anyone with access to
your `.dashboard` file or browser storage isn't meaningfully blocked by
it. Treat it as a "don't show this to whoever's glancing at my screen"
lock, not real account security.

## What changed from the old finance dashboard

This started as a market-data new-tab page. All of that is gone: the
markets ticker, the IPO watchlist, the two Python fetch scripts, their
scheduled GitHub Actions, and the JSON snapshots they wrote. What's left
(quick links, folders, saved notes) has been rebuilt around the terminal
and command set above.
