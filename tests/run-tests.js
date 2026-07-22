const fs = require("fs");
const vm = require("vm");

const context = {
  console,
  crypto: require("crypto").webcrypto,
  document: { addEventListener() {} },
  window: {},
  setTimeout,
  clearTimeout
};

vm.createContext(context);
runScript("assets/js/data.js", "this.testData = FFXIV_DATA;");
runScript("assets/js/analytics.js", "this.testAnalytics = Analytics;");
runScript("assets/js/app.js", "this.testImport = { parseMatchesCsv, normalizeJsonMatches };");
runScript("assets/js/ui.js", "this.testUi = { escapeHtml, mapAnalysis, matchDetailContent, bestAnalysis, buildRoleUsageSegments, roleBadge };");

const header = "Date,Time,Map,GrandCompany,Rank,Job,Kills,Deaths,Assists,Damage,DamageTaken,Healing,TopDamage";
const [mapA, mapB] = context.testData.maps;
const [grandCompany] = context.testData.grandCompanies;
const results = [];

test("CSV accepts HH:MM", () => parse(row({ time: "9:05" }))[0].time === "09:05");
test("CSV accepts HH:MM:SS", () => parse(row({ time: "9:05:07" }))[0].time === "09:05:07");
test("CSV rejects impossible dates", () => rejects(row({ date: "2026-02-30" })));
test("CSV rejects unknown jobs", () => rejects(row({ job: "BLU" })));
test("CSV rejects negative values", () => rejects(row({ kills: -1 })));
test("CSV rejects HTML payloads", () => rejects(row({ map: "<img src=x onerror=alert(1)>" })));
test("JSON uses the same validation", () => {
  const record = match({ date: "2026-02-30" });
  try {
    context.testImport.normalizeJsonMatches([record]);
    return false;
  } catch {
    return true;
  }
});
test("HTML output is escaped", () => context.testUi.escapeHtml(`<img src="x">&`) === "&lt;img src=&quot;x&quot;&gt;&amp;");
test("Map leaders prefer three or more matches", () => {
  const matches = [
    match({ map: mapA, rank: 1, damage: 9000000, matchNo: 1 }),
    match({ map: mapB, rank: 2, damage: 1000000, matchNo: 2 }),
    match({ map: mapB, rank: 2, damage: 1100000, matchNo: 3 }),
    match({ map: mapB, rank: 1, damage: 1200000, matchNo: 4 })
  ];
  const html = context.testUi.mapAnalysis(matches);
  const leader = html.match(/1位率トップ[\s\S]*?<strong>(.*?)<\/strong>/)?.[1];
  return leader === mapB;
});
test("Tab changes do not rebuild the full UI", () => {
  const source = fs.readFileSync("assets/js/app.js", "utf8");
  return !/resize[^\n]+UI\.render/.test(source) && /requestAnimationFrame\(\(\) => UI\.redrawCharts/.test(source);
});
test("Best records link to match details", () => {
  const html = context.testUi.bestAnalysis([match()]);
  return html.includes('data-match-id="test-1"') && html.includes("試合詳細を開く");
});
test("Match details escape imported text", () => {
  const html = context.testUi.matchDetailContent(match({ map: `<img src=x>` }));
  return !html.includes("<img src=x>") && html.includes("&lt;img src=x&gt;");
});
test("Role usage distinguishes melee and ranged DPS", () => {
  const segments = context.testUi.buildRoleUsageSegments([]);
  const melee = segments.find(segment => segment.id === "melee");
  const ranged = segments.find(segment => segment.id === "ranged");
  return melee.badge === "近" && ranged.badge === "遠"
    && melee.icon.includes("DPSRole.png") && ranged.icon.includes("DPSRole.png");
});
test("Role donut uses icons without center text", () => {
  const source = fs.readFileSync("assets/js/ui.js", "utf8");
  return /#roleChart"\), roleSegments, "", \{ legend: false, icons: true \}/.test(source);
});
test("Role stacked bar includes role icons", () => {
  const source = fs.readFileSync("assets/js/ui.js", "utf8");
  return /role-stacked-segment[\s\S]*?roleIcon\(role\.id\)/.test(source);
});

results.forEach(result => console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.error ? `: ${result.error}` : ""}`));
const failed = results.filter(result => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed`);
if (failed.length) process.exitCode = 1;

function runScript(path, expose) {
  vm.runInContext(`${fs.readFileSync(path, "utf8")}\n${expose}`, context, { filename: path });
}

function test(name, assertion) {
  try {
    results.push({ name, ok: Boolean(assertion()) });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

function parse(csvRow) {
  return context.testImport.parseMatchesCsv(`${header}\n${csvRow}\n`);
}

function rejects(csvRow) {
  try {
    parse(csvRow);
    return false;
  } catch {
    return true;
  }
}

function row(overrides = {}) {
  const value = match(overrides);
  return [value.date, value.time, value.map, value.grandCompany, value.rank, value.job, value.kills,
    value.deaths, value.assists, value.damage, value.damageTaken, value.healing, value.topDamage ? 1 : 0].join(",");
}

function match(overrides = {}) {
  return {
    id: `test-${overrides.matchNo || 1}`,
    matchNo: overrides.matchNo || 1,
    date: "2026-07-22",
    time: "12:00",
    map: mapA,
    grandCompany,
    rank: 1,
    job: "DRK",
    kills: 5,
    deaths: 2,
    assists: 30,
    damage: 1500000,
    damageTaken: 800000,
    healing: 100000,
    topDamage: false,
    ...overrides
  };
}
