const UI = {
  render(state) {
    const matches = state.matches;
    const summary = Analytics.summarize(matches);
    this.header(matches);
    this.dashboardEmpty(matches);
    this.summaryCards(summary);
    this.averageCards(matches);
    this.latestRows(Analytics.latest(matches));
    this.mapSummary(Analytics.mapStats(matches));
    this.bestRecords(Analytics.bests(matches));
    this.streakRecords(matches);
    this.detailViews(matches, summary);
    this.redrawCharts(state);
  },
  redrawCharts(state) {
    this.charts(state.matches);
  },
  header(matches) {
    const latest = Analytics.latest(matches, 1)[0];
    const lastUpdated = document.querySelector("#lastUpdated");
    const matchNo = document.querySelector("#matchNo");
    if (lastUpdated) lastUpdated.textContent = latest ? latest.date.replaceAll("-", "/") : "-";
    if (matchNo) matchNo.textContent = matches.length;
  },
  dashboardEmpty(matches) {
    const dashboard = document.querySelector("#dashboard");
    const target = document.querySelector("#dashboardEmpty");
    const isEmpty = matches.length === 0;
    dashboard.classList.toggle("is-empty", isEmpty);
    target.innerHTML = isEmpty ? analysisEmpty("戦績データがありません", "まずデータタブからCSVを読み込んでください。初回登録も、2回目以降の追加登録も同じボタンで行えます。") : "";
  },
  summaryCards(summary) {
    const rankTotal = summary.total || 1;
    document.querySelector("#summaryCards").innerHTML = `
      <article class="summary-card">
        <span class="card-label">総試合数</span>
        <div class="card-body"><strong>${formatNumber(summary.total)}</strong><small>試合</small></div>
      </article>
      <article class="summary-card rank-card" style="--r1:${summary.ranks[1] || .01}fr;--r2:${summary.ranks[2] || .01}fr;--r3:${summary.ranks[3] || .01}fr">
        <span class="card-label">順位別回数</span>
        <div class="card-body rank-card-body">
          <div class="rank-breakdown">
            <div>1位<b>${summary.ranks[1]}</b></div>
            <div>2位<b>${summary.ranks[2]}</b></div>
            <div>3位<b>${summary.ranks[3]}</b></div>
          </div>
          <div class="rank-meter"><i></i><i></i><i></i></div>
        </div>
      </article>
      <article class="summary-card">
        <span class="card-label">1位率</span>
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
    if (!matches.length) {
      document.querySelector("#latestRows").innerHTML = `<tr class="latest-empty-row"><td colspan="13">戦績データがありません</td></tr>`;
      return;
    }
    document.querySelector("#latestRows").innerHTML = matches.map((match, index) => `
      <tr>
        <td data-label="No.">${match.matchNo || matches.length - index}</td>
        <td data-label="日付">${escapeHtml(match.date.replaceAll("-", "/"))}</td>
        <td class="latest-map-cell" data-label="マップ">${escapeHtml(match.map)}</td>
        <td data-label="所属勢力">${gcName(match.grandCompany)}</td>
        <td data-label="順位"><span class="rank-badge rank-${match.rank}">${match.rank}位</span></td>
        <td class="latest-job-cell" data-label="ジョブ">${jobIcon(match.job)}${escapeHtml(jobName(match.job))}</td>
        <td data-label="KO">${match.kills}</td>
        <td data-label="Down">${match.deaths}</td>
        <td data-label="Assist">${match.assists}</td>
        <td data-label="与ダメージ" class="${match.topDamage ? "top-damage-cell" : ""}">${formatNumber(match.damage)}</td>
        <td data-label="被ダメージ">${formatNumber(match.damageTaken)}</td>
        <td data-label="回復量">${formatNumber(match.healing)}</td>
        <td data-label="与ダメ1位">${match.topDamage ? "○" : "-"}</td>
      </tr>
    `).join("");
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
    const allJobSegments = buildAllJobUsageSegments(jobStats, matches.length, true);
    const usedJobSegments = allJobSegments.filter(job => job.value > 0);
    const topJobSegments = [...usedJobSegments].sort((a, b) => b.value - a.value).slice(0, 5);
    document.querySelector("#summaryDetail").innerHTML = matches.length
      ? summaryAnalysis(matches, summary)
      : analysisEmpty("総集計", "CSVを読み込むと、全期間平均・直近比較・順位分布・与ダメージ分布を確認できます。");
    document.querySelector("#jobsDetail").innerHTML = matches.length ? `
      <section class="job-analysis-section">
        <h3 class="analysis-section-title">ジョブ使用率</h3>
        <section class="full-job-usage">
          <canvas id="allJobChart" class="full-job-chart" height="390"></canvas>
          <div class="full-job-insights">
            <section class="full-job-panel">
              <h4>全ジョブ使用状況</h4>
              <div id="allJobLegend" class="full-job-legend">${fullJobLegend(allJobSegments)}</div>
            </section>
            <section class="full-job-panel job-top-five">
              <h4>使用回数 TOP5</h4>
              <div class="job-top-five-list">${jobTopFive(topJobSegments)}</div>
            </section>
          </div>
        </section>
      </section>
      ${roleAnalysis(matches)}
      ${jobPerformanceHighlights(jobStats)}
      ${survivalAnalysis(jobStats)}
      <section class="job-analysis-section">
        <h3 class="analysis-section-title">ジョブ別詳細成績</h3>
        ${statCards(jobStats, true, false)}
      </section>
    ` : analysisEmpty("ジョブ別分析", "CSVを読み込むと、ロール使用率・ジョブ実績・被ダメ生存指数を比較できます。");
    document.querySelector("#mapsDetail").innerHTML = mapAnalysis(matches);
    document.querySelector("#bestsDetail").innerHTML = bestAnalysis(matches);
  },
  charts(matches) {
    const activePanel = document.querySelector(".tab-panel.active")?.id || "dashboard";
    if (activePanel === "dashboard") {
      const roleSegments = buildRoleUsageSegments(matches);
      Charts.drawDonut(document.querySelector("#roleChart"), roleSegments, "ロール", { legend: false });
      this.roleUsageList(roleSegments);

      const jobSegments = buildJobUsageSegments(Analytics.jobStats(matches), matches.length);
      Charts.drawDonut(document.querySelector("#jobChart"), jobSegments, "Top 5", { legend: false, icons: true });
      this.jobUsageList(jobSegments);

      const latest = Analytics.latest(matches).reverse();
      Charts.drawLine(document.querySelector("#rankTrendChart"), latest.map(match => match.rank), { min: 1, max: 3, invert: true, yLabels: ["1位", "2位", "3位"] });
      Charts.drawBars(document.querySelector("#damageTrendChart"), latest.map(match => match.damage));
    }

    if (activePanel === "jobs") {
      const jobStats = Analytics.jobStats(matches);
      const allJobChart = document.querySelector("#allJobChart");
      if (allJobChart?.getBoundingClientRect().width > 0) {
        Charts.drawDonut(allJobChart, buildAllJobUsageSegments(jobStats, matches.length), "", { legend: false, icons: true });
      }

      buildRoleAnalysisData(matches).forEach(role => {
        const canvas = document.querySelector(`#roleJobChart-${role.id}`);
        if (canvas?.getBoundingClientRect().width > 0) {
          Charts.drawDonut(canvas, roleJobDonutSegments(role), "", { legend: false, icons: true });
        }
      });

      const survivalScatterChart = document.querySelector("#survivalScatterChart");
      if (survivalScatterChart?.getBoundingClientRect().width > 0) {
        const survivalMetrics = buildSurvivalMetrics(jobStats);
        Charts.drawScatter(survivalScatterChart, survivalMetrics.points, {
          averageX: survivalMetrics.averageDamageTaken,
          averageY: survivalMetrics.averageDowns
        });
      }
    }

    if (activePanel === "summary") {
      const summary = Analytics.summarize(matches);
      const summaryRankChart = document.querySelector("#summaryRankChart");
      if (!summaryRankChart?.getBoundingClientRect().width) return;
      Charts.drawDonut(summaryRankChart, [
        { label: "1位", value: summary.ranks[1], color: "#d5a22e" },
        { label: "2位", value: summary.ranks[2], color: "#8c8a7e" },
        { label: "3位", value: summary.ranks[3], color: "#ad3725" }
      ], `${summary.total}戦`, { legend: false });
    }
  },
  jobUsageList(segments) {
    document.querySelector("#jobUsageList").innerHTML = segments.map(segment => `
      <div class="usage-row" title="${escapeHtml(segment.label)}">
        <span class="usage-swatch" style="background:${segment.color}"></span>
        <span class="usage-name">${escapeHtml(segment.label)}</span>
        <span class="usage-percent">${formatPercent(segment.rate)}</span>
      </div>
    `).join("");
  },
  roleUsageList(segments) {
    document.querySelector("#roleUsageList").innerHTML = segments.map(segment => `
      <div class="usage-row" title="${escapeHtml(segment.label)}">
        <span class="usage-swatch" style="background:${segment.color}"></span>
        <span class="usage-name">${escapeHtml(segment.label)}</span>
        <span class="usage-percent">${formatPercent(segment.rate)}</span>
      </div>
    `).join("");
  }
};

