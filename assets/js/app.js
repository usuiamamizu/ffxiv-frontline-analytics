const App = {
  state: { matches: [] },
  async init() {
    this.state.matches = await Store.init();
    this.bindTabs();
    this.bindDataActions();
    UI.render(this.state);
    setCsvStatus(Store.mode === "indexeddb"
      ? "戦績データはこのブラウザ内に保存されます。初回登録も追加登録も「CSV読み込み」を使用します。"
      : "IndexedDBを利用できないため、互換保存モードで動作しています。JSONバックアップを定期的に保存してください。");
    window.addEventListener("resize", debounce(() => UI.render(this.state), 150));
  },
  bindTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false");
      tab.addEventListener("click", () => this.openTab(tab.dataset.tab));
    });
    document.querySelectorAll(".tab-panel").forEach(panel => panel.setAttribute("role", "tabpanel"));
    document.addEventListener("click", event => {
      const trigger = event.target.closest?.("[data-open-tab]");
      if (trigger) this.openTab(trigger.dataset.openTab);
    });
  },
  openTab(tabId) {
    const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    const panel = document.querySelector(`#${tabId}`);
    if (!tab || !panel) return;
    document.querySelectorAll(".tab, .tab-panel").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(el => el.setAttribute("aria-selected", "false"));
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    panel.classList.add("active");
    UI.render(this.state);
  },
  bindDataActions() {
    document.querySelector("#importCsv").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const imported = parseMatchesCsv(reader.result);
          const result = mergeImportedMatches(this.state.matches, imported);
          await Store.add(result.addedMatches);
          this.state.matches = result.matches;
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
      const header = "Date,Time,Map,GrandCompany,Rank,Job,Kills,Deaths,Assists,Damage,DamageTaken,Healing,TopDamage\n";
      const sample = "2026-07-04,20:03,ウォーコー・チーテ（演習戦）,不滅隊,3,踊り子,6,0,37,886484,465756,807903,1\n";
      downloadText("ffxiv-frontline-chatgpt-template.csv", header + sample, "text/csv");
    });
    document.querySelector("#exportJson").addEventListener("click", () => {
      downloadText("ffxiv-frontline-records.json", JSON.stringify({ version: 1, matches: this.state.matches }, null, 2), "application/json");
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
  const imported = rows.slice(1)
    .filter(row => row.some(cell => String(cell || "").trim()))
    .map((row, index) => normalizeCsvMatch(rowToObject(headers, row), index + 2));
  if (!imported.length) throw new Error("CSVに読み込める戦績データがありません。");
  return imported;
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
  return sourceMatches.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`JSONの${index + 1}件目を確認してください。`);
    }
    const match = {
      id: cleanCell(record.id) || createImportedId(index),
      matchNo: Number(record.matchNo) || index + 1,
      date: normalizeDate(record.date),
      time: cleanCell(record.time),
      map: resolveValue(record.map, FFXIV_DATA.maps),
      grandCompany: resolveValue(record.grandCompany, FFXIV_DATA.grandCompanies),
      rank: toNumber(record.rank),
      job: resolveJob(record.job),
      kills: toNumber(record.kills),
      deaths: toNumber(record.deaths),
      assists: toNumber(record.assists),
      damage: toNumber(record.damage),
      damageTaken: toNumber(record.damageTaken),
      healing: toNumber(record.healing),
      topDamage: typeof record.topDamage === "boolean" ? record.topDamage : toBoolean(record.topDamage)
    };
    if (usedIds.has(match.id)) match.id = createImportedId(index);
    usedIds.add(match.id);
    validateMatch(match, index + 1, "JSON");
    return match;
  });
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
  return rows.filter(item => item.some(cellValue => String(cellValue || "").trim()));
}

function rowToObject(headers, row) {
  return headers.reduce((record, header, index) => {
    if (header) record[header] = cleanCell(row[index]);
    return record;
  }, {});
}

function normalizeCsvMatch(record, rowNumber) {
  const match = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${rowNumber}`,
    date: normalizeDate(record.date),
    time: record.time || "",
    map: resolveValue(record.map, FFXIV_DATA.maps),
    grandCompany: resolveValue(record.grandCompany, FFXIV_DATA.grandCompanies),
    rank: toNumber(record.rank),
    job: resolveJob(record.job),
    kills: toNumber(record.kills),
    deaths: toNumber(record.deaths),
    assists: toNumber(record.assists),
    damage: toNumber(record.damage),
    damageTaken: toNumber(record.damageTaken),
    healing: toNumber(record.healing),
    topDamage: toBoolean(record.topDamage)
  };
  validateMatch(match, rowNumber);
  return match;
}

function validateMatch(match, rowNumber, source = "CSV") {
  const missing = [];
  ["date", "map", "grandCompany", "job"].forEach(key => {
    if (!match[key]) missing.push(key);
  });
  ["rank", "kills", "deaths", "assists", "damage", "damageTaken", "healing"].forEach(key => {
    if (!Number.isFinite(match[key])) missing.push(key);
  });
  if (match.rank < 1 || match.rank > 3) missing.push("rank(1-3)");
  ["kills", "deaths", "assists", "damage", "damageTaken", "healing"].forEach(key => {
    if (Number.isFinite(match[key]) && match[key] < 0) missing.push(`${key}(0以上)`);
  });
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(match.date)) missing.push("date(YYYY-MM-DD)");
  if (missing.length) {
    const position = source === "CSV" ? `${rowNumber}行目` : `${rowNumber}件目`;
    throw new Error(`${source}の${position}を確認してください：${[...new Set(missing)].join(", ")}`);
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
    k: "kills",
    deaths: "deaths",
    death: "deaths",
    d: "deaths",
    assists: "assists",
    assist: "assists",
    a: "assists",
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
  const match = text.match(/^(20\d{2})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  if (!match) return text;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function resolveValue(value, candidates) {
  const text = cleanCell(value);
  return candidates.find(item => item === text) || candidates.find(item => item.includes(text) || text.includes(item)) || text;
}

function resolveJob(value) {
  const text = cleanCell(value);
  const upper = text.toUpperCase();
  const found = FFXIV_DATA.jobs.find(job => job.id.toUpperCase() === upper || job.name === text);
  return found ? found.id : text;
}

function toNumber(value) {
  const normalized = cleanCell(value).replace(/[,，]/g, "").replace(/位/g, "");
  if (!normalized) return NaN;
  return Number(normalized);
}

function toBoolean(value) {
  const text = cleanCell(value).toLowerCase();
  return ["true", "1", "yes", "y", "はい", "○", "〇"].includes(text);
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
