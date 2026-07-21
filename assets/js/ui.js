const UI = {
  render(state) {
    const matches = state.matches;
    const summary = Analytics.summarize(matches);
    this.header(matches);
    this.summaryCards(summary);
    this.averageCards(matches);
    this.latestRows(Analytics.latest(matches));
    this.jobSummary(Analytics.jobStats(matches));
    this.mapSummary(Analytics.mapStats(matches));
    this.bestRecords(Analytics.bests(matches));
    this.streakRecords(matches);
    this.detailViews(matches, summary);
    this.charts(matches, summary);
  },
  header(matches) {
    const latest = Analytics.latest(matches, 1)[0];
    const lastUpdated = document.querySelector("#lastUpdated");
    const matchNo = document.querySelector("#matchNo");
    if (lastUpdated) lastUpdated.textContent = latest ? latest.date.replaceAll("-", "/") : "-";
    if (matchNo) matchNo.textContent = matches.length;
  },
  summaryCards(summary) {
    const rankTotal = summary.total || 1;
    document.querySelector("#summaryCards").innerHTML = `
      <article class="summary-card">
        <span class="card-label">総試合数</span>
        <div class="card-body"><strong>${formatNumber(summary.total)}</strong><small>試合</small></div>
      </article>
      <article class="summary-card rank-card" style="--r1:${summary.ranks[1] || .01}fr;--r2:${summary.ranks[2] || .01}fr;--r3:${summary.ranks[3] || .01}fr">
        <span class="card-label">順位別割合</span>
        <div class="card-body rank-card-body">
          <div class="rank-breakdown">
            <div>1位<b>${summary.ranks[1]}</b><small>${formatPercent(summary.ranks[1] / rankTotal)}</small></div>
            <div>2位<b>${summary.ranks[2]}</b><small>${formatPercent(summary.ranks[2] / rankTotal)}</small></div>
            <div>3位<b>${summary.ranks[3]}</b><small>${formatPercent(summary.ranks[3] / rankTotal)}</small></div>
          </div>
          <div class="rank-meter"><i></i><i></i><i></i></div>
        </div>
      </article>
      <article class="summary-card">
        <span class="card-label">勝率（1位獲得率）</span>
        <div class="card-body"><strong>${formatPercent(summary.firstRate)}</strong><small>${summary.ranks[1]} / ${summary.total || 0} 試合</small></div>
      </article>
      <article class="summary-card top-damage-summary">
        <span class="card-label">与ダメ1位回数</span>
        <div class="card-body"><strong>${formatNumber(summary.topDamage)}</strong><small>${formatPercent(summary.topDamage / rankTotal)}</small></div>
      </article>
    `;
  },
  averageCards(matches) {
    const cards = [
      ["KO（ノックアウト）", avgText(matches, "kills")],
      ["Down（ダウン）", avgText(matches, "deaths")],
      ["Assist（アシスト）", avgText(matches, "assists")],
      ["与ダメージ", formatNumber(avgRaw(matches, "damage"))],
      ["被ダメージ", formatNumber(avgRaw(matches, "damageTaken"))],
      ["回復量", formatNumber(avgRaw(matches, "healing"))]
    ];
    document.querySelector("#averageCards").innerHTML = cards.map(([label, value]) => `
      <article class="avg-card"><span>${label}</span><strong>${value}</strong></article>
    `).join("");
    document.querySelector("#ratioStrip").innerHTML = "";
  },
  latestRows(matches) {
    document.querySelector("#latestRows").innerHTML = matches.map((match, index) => `
      <tr>
        <td>${match.matchNo || matches.length - index}</td>
        <td>${match.date.replaceAll("-", "/")}</td>
        <td>${match.map}</td>
        <td>${gcName(match.grandCompany)}</td>
        <td><span class="rank-badge rank-${match.rank}">${match.rank}位</span></td>
        <td>${jobIcon(match.job)}${jobName(match.job)}</td>
        <td>${match.kills}</td>
        <td>${match.deaths}</td>
        <td>${match.assists}</td>
        <td class="${match.topDamage ? "top-damage-cell" : ""}">${formatNumber(match.damage)}</td>
        <td>${formatNumber(match.damageTaken)}</td>
        <td>${formatNumber(match.healing)}</td>
        <td>${match.topDamage ? "○" : "-"}</td>
      </tr>
    `).join("");
  },
  jobSummary(stats) {
    document.querySelector("#jobSummary").innerHTML = statCards(stats, true, true);
  },
  mapSummary(stats) {
    document.querySelector("#mapSummary").innerHTML = statTable(stats, false, true);
  },
  bestRecords(bests) {
    const rows = [
      ["最高与ダメージ", bests.damage, "damage"],
      ["最高ノックアウト", bests.kills, "kills"],
      ["最高アシスト", bests.assists, "assists"],
      ["最高回復量", bests.healing, "healing"]
    ];
    document.querySelector("#bestRecords").innerHTML = rows.map(([label, match, key]) => recordRow(label, match, key)).join("");
  },
  streakRecords(matches) {
    const current = Analytics.currentStreak(matches);
    const max = Analytics.maxWinStreak(matches);
    const latestTopDamage = Analytics.latest(matches).findIndex(match => match.topDamage);
    document.querySelector("#streakRecords").innerHTML = `
      <div class="record-item"><span>連続1位</span><strong>${max} 試合</strong></div>
      <div class="record-item"><span>現在の連勝</span><strong>${current} 試合</strong></div>
      <div class="record-item"><span>最新与ダメ1位</span><strong>${latestTopDamage >= 0 ? `${latestTopDamage + 1}試合前` : "-"}</strong></div>
    `;
  },
  detailViews(matches, summary) {
    const jobStats = Analytics.jobStats(matches);
    const allJobSegments = buildAllJobUsageSegments(jobStats, matches.length);
    document.querySelector("#summaryDetail").innerHTML = summaryAnalysis(matches, summary);
    document.querySelector("#jobsDetail").innerHTML = `
      <h3 class="analysis-section-title">ジョブ使用率</h3>
      <section class="full-job-usage">
        <canvas id="allJobChart" class="full-job-chart" height="390"></canvas>
        <div id="allJobLegend" class="full-job-legend">${fullJobLegend(allJobSegments)}</div>
      </section>
      ${statCards(jobStats, true, false)}
    `;
    document.querySelector("#mapsDetail").innerHTML = statTable(Analytics.mapStats(matches), false, false);
    document.querySelector("#bestsDetail").innerHTML = document.querySelector("#bestRecords").innerHTML;
  },
  charts(matches, summary) {
    const roleSegments = buildRoleUsageSegments(matches);
    Charts.drawDonut(document.querySelector("#roleChart"), roleSegments, "Roles", { legend: false });
    this.roleUsageList(roleSegments);

    const jobSegments = buildJobUsageSegments(Analytics.jobStats(matches), matches.length);
    Charts.drawDonut(document.querySelector("#jobChart"), jobSegments, "Top 5", { legend: false, icons: true });
    this.jobUsageList(jobSegments);

    const allJobChart = document.querySelector("#allJobChart");
    if (allJobChart && allJobChart.getBoundingClientRect().width > 0) {
      Charts.drawDonut(allJobChart, buildAllJobUsageSegments(Analytics.jobStats(matches), matches.length), "Used Jobs", { legend: false, icons: true });
    }

    const latest = Analytics.latest(matches).reverse();
    Charts.drawLine(document.querySelector("#rankTrendChart"), latest.map(m => m.rank), { min: 1, max: 3, invert: true, yLabels: ["1位", "2位", "3位"] });
    Charts.drawBars(document.querySelector("#damageTrendChart"), latest.map(m => m.damage));
  },
  jobUsageList(segments) {
    document.querySelector("#jobUsageList").innerHTML = segments.map(segment => `
      <div class="usage-row" title="${segment.label}">
        <span class="usage-swatch" style="background:${segment.color}"></span>
        <span class="usage-name">${segment.label}</span>
        <span class="usage-percent">${formatPercent(segment.rate)}</span>
      </div>
    `).join("");
  },
  roleUsageList(segments) {
    document.querySelector("#roleUsageList").innerHTML = segments.map(segment => `
      <div class="usage-row" title="${segment.label}">
        <span class="usage-swatch" style="background:${segment.color}"></span>
        <span class="usage-name">${segment.label}</span>
        <span class="usage-percent">${formatPercent(segment.rate)}</span>
      </div>
    `).join("");
  }
};

