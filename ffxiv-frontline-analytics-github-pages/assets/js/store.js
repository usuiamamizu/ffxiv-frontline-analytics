const STORAGE_KEY = "ffxiv-frontline-analytics-v1";

const Store = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.matches) ? withMatchNumbers(parsed.matches) : [];
    } catch {
      return [];
    }
  },
  save(matches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, matches }));
  },
  reset() {
    this.save([...SAMPLE_MATCHES]);
    return this.load();
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

function withMatchNumbers(matches) {
  let next = matches.reduce((max, match) => Math.max(max, Number(match.matchNo) || 0), 0) + 1;
  return matches.map((match, index) => {
    if (Number(match.matchNo)) return match;
    const fallbackNo = next > 1 ? next : index + 1;
    next = fallbackNo + 1;
    return { ...match, matchNo: fallbackNo };
  });
}
