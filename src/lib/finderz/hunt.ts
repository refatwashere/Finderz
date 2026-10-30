import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { discreet, runtimeLabel } from "./copy";
import { mapJavinfoResults } from "./javinfo";
import type { Find } from "./types";

const HuntInput = z.object({
  query: z.string().trim().max(120),
  genre: z.string().trim().max(40).optional(),
  code: z.string().trim().max(40).optional(),
  includeJavinfo: z.boolean().optional(),
});

const XPinInput = z.object({
  url: z.string().trim().url().max(300),
});

const BriefInput = z.object({
  title: z.string().trim().min(1).max(160),
  year: z.number().int().optional(),
  kind: z.string().trim().max(40).optional(),
  synopsis: z.string().trim().max(600).optional(),
});

const UA = "Finderz/1.0 (video discovery desk)";
const TIMEOUT = 8000;

const ANILIST_GENRES = new Set([
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
]);

function genreForAniList(genre?: string): string | undefined {
  if (!genre) return undefined;
  if (genre === "Animation") return undefined;
  if (ANILIST_GENRES.has(genre)) return genre;
  return undefined;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", "User-Agent": UA, ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function appleArt(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/\d+x\d+bb/, "600x600bb");
}

async function huntApple(q: string, genre?: string): Promise<Find[]> {
  const term = [q, genre].filter(Boolean).join(" ");
  const kinds: Array<{ media: string; entity?: string }> = [
    { media: "movie" },
    { media: "tvShow", entity: "tvSeason" },
    { media: "musicVideo" },
  ];
  const packs = await Promise.all(
    kinds.map(({ media, entity }) => {
      const u = new URL("https://itunes.apple.com/search");
      u.searchParams.set("term", term);
      u.searchParams.set("media", media);
      u.searchParams.set("country", "US");
      if (entity) u.searchParams.set("entity", entity);
      u.searchParams.set("limit", "6");
      return fetchJson<{
        results?: Array<{
          trackId?: number;
          collectionId?: number;
          trackName?: string;
          collectionName?: string;
          artistName?: string;
          releaseDate?: string;
          primaryGenreName?: string;
          longDescription?: string;
          shortDescription?: string;
          description?: string;
          trackTimeMillis?: number;
          artworkUrl100?: string;
          trackViewUrl?: string;
          collectionViewUrl?: string;
          kind?: string;
          wrapperType?: string;
          trackExplicitness?: string;
        }>;
      }>(u.toString());
    }),
  );
  const finds: Find[] = [];
  for (const pack of packs) {
    for (const item of pack?.results ?? []) {
      if (item.trackExplicitness === "explicit") continue;
      if (item.wrapperType === "audiobook") continue;
      if (item.kind === "song" || item.kind === "podcast" || item.kind === "podcast-episode") continue;
      const title = item.trackName || item.collectionName;
      if (!title) continue;
      const id = String(item.trackId || item.collectionId || title);
      const year = item.releaseDate ? Number(item.releaseDate.slice(0, 4)) : undefined;
      const kind: Find["kind"] =
        item.kind === "feature-movie"
          ? "film"
          : item.kind === "music-video"
            ? "clip"
            : "series";
      finds.push({
        id: `apple:${id}`,
        title,
        year: Number.isFinite(year) ? year : undefined,
        genres: item.primaryGenreName ? [item.primaryGenreName] : [],
        synopsis: discreet(item.longDescription || item.shortDescription || item.description || ""),
        runtime: runtimeLabel(item.trackTimeMillis ? Math.round(item.trackTimeMillis / 60000) : undefined),
        poster: appleArt(item.artworkUrl100),
        catalogCode: id,
        provider: "apple",
        providerUrl: item.trackViewUrl || item.collectionViewUrl || `https://tv.apple.com/search?term=${encodeURIComponent(title)}`,
        kind,
      });
    }
  }
  return finds;
}

