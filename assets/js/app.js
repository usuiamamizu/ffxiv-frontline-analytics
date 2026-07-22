const App = {
  state: { matches: [] },
  rawMatches: [],
  storageIssues: [],
  async init() {
    this.rawMatches = await Store.init();
    const stored = reviewStoredMatches(this.rawMatches);
    this.state.matches = stored.matches;
    this.storageIssues = stored.issues;
    this.bindTabs();
    this.bindDataActions();
    this.bindMatchDetails();
    UI.render(this.state);
    if (this.storageIssues.length) {
      setCsvStatus(`保存済みデータに${this.storageIssues.length}件の問題があります。データは削除していません。JSONバックアップを保存して内容を確認してください。\n${this.storageIssues.slice(0, 3).join("\n")}`);
    } else {
      setCsvStatus(Store.mode === "indexeddb"
        ? "戦績データはこのブラウザ内に保存されます。初回登録も追加登録も「CSV読み込み」を使用します。"
        : "IndexedDBを利用できないため、互換保存モードで動作しています。JSONバックアップを定期的に保存してください。");
    }
    window.addEventListener("resize", debounce(() => UI.redrawCharts(this.state), 150));
  },
  bindTabs() {
    const tabs = [...document.querySelectorAll(".tab")];
    tabs.forEach((tab, index) => {
      const selected = tab.classList.contains("active");
      if (!tab.id) tab.id = `tab-${tab.dataset.tab}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", tab.dataset.tab);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      tab.addEventListener("click", () => this.openTab(tab.dataset.tab));
      tab.addEventListener("keydown", event => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        const nextIndex = event.key === "Home" ? 0
          : event.key === "End" ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        this.openTab(tabs[nextIndex].dataset.tab, { focus: true });
      });
    });
    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `tab-${panel.id}`);
      panel.hidden = !panel.classList.contains("active");
    });
    document.addEventListener("click", event => {
      const trigger = event.target.closest?.("[data-open-tab]");
      if (trigger) this.openTab(trigger.dataset.openTab);
    });
  },
  openTab(tabId, options = {}) {
    const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const panel = document.querySelector(`#${tabId}`);
    if (!tab || !panel) return;
    document.querySelectorAll(".tab").forEach(element => {
      element.classList.remove("active");
      element.setAttribute("aria-selected", "false");
      element.tabIndex = -1;
    });
    document.querySelectorAll(".tab-panel").forEach(element => {
      element.classList.remove("active");
      element.hidden = true;
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    tab.tabIndex = 0;
    panel.classList.add("active");
    panel.hidden = false;
    if (options.focus) tab.focus();
    requestAnimationFrame(() => UI.redrawCharts(this.state));
  },
  bindMatchDetails() {
    const dialog = document.querySelector("#matchDetailDialog");
    if (!dialog) return;
    document.addEventListener("click", event => {
      const record = event.target.closest?.("[data-match-id]");
      if (record) this.openMatchDetail(record.dataset.matchId, record);
      if (event.target.closest?.("[data-close-match-detail]")) dialog.close();
      const navigation = event.target.closest?.("[data-match-nav]");
      if (navigation && !navigation.disabled) this.moveMatchDetail(navigation.dataset.matchNav);
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (this.matchDetailTrigger?.isConnected) this.matchDetailTrigger.focus();
      this.matchDetailTrigger = null;
    });
  },
  openMatchDetail(matchId, trigger = null) {
    const matches = Analytics.byDate(this.state.matches);
    const index = matches.findIndex(match => String(match.id) === String(matchId));
    if (index < 0) return;
    const dialog = document.querySelector("#matchDetailDialog");
    this.matchDetailIndex = index;
    this.matchDetailTrigger = trigger || this.matchDetailTrigger;
    document.querySelector("#matchDetailBody").innerHTML = matchDetailContent(matches[index]);
    document.querySelector("#matchDetailTitle").textContent = `試合 No.${matches[index].matchNo || index + 1}`;
    document.querySelector("#matchDetailPosition").textContent = `${index + 1} / ${matches.length}`;
    dialog.querySelector('[data-match-nav="previous"]').disabled = index === 0;
    dialog.querySelector('[data-match-nav="next"]').disabled = index === matches.length - 1;
    if (!dialog.open) dialog.showModal();
  },
  moveMatchDetail(direction) {
    const matches = Analytics.byDate(this.state.matches);
    const offset = direction === "previous" ? -1 : 1;
    const match = matches[this.matchDetailIndex + offset];
    if (match) this.openMatchDetail(match.id);
  },
  bindDataActions() {
    document.querySelector("#importCsv").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          if (this.storageIssues.length) {
            throw new Error("保存済みデータに問題があるため追加できません。先にJSONバックアップを保存し、正常なJSONを復元してください。");
          }
          const imported = parseMatchesCsv(reader.result);
          const result = mergeImportedMatches(this.state.matches, imported);
          await Store.add(result.addedMatches);
          this.state.matches = result.matches;
          this.rawMatches = result.matches;
          UI.render(this.state);
          setCsvStatus(`CSV読み込み完了：${result.added}件追加 / ${result.skipped}件重複を除外。合計${this.state.matches.length}件です。`);
        } catch (error) {
          setCsvStatus(error.message || "CSVの読み込みに失敗しました。");
        } finally {
          event.target.value = "";
        }
      };
      reader.readAsText(file, "utf-8");
    });
    document.querySelector("#downloadCsvTemplate").addEventListener("click", () => {
      const header = "Date,Time,Map,GrandCompany,Rank,Job,KO,Down,Assists,Damage,DamageTaken,Healing,TopDamage\n";
      const sample = "2026-07-04,20:03,ウォーコー・チーテ (演習戦),不滅隊,3,踊り子,6,0,37,886484,465756,807903,1\n";
      downloadText("ffxiv-frontline-chatgpt-template.csv", header + sample, "text/csv");
    });
    document.querySelector("#exportJson").addEventListener("click", () => {
      const matches = this.storageIssues.length ? this.rawMatches : this.state.matches;
      downloadText("ffxiv-frontline-records.json", JSON.stringify({ version: 1, matches }, null, 2), "application/json");
    });
    document.querySelector("#importJson").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result);
          const sourceMatches = Array.isArray(parsed.matches) ? parsed.matches : parsed;
          if (!Array.isArray(sourceMatches)) throw new Error("JSON内に戦績データがありません。");
          const matches = normalizeJsonMatches(sourceMatches);
          const storedMatches = await Store.replaceAll(matches);
          this.state.matches = storedMatches;
          this.rawMatches = storedMatches;
          this.storageIssues = [];
          UI.render(this.state);
          setCsvStatus(`JSONバックアップから${matches.length}件を復元しました。`);
        } catch (error) {
          setCsvStatus(error.message || "JSONバックアップの復元に失敗しました。");
        } finally {
          event.target.value = "";
        }
      };
      reader.readAsText(file);
    });
    document.querySelector("#clearData").addEventListener("click", async () => {
      if (!confirm("保存済みの全戦績データを削除します。よろしいですか？")) return;
      try {
        this.state.matches = await Store.clear();
        this.rawMatches = [];
        this.storageIssues = [];
        UI.render(this.state);
        setCsvStatus("保存済みの戦績データをすべて削除しました。");
      } catch (error) {
        setCsvStatus(error.message || "戦績データを削除できませんでした。");
      }
    });
  }
};

function parseMatchesCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSVに戦績データの行がありません。");
  const headers = rows[0].map(normalizeHeader);
  validateCsvHeaders(headers);
  const imported = [];
  const errors = [];
  rows.slice(1).forEach((row, index) => {
    if (!row.some(cell => String(cell || "").trim())) return;
    try {
      imported.push(normalizeCsvMatch(rowToObject(headers, row), index + 2));
    } catch (error) {
      errors.push(error.message);
    }
  });
  if (errors.length) throw importErrors("CSVを読み込めません。", errors);
  if (!imported.length) throw new Error("CSVに読み込める戦績データがありません。");
  return imported;
}

function validateCsvHeaders(headers) {
  const required = ["date", "map", "grandCompany", "rank", "job", "kills", "deaths", "assists", "damage", "damageTaken", "healing", "topDamage"];
  const missing = required.filter(header => !headers.includes(header));
  if (missing.length) throw new Error(`CSVの必須列が不足しています：${missing.map(fieldLabel).join("、")}`);
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicates.length) throw new Error(`CSVに同じ列が複数あります：${[...new Set(duplicates)].map(fieldLabel).join("、")}`);
}

function mergeImportedMatches(currentMatches, importedMatches) {
  const existingKeys = new Set(currentMatches.map(matchKey));
  const matches = [...currentMatches];
  let nextMatchNo = getNextMatchNo(matches);
  let added = 0;
  let skipped = 0;

  for (const match of importedMatches) {
    const key = matchKey(match);
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    const stored = {
      ...match,
      matchNo: nextMatchNo
    };
    nextMatchNo += 1;
    existingKeys.add(key);
    matches.push(stored);
    added += 1;
  }

  matches.sort((a, b) => (a.matchNo || 0) - (b.matchNo || 0));
  return { matches, addedMatches: matches.slice(matches.length - added), added, skipped };
}

function normalizeJsonMatches(sourceMatches) {
  const usedIds = new Set();
  const matches = [];
  const errors = [];
  sourceMatches.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`JSONの${index + 1}件目：試合データの形式ではありません。`);
      return;
    }
    try {
      const match = normalizeMatchRecord(record, index + 1, "JSON", true);
      if (usedIds.has(match.id)) match.id = createImportedId(index);
      usedIds.add(match.id);
      matches.push(match);
    } catch (error) {
      errors.push(error.message);
    }
  });
  if (errors.length) throw importErrors("JSONを復元できません。", errors);
  return matches;
}

function reviewStoredMatches(sourceMatches) {
  const matches = [];
  const issues = [];
  const usedIds = new Set();
  sourceMatches.forEach((record, index) => {
    try {
      const match = normalizeMatchRecord(record, index + 1, "保存データ", true);
      if (usedIds.has(match.id)) throw new Error(`保存データの${index + 1}件目：IDが重複しています。`);
      usedIds.add(match.id);
      matches.push(match);
    } catch (error) {
      issues.push(error.message);
    }
  });
  return { matches, issues };
}

function getNextMatchNo(matches) {
  const maxNo = matches.reduce((max, match, index) => {
    const no = Number(match.matchNo) || index + 1;
    return Math.max(max, no);
  }, 0);
  return maxNo + 1;
}

function matchKey(match) {
  return [
    match.date,
    match.time,
    match.map,
    match.grandCompany,
    match.rank,
    match.job,
    match.kills,
    match.deaths,
    match.assists,
    match.damage,
    match.damageTaken,
    match.healing,
    match.topDamage ? 1 : 0
  ].join("|");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  if (inQuotes) throw new Error("CSVの引用符（\"）が閉じられていません。");
  return rows.filter(item => item.some(cellValue => String(cellValue || "").trim()));
}

function rowToObject(headers, row) {
  return headers.reduce((record, header, index) => {
    if (header) record[header] = cleanCell(row[index]);
    return record;
  }, {});
}

function normalizeCsvMatch(record, rowNumber) {
  return normalizeMatchRecord(record, rowNumber, "CSV", false);
}

