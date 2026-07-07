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
    document.querySelector("#summaryDetail").innerHTML = `
      <div class="detail-grid">
        ${detailCard("総試合数", formatNumber(summary.total))}
        ${detailCard("1位 / 2位 / 3位", `${summary.ranks[1]} / ${summary.ranks[2]} / ${summary.ranks[3]}`)}
        ${detailCard("与ダメ1位数", formatNumber(summary.topDamage))}
        ${detailCard("平均KO/Down/A", `${avgText(matches, "kills")} / ${avgText(matches, "deaths")} / ${avgText(matches, "assists")}`)}
        ${detailCard("平均与ダメ", formatNumber(avgRaw(matches, "damage")))}
        ${detailCard("平均回復", formatNumber(avgRaw(matches, "healing")))}
      </div>`;
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
    const rankTotal = summary.total || 1;
    Charts.drawDonut(document.querySelector("#rankChart"), [
      { label: "1位", value: summary.ranks[1], rate: summary.ranks[1] / rankTotal, color: "#d5a22e" },
      { label: "2位", value: summary.ranks[2], rate: summary.ranks[2] / rankTotal, color: "#8c8a7e" },
      { label: "3位", value: summary.ranks[3], rate: summary.ranks[3] / rankTotal, color: "#ad3725" }
    ], "", { legendPosition: "right", showRate: true });

    const jobSegments = buildJobUsageSegments(Analytics.jobStats(matches), matches.length);
    Charts.drawDonut(document.querySelector("#jobChart"), jobSegments, "Top 5", { legend: false });
    this.jobUsageList(jobSegments);

    const allJobChart = document.querySelector("#allJobChart");
    if (allJobChart && allJobChart.getBoundingClientRect().width > 0) {
      Charts.drawDonut(allJobChart, buildAllJobUsageSegments(Analytics.jobStats(matches), matches.length), "All Jobs", { legend: false });
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
  }
};

const JOB_COLORS = [
  "#9b2f24", "#b15a2a", "#c08c2f", "#8f8a3a", "#6f8c42", "#3f8b59", "#2f806e",
  "#2f6969", "#2d6386", "#34518f", "#51468f", "#6a438d", "#8c4b75", "#a0485a",
  "#b05c74", "#c07b55", "#9e7050", "#7c6f68", "#6c675c", "#8c8a7e", "#d5a22e"
];

function buildJobUsageSegments(stats, totalMatches) {
  const top = stats.slice(0, 5).map((job, index) => ({
    label: jobName(job.id),
    value: job.matches,
    rate: totalMatches ? job.matches / totalMatches : 0,
    color: JOB_COLORS[index]
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
      color: JOB_COLORS[index % JOB_COLORS.length]
    };
  });
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
  return `<span class="job-icon" title="${job.name}"><img src="./assets/job-icons/${job.icon}" alt="${job.name}"></span>`;
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
        <div class="stat-card-title">${showJob ? `${jobIcon(stat.id)}${jobName(stat.id)}` : stat.id}</div>
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