async function huntAniList(q: string, genre?: string, code?: string): Promise<Find[]> {
  const idNum = code && /^\d{2,7}$/.test(code) ? Number(code) : undefined;
  const gql = `
    query ($search: String, $genre: String, $id: Int) {
      Page(page: 1, perPage: 8) {
        media(search: $search, type: ANIME, genre: $genre, id: $id, isAdult: false, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          seasonYear
          genres
          description(asHtml: false)
          duration
          coverImage { large }
          siteUrl
          format
        }
      }
    }
  `;
  const data = await fetchJson<{
    data?: {
      Page?: {
        media?: Array<{
          id: number;
          title: { romaji?: string; english?: string; native?: string };
          seasonYear?: number;
          genres?: string[];
          description?: string | null;
          duration?: number | null;
          coverImage?: { large?: string };
          siteUrl?: string;
          format?: string;
        }>;
      };
    };
  }>("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: gql,
      variables: {
        search: idNum ? undefined : q || undefined,
        genre: genreForAniList(genre),
        id: idNum,
      },
    }),
  });
  const media = data?.data?.Page?.media ?? [];
  return media.map((m) => {
    const title = m.title.english || m.title.romaji || m.title.native || "Untitled";
    const format = (m.format || "").toUpperCase();
    const kind: Find["kind"] = format.includes("MOVIE") ? "film" : "anime";
    return {
      id: `anilist:${m.id}`,
      title,
      originalTitle: m.title.romaji && m.title.romaji !== title ? m.title.romaji : m.title.native,
      year: m.seasonYear,
      genres: m.genres ?? [],
      synopsis: discreet(m.description || ""),
      runtime: runtimeLabel(m.duration),
      poster: m.coverImage?.large,
      catalogCode: String(m.id),
      provider: "anilist" as const,
      providerUrl: m.siteUrl || `https://anilist.co/anime/${m.id}`,
      kind,
    };
  });
}