const ASSET_VERSION = "20260722-006";

const JOB_COLORS = [
  "#9b2f24", "#b15a2a", "#c08c2f", "#8f8a3a", "#6f8c42", "#3f8b59", "#2f806e",
  "#2f6969", "#2d6386", "#34518f", "#51468f", "#6a438d", "#8c4b75", "#a0485a",
  "#b05c74", "#c07b55", "#9e7050", "#7c6f68", "#6c675c", "#8c8a7e", "#d5a22e"
];

const ROLE_DEFS = [
  { id: "tank", label: "タンク", jobs: ["PLD", "WAR", "DRK", "GNB"], color: "#3f7fbf" },
  { id: "healer", label: "ヒーラー", jobs: ["WHM", "SCH", "AST", "SGE"], color: "#58a85b" },
  { id: "melee", label: "近接DPS", jobs: ["MNK", "DRG", "NIN", "SAM", "RPR", "VPR"], color: "#c45a4d" },
  { id: "ranged", label: "遠隔DPS", jobs: ["BRD", "MCH", "DNC", "BLM", "SMN", "RDM", "PCT"], color: "#b48ad9" }
];

function buildRoleUsageSegments(matches) {
  const total = matches.length || 1;
  return ROLE_DEFS.map(role => {
    const value = matches.filter(match => role.jobs.includes(match.job)).length;
    return {
      label: role.label,
      value,
      rate: value / total,
      color: role.color
    };
  });
}