const ASSET_VERSION = "20260722-027";
const MIN_RANKING_MATCHES = 3;

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

function roleAnalysis(matches) {
  const roles = buildRoleAnalysisData(matches);

  return `
    <section class="job-analysis-section">
      <h3 class="analysis-section-title">ロール使用率 <small>全試合比</small></h3>
      <section class="role-usage-overview">
        <div class="role-stacked-bar" aria-label="ロール使用率">
          ${roles.filter(role => role.value > 0).map(role => `
            <span style="--role-color:${role.color};--role-width:${role.rate * 100}%" title="${role.label} ${formatPercent(role.rate)}"></span>
          `).join("")}
        </div>
        <div class="role-stacked-legend">
          ${roles.map(role => `
            <div style="--role-color:${role.color}">
              <span class="role-overview-name"><i></i>${role.label}</span>
              <span class="role-usage-count">${role.value}戦</span>
              <strong>${formatPercent(role.rate)}</strong>
            </div>
          `).join("")}
        </div>
      </section>
    </section>
    <section class="job-analysis-section">
      <h3 class="analysis-section-title">ロール別ジョブ使用率 <small>各ロール内の割合</small></h3>
      <section class="role-job-grid">
        ${roles.map(role => `
          <article class="role-job-panel" style="--role-color:${role.color}">
            <h4><span><i></i>${role.label}</span><small>${role.value}戦 / 全体 ${formatPercent(role.rate)}</small></h4>
            <div class="role-job-donut-layout">
              <canvas id="roleJobChart-${role.id}" class="role-job-donut" height="250"></canvas>
              <div class="role-job-donut-legend">
              ${role.jobs.map(job => `
                <div class="role-job-donut-row${job.value === 0 ? " is-unused" : ""}" style="--job-color:${job.color}">
                  <span class="role-job-icon"><img src="${job.icon}" alt=""></span>
                  <span class="role-job-name">${job.label}</span>
                  <span class="role-job-count">${job.value}戦</span>
                  <strong>${formatPercent(job.rate)}</strong>
                </div>
              `).join("")}
              </div>
            </div>
          </article>
        `).join("")}
      </section>
    </section>
  `;
}

