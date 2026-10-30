import type { DispatchLink, Find, Source } from "./types";

export const DEFAULT_SOURCES: Source[] = [
  {
    id: "x",
    name: "X (video posts)",
    enabled: true,
    kind: "x",
    searchUrl: "https://x.com/search?q={q}&src=typed_query&f=media",
    homeUrl: "https://x.com/search?q=filter%3Avideos&f=media",
    builtin: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    enabled: true,
    kind: "dispatch",
    searchUrl: "https://www.youtube.com/results?search_query={q}",
    homeUrl: "https://www.youtube.com",
    builtin: true,
  },
  {
    id: "vimeo",
    name: "Vimeo",
    enabled: true,
    kind: "dispatch",
    searchUrl: "https://vimeo.com/search?q={q}",
    homeUrl: "https://vimeo.com",
    builtin: true,
  },
  {
    id: "archive",
    name: "Internet Archive",
    enabled: true,
    kind: "catalog",
    searchUrl: "https://archive.org/search?query={q}&and%5B%5D=mediatype%3A%22movies%22",
    homeUrl: "https://archive.org/details/movies",
    builtin: true,
  },
  {
    id: "letterboxd",
    name: "Letterboxd",
    enabled: true,
    kind: "dispatch",
    searchUrl: "https://letterboxd.com/search/{q}/",
    homeUrl: "https://letterboxd.com",
    builtin: true,
  },
  {
    id: "imdb",
    name: "IMDb",
    enabled: true,
    kind: "dispatch",
    searchUrl: "https://www.imdb.com/find/?q={q}",
    homeUrl: "https://www.imdb.com",
    builtin: true,
  },
  {
    id: "justwatch",
    name: "JustWatch",
    enabled: true,
    kind: "dispatch",
    searchUrl: "https://www.justwatch.com/us/search?q={q}",
    homeUrl: "https://www.justwatch.com",
    builtin: true,
  },
  {
    id: "anilist",
    name: "AniList",
    enabled: true,
    kind: "catalog",
    searchUrl: "https://anilist.co/search/anime?search={q}",
    homeUrl: "https://anilist.co",
    builtin: true,
  },
  {
    id: "apple",
    name: "Apple TV",
    enabled: true,
    kind: "catalog",
    searchUrl: "https://tv.apple.com/search?term={q}",
    homeUrl: "https://tv.apple.com",
    builtin: true,
  },
];

export function mergeSources(saved: Source[] | undefined): Source[] {
  const list = saved ?? [];
  const custom = list.filter((s) => !s.builtin);
  const builtins = DEFAULT_SOURCES.map((d) => {
    const prev = list.find((s) => s.id === d.id);
    return prev ? { ...d, enabled: prev.enabled } : d;
  });
  return [...builtins, ...custom];
}

export function interpolate(
  template: string,
  vars: { q: string; id?: string; genre?: string; year?: string },
): string {
  const q = encodeURIComponent(vars.q);
  const id = encodeURIComponent(vars.id || vars.q);
  const genre = encodeURIComponent(vars.genre || "");
  const year = encodeURIComponent(vars.year || "");
  return template
    .replaceAll("{q}", q)
    .replaceAll("{id}", id)
    .replaceAll("{genre}", genre)
    .replaceAll("{year}", year);
}

export function xVideoSearchUrl(parts: {
  title?: string;
  code?: string;
  genre?: string;
  year?: number;
}): string {
  const tokens = [
    parts.title?.trim(),
    parts.code?.trim(),
    parts.genre?.trim(),
    parts.year ? String(parts.year) : "",
    "filter:videos",
  ].filter(Boolean);
  const q = tokens.join(" ");
  return `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query&f=media`;
}

export function dispatchLinks(
  find: Find,
  sources: Source[],
  extras: { genre?: string; code?: string },
): DispatchLink[] {
  const q = [find.title, find.year, extras.genre].filter(Boolean).join(" ");
  const id = extras.code || find.catalogCode || find.title;
  return sources
    .filter((s) => s.enabled && s.kind !== "catalog")
    .map((s) => {
      const url =
        s.kind === "x"
          ? xVideoSearchUrl({
              title: find.title,
              code: extras.code || find.catalogCode,
              genre: extras.genre,
              year: find.year,
            })
          : interpolate(s.searchUrl, {
              q,
              id,
              genre: extras.genre || find.genres[0],
              year: find.year ? String(find.year) : undefined,
            });
      return { label: s.name, url, sourceId: s.id, kind: s.kind };
    });
}

export function bareDispatchLinks(
  sources: Source[],
  vars: { q: string; id?: string; genre?: string },
): DispatchLink[] {
  return sources
    .filter((s) => s.enabled)
    .map((s) => {
      const url =
        s.kind === "x"
          ? xVideoSearchUrl({
              title: vars.q,
              code: vars.id,
              genre: vars.genre,
            })
          : interpolate(s.searchUrl, vars);
      return { label: s.name, url, sourceId: s.id, kind: s.kind };
    });
}

export function isValidSearchTemplate(url: string): boolean {
  try {
    const u = new URL(url.replaceAll("{q}", "q").replaceAll("{id}", "id").replaceAll("{genre}", "g").replaceAll("{year}", "y"));
    if (u.protocol !== "https:") return false;
    return /\{q\}|\{id\}/.test(url);
  } catch {
    return false;
  }
}

export function normalizeSearchTemplate(url: string): string {
  const trimmed = url.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
