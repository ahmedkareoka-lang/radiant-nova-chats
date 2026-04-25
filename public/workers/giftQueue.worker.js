/**
 * 🎁 Gift Queue Web Worker
 *
 * Offloads heavy gift queue processing (sorting, deduping, combo aggregation,
 * priority scoring) from the main thread so the UI and Agora audio stream
 * remain smooth even during gift storms.
 *
 * Protocol:
 *   postMessage({ type: "process", gifts: [...], now: <ms> })
 *   → onmessage({ type: "processed", queue: [...], stats: {...} })
 */

const TIER_PRIORITY = {
  legendary: 4,
  epic: 3,
  rare: 2,
  normal: 1,
};

self.onmessage = (e) => {
  const msg = e.data;
  if (!msg || msg.type !== "process") return;

  const now = msg.now || Date.now();
  const incoming = Array.isArray(msg.gifts) ? msg.gifts : [];

  // Aggregate combos by sender+gift within a 3s window
  const comboMap = new Map();
  for (const g of incoming) {
    const key = `${g.sender_id}:${g.gift_id}`;
    const existing = comboMap.get(key);
    if (existing && now - existing.last_at < 3000) {
      existing.combo += 1;
      existing.total_gold += g.gold || 0;
      existing.last_at = g.created_at || now;
    } else {
      comboMap.set(key, {
        ...g,
        combo: 1,
        total_gold: g.gold || 0,
        last_at: g.created_at || now,
      });
    }
  }

  // Sort by tier priority desc, then combo desc, then recency desc
  const queue = Array.from(comboMap.values()).sort((a, b) => {
    const pa = TIER_PRIORITY[a.tier] || 1;
    const pb = TIER_PRIORITY[b.tier] || 1;
    if (pa !== pb) return pb - pa;
    if (a.combo !== b.combo) return b.combo - a.combo;
    return (b.last_at || 0) - (a.last_at || 0);
  });

  const stats = {
    total: incoming.length,
    deduped: queue.length,
    legendary: queue.filter((g) => g.tier === "legendary").length,
  };

  self.postMessage({ type: "processed", queue, stats });
};