function buildRoleAnalysisData(matches) {
  const totalMatches = matches.length;
  return ROLE_DEFS.map(role => {
    const roleMatches = matches.filter(match => role.jobs.includes(match.job));
    const jobs = role.jobs.map(jobId => {
      const value = roleMatches.filter(match => match.job === jobId).length;
      const colorIndex = Math.max(0, FFXIV_DATA.jobs.findIndex(job => job.id === jobId));
      return {
        id: jobId,
        label: jobName(jobId),
        icon: jobIconSource(jobId),
        color: JOB_COLORS[colorIndex % JOB_COLORS.length],
        value,
        rate: roleMatches.length ? value / roleMatches.length : 0
      };
    }).sort((a, b) => b.value - a.value);
    return {
      ...role,
      value: roleMatches.length,
      rate: totalMatches ? roleMatches.length / totalMatches : 0,
      jobs
    };
  });
}

function roleJobDonutSegments(role) {
  return role.jobs
    .filter(job => job.value > 0)
    .map(job => ({ label: job.label, value: job.value, color: job.color, icon: job.icon }));
}

function jobPerformanceHighlights(stats) {
  return `
    <section class="job-analysis-section">
      <h3 class="analysis-section-title">ジョブ実績 TOP3 <small>1～2試合は参考値</small></h3>
      <section class="job-performance-grid">
        ${jobPerformancePanel("1位率 TOP3", stats, stat => safeRate(stat.firsts, stat.matches), "percent")}
        ${jobPerformancePanel("平均与ダメージ TOP3", stats, stat => stat.avgDamage, "number")}
        ${jobPerformancePanel("平均Assist TOP3", stats, stat => stat.avgAssists, "decimal")}
      </section>
    </section>
  `;
}

function jobPerformancePanel(title, stats, selector, type) {
  const rows = [...stats]
    .map(stat => ({ ...stat, rankingValue: selector(stat) }))
    .sort((a, b) => b.rankingValue - a.rankingValue || b.matches - a.matches)
    .slice(0, 3);
  return `
    <article class="ranking-panel job-performance-panel">
      <h4>${title}</h4>
      <ol class="ranking-list">
        ${rows.length ? rows.map((stat, index) => jobPerformanceRow(stat, index, type)).join("") : `<li class="empty-row">データなし</li>`}
      </ol>
    </article>
  `;
}

function jobPerformanceRow(stat, index, type) {
  return `
    <li>
      <span class="ranking-order">${index + 1}</span>
      <span class="ranking-name">${jobIcon(stat.id)}<b>${escapeHtml(jobName(stat.id))}</b>${stat.matches < 3 ? `<small>参考値</small>` : ""}</span>
      <strong>${formatTypedValue(stat.rankingValue, type)}</strong>
      <em>${stat.matches}戦</em>
    </li>
  `;
}

function buildSurvivalMetrics(stats) {
  const totalMatches = stats.reduce((sum, stat) => sum + stat.matches, 0);
  const totalDamageTaken = stats.reduce((sum, stat) => sum + stat.avgDamageTaken * stat.matches, 0);
  const totalDowns = stats.reduce((sum, stat) => sum + stat.avgDeaths * stat.matches, 0);
  const baseline = totalMatches + totalDowns ? totalDamageTaken / (totalMatches + totalDowns) : 0;
  const points = stats.map(stat => {
    const survivalValue = statDamageSurvivalValue(stat);
    return {
      id: stat.id,
      label: jobName(stat.id),
      icon: jobIconSource(stat.id),
      matches: stat.matches,
      x: stat.avgDamageTaken,
      y: stat.avgDeaths,
      survivalValue,
      survivalIndex: baseline ? survivalValue / baseline * 100 : 0
    };
  });
  return {
    baseline,
    points,
    averageDamageTaken: totalMatches ? totalDamageTaken / totalMatches : 0,
    averageDowns: totalMatches ? totalDowns / totalMatches : 0
  };
}

function survivalAnalysis(stats) {
  const metrics = buildSurvivalMetrics(stats);
  const top = [...metrics.points]
    .sort((a, b) => b.survivalIndex - a.survivalIndex || b.matches - a.matches)
    .slice(0, 3);
  return `
    <section class="job-analysis-section">
      <h3 class="analysis-section-title">被ダメージとDownの関係 <small>右上ほど高被ダメージ・低Down</small></h3>
      <section class="survival-analysis-grid">
        <article class="survival-scatter-panel">
          <h4>平均被ダメージ × 平均Down</h4>
          <canvas id="survivalScatterChart" height="520"></canvas>
          <p>破線は全試合平均。1～2試合のジョブは半透明で表示します。</p>
        </article>
        <article class="survival-index-panel">
          <h4>被ダメ生存指数 TOP3</h4>
          <ol class="ranking-list survival-index-list">
            ${top.length ? top.map((point, index) => survivalIndexRow(point, index)).join("") : `<li class="empty-row">データなし</li>`}
          </ol>
          <aside class="survival-index-guide" aria-label="被ダメ生存指数の説明">
            <strong>計算式</strong>
            <code>被ダメ生存値 = 被ダメージ合計 ÷（試合数 + Down合計）</code>
            <code>生存指数 = ジョブ別被ダメ生存値 ÷ 全試合の被ダメ生存値 × 100</code>
            <span>全試合平均を100とし、100より高いほど少ないDownで多くの攻撃を引き受けた目安です。ジョブ・ロール特性や味方からの支援にも左右されるため、他の戦績とあわせて確認してください。</span>
          </aside>
        </article>
      </section>
    </section>
  `;
}

function statDamageSurvivalValue(stat) {
  return stat.avgDamageTaken / (1 + stat.avgDeaths);
}