function normalizeMatchRecord(record, rowNumber, source, preserveIdentity) {
  const raw = Object.fromEntries(Object.entries(record).map(([key, value]) => [key, cleanCell(value)]));
  const match = {
    id: preserveIdentity ? raw.id || createImportedId(rowNumber) : createImportedId(rowNumber),
    matchNo: preserveIdentity ? toPositiveInteger(record.matchNo, rowNumber) : undefined,
    date: normalizeDate(raw.date),
    time: normalizeTime(raw.time),
    map: resolveMap(raw.map),
    grandCompany: resolveKnownValue(raw.grandCompany, FFXIV_DATA.grandCompanies),
    rank: toNumber(raw.rank),
    job: resolveJob(raw.job),
    kills: toNumber(raw.kills),
    deaths: toNumber(raw.deaths),
    assists: toNumber(raw.assists),
    damage: toNumber(raw.damage),
    damageTaken: toNumber(raw.damageTaken),
    healing: toNumber(raw.healing),
    topDamage: normalizeBoolean(record.topDamage)
  };
  validateMatch(match, raw, rowNumber, source, preserveIdentity);
  return match;
}

function validateMatch(match, raw, rowNumber, source, preserveIdentity) {
  const errors = [];
  if (!isRealDate(match.date)) errors.push("日付は実在するYYYY-MM-DD形式で入力してください");
  if (raw.time && !match.time) errors.push("時間はHH:MMまたはHH:MM:SS形式で入力してください");
  if (!match.map) errors.push(`未対応のマップです「${safeInput(raw.map)}」`);
  if (!match.grandCompany) errors.push(`所属勢力は黒渦団・双蛇党・不滅隊から指定してください「${safeInput(raw.grandCompany)}」`);
  if (!match.job) errors.push(`未対応のジョブです「${safeInput(raw.job)}」`);
  if (!Number.isInteger(match.rank) || match.rank < 1 || match.rank > 3) errors.push("順位は1・2・3のいずれかで入力してください");
  ["kills", "deaths", "assists", "damage", "damageTaken", "healing"].forEach(key => {
    if (!Number.isInteger(match[key]) || match[key] < 0) errors.push(`${fieldLabel(key)}は0以上の整数で入力してください`);
  });
  if (typeof match.topDamage !== "boolean") errors.push("与ダメ1位は1/0、true/false、○/-のいずれかで入力してください");
  if (preserveIdentity && (!Number.isInteger(match.matchNo) || match.matchNo < 1)) errors.push("試合No.は1以上の整数で入力してください");
  if (errors.length) {
    const position = source === "CSV" ? `${rowNumber}行目` : `${rowNumber}件目`;
    throw new Error(`${source}の${position}：${errors.join("、")}`);
  }
}

function createImportedId(index) {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}

function normalizeHeader(header) {
  const key = String(header || "").trim().toLowerCase().replace(/[\s_－ー-]/g, "");
  const aliases = {
    date: "date",
    day: "date",
    日付: "date",
    time: "time",
    時間: "time",
    map: "map",
    マップ: "map",
    grandcompany: "grandCompany",
    gc: "grandCompany",
    所属勢力: "grandCompany",
    勢力: "grandCompany",
    rank: "rank",
    順位: "rank",
    job: "job",
    ジョブ: "job",
    kills: "kills",
    kill: "kills",
    knockout: "kills",
    ko: "kills",
    k: "kills",
    ノックアウト: "kills",
    deaths: "deaths",
    death: "deaths",
    down: "deaths",
    d: "deaths",
    ダウン: "deaths",
    assists: "assists",
    assist: "assists",
    a: "assists",
    アシスト: "assists",
    damage: "damage",
    与ダメ: "damage",
    与ダメージ: "damage",
    戦与ダメージ: "damage",
    damagetaken: "damageTaken",
    被ダメ: "damageTaken",
    被ダメージ: "damageTaken",
    healing: "healing",
    heal: "healing",
    回復: "healing",
    回復量: "healing",
    topdamage: "topDamage",
    与ダメ1位: "topDamage",
    与ダメージ1位: "topDamage"
  };
  return aliases[key] || key;
}

function cleanCell(value) {
  return String(value ?? "").trim();
}

