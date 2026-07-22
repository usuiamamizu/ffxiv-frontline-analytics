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
runScript("assets/js/ui.js", "this.testUi = { escapeHtml, mapAnalysis, matchDetailContent, bestAnalysis, buildRoleUsageSegments, roleBadge, dataRecordCard };");

const header = "Date,Time,Map,GrandCompany,Rank,Job,KO,Down,Assists,Damage,DamageTaken,Healing,TopDamage";
const legacyHeader = "Date,Time,Map,GrandCompany,Rank,Job,Kills,Deaths,Assists,Damage,DamageTaken,Healing,TopDamage";
const japaneseHeader = "日付,時間,マップ,所属勢力,順位,ジョブ,ノックアウト,ダウン,アシスト,与ダメ,被ダメ,回復,与ダメ1位";
const [mapA, mapB] = context.testData.maps;
const [grandCompany] = context.testData.grandCompanies;
const results = [];

test("CSV accepts HH:MM", () => parse(row({ time: "9:05" }))[0].time === "09:05");
test("CSV accepts HH:MM:SS", () => parse(row({ time: "9:05:07" }))[0].time === "09:05:07");
test("CSV uses KO and Down headers", () => {
  const parsed = parse(row({ kills: 7, deaths: 3 }))[0];
  return parsed.kills === 7 && parsed.deaths === 3;
});
test("CSV still accepts legacy Kills and Deaths headers", () => {
  const parsed = parseWithHeader(legacyHeader, row({ kills: 7, deaths: 3 }))[0];
  return parsed.kills === 7 && parsed.deaths === 3;
});
test("CSV accepts Japanese KO and Down headers", () => {
  const parsed = parseWithHeader(japaneseHeader, row({ kills: 7, deaths: 3, assists: 28 }))[0];
  return parsed.kills === 7 && parsed.deaths === 3 && parsed.assists === 28;
});
test("Screenshot guide uses the current CSV format", () => {
  const source = fs.readFileSync("index.html", "utf8");
  const prompt = source.match(/id="chatGptPromptText">([\s\S]*?)<\/pre>/)?.[1] || "";
  return source.includes("./assets/guide/frontline-result-capture-guide.png")
    && prompt.includes("Date,Time,Map,GrandCompany,Rank,Job,KO,Down,Assists,Damage,DamageTaken,Healing,TopDamage")
    && prompt.includes("画像ごとに完全に独立して解析してください")
    && prompt.includes("赤またはオレンジ色 → 黒渦団")
    && prompt.includes("K → KO")
    && prompt.includes("Jobは、画面下部の経験値バー横に表示されている英語のジョブ略称から判定してください")
    && prompt.includes("DateはYYYY-MM-DD形式")
    && prompt.includes("TimeはHH:MM形式")
    && prompt.includes("UTF-8形式のCSVファイル")
    && !source.match(/id="chatGptPromptText"[\s\S]*?MatchNo列は作らない/);
});
test("Screenshot prompt protects map, rank, and top damage decisions", () => {
  const source = fs.readFileSync("index.html", "utf8");
  const prompt = source.match(/id="chatGptPromptText">([\s\S]*?)<\/pre>/)?.[1] || "";
  return prompt.includes("Mapは、画面右側にある「コンテンツ情報HUD」だけを見て判定してください")
    && prompt.includes("得点の大小から順位を計算し直さないでください")
    && prompt.includes("固定表示された自分の行を、ランキングの先頭として扱わないでください")
    && prompt.includes("自分のDamageと最大Damageが同じ場合だけTopDamageを1にする")
    && prompt.includes("1画像につき1行だけ出力してください");
});
test("Screenshot guide supports zoom and privacy guidance", () => {
  const source = fs.readFileSync("index.html", "utf8");
  return source.includes('id="guideImageDialog"')
    && source.includes("画像をタップして拡大")
    && source.includes("スクリーンショットの取り扱いについて")
    && source.includes("1枚＝1試合・複数試合まとめて送信可能")
    && source.includes("戦績ウィンドウの拡縮は140％を推奨します")
    && source.includes("画面に収まらない場合は120％程度まで下げます");
});
test("Screenshot prompt is presented as a prominent send step", () => {
  const source = fs.readFileSync("index.html", "utf8");
  return source.includes("スクリーンショットと依頼文をセットで送信します")
    && source.includes("ChatGPTへの依頼文を開く")
    && source.includes("撮影したスクリーンショットと一緒にChatGPTへ送ってください")
    && source.includes('class="prompt-summary-action"');
});
test("Data tab links directly to the screenshot guide", () => {
  const source = fs.readFileSync("index.html", "utf8");
  return source.includes('data-open-tab="settings" data-scroll-target="#screenshotGuideTitle"')
    && source.includes("スクリーンショットからCSVを作る方法を見る");
});
test("Obsolete ChatGPT CSV template is removed", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const app = fs.readFileSync("assets/js/app.js", "utf8");
  return !html.includes("ChatGPT用CSVテンプレート")
    && !html.includes('id="downloadCsvTemplate"')
    && !app.includes("downloadCsvTemplate");
});
test("Registered match cards provide edit and delete actions", () => {
  const html = context.testUi.dataRecordCard(match());
  return html.includes('data-edit-match="test-1"')
    && html.includes('data-delete-match="test-1"')
    && html.includes("与ダメージ");
});
test("Registered matches are presented as an editable collapsible section", () => {
  const source = fs.readFileSync("index.html", "utf8");
  return source.includes('<details class="data-record-section">')
    && source.includes("登録済み戦績の確認・編集・削除")
    && !source.includes('<div class="csv-guide">');
});
test("Registered match manager paginates large datasets", () => {
  const source = fs.readFileSync("assets/js/ui.js", "utf8");
  return /dataPageSize:\s*50/.test(source)
    && /records\.slice\(start, start \+ this\.dataPageSize\)/.test(source);
});
test("Store updates and removes individual records", () => {
  const source = fs.readFileSync("assets/js/store.js", "utf8");
  return /async update\(match\)/.test(source) && /async remove\(id\)/.test(source)
    && /objectStore\(MATCH_STORE\)\.delete\(id\)/.test(source);
});
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
test("Small role segments move icons outside the donut", () => {
  const segments = context.testUi.buildRoleUsageSegments([
    match({ job: "WAR" }),
    ...Array.from({ length: 19 }, (_, index) => match({ id: `dps-${index}`, job: "SMN" }))
  ]);
  return segments.find(segment => segment.id === "tank")?.externalIcon === true
    && segments.find(segment => segment.id === "ranged")?.externalIcon === false;
});
test("Map summary values use the shared numeric font", () => {
  const source = fs.readFileSync("assets/css/styles.css", "utf8");
  return /\.map-insight-card > b\s*\{[\s\S]*?font-family: var\(--font-numeric\)/.test(source);
});
test("Map names match the official Lodestone titles", () => {
  return JSON.stringify(context.testData.maps) === JSON.stringify([
    "外縁遺跡群 (制圧戦)",
    "シールロック (争奪戦)",
    "フィールド・オブ・グローリー (砕氷戦)",
    "オンサル・ハカイル (終節戦)",
    "ウォーコー・チーテ (演習戦)"
  ]);
});
test("Legacy map names normalize to official titles", () => {
  const sealRock = parse(row({ map: "シールロック" }))[0].map;
  const borderland = context.testImport.normalizeJsonMatches([match({ map: "外縁遺跡群" })])[0].map;
  const worqor = parse(row({ map: "ウォーコー・チーテ（演習戦）" }))[0].map;
  return sealRock === "シールロック (争奪戦)"
    && borderland === "外縁遺跡群 (制圧戦)"
    && worqor === "ウォーコー・チーテ (演習戦)";
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
  return parseWithHeader(header, csvRow);
}

function parseWithHeader(csvHeader, csvRow) {
  return context.testImport.parseMatchesCsv(`${csvHeader}\n${csvRow}\n`);
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