function buildJobUsageSegments(stats, totalMatches) {
  const top = stats.slice(0, 5).map((job, index) => ({
    label: jobName(job.id),
    value: job.matches,
    rate: totalMatches ? job.matches / totalMatches : 0,
    color: JOB_COLORS[index],
    icon: jobIconSource(job.id)
  }));
  const otherCount = stats.slice(5).reduce((sum, job) => sum + job.matches, 0);
  if (otherCount > 0) {
    top.push({
      label: "その他",
      value: otherCount,
      rate: totalMatches ? otherCount / totalMatches : 0,
      color: "#6c675c"
    });
  }
  return top;
}

function buildAllJobUsageSegments(stats, totalMatches) {
  const statMap = new Map(stats.map(stat => [stat.id, stat]));
  return FFXIV_DATA.jobs.map((job, index) => {
    const stat = statMap.get(job.id);
    const value = stat ? stat.matches : 0;
    return {
      label: job.name,
      value,
      rate: totalMatches ? value / totalMatches : 0,
      color: JOB_COLORS[index % JOB_COLORS.length],
      icon: jobIconSource(job.id)
    };
  }).filter(job => job.value > 0);
}

function fullJobLegend(segments) {
  return segments.map(segment => `
    <div class="full-job-row" title="${segment.label}">
      <span class="usage-swatch" style="background:${segment.color}"></span>
      <span class="usage-name">${segment.label}</span>
      <span class="full-job-count">${segment.value}戦</span>
      <span class="full-job-rate">${formatPercent(segment.rate)}</span>
    </div>
  `).join("");
}

function formatNumber(value) {
  return Math.round(Number(value || 0)).toLocaleString("ja-JP");
}
function formatPercent(value) {
  return `${Math.round((value || 0) * 1000) / 10}%`;
}
function jobName(id) {
  return FFXIV_DATA.jobs.find(job => job.id === id)?.name || id;
}
function jobIcon(id) {
  const job = FFXIV_DATA.jobs.find(item => item.id === id);
  if (!job?.icon) return `<span class="job-icon" title="${id}">${id.slice(0, 2)}</span>`;
  return `<span class="job-icon" title="${job.name}"><img src="./assets/job-icons/${job.icon}?v=${ASSET_VERSION}" alt="${job.name}"></span>`;
}
function jobIconSource(id) {
  const job = FFXIV_DATA.jobs.find(item => item.id === id);
  return job?.icon ? `./assets/job-icons/${job.icon}?v=${ASSET_VERSION}` : "";
}
function jobSprite(id) {
  const job = FFXIV_DATA.jobs.find(item => item.id === id);
  if (!job?.icon) return "";
  return `<span class="job-sprite" aria-hidden="true"><img src="./assets/job-sprites/${job.icon}?v=${ASSET_VERSION}" alt=""></span>`;
}
function jobStatTitle(id) {
  return `
    <div class="job-stat-title">
      ${jobSprite(id)}
      <span class="job-stat-name">${jobName(id)}</span>
    </div>
  `;
}
function gcName(name) {
  const cls = name === "黒渦団" ? "maelstrom-text" : name === "双蛇党" ? "adders-text" : "flames-text";
  return `<span class="gc-name ${cls}">${name}</span>`;
}
function recordRow(label, match, key) {
  if (!match) return `<div class="record-item"><span>${label}</span><strong>-</strong></div>`;
  return `<div class="record-item"><span>${label}</span><strong>${formatNumber(match[key])} <small>(${jobName(match.job)})</small></strong></div>`;
}
function detailCard(label, value) {
  return `<div class="detail-card"><span class="muted">${label}</span><h3>${value}</h3></div>`;
}
function avgRaw(rows, key) {
  return rows.length ? rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length : 0;
}
function avgText(rows, key) {
  return Math.round(avgRaw(rows, key) * 10) / 10;
}
function statCards(stats, showJob, compact) {
  const rows = compact ? stats.slice(0, 10) : stats;
  return `<div class="stat-card-grid ${showJob ? "job-stat-grid" : "map-stat-grid"}">
    ${rows.map(stat => `
      <article class="stat-card">
        <div class="stat-card-title">${showJob ? jobStatTitle(stat.id) : stat.id}</div>
        <div class="stat-card-main">
          <span><b>${stat.matches}</b><small>試合</small></span>
          <span><b>${stat.firsts}</b><small>1位</small></span>
          <span class="${stat.firsts ? "rank-1" : ""}"><b>${formatPercent(stat.firsts / stat.matches)}</b><small>1位率</small></span>
          <span class="${stat.topDamage ? "rank-1" : ""}"><b>${stat.topDamage}</b><small>与ダメ1位</small></span>
        </div>
        <div class="stat-card-sub">
          <span>平均与ダメ ${formatNumber(stat.avgDamage)}</span>
        </div>
      </article>
    `).join("")}
  </div>`;
}