function survivalIndexRow(point, index) {
  return `
    <li class="survival-index-row">
      <span class="ranking-order">${index + 1}</span>
      <span class="ranking-name">${jobIcon(point.id)}<b>${escapeHtml(point.label)}</b>${point.matches < 3 ? `<small>参考値</small>` : ""}</span>
      <strong>指数 ${Math.round(point.survivalIndex)}</strong>
      <em>${point.matches}戦</em>
      <span class="survival-index-detail">被ダメ生存値 ${formatNumber(point.survivalValue)}</span>
    </li>
  `;
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

function buildAllJobUsageSegments(stats, totalMatches, includeUnused = false) {
  const statMap = new Map(stats.map(stat => [stat.id, stat]));
  const segments = FFXIV_DATA.jobs.map((job, index) => {
    const stat = statMap.get(job.id);
    const value = stat ? stat.matches : 0;
    return {
      id: job.id,
      label: job.name,
      value,
      rate: totalMatches ? value / totalMatches : 0,
      color: JOB_COLORS[index % JOB_COLORS.length],
      icon: jobIconSource(job.id)
    };
  });
  return includeUnused ? segments : segments.filter(job => job.value > 0);
}

function fullJobLegend(segments) {
  return segments.map(segment => `
    <div class="full-job-row${segment.value === 0 ? " is-unused" : ""}" title="${escapeHtml(segment.label)}">
      <span class="usage-swatch" style="background:${segment.color}"></span>
      <span class="usage-name">${escapeHtml(segment.label)}</span>
      <span class="full-job-count">${segment.value}戦</span>
      <span class="full-job-rate">${formatPercent(segment.rate)}</span>
    </div>
  `).join("");
}

function jobTopFive(segments) {
  if (!segments.length) return `<p class="job-top-empty">戦績データがありません</p>`;
  const max = Math.max(...segments.map(segment => segment.value), 1);
  return segments.map((segment, index) => `
    <div class="job-top-row">
      <span class="job-top-rank">${index + 1}</span>
      <span class="job-top-icon"><img src="${segment.icon}" alt=""></span>
      <span class="job-top-name">${escapeHtml(segment.label)}</span>
      <span class="job-top-bar"><i style="--usage-width:${segment.value / max * 100}%"></i></span>
      <span class="job-top-count">${segment.value}戦</span>
      <strong>${formatPercent(segment.rate)}</strong>
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
  if (!job?.icon) return `<span class="job-icon" title="${escapeHtml(id)}">${escapeHtml(String(id || "").slice(0, 2))}</span>`;
  return `<span class="job-icon" title="${escapeHtml(job.name)}"><img src="./assets/job-icons/${encodeURIComponent(job.icon)}?v=${ASSET_VERSION}" alt="${escapeHtml(job.name)}"></span>`;
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
      <span class="job-stat-name">${escapeHtml(jobName(id))}</span>
    </div>
  `;
}
function gcName(name) {
  const cls = name === "黒渦団" ? "maelstrom-text" : name === "双蛇党" ? "adders-text" : "flames-text";
  return `<span class="gc-name ${cls}">${escapeHtml(name)}</span>`;
}
function recordRow(label, match, key) {
  if (!match) return `<div class="record-item"><span>${label}</span><strong>-</strong></div>`;
  return `<button type="button" class="record-item record-match-link" data-match-id="${escapeHtml(match.id)}" aria-label="${escapeHtml(label)}の試合詳細を開く"><span>${label}</span><strong>${formatNumber(match[key])} <small>(${escapeHtml(jobName(match.job))})</small></strong></button>`;
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
        <div class="stat-card-sub${compact ? "" : " stat-card-sub-detail"}">
          ${compact ? `<span>平均与ダメ ${formatNumber(stat.avgDamage)}</span>` : `
            <span class="stat-card-sub-primary"><small>平均与ダメ</small><b>${formatNumber(stat.avgDamage)}</b></span>
            <span><small>平均Assist</small><b>${formatDecimal(stat.avgAssists, 1)}</b></span>
            <span><small>被ダメ生存値</small><b>${formatNumber(statDamageSurvivalValue(stat))}</b></span>
          `}
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
      <td>${showJob ? `${jobIcon(stat.id)}${escapeHtml(jobName(stat.id))}` : escapeHtml(stat.id)}</td>
      <td>${stat.matches}</td>
      <td>${stat.firsts}</td>
      <td class="${stat.firsts ? "rank-1" : ""}">${formatPercent(stat.firsts / stat.matches)}</td>
      <td>${stat.topDamage}</td>
      <td>${formatNumber(stat.avgDamage)}</td>
    </tr>`).join("")}
  </tbody></table></div>`;
}

function mapAnalysis(matches) {
  if (!matches.length) return analysisEmpty("マップ別分析", "CSVを読み込むと、マップごとの1位率・戦闘傾向・使用ジョブを比較できます。");
  const stats = Analytics.mapStats(matches).map(stat => enrichMapStat(stat, matches));
  const eligibleStats = stats.filter(stat => stat.matches >= MIN_RANKING_MATCHES);
  const comparisonStats = eligibleStats.length ? eligibleStats : stats;
  const mostPlayed = bestBy(stats, stat => stat.matches);
  const bestFirstRate = bestBy(comparisonStats, stat => stat.firstRate);
  const bestDamage = bestBy(comparisonStats, stat => stat.avgDamage);
  const bestSurvival = bestBy(comparisonStats, stat => stat.survivalValue);
  return `
    <div class="analysis-page map-analysis-page">
      <section class="analysis-block">
        <h3>マップサマリー <small>3試合以上のマップを優先</small></h3>
        <div class="map-insight-grid">
          ${mapInsightCard("最多出撃", mostPlayed, `${mostPlayed.matches}戦`, formatPercent(mostPlayed.matches / matches.length))}
          ${mapInsightCard("1位率トップ", bestFirstRate, formatPercent(bestFirstRate.firstRate), `${bestFirstRate.firsts} / ${bestFirstRate.matches}戦`)}
          ${mapInsightCard("平均与ダメージトップ", bestDamage, formatNumber(bestDamage.avgDamage), `${bestDamage.matches}戦の平均`)}
          ${mapInsightCard("被ダメ生存値トップ", bestSurvival, formatNumber(bestSurvival.survivalValue), `${bestSurvival.matches}戦の集計`)}
        </div>
      </section>

      <section class="analysis-block">
        <h3>マップ別詳細 <small>勝敗・戦闘平均・使用ジョブ</small></h3>
        <div class="map-detail-grid">
          ${stats.map(mapDetailCard).join("")}
        </div>
        <aside class="map-survival-note">
          <strong>被ダメ生存値</strong>
          <code>被ダメージ合計 ÷（試合数 + Down合計）</code>
          <span>値が高いほど、少ないDownで多くの攻撃を引き受けた目安です。マップごとの交戦量や使用ジョブもあわせて確認してください。</span>
        </aside>
      </section>
    </div>
  `;
}

function enrichMapStat(stat, matches) {
  const rows = matches.filter(match => match.map === stat.id);
  const jobCounts = new Map();
  rows.forEach(row => jobCounts.set(row.job, (jobCounts.get(row.job) || 0) + 1));
  const topJobs = [...jobCounts.entries()]
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value || jobName(a.id).localeCompare(jobName(b.id), "ja"))
    .slice(0, 3);
  return {
    ...stat,
    rows,
    firstRate: safeRate(stat.firsts, stat.matches),
    topDamageRate: safeRate(stat.topDamage, stat.matches),
    survivalValue: damageSurvivalValue(rows),
    topJobs
  };
}

function mapInsightCard(label, stat, value, note) {
  return `
    <article class="map-insight-card">
      <span>${label}</span>
      <strong>${escapeHtml(stat.id)}</strong>
      <b>${value}</b>
      <small>${note}${stat.matches < 3 ? "・参考値" : ""}</small>
    </article>
  `;
}

function mapDetailCard(stat) {
  return `
    <article class="map-detail-card">
      <header>
        <h4>${escapeHtml(stat.id)}</h4>
        <span>${stat.matches}戦${stat.matches < 3 ? "・参考値" : ""}</span>
      </header>
      <div class="map-rate-list">
        ${mapRateRow("1位率", stat.firstRate, `${stat.firsts}戦`)}
        ${mapRateRow("与ダメ1位率", stat.topDamageRate, `${stat.topDamage}戦`)}
      </div>
      <div class="map-stat-grid">
        ${mapStatCell("平均KO", formatDecimal(stat.avgKills, 1))}
        ${mapStatCell("平均Down", formatDecimal(stat.avgDeaths, 1))}
        ${mapStatCell("平均Assist", formatDecimal(stat.avgAssists, 1))}
        ${mapStatCell("平均与ダメ", formatNumber(stat.avgDamage))}
        ${mapStatCell("平均被ダメ", formatNumber(stat.avgDamageTaken))}
        ${mapStatCell("平均回復量", formatNumber(stat.avgHealing))}
        ${mapStatCell("被ダメ生存値", formatNumber(stat.survivalValue))}
      </div>
      <div class="map-top-jobs">
        <span>使用ジョブ TOP3</span>
        <div>${stat.topJobs.map(job => `<b>${jobIcon(job.id)}${escapeHtml(jobName(job.id))} <small>${job.value}戦</small></b>`).join("") || `<em>データなし</em>`}</div>
      </div>
    </article>
  `;
}

function mapRateRow(label, rate, countText) {
  return `
    <div class="map-rate-row" style="--metric-width:${Math.max(0, Math.min(100, rate * 100))}%">
      <span>${label}</span><i><b></b></i><strong>${formatPercent(rate)}</strong><small>${countText}</small>
    </div>
  `;
}

function mapStatCell(label, value) {
  return `<span><small>${label}</small><strong>${value}</strong></span>`;
}

function bestAnalysis(matches) {
  if (!matches.length) return analysisEmpty("自己ベスト", "CSVを読み込むと、最高記録・カテゴリ別TOP3・記録更新履歴を確認できます。");
  const definitions = bestMetricDefinitions();
  return `
    <div class="analysis-page best-analysis-page">
      <section class="analysis-block">
        <h3>自己ベスト記録 <small>記録時の試合情報</small></h3>
        <div class="best-record-grid">
          ${definitions.map(definition => bestRecordCard(definition, bestMatchBy(matches, definition))).join("")}
        </div>
      </section>

      <section class="analysis-block">
        <h3>カテゴリ別 TOP3 <small>単試合記録</small></h3>
        <div class="best-ranking-grid">
          ${definitions.filter(definition => definition.showRanking).map(definition => bestRankingPanel(definition, matches)).join("")}
        </div>
      </section>

      <section class="analysis-block">
        <h3>自己ベスト更新履歴 <small>新記録を達成した試合</small></h3>
        <div class="record-timeline">
          ${recordProgression(matches, definitions)}
        </div>
      </section>
    </div>
  `;
}

function bestMetricDefinitions() {
  return [
    { id: "damage", label: "最高与ダメージ", type: "number", value: match => Number(match.damage || 0), showRanking: true },
    { id: "damageTaken", label: "最大被ダメージ（参考記録）", type: "number", value: match => Number(match.damageTaken || 0), showRanking: false },
    { id: "healing", label: "最高回復量", type: "number", value: match => Number(match.healing || 0), showRanking: true },
    { id: "kills", label: "最高KO", type: "integer", value: match => Number(match.kills || 0), showRanking: true },
    { id: "assists", label: "最高Assist", type: "integer", value: match => Number(match.assists || 0), showRanking: true },
    { id: "survival", label: "最高被ダメ生存値", type: "number", value: matchSurvivalValue, showRanking: true }
  ];
}

function bestMatchBy(matches, definition) {
  return [...matches].sort((a, b) => definition.value(b) - definition.value(a) || compareMatchesNewest(a, b))[0] || null;
}

function bestRecordCard(definition, match) {
  const value = match ? definition.value(match) : 0;
  return `
    <button type="button" class="best-record-card record-match-link" data-match-id="${escapeHtml(match.id)}" aria-label="${escapeHtml(definition.label)}の試合詳細を開く">
      <span>${definition.label}</span>
      <strong>${formatBestValue(value, definition.type)}</strong>
      <div class="best-record-context">
        <b>${jobIcon(match.job)}${escapeHtml(jobName(match.job))}</b>
        <small>${escapeHtml(match.date.replaceAll("-", "/"))} ${escapeHtml(match.time || "")}</small>
        <small>${escapeHtml(match.map)}・${match.rank}位</small>
      </div>
    </button>
  `;
}

function bestRankingPanel(definition, matches) {
  const rows = [...matches]
    .sort((a, b) => definition.value(b) - definition.value(a) || compareMatchesNewest(a, b))
    .slice(0, 3);
  return `
    <article class="best-ranking-panel">
      <h4>${definition.label}</h4>
      <ol>
        ${rows.map((match, index) => `
          <li>
            <button type="button" class="best-ranking-link record-match-link" data-match-id="${escapeHtml(match.id)}" aria-label="${index + 1}位の試合詳細を開く">
              <span>${index + 1}</span>
              <b>${jobIcon(match.job)}${escapeHtml(jobName(match.job))}</b>
              <strong>${formatBestValue(definition.value(match), definition.type)}</strong>
              <small>${escapeHtml(match.date.replaceAll("-", "/"))}・${escapeHtml(match.map)}</small>
            </button>
          </li>
        `).join("")}
      </ol>
    </article>
  `;
}

function recordProgression(matches, definitions) {
  const records = new Map();
  const events = [];
  Analytics.byDate(matches).forEach(match => {
    definitions.forEach(definition => {
      const value = definition.value(match);
      const previous = records.get(definition.id) || 0;
      if (value > previous) {
        records.set(definition.id, value);
        events.push({ definition, match, value });
      }
    });
  });
  return events.reverse().slice(0, 16).map(event => `
    <button type="button" class="record-timeline-row record-match-link" data-match-id="${escapeHtml(event.match.id)}" aria-label="${escapeHtml(event.definition.label)}を更新した試合の詳細を開く">
      <time>${escapeHtml(event.match.date.replaceAll("-", "/"))}<small>${escapeHtml(event.match.time || "")}</small></time>
      <span>${event.definition.label}</span>
      <strong>${formatBestValue(event.value, event.definition.type)}</strong>
      <b>${jobIcon(event.match.job)}${escapeHtml(jobName(event.match.job))}</b>
      <small>${escapeHtml(event.match.map)}・${event.match.rank}位</small>
    </button>
  `).join("") || `<p class="history-empty">更新履歴がありません</p>`;
}

function matchDetailContent(match) {
  const survivalValue = matchSurvivalValue(match);
  return `
    <section class="match-detail-summary">
      <div><small>試合 No.</small><strong>${formatNumber(match.matchNo)}</strong></div>
      <div><small>日時</small><strong>${escapeHtml(match.date.replaceAll("-", "/"))}<span>${escapeHtml(match.time || "-")}</span></strong></div>
      <div><small>マップ</small><strong>${escapeHtml(match.map)}</strong></div>
    </section>
    <section class="match-detail-identity">
      <div><small>所属勢力</small><strong>${gcName(match.grandCompany)}</strong></div>
      <div><small>順位</small><strong><span class="rank-badge rank-${match.rank}">${match.rank}位</span></strong></div>
      <div><small>ジョブ</small><strong>${jobIcon(match.job)}${escapeHtml(jobName(match.job))}</strong></div>
    </section>
    <section class="match-detail-stats">
      ${matchDetailStat("KO", match.kills)}
      ${matchDetailStat("Down", match.deaths)}
      ${matchDetailStat("Assist", match.assists)}
      ${matchDetailStat("与ダメージ", match.damage, match.topDamage ? "与ダメージ1位" : "")}
      ${matchDetailStat("被ダメージ", match.damageTaken)}
      ${matchDetailStat("回復量", match.healing)}
      ${matchDetailStat("被ダメ生存値", survivalValue)}
    </section>
  `;
}

function matchDetailStat(label, value, badge = "") {
  return `<div class="match-detail-stat${badge ? " match-detail-stat-highlight" : ""}"><small>${label}</small><strong>${formatNumber(value)}</strong>${badge ? `<span>${badge}</span>` : ""}</div>`;
}

function matchSurvivalValue(match) {
  return Number(match.damageTaken || 0) / (1 + Number(match.deaths || 0));
}

function formatBestValue(value, type) {
  return type === "integer" ? formatNumber(Math.round(value)) : formatNumber(value);
}

function compareMatchesNewest(a, b) {
  return `${b.date}|${b.time || ""}|${b.matchNo || 0}`.localeCompare(`${a.date}|${a.time || ""}|${a.matchNo || 0}`);
}

function bestBy(rows, selector) {
  return [...rows].sort((a, b) => selector(b) - selector(a) || b.matches - a.matches)[0];
}

function analysisEmpty(title, message) {
  return `
    <section class="analysis-empty">
      <strong>${title}</strong>
      <p>${message}</p>
      <button type="button" data-open-tab="data">データタブを開く</button>
    </section>
  `;
}

function summaryAnalysis(matches, summary) {
  const total = summary.total || 0;
  const rankTotal = total || 1;
  const topDamageRate = total ? summary.topDamage / total : 0;
  const currentStreak = Analytics.currentStreak(matches);
  const latest = Analytics.latest(matches, Math.min(10, matches.length));
  return `
    <div class="analysis-page">
      <section class="analysis-block">
        <h3>全期間サマリー</h3>
        <div class="analysis-summary-grid">
          ${analysisMetric("総試合数", formatNumber(total), "試合", "featured")}
          ${analysisMetric("1位数", formatNumber(summary.ranks[1]), "回")}
          ${analysisMetric("1位率", formatPercent(summary.firstRate), `${summary.ranks[1]} / ${total || 0} 試合`)}
          ${analysisMetric("与ダメージ1位数", formatNumber(summary.topDamage), "回")}
          ${analysisMetric("与ダメージ1位率", formatPercent(topDamageRate), `${summary.topDamage} / ${total || 0} 試合`)}
          ${analysisMetric("最大連勝", formatNumber(summary.maxWinStreak), "試合")}
          ${analysisMetric("現在の連勝", formatNumber(currentStreak), "試合")}
        </div>
      </section>

      <section class="analysis-block">
        <h3>平均戦績</h3>
        <div class="analysis-average-grid">
          ${averageMetricCard("平均KO", avgText(matches, "kills"))}
          ${averageMetricCard("平均Down", avgText(matches, "deaths"))}
          ${averageMetricCard("平均Assist", avgText(matches, "assists"))}
          ${averageMetricCard("平均与ダメージ", formatNumber(avgRaw(matches, "damage")))}
          ${averageMetricCard("平均被ダメージ", formatNumber(avgRaw(matches, "damageTaken")))}
          ${averageMetricCard("平均回復量", formatNumber(avgRaw(matches, "healing")))}
          ${averageMetricCard("K/D比", formatDecimal(kdRatio(matches), 2))}
          ${averageMetricCard("被ダメ生存値", formatNumber(damageSurvivalValue(matches)))}
        </div>
        <aside class="survival-value-guide" aria-label="被ダメ生存値の説明">
          <strong>被ダメ生存値とは</strong>
          <code>被ダメージ合計 ÷（試合数 + Down合計）</code>
          <span>1回の生存機会あたりに受け止めた被ダメージ量の目安です。値が高いほど、少ないDownで多くの攻撃を引き受けています。ジョブ・ロール特性や味方からの支援にも左右されるため、他の戦績とあわせて確認してください。</span>
        </aside>
      </section>

      <section class="analysis-block">
        <h3>直近比較 <small>全期間 vs 直近${latest.length || 0}戦</small></h3>
        <div class="comparison-list comparison-grid">
          ${comparisonRows(matches, latest)}
        </div>
      </section>

      <section class="analysis-two-column">
        <article class="analysis-block">
          <h3>順位分布</h3>
          <div class="summary-rank-layout">
            <canvas id="summaryRankChart" height="270"></canvas>
            <div class="summary-rank-legend">
              ${rankLegendRow("1位", summary.ranks[1], rankTotal, "#d5a22e")}
              ${rankLegendRow("2位", summary.ranks[2], rankTotal, "#8c8a7e")}
              ${rankLegendRow("3位", summary.ranks[3], rankTotal, "#ad3725")}
            </div>
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
        <h3>1位時 vs 非1位時</h3>
        <div class="outcome-comparison">
          ${outcomeComparison(matches)}
        </div>
      </section>

      <section class="analysis-block">
        ${recentHistory(matches)}
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
    ["1位率", rateBy(allRows, row => row.rank === 1), rateBy(recentRows, row => row.rank === 1), "percent", "higher"],
    ["平均KO", avgRaw(allRows, "kills"), avgRaw(recentRows, "kills"), "decimal", "higher"],
    ["平均Down", avgRaw(allRows, "deaths"), avgRaw(recentRows, "deaths"), "decimal", "lower"],
    ["平均Assist", avgRaw(allRows, "assists"), avgRaw(recentRows, "assists"), "decimal", "higher"],
    ["平均与ダメージ", avgRaw(allRows, "damage"), avgRaw(recentRows, "damage"), "number", "higher"],
    ["平均被ダメージ", avgRaw(allRows, "damageTaken"), avgRaw(recentRows, "damageTaken"), "number", "neutral"],
    ["平均回復量", avgRaw(allRows, "healing"), avgRaw(recentRows, "healing"), "number", "neutral"],
    ["被ダメ生存値", damageSurvivalValue(allRows), damageSurvivalValue(recentRows), "number", "higher"],
    ["与ダメージ1位率", rateBy(allRows, row => row.topDamage), rateBy(recentRows, row => row.topDamage), "percent", "higher"]
  ];
  return rows.map(([label, allValue, recentValue, type, direction]) => comparisonRow(label, allValue, recentValue, type, direction)).join("");
}

function comparisonRow(label, allValue, recentValue, type, direction) {
  const diff = recentValue - allValue;
  const same = Math.abs(diff) < 0.0001;
  const sign = same
    ? "same"
    : direction === "neutral"
      ? "neutral"
      : (direction === "lower" ? diff < 0 : diff > 0) ? "up" : "down";
  const marker = sign === "up" ? "▲" : sign === "down" ? "▼" : sign === "neutral" ? "↕" : "→";
  const diffText = `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatTypedValue(diff, type, true)}`;
  return `
    <div class="comparison-row ${sign}">
      <span class="comparison-label">${label}</span>
      <span class="comparison-values"><b>${formatTypedValue(allValue, type)}</b><i>→</i><b>${formatTypedValue(recentValue, type)}</b></span>
      <strong><span>${marker}</span> ${diffText}</strong>
    </div>
  `;
}

function rankLegendRow(label, value, total, color) {
  const rate = total ? value / total : 0;
  return `
    <div class="summary-rank-row">
      <i style="background:${color}"></i>
      <span>${label}</span>
      <strong>${formatNumber(value)}戦</strong>
      <b>${formatPercent(rate)}</b>
    </div>
  `;
}

function outcomeComparison(matches) {
  const firstRows = matches.filter(match => match.rank === 1);
  const otherRows = matches.filter(match => match.rank !== 1);
  const rows = [
    ["平均与ダメージ", avgRaw(firstRows, "damage"), avgRaw(otherRows, "damage"), "number", "higher"],
    ["平均Assist", avgRaw(firstRows, "assists"), avgRaw(otherRows, "assists"), "decimal", "higher"],
    ["平均Down", avgRaw(firstRows, "deaths"), avgRaw(otherRows, "deaths"), "decimal", "lower"],
    ["被ダメ生存値", damageSurvivalValue(firstRows), damageSurvivalValue(otherRows), "number", "higher"]
  ];
  return `
    <div class="outcome-header">
      <span>指標</span><span>1位時</span><span>非1位時</span><span>差</span>
    </div>
    ${rows.map(row => outcomeComparisonRow(row, firstRows.length, otherRows.length)).join("")}
    <p class="outcome-note">1位 ${firstRows.length}戦 ／ 非1位 ${otherRows.length}戦</p>
  `;
}

function outcomeComparisonRow([label, firstValue, otherValue, type, direction], firstCount, otherCount) {
  const hasBoth = firstCount > 0 && otherCount > 0;
  const diff = firstValue - otherValue;
  const same = Math.abs(diff) < 0.0001;
  const sign = !hasBoth || same ? "same" : (direction === "lower" ? diff < 0 : diff > 0) ? "up" : "down";
  const marker = sign === "up" ? "▲" : sign === "down" ? "▼" : "→";
  const diffText = hasBoth ? `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${formatTypedValue(diff, type, true)}` : "-";
  return `
    <div class="outcome-row ${sign}">
      <span>${label}</span>
      <strong>${firstCount ? formatTypedValue(firstValue, type) : "-"}</strong>
      <strong>${otherCount ? formatTypedValue(otherValue, type) : "-"}</strong>
      <b>${marker} ${diffText}</b>
    </div>
  `;
}

function damageSurvivalValue(rows) {
  const totalDamageTaken = rows.reduce((sum, row) => sum + Number(row.damageTaken || 0), 0);
  const totalDowns = rows.reduce((sum, row) => sum + Number(row.deaths || 0), 0);
  const opportunities = rows.length + totalDowns;
  return opportunities ? totalDamageTaken / opportunities : 0;
}

function recentHistory(matches) {
  const rows = Analytics.latest(matches, 100);
  return `
    <details class="recent-history">
      <summary><span>直近100試合の戦績一覧</span><strong>${rows.length}件</strong></summary>
      <div class="history-list">
        <div class="history-row history-row-header">
          <span>No.</span><span>日時</span><span>マップ</span><span>所属</span><span>順位</span><span>ジョブ</span>
          <span>KO</span><span>Down</span><span>Assist</span><span>与ダメ</span><span>被ダメ</span><span>回復</span><span>与ダメ1位</span>
        </div>
        ${rows.length ? rows.map(historyRow).join("") : `<p class="history-empty">戦績データがありません</p>`}
      </div>
    </details>
  `;
}

function historyRow(match) {
  return `
    <article class="history-row${match.rank === 1 ? " is-first" : ""}">
      <span data-label="No.">${match.matchNo || "-"}</span>
      <span data-label="日時">${escapeHtml(match.date.replaceAll("-", "/"))} ${escapeHtml(match.time || "-")}</span>
      <span class="history-map" data-label="マップ">${escapeHtml(match.map)}</span>
      <span data-label="所属">${gcName(match.grandCompany)}</span>
      <span data-label="順位"><span class="rank-badge rank-${match.rank}">${match.rank}位</span></span>
      <span class="history-job" data-label="ジョブ">${jobIcon(match.job)}${escapeHtml(jobName(match.job))}</span>
      <span data-label="KO">${match.kills}</span>
      <span data-label="Down">${match.deaths}</span>
      <span data-label="Assist">${match.assists}</span>
      <span data-label="与ダメ" class="${match.topDamage ? "top-damage-cell" : ""}">${formatNumber(match.damage)}</span>
      <span data-label="被ダメ">${formatNumber(match.damageTaken)}</span>
      <span data-label="回復">${formatNumber(match.healing)}</span>
      <span data-label="与ダメ1位">${match.topDamage ? "○" : "-"}</span>
    </article>
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
      <span class="ranking-name">${jobSprite(stat.id)}<b>${escapeHtml(jobName(stat.id))}</b>${stat.matches < 3 ? `<small>参考値</small>` : ""}</span>
      <strong>${formatTypedValue(stat.rankingValue, type)}</strong>
      <em>${stat.matches}戦</em>
    </li>
  `;
}

function mapHighlight(label, stat, type) {
  if (!stat) return `<article class="map-highlight"><span>${label}</span><strong>-</strong><small>データなし</small></article>`;
  const value = type === "firstRate" ? formatPercent(safeRate(stat.firsts, stat.matches)) : formatNumber(stat.avgDamage);
  const note = type === "firstRate" ? `${stat.firsts} / ${stat.matches} 戦` : `${stat.matches}戦の平均`;
  return `<article class="map-highlight"><span>${label}</span><strong>${escapeHtml(stat.id)}</strong><small>${value} ・ ${note}</small></article>`;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}
