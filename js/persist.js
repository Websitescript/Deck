// Two storage layers:
//  - localStorage: always used, instant, works in every browser.
//  - a linked .dashboard file on disk: opt-in via /linkfile, only in
//    browsers that support the File System Access API (Chrome/Edge/Opera).
// The file handle itself is remembered across visits in IndexedDB so the
// dashboard can offer to reconnect without the user re-picking the file
// every time (the browser still gates the actual read/write on permission).

const persist = {
  supportsFS: "showSaveFilePicker" in window,

  loadLocal() {
    try {
      const raw = localStorage.getItem(CONFIG.LS_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveLocal(data) {
    try {
      localStorage.setItem(CONFIG.LS_DATA_KEY, JSON.stringify(data));
    } catch {
      /* storage full or disabled — the in-file copy (if linked) still holds */
    }
  },

  openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(CONFIG.IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async loadHandle() {
    if (!this.supportsFS) return null;
    try {
      const db = await this.openDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(CONFIG.IDB_STORE, "readonly");
        const req = tx.objectStore(CONFIG.IDB_STORE).get(CONFIG.IDB_HANDLE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async saveHandle(handle) {
    try {
      const db = await this.openDb();
      const tx = db.transaction(CONFIG.IDB_STORE, "readwrite");
      tx.objectStore(CONFIG.IDB_STORE).put(handle, CONFIG.IDB_HANDLE_KEY);
    } catch {
      /* not fatal — the file just won't auto-reconnect next visit */
    }
  },

  async clearHandle() {
    try {
      const db = await this.openDb();
      const tx = db.transaction(CONFIG.IDB_STORE, "readwrite");
      tx.objectStore(CONFIG.IDB_STORE).delete(CONFIG.IDB_HANDLE_KEY);
    } catch {
      /* nothing to clean up */
    }
  },

  async readFromHandle(handle) {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    return JSON.parse(text);
  },

  async writeToHandle(handle, data) {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  },
};
