const Analytics = {
  summarize(matches) {
    const total = matches.length;
    const ranks = { 1: 0, 2: 0, 3: 0 };
    let topDamage = 0;
    for (const match of matches) {
      ranks[match.rank] += 1;
      if (match.topDamage) topDamage += 1;
    }
    return {
      total,
      ranks,
      firstRate: total ? ranks[1] / total : 0,
      topDamage,
      maxWinStreak: this.maxWinStreak(matches)
    };
  },
  maxWinStreak(matches) {
    let best = 0;
    let current = 0;
    for (const match of this.byDate(matches)) {
      current = match.rank === 1 ? current + 1 : 0;
      best = Math.max(best, current);
    }
    return best;
  },
  currentStreak(matches) {
    let current = 0;
    const sorted = this.byDate(matches).reverse();
    for (const match of sorted) {
      if (match.rank !== 1) break;
      current += 1;
    }
    return current;
  },
  byDate(matches) {
    return [...matches].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare) return dateCompare;
      const timeCompare = String(a.time || "").localeCompare(String(b.time || ""));
      if (timeCompare) return timeCompare;
      return (a.matchNo || 0) - (b.matchNo || 0);
    });
  },
  latest(matches, count = 10) {
    return this.byDate(matches).reverse().slice(0, count);
  },
  jobStats(matches) {
    return this.groupStats(matches, "job").sort((a, b) => b.matches - a.matches);
  },
  mapStats(matches) {
    return this.groupStats(matches, "map").sort((a, b) => b.matches - a.matches);
  },
  groupStats(matches, key) {
    const map = new Map();
    for (const match of matches) {
      const id = match[key];
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(match);
    }
    return [...map.entries()].map(([id, rows]) => {
      const total = rows.length;
      return {
        id,
        matches: total,
        firsts: rows.filter(row => row.rank === 1).length,
        topDamage: rows.filter(row => row.topDamage).length,
        avgRank: avg(rows, "rank"),
        avgKills: avg(rows, "kills"),
        avgDeaths: avg(rows, "deaths"),
        avgAssists: avg(rows, "assists"),
        avgDamage: avg(rows, "damage"),
        avgDamageTaken: avg(rows, "damageTaken"),
        avgHealing: avg(rows, "healing")
      };
    });
  },
  bests(matches) {
    return {
      damage: maxBy(matches, "damage"),
      damageTaken: maxBy(matches, "damageTaken"),
      healing: maxBy(matches, "healing"),
      kills: maxBy(matches, "kills"),
      assists: maxBy(matches, "assists")
    };
  }
};

function avg(rows, key) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length;
}

function maxBy(rows, key) {
  return rows.reduce((best, row) => !best || Number(row[key]) > Number(best[key]) ? row : best, null);
}
