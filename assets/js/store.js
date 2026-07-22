const STORAGE_KEY = "ffxiv-frontline-analytics-v1";
const DATABASE_NAME = "ffxiv-frontline-analytics";
const DATABASE_VERSION = 1;
const MATCH_STORE = "matches";
const META_STORE = "meta";
const MIGRATION_KEY = "local-storage-migration-v1";

const Store = {
  db: null,
  mode: "indexeddb",

  async init() {
    if (!window.indexedDB) {
      this.mode = "localstorage";
      return this.loadLegacy();
    }

    try {
      this.db = await openDatabase();
      await this.migrateLegacyData();
      return this.load();
    } catch (error) {
      console.warn("IndexedDBを利用できないためlocalStorageへ切り替えます。", error);
      this.mode = "localstorage";
      this.db = null;
      return this.loadLegacy();
    }
  },

  async load() {
    if (this.mode === "localstorage") return this.loadLegacy();
    const matches = await requestResult(this.db.transaction(MATCH_STORE).objectStore(MATCH_STORE).getAll());
    return prepareMatches(matches).sort((a, b) => (a.matchNo || 0) - (b.matchNo || 0));
  },

  async add(matches) {
    const prepared = prepareMatches(matches);
    if (!prepared.length) return;
    if (this.mode === "localstorage") {
      const current = this.loadLegacy();
      this.saveLegacy([...current, ...prepared]);
      return;
    }
    await writeMatches(this.db, prepared, false);
  },

  async replaceAll(matches) {
    const prepared = prepareMatches(matches);
    if (this.mode === "localstorage") {
      this.saveLegacy(prepared);
      return prepared;
    }
    await writeMatches(this.db, prepared, true);
    return prepared;
  },

  async clear() {
    if (this.mode === "localstorage") {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    const transaction = this.db.transaction(MATCH_STORE, "readwrite");
    transaction.objectStore(MATCH_STORE).clear();
    await transactionDone(transaction);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  },

  loadLegacy() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.matches) ? prepareMatches(parsed.matches) : [];
    } catch {
      return [];
    }
  },

  saveLegacy(matches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, matches }));
  },

  async migrateLegacyData() {
    const migrated = await requestResult(this.db.transaction(META_STORE).objectStore(META_STORE).get(MIGRATION_KEY));
    if (migrated?.complete) return;

    const legacyMatches = this.loadLegacy();
    const existingCount = await requestResult(this.db.transaction(MATCH_STORE).objectStore(MATCH_STORE).count());
    if (legacyMatches.length && existingCount === 0) {
      await writeMatches(this.db, legacyMatches, false);
    }

    const transaction = this.db.transaction(META_STORE, "readwrite");
    transaction.objectStore(META_STORE).put({ key: MIGRATION_KEY, complete: true, migratedAt: new Date().toISOString() });
    await transactionDone(transaction);
    localStorage.removeItem(STORAGE_KEY);
  }
};

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MATCH_STORE)) {
        const matches = db.createObjectStore(MATCH_STORE, { keyPath: "id" });
        matches.createIndex("matchNo", "matchNo", { unique: false });
        matches.createIndex("date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDBを開けませんでした。"));
    request.onblocked = () => reject(new Error("別のタブがデータベースを使用しています。ほかのタブを閉じて再読み込みしてください。"));
  });
}

function writeMatches(db, matches, replace) {
  const transaction = db.transaction(MATCH_STORE, "readwrite");
  const store = transaction.objectStore(MATCH_STORE);
  if (replace) store.clear();
  matches.forEach(match => store.put(match));
  return transactionDone(transaction);
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("保存データを読み込めませんでした。"));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("戦績データを保存できませんでした。"));
    transaction.onabort = () => reject(transaction.error || new Error("戦績データの保存が中断されました。"));
  });
}

function prepareMatches(matches) {
  const usedIds = new Set();
  let nextMatchNo = matches.reduce((max, match) => Math.max(max, Number(match?.matchNo) || 0), 0) + 1;
  return matches.map((match, index) => {
    const currentNo = Number(match?.matchNo);
    const matchNo = currentNo > 0 ? currentNo : nextMatchNo++;
    let id = String(match?.id || "").trim();
    if (!id || usedIds.has(id)) id = createMatchId(index);
    usedIds.add(id);
    return { ...match, id, matchNo };
  });
}

function createMatchId(index) {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}
