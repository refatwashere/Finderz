import { useMemo, useState } from "react";
import { FolderOpen, Radar, Search } from "lucide-react";
import { toast } from "sonner";
import { FileSheet } from "@/components/finderz/file-sheet";
import { ResultCard } from "@/components/finderz/result-card";
import { SourcesSheet } from "@/components/finderz/sources-sheet";
import { XLane } from "@/components/finderz/x-lane";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { huntCatalog } from "@/lib/finderz/hunt";
import { rankFinds } from "@/lib/finderz/rank";
import { bareDispatchLinks } from "@/lib/finderz/sources";
import { useDesk } from "@/lib/finderz/store";
import { GENRES, type HuntQuery } from "@/lib/finderz/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS: HuntQuery[] = [
  { query: "Blade Runner 2049", genre: "Sci-Fi", code: "" },
  { query: "Perfect Blue", genre: "Psychological", code: "" },
  { query: "The Conversation", genre: "Thriller", code: "tt0071360" },
  { query: "Spirited Away", genre: "Animation", code: "" },
  { query: "Chungking Express", genre: "Romance", code: "" },
];

export function Desk() {
  const sources = useDesk((s) => s.sources);
  const includeJavinfo = useDesk((s) => s.includeJavinfo);
  const taste = useDesk((s) => s.taste);
  const file = useDesk((s) => s.file);
  const lastQuery = useDesk((s) => s.lastQuery);
  const lastFinds = useDesk((s) => s.lastFinds);
  const setLast = useDesk((s) => s.setLast);
  const [query, setQuery] = useState(lastQuery.query);
  const [code, setCode] = useState(lastQuery.code);
  const [genre, setGenre] = useState(lastQuery.genre);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hunted, setHunted] = useState(lastFinds.length > 0);

  const ranked = useMemo(
    () => rankFinds(lastFinds, taste, genre, lastQuery.query || lastQuery.code),
    [lastFinds, taste, genre],
  );
  const enabledCount = sources.filter((s) => s.enabled).length;
  const dispatch = bareDispatchLinks(sources, {
    q: [query, genre].filter(Boolean).join(" ") || code,
    id: code || undefined,
    genre: genre || undefined,
  });

  async function hunt(next?: HuntQuery) {
    const q: HuntQuery = next ?? { query: query.trim(), genre, code: code.trim() };
    if (next) {
      setQuery(q.query);
      setGenre(q.genre);
      setCode(q.code);
    }
    if (!q.query && !q.code && !q.genre) {
      toast.error("Enter a title, a catalog code, or pick a genre.");
      return;
    }
    setBusy(true);
    setError(null);
    setHunted(true);
    try {
      const res = await huntCatalog({
        data: {
          query: q.query,
          genre: q.genre || undefined,
          code: q.code || undefined,
          includeJavinfo,
        },
      });
      setLast(q, res.finds);
      if (res.error) setError(res.error);
      if (res.finds.length === 0 && !res.error) {
        setError("No catalog match. Dispatch still opened your source list below.");
      }
    } catch {
      setError("Hunt failed. Check the catalogs and try again.");
      setLast(q, []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <p className="font-display text-2xl italic tracking-tight">Finderz</p>
            <p className="hidden text-xs uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Discovery desk
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SourcesSheet>
              <Button variant="outline" size="sm">
                <Radar className="size-3.5" />
                Sources
                <Badge className="ml-1">{enabledCount}</Badge>
              </Button>
            </SourcesSheet>
            <FileSheet>
              <Button variant="ghost" size="sm">
                <FolderOpen className="size-3.5" />
                File
                {file.length > 0 ? <Badge className="ml-1">{file.length}</Badge> : null}
              </Button>
            </FileSheet>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:py-10">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Hunt</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            Set the sites.
            <span className="block italic text-muted-foreground">Find the cut.</span>
          </h1>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground">
            Public catalogs for films, series, anime, and archive clips. Your source list is searched
            with the same title, genre, or catalog ID — including video posts on X.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void hunt();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chungking Express"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Catalog code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="tt0111161 · AniList 5114"
                autoComplete="off"
                className="tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => {
                  const on = genre === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(on ? "" : g)}
                      className={cn(
                        "h-9 rounded-full border px-3 text-xs font-medium",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              <Search className="size-4" />
              {busy ? "Hunting…" : "Hunt"}
            </Button>
          </form>
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Try</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.query}
                  type="button"
                  onClick={() => void hunt(s)}
                  className="h-9 rounded-full border border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.query}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {!hunted && !busy ? (
            <EmptyDesk />
          ) : (
            <>
              {busy ? <LoadingList /> : null}
              {!busy && error ? (
                <p className="rounded-[var(--radius-md)] border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  {error}
                </p>
              ) : null}
              {!busy && ranked.length > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl tracking-tight">
                    {ranked.length} find{ranked.length === 1 ? "" : "s"}
                  </h2>
                  <p className="text-xs text-muted-foreground">Ranked with your taste marks</p>
                </div>
              ) : null}
              {!busy
                ? ranked.map((find, i) => (
                    <ResultCard key={find.id} find={find} query={lastQuery} index={i} />
                  ))
                : null}
              {!busy && hunted ? (
                <DispatchStrip links={dispatch} />
              ) : null}
              {!busy && hunted ? <XLane query={lastQuery} /> : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyDesk() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-card px-6 py-14 text-center sm:px-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Ready</p>
      <h2 className="mx-auto mt-3 max-w-md font-display text-3xl tracking-tight">
        A quiet desk for public moving pictures.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground">
        Hunt a title or catalog ID. Finderz reads Apple, AniList, TVMaze, Wikipedia, and the
        Internet Archive, then hands you precise links across the sites you switched on.
      </p>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-4" aria-live="polite" aria-label="Searching catalogs">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid grid-cols-1 overflow-hidden rounded-[var(--radius-xl)] border border-border sm:grid-cols-[148px_1fr]">
          <Skeleton className="h-44 sm:h-full" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DispatchStrip({
  links,
}: {
  links: { label: string; url: string; sourceId: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <section className="rounded-[var(--radius-xl)] border border-border px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Dispatch across your sources
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.sourceId}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-full border border-border px-3.5 text-xs font-medium hover:bg-muted"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
