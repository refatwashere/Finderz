import type { Find } from "./types";

type JavinfoQueryResponse = {
  source?: unknown;
  results?: unknown;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function httpsUrl(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function mapJavinfoResults(payload: unknown): Find[] {
  const response = record(payload) as JavinfoQueryResponse | undefined;
  if (!response || !Array.isArray(response.results)) return [];

  const source = text(response.source) ?? "catalog";
  return response.results.flatMap((item, index): Find[] => {
    const result = record(item);
    if (!result) return [];

    const catalogCode = text(result.dvdId);
    const title = text(result.title) ?? catalogCode;
    if (!title) return [];

    const releaseDate = text(result.releaseDate);
    const yearMatch = releaseDate?.match(/^(\d{4})/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;
    const resultId = text(result.id) ?? catalogCode ?? `${title}:${releaseDate ?? index}`;
    const extra = record(result.extra);

    return [
      {
        id: `javinfo:${source}:${resultId}`,
        title,
        year,
        genres: [],
        synopsis: "",
        poster: httpsUrl(result.cover),
        catalogCode,
        provider: "javinfo",
        providerUrl:
          httpsUrl(extra?.url) ??
          httpsUrl(extra?.pageUrl) ??
          "https://javinfo.dev/",
        kind: "film",
      },
    ];
  });
}