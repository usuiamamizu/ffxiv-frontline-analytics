const App = {
  state: { matches: [] },
  init() {
    this.state.matches = Store.load();
    this.bindTabs();
    this.bindDataActions();
    UI.render(this.state);
    window.addEventListener("resize", debounce(() => UI.render(this.state), 150));
  },
  bindTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab, .tab-panel").forEach(el => el.classList.remove("active"));
        tab.classList.add("active");
        document.querySelector(`#${tab.dataset.tab}`).classList.add("active");
        UI.render(this.state);
      });
    });
  },
  bindDataActions() {
    document.querySelector("#importCsv").addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = parseMatchesCsv(reader.result);
          const result = mergeImportedMatches(this.state.matches, imported);
          this.state.matches = result.matches;
          Store.save(this.state.matches);
          UI.render(this.state);
          setCsvStatus(`CSV load complete: ${result.added} added / ${result.skipped} skipped. Total: ${this.state.matches.length}.`);
        } catch (error) {
          setCsvStatus(error.message || "CSV import failed.");
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
      reader.onload = () => {
        const parsed = JSON.parse(reader.result);
        this.state.matches = Array.isArray(parsed.matches) ? parsed.matches : parsed;
        Store.save(this.state.matches);
        UI.render(this.state);
      };
      reader.readAsText(file);
    });
    document.querySelector("#clearData").addEventListener("click", () => {
      if (!confirm("保存済みの全戦績データを削除します。よろしいですか？")) return;
      this.state.matches = Store.clear();
      UI.render(this.state);
      setCsvStatus("All saved records were deleted.");
    });
  }
};

function parseMatchesCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSV has no data rows.");
  const headers = rows[0].map(normalizeHeader);
  const imported = rows.slice(1)
    .filter(row => row.some(cell => String(cell || "").trim()))
    .map((row, index) => normalizeCsvMatch(rowToObject(headers, row), index + 2));
  if (!imported.length) throw new Error("CSV has no importable records.");
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
  return { matches, added, skipped };
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

function validateMatch(match, rowNumber) {
  const missing = [];
  ["date", "map", "grandCompany", "job"].forEach(key => {
    if (!match[key]) missing.push(key);
  });
  ["rank", "kills", "deaths", "assists", "damage", "damageTaken", "healing"].forEach(key => {
    if (!Number.isFinite(match[key])) missing.push(key);
  });
  if (match.rank < 1 || match.rank > 3) missing.push("rank(1-3)");
  if (missing.length) throw new Error(`CSV row ${rowNumber}: invalid ${missing.join(", ")}`);
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

document.addEventListener("DOMContentLoaded", () => App.init());