function statTable(stats, showJob, compact) {
  const rows = compact ? stats.slice(0, 6) : stats;
  return `<div class="compact-table-wrap"><table class="compact-table"><thead><tr>
    <th>${showJob ? "ジョブ" : "マップ"}</th><th>試合</th><th>1位</th><th>1位率</th><th>与ダメ1位</th><th>平均与ダメ</th>
  </tr></thead><tbody>
    ${rows.map(stat => `<tr>
      <td>${showJob ? `${jobIcon(stat.id)}${jobName(stat.id)}` : stat.id}</td>
      <td>${stat.matches}</td>
      <td>${stat.firsts}</td>
      <td class="${stat.firsts ? "rank-1" : ""}">${formatPercent(stat.firsts / stat.matches)}</td>
      <td>${stat.topDamage}</td>
      <td>${formatNumber(stat.avgDamage)}</td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

function summaryAnalysis(matches, summary) {
  const total = summary.total || 0;
  const rankTotal = total || 1;
  const twoRate = total ? (summary.ranks[1] + summary.ranks[2]) / total : 0;
  const topDamageRate = total ? summary.topDamage / total : 0;
  const currentStreak = Analytics.currentStreak(matches);
  const jobStats = Analytics.jobStats(matches);
  const mapStats = Analytics.mapStats(matches);
  const latest = Analytics.latest(matches, Math.min(10, matches.length));
  return `
    <div class="analysis-page">
      <section class="analysis-block">
        <h3>全期間サマリー</h3>
        <div class="analysis-summary-grid">
          ${analysisMetric("総試合数", formatNumber(total), "試合", "featured")}
          ${analysisMetric("1位 / 2位 / 3位", `${summary.ranks[1]} / ${summary.ranks[2]} / ${summary.ranks[3]}`, "順位別")}
          ${analysisMetric("1位率", formatPercent(summary.firstRate), `${summary.ranks[1]} / ${total || 0} 試合`)}
          ${analysisMetric("2位以内率", formatPercent(twoRate), `${summary.ranks[1] + summary.ranks[2]} / ${total || 0} 試合`)}
          ${analysisMetric("与ダメージ1位数", formatNumber(summary.topDamage), "回")}
          ${analysisMetric("与ダメージ1位率", formatPercent(topDamageRate), `${summary.topDamage} / ${total || 0} 試合`)}
          ${analysisMetric("最大連勝", formatNumber(summary.maxWinStreak), "試合")}
          ${analysisMetric("現在の連勝", formatNumber(currentStreak), "試合")}
        </div>
      </section>

      <section class="analysis-two-column">
        <article class="analysis-block">
          <h3>平均戦績</h3>
          <div class="analysis-average-grid">
            ${averageMetricCard("平均KO", avgText(matches, "kills"))}
            ${averageMetricCard("平均Down", avgText(matches, "deaths"))}
            ${averageMetricCard("平均Assist", avgText(matches, "assists"))}
            ${averageMetricCard("平均与ダメージ", formatNumber(avgRaw(matches, "damage")))}
            ${averageMetricCard("平均被ダメージ", formatNumber(avgRaw(matches, "damageTaken")))}
            ${averageMetricCard("平均回復量", formatNumber(avgRaw(matches, "healing")))}
            ${averageMetricCard("K/D比", formatDecimal(kdRatio(matches), 2))}
            ${averageMetricCard("K+A", formatDecimal(avgKA(matches), 1))}
          </div>
        </article>

        <article class="analysis-block">
          <h3>直近比較 <small>全期間 vs 直近${latest.length || 0}戦</small></h3>
          <div class="comparison-list">
            ${comparisonRows(matches, latest)}
          </div>
        </article>
      </section>

      <section class="analysis-two-column">
        <article class="analysis-block">
          <h3>順位分布</h3>
          <div class="rank-distribution">
            ${rankBar("1位", summary.ranks[1], rankTotal, "#d5a22e")}
            ${rankBar("2位", summary.ranks[2], rankTotal, "#8c8a7e")}
            ${rankBar("3位", summary.ranks[3], rankTotal, "#ad3725")}
          </div>
        </article>

        <article class="analysis-block">
          <h3>与ダメージ分布</h3>
          <div class="damage-distribution">
            ${damageDistribution(matches)}
          </div>
        </article>
      </section>

      <section class="analysis-block">
        <h3>ジョブランキング</h3>
        <div class="ranking-grid">
          ${rankingPanel("1位率ランキング", jobStats, stat => safeRate(stat.firsts, stat.matches), "percent")}
          ${rankingPanel("平均与ダメージランキング", jobStats, stat => stat.avgDamage, "number")}
          ${rankingPanel("与ダメージ1位率ランキング", jobStats, stat => safeRate(stat.topDamage, stat.matches), "percent")}
          ${rankingPanel("平均KOランキング", jobStats, stat => stat.avgKills, "decimal")}
          ${rankingPanel("平均Assistランキング", jobStats, stat => stat.avgAssists, "decimal")}
        </div>
      </section>

      <section class="analysis-block">
        <h3>マップ別集計への導線</h3>
        <div class="map-highlight-grid">
          ${mapHighlight("最も1位率が高いマップ", bestMapBy(mapStats, stat => safeRate(stat.firsts, stat.matches)), "firstRate")}
          ${mapHighlight("最も平均与ダメージが高いマップ", bestMapBy(mapStats, stat => stat.avgDamage), "damage")}
        </div>
        <p class="analysis-note">マップ別の詳細な比較は「マップ別分析」タブで確認できます。</p>
      </section>
    </div>
  `;
}

function analysisMetric(label, value, note, variant = "") {
  return `<article class="analysis-metric ${variant ? `analysis-metric-${variant}` : ""}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function averageMetricCard(label, value) {
  return `<article class="analysis-average-card"><span>${label}</span><strong>${value}</strong></article>`;
}

function comparisonRows(allRows, recentRows) {
  const rows = [
    ["1位率", rateBy(allRows, row => row.rank === 1), rateBy(recentRows, row => row.rank === 1), "percent", false],
    ["平均KO", avgRaw(allRows, "kills"), avgRaw(recentRows, "kills"), "decimal", false],
    ["平均Down", avgRaw(allRows, "deaths"), avgRaw(recentRows, "deaths"), "decimal", true],
    ["平均Assist", avgRaw(allRows, "assists"), avgRaw(recentRows, "assists"), "decimal", false],
    ["平均与ダメージ", avgRaw(allRows, "damage"), avgRaw(recentRows, "damage"), "number", false],
    ["平均被ダメージ", avgRaw(allRows, "damageTaken"), avgRaw(recentRows, "damageTaken"), "number", true],
    ["平均回復量", avgRaw(allRows, "healing"), avgRaw(recentRows, "healing"), "number", false],
    ["与ダメージ1位率", rateBy(allRows, row => row.topDamage), rateBy(recentRows, row => row.topDamage), "percent", false]
  ];
  return rows.map(([label, allValue, recentValue, type, lowerBetter]) => comparisonRow(label, allValue, recentValue, type, lowerBetter)).join("");
}

function comparisonRow(label, allValue, recentValue, type, lowerBetter) {
  const diff = recentValue - allValue;
  const same = Math.abs(diff) < 0.0001;
  const sign = same ? "same" : (lowerBetter ? diff < 0 : diff > 0) ? "up" : "down";
  const marker = sign === "up" ? "▲" : sign === "down" ? "▼" : "→";
  const diffText = `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatTypedValue(diff, type, true)}`;
  return `
    <div class="comparison-row ${sign}">
      <span class="comparison-label">${label}</span>
      <span class="comparison-values"><b>${formatTypedValue(allValue, type)}</b><i>→</i><b>${formatTypedValue(recentValue, type)}</b></span>
      <strong><span>${marker}</span> ${diffText}</strong>
    </div>
  `;
}

function rankBar(label, value, total, color) {
  const rate = total ? value / total : 0;
  return `
    <div class="distribution-row">
      <span>${label}</span>
      <div class="distribution-track"><i style="width:${Math.max(rate * 100, value ? 3 : 0)}%;background:${color}"></i></div>
      <strong><b>${formatNumber(value)}戦</b><small>${formatPercent(rate)}</small></strong>
    </div>
  `;
}

function damageDistribution(matches) {
  const bins = [
    ["0〜499,999", 0, 499999],
    ["500,000〜999,999", 500000, 999999],
    ["1,000,000〜1,499,999", 1000000, 1499999],
    ["1,500,000〜1,999,999", 1500000, 1999999],
    ["2,000,000〜2,499,999", 2000000, 2499999],
    ["2,500,000以上", 2500000, Infinity]
  ];
  const counts = bins.map(([label, min, max]) => ({
    label,
    value: matches.filter(match => match.damage >= min && match.damage <= max).length
  }));
  const max = Math.max(...counts.map(row => row.value), 1);
  return counts.map(row => `
    <div class="distribution-row">
      <span>${row.label}</span>
      <div class="distribution-track"><i style="width:${row.value ? Math.max(row.value / max * 100, 4) : 0}%"></i></div>
      <strong><b>${row.value}戦</b><small>${formatPercent(matches.length ? row.value / matches.length : 0)}</small></strong>
    </div>
  `).join("");
}

function rankingPanel(title, stats, selector, type) {
  const rows = [...stats]
    .map(stat => ({ ...stat, rankingValue: selector(stat) }))
    .sort((a, b) => b.rankingValue - a.rankingValue)
    .slice(0, 5);
  return `
    <article class="ranking-panel">
      <h4>${title}</h4>
      <ol class="ranking-list">
        ${rows.length ? rows.map((stat, index) => rankingRow(stat, index, type)).join("") : `<li class="empty-row">データなし</li>`}
      </ol>
    </article>
  `;
}

function rankingRow(stat, index, type) {
  return `
    <li>
      <span class="ranking-order">${index + 1}</span>
      <span class="ranking-name">${jobSprite(stat.id)}<b>${jobName(stat.id)}</b>${stat.matches < 3 ? `<small>参考値</small>` : ""}</span>
      <strong>${formatTypedValue(stat.rankingValue, type)}</strong>
      <em>${stat.matches}戦</em>
    </li>
  `;
}

function mapHighlight(label, stat, type) {
  if (!stat) return `<article class="map-highlight"><span>${label}</span><strong>-</strong><small>データなし</small></article>`;
  const value = type === "firstRate" ? formatPercent(safeRate(stat.firsts, stat.matches)) : formatNumber(stat.avgDamage);
  const note = type === "firstRate" ? `${stat.firsts} / ${stat.matches} 戦` : `${stat.matches}戦の平均`;
  return `<article class="map-highlight"><span>${label}</span><strong>${stat.id}</strong><small>${value} ・ ${note}</small></article>`;
}

function bestMapBy(stats, selector) {
  return stats.reduce((best, stat) => !best || selector(stat) > selector(best) ? stat : best, null);
}

function rateBy(rows, predicate) {
  return rows.length ? rows.filter(predicate).length / rows.length : 0;
}

function safeRate(value, total) {
  return total ? value / total : 0;
}

function kdRatio(rows) {
  const kills = rows.reduce((sum, row) => sum + Number(row.kills || 0), 0);
  const deaths = rows.reduce((sum, row) => sum + Number(row.deaths || 0), 0);
  return deaths ? kills / deaths : kills;
}

function avgKA(rows) {
  return rows.length ? rows.reduce((sum, row) => sum + Number(row.kills || 0) + Number(row.assists || 0), 0) / rows.length : 0;
}

function formatDecimal(value, digits = 1) {
  return Number(value || 0).toLocaleString("ja-JP", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatTypedValue(value, type, signed = false) {
  const numeric = Number(value || 0);
  const absValue = signed ? Math.abs(numeric) : numeric;
  if (type === "percent") return `${Math.round(absValue * 1000) / 10}%`;
  if (type === "number") return formatNumber(absValue);
  return formatDecimal(absValue, 1);
}
