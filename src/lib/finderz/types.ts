export const PROVIDERS = [
  "apple",
  "anilist",
  "tvmaze",
  "archive",
  "wikipedia",
] as const;

export type Provider = (typeof PROVIDERS)[number];

export type FindKind = "film" | "series" | "anime" | "clip" | "document";

export type SourceKind = "catalog" | "dispatch" | "x";

export type Source = {
  id: string;
  name: string;
  enabled: boolean;
  kind: SourceKind;
  searchUrl: string;
  homeUrl?: string;
  builtin?: boolean;
};

export type DispatchLink = {
  label: string;
  url: string;
  sourceId: string;
  kind: SourceKind;
};

export type Find = {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  genres: string[];
  synopsis: string;
  runtime?: string;
  poster?: string;
  catalogCode?: string;
  provider: Provider;
  providerUrl: string;
  kind: FindKind;
};

export type HuntQuery = {
  query: string;
  genre: string;
  code: string;
};

export type Taste = {
  genres: Record<string, number>;
  likedIds: string[];
  passedIds: string[];
};

export type SavedFind = Find & {
  savedAt: number;
  links: DispatchLink[];
  notes: string;
};

export type XPin = {
  id: string;
  url: string;
  authorName: string;
  authorUrl: string;
  title: string;
  pinnedAt: number;
};

export const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Thriller",
] as const;

export type Genre = (typeof GENRES)[number];
