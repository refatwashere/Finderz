import type { Find, Taste } from "./types";

function titleAffinity(title: string, query: string): number {
  const t = title.toLowerCase().replace(/\s*\([^)]*\)\s*$/, "").trim();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (t === q) return 90;
  if (t.startsWith(q) || q.startsWith(t)) return 70;
  if (t.includes(q)) return 50;
  const tokens = q.split(/\s+/).filter((w) => w.length > 2);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((w) => t.includes(w)).length;
  return Math.round((hits / tokens.length) * 28);
}

export function rankFinds(finds: Find[], taste: Taste, genre: string, query = ""): Find[] {
  const passed = new Set(taste.passedIds);
  const liked = new Set(taste.likedIds);
  const scored = finds
    .filter((f) => !passed.has(f.id))
    .map((f) => {
      let score = titleAffinity(f.title, query);
      if (genre && f.genres.some((g) => g.toLowerCase() === genre.toLowerCase())) score += 16;
      for (const g of f.genres) score += (taste.genres[g] ?? 0) * 4;
      if (liked.has(f.id)) score += 8;
      if (f.synopsis) score += 4;
      if (f.poster) score += 3;
      if (f.provider === "wikipedia" || f.provider === "apple" || f.provider === "anilist") score += 8;
      if (f.provider === "archive") score -= 14;
      if (f.kind === "document") score -= 6;
      if (/soundtrack|franchise|magazine|featurette|challenge|quiz/i.test(f.title)) score -= 24;
      return { f, score };
    });
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: Find[] = [];
  for (const { f } of scored) {
    const key = `${f.title.toLowerCase()}|${f.year ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function bumpGenre(genres: Record<string, number>, names: string[], delta: number) {
  const next = { ...genres };
  for (const name of names) {
    next[name] = (next[name] ?? 0) + delta;
  }
  return next;
}