async function huntTvMaze(q: string): Promise<Find[]> {
  const rows = await fetchJson<
    Array<{
      show: {
        id: number;
        name: string;
        premiered?: string;
        genres?: string[];
        summary?: string | null;
        runtime?: number | null;
        averageRuntime?: number | null;
        image?: { medium?: string; original?: string } | null;
        officialSite?: string | null;
        url?: string;
        type?: string;
      };
    }>
  >(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
  return (rows ?? []).slice(0, 8).map(({ show }) => ({
    id: `tvmaze:${show.id}`,
    title: show.name,
    year: show.premiered ? Number(show.premiered.slice(0, 4)) : undefined,
    genres: show.genres ?? [],
    synopsis: discreet(show.summary || ""),
    runtime: runtimeLabel(show.averageRuntime || show.runtime),
    poster: show.image?.original || show.image?.medium,
    catalogCode: String(show.id),
    provider: "tvmaze" as const,
    providerUrl: show.url || `https://www.tvmaze.com/shows/${show.id}`,
    kind: "series" as const,
  }));
}

async function huntArchive(q: string): Promise<Find[]> {
  const u = new URL("https://archive.org/advancedsearch.php");
  const quoted = q.replaceAll('"', "");
  u.search = new URLSearchParams({
    q: `title:("${quoted}") AND mediatype:(movies)`,
    rows: "4",
    page: "1",
    output: "json",
  }).toString();
  u.searchParams.append("fl[]", "identifier");
  u.searchParams.append("fl[]", "title");
  u.searchParams.append("fl[]", "description");
  u.searchParams.append("fl[]", "year");
  u.searchParams.append("fl[]", "runtime");
  const data = await fetchJson<{
    response?: {
      docs?: Array<{
        identifier: string;
        title?: string;
        description?: string | string[];
        year?: string | number;
        runtime?: string;
      }>;
    };
  }>(u.toString());
  const tokens = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return (data?.response?.docs ?? [])
    .filter((d) => {
      const t = (d.title || "").toLowerCase();
      if (!tokens.length) return true;
      const hits = tokens.filter((w) => t.includes(w)).length;
      return hits >= Math.min(2, tokens.length);
    })
    .map((d) => {
    const desc = Array.isArray(d.description) ? d.description[0] : d.description;
    const year = d.year ? Number(d.year) : undefined;
    return {
      id: `archive:${d.identifier}`,
      title: d.title || d.identifier,
      year: Number.isFinite(year) ? year : undefined,
      genres: ["Documentary"],
      synopsis: discreet(desc || "Public-domain or freely circulated moving image on the Internet Archive."),
      runtime: d.runtime,
      poster: `https://archive.org/services/img/${d.identifier}`,
      catalogCode: d.identifier,
      provider: "archive" as const,
      providerUrl: `https://archive.org/details/${d.identifier}`,
      kind: "document" as const,
    };
  });
}

async function huntWiki(q: string): Promise<Find[]> {
  const search = await fetchJson<{
    query?: { search?: Array<{ title: string; snippet: string }>; };
  }>(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json`,
  );
  const titles = (search?.query?.search ?? []).map((s) => s.title);
  const summaries = await Promise.all(
    titles.slice(0, 4).map((title) =>
      fetchJson<{
        title: string;
        extract?: string;
        description?: string;
        content_urls?: { desktop?: { page?: string } };
        thumbnail?: { source?: string };
        type?: string;
      }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`),
    ),
  );
  const filmish = /film|movie|television|anime|series|documentary|cinema|director|screen|tv/i;
  const snippetByTitle = new Map((search?.query?.search ?? []).map((s) => [s.title, s.snippet]));
  return summaries
    .filter((s): s is NonNullable<typeof s> => Boolean(s?.title))
    .filter((s) => filmish.test(`${s.description ?? ""} ${s.extract ?? ""} ${s.title}`) || s.title.toLowerCase().includes(q.toLowerCase()))
    .map((s) => {
      const yearMatch = `${s.description ?? ""} ${s.extract ?? ""}`.match(/\b((?:19|20)\d{2})\b/);
      const year = yearMatch ? Number(yearMatch[1]) : undefined;
      const kind: Find["kind"] = /television|tv series|anime/i.test(s.description || "") ? "series" : "film";
      return {
        id: `wiki:${s.title}`,
        title: s.title.replace(/\s*\((film|movie|TV series).*$/i, "").trim() || s.title,
        year: Number.isFinite(year) ? year : undefined,
        genres: [],
        synopsis: discreet(s.extract || s.description || snippetByTitle.get(s.title) || ""),
        poster: s.thumbnail?.source,
        catalogCode: s.title,
        provider: "wikipedia" as const,
        providerUrl: s.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replaceAll(" ", "_"))}`,
        kind,
      };
    });
}

async function huntJavinfo(q: string): Promise<Find[]> {
  const apiKey = process.env.JAVINFO_API_KEY?.trim();
  if (!apiKey || !q.trim()) return [];

  try {
    const response = await fetch("https://api.javinfo.dev/query", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": UA,
        "x-javinfo-key": apiKey,
      },
      body: JSON.stringify({
        q: q.trim(),
        providers: "fanza,javdatabase,javlibrary",
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!response.ok) {
      console.warn(`[javinfo] query failed (${response.status})`);
      return [];
    }
    return mapJavinfoResults(await response.json());
  } catch {
    console.warn("[javinfo] query request failed");
    return [];
  }
}

function huntTerm(query: string, code?: string): string {
  return (query || code || "").trim();
}

export const huntCatalog = createServerFn({ method: "POST" })
  .validator((input: unknown) => HuntInput.parse(input))
  .handler(async ({ data }): Promise<{ finds: Find[]; error?: string }> => {
    const q = huntTerm(data.query, data.code) || data.genre || "";
    if (q.length < 1) return { finds: [], error: "Enter a title, genre, or catalog code." };

    const genre = data.genre || undefined;
    const code = data.code || undefined;
    const appleQuery = data.query.trim() || q;

    const searches = [
      huntApple(appleQuery, genre),
      huntAniList(appleQuery || q, genre, code),
      huntTvMaze(appleQuery || q),
      huntArchive(q),
      huntWiki(appleQuery || q),
    ];
    if (data.includeJavinfo === true) searches.push(huntJavinfo(appleQuery || q));
    const settled = await Promise.allSettled(searches);

    const finds: Find[] = [];
    let failures = 0;
    for (const result of settled) {
      if (result.status === "fulfilled") finds.push(...result.value);
      else failures += 1;
    }
    return {
      finds,
      error: failures === settled.length ? "Catalogs were unreachable. Try again in a moment." : undefined,
    };
  });

const X_STATUS = /^https:\/\/(x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+/i;

export const embedXPost = createServerFn({ method: "POST" })
  .validator((input: unknown) => XPinInput.parse(input))
  .handler(async ({ data }) => {
    if (!X_STATUS.test(data.url)) {
      return { ok: false as const, error: "Paste a public X post URL (x.com/user/status/…)." };
    }
    const u = new URL("https://publish.twitter.com/oembed");
    u.searchParams.set("url", data.url);
    u.searchParams.set("omit_script", "1");
    const body = await fetchJson<{
      author_name?: string;
      author_url?: string;
      url?: string;
      html?: string;
    }>(u.toString());
    if (!body) return { ok: false as const, error: "X did not return a public embed for that post." };
    const title =
      body.html
        ?.replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180) || "Pinned X video";
    return {
      ok: true as const,
      pin: {
        url: body.url || data.url,
        authorName: body.author_name || "X",
        authorUrl: body.author_url || data.url,
        title,
      },
    };
  });

export const briefFind = createServerFn({ method: "POST" })
  .validator((input: unknown) => BriefInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Briefing is unavailable in this environment." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 180,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Write a two-sentence, spoiler-free catalog briefing for a film, series, or anime. Tone: precise, discreet, editorial. No marketing hype, no emoji, no spoilers, no adult content.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: data.title,
              year: data.year,
              kind: data.kind,
              notes: data.synopsis,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `Briefing failed (${res.status}).` };
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = discreet(body.choices?.[0]?.message?.content ?? "", 360);
    if (!text) return { ok: false as const, error: "Empty briefing." };
    return { ok: true as const, text };
  });