function normalizeDate(value) {
  const text = cleanCell(value);
  const match = text.match(/^(20\d{2})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})(?:日)?$/);
  if (!match) return text;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeTime(value) {
  const text = cleanCell(value);
  if (!text) return "";
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? null : Number(match[3]);
  if (hour > 23 || minute > 59 || (second !== null && second > 59)) return "";
  const normalized = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return second === null ? normalized : `${normalized}:${String(second).padStart(2, "0")}`;
}

function isRealDate(value) {
  const match = cleanCell(value).match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function resolveMap(value) {
  const aliases = {
    外縁遺跡群: "外縁遺跡群 (制圧戦)",
    外縁遺跡群制圧戦: "外縁遺跡群 (制圧戦)",
    シールロック: "シールロック (争奪戦)",
    シールロック争奪戦: "シールロック (争奪戦)",
    フィールドオブグローリー: "フィールド・オブ・グローリー (砕氷戦)",
    フィールドオブグローリー砕氷戦: "フィールド・オブ・グローリー (砕氷戦)",
    オンサルハカイル: "オンサル・ハカイル (終節戦)",
    オンサルハカイル終節戦: "オンサル・ハカイル (終節戦)",
    ウォーコーチーテ: "ウォーコー・チーテ (演習戦)",
    ウォーコーチーテ演習戦: "ウォーコー・チーテ (演習戦)"
  };
  const key = normalizeLookupKey(value);
  if (!key) return "";
  const exact = FFXIV_DATA.maps.find(item => normalizeLookupKey(item) === key);
  return exact || aliases[key] || "";
}

function resolveKnownValue(value, candidates) {
  const key = normalizeLookupKey(value);
  if (!key) return "";
  return candidates.find(item => normalizeLookupKey(item) === key) || "";
}

function normalizeLookupKey(value) {
  return cleanCell(value).normalize("NFKC").replace(/[\s・･()（）・\-‐‑–—]/g, "").toLowerCase();
}

function resolveJob(value) {
  const text = cleanCell(value);
  const upper = text.toUpperCase();
  const found = FFXIV_DATA.jobs.find(job => job.id.toUpperCase() === upper || job.name === text);
  return found ? found.id : "";
}

function toNumber(value) {
  const normalized = cleanCell(value).replace(/[,，]/g, "").replace(/位/g, "");
  if (!normalized) return NaN;
  return Number(normalized);
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  const text = cleanCell(value).toLowerCase();
  if (["true", "1", "yes", "y", "はい", "○", "〇"].includes(text)) return true;
  if (["false", "0", "no", "n", "いいえ", "-", "－", "×", "x", ""].includes(text)) return false;
  return null;
}

function toPositiveInteger(value, fallback) {
  const text = cleanCell(value);
  if (!text) return fallback;
  return Number(text);
}

function fieldLabel(key) {
  const labels = {
    date: "日付", map: "マップ", grandCompany: "所属勢力", rank: "順位", job: "ジョブ",
    kills: "KO", deaths: "Down", assists: "Assist", damage: "与ダメージ",
    damageTaken: "被ダメージ", healing: "回復量", topDamage: "与ダメ1位"
  };
  return labels[key] || key;
}

function safeInput(value) {
  const text = cleanCell(value).replace(/[\r\n\t]/g, " ");
  return text ? `${text.slice(0, 40)}${text.length > 40 ? "…" : ""}` : "空欄";
}

function importErrors(title, errors) {
  const visible = errors.slice(0, 5);
  const remainder = errors.length - visible.length;
  return new Error(`${title}\n${visible.join("\n")}${remainder ? `\nほか${remainder}件の問題があります。` : ""}`);
}

function setCsvStatus(message) {
  const status = document.querySelector("#csvStatus");
  if (status) status.textContent = message;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  App.init().catch(error => {
    console.error(error);
    setCsvStatus(error.message || "保存データを読み込めませんでした。ページを再読み込みしてください。");
  });
});
