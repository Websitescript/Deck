// Constants + the shape of a fresh dashboard. No backend, no fetched
// data — everything here lives in the .dashboard file / browser storage.
const CONFIG = {
  APP_NAME: "Terminal | New Tab",
  VERSION: "1.2",
  LS_DATA_KEY: "terminal.newtab.data",
  LS_LOGIN_KEY: "terminal.newtab.loggedIn",
  IDB_NAME: "terminal-newtab",
  IDB_STORE: "handles",
  IDB_HANDLE_KEY: "dashboardFile",
  FILE_SUGGESTED_NAME: ".dashboard",
};

function defaultData() {
  return {
    version: 1,
    auth: null,
    autosave: true,
    links: [
      { id: uid(), name: "Gmail", url: "https://mail.google.com/" },
      { id: uid(), name: "GitHub", url: "https://github.com/" },
    ],
    folders: [
      {
        id: uid(),
        name: "AI Chatbots",
        links: [
          { id: uid(), name: "Claude", url: "https://claude.ai/" },
          { id: uid(), name: "ChatGPT", url: "https://chatgpt.com/" },
          { id: uid(), name: "Gemini", url: "https://gemini.google.com/" },
        ],
      },
    ],
    notes: [],
    reminders: [],
  };
}
