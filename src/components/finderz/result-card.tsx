import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, PenLine, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { briefFind } from "@/lib/finderz/hunt";
import { dispatchLinks } from "@/lib/finderz/sources";
import { useDesk } from "@/lib/finderz/store";
import type { Find, HuntQuery } from "@/lib/finderz/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<Find["kind"], string> = {
  film: "Film",
  series: "Series",
  anime: "Anime",
  clip: "Clip",
  document: "Archive",
};

export function ResultCard({ find, query, index }: { find: Find; query: HuntQuery; index: number }) {
  const sources = useDesk((s) => s.sources);
  const taste = useDesk((s) => s.taste);
  const file = useDesk((s) => s.file);
  const like = useDesk((s) => s.like);
  const pass = useDesk((s) => s.pass);
  const save = useDesk((s) => s.save);
  const unsave = useDesk((s) => s.unsave);
  const [synopsis, setSynopsis] = useState(find.synopsis);
  const [briefing, setBriefing] = useState(false);
  const links = dispatchLinks(find, sources, { genre: query.genre, code: query.code });
  const saved = file.some((f) => f.id === find.id);
  const liked = taste.likedIds.includes(find.id);

  async function onBrief() {
    setBriefing(true);
    try {
      const res = await briefFind({
        data: { title: find.title, year: find.year, kind: find.kind, synopsis: find.synopsis },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSynopsis(res.text);
    } catch {
      toast.error("Briefing failed.");
    } finally {
      setBriefing(false);
    }
  }

  return (
    <article
      className="finderz-enter grid grid-cols-1 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card sm:grid-cols-[148px_1fr]"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="relative min-h-44 bg-muted sm:min-h-full">
        {find.poster ? (
          <img
            src={find.poster}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="flex size-full min-h-44 items-end p-4">
            <p className="font-display text-3xl leading-none text-muted-foreground">{find.title.slice(0, 1)}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-2xl leading-tight tracking-tight">{find.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {[find.year, KIND_LABEL[find.kind], find.runtime, find.catalogCode ? `ID ${find.catalogCode}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <Badge>{find.provider}</Badge>
        </div>
        {find.genres.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {find.genres.slice(0, 5).map((g) => (
              <Badge key={g} tone="accent">
                {g}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {synopsis || "No public synopsis. Open a source for the listing."}
        </p>
        <div className="flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.sourceId}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted",
                l.kind === "x" && "border-accent/40 text-accent",
              )}
            >
              {l.label}
              <ExternalLink className="size-3" />
            </a>
          ))}
          <a
            href={find.providerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted"
          >
            Catalog page
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          <Button variant={liked ? "secondary" : "ghost"} size="sm" onClick={() => like(find)}>
            <ThumbsUp className="size-3.5" />
            Taste
          </Button>
          <Button variant="ghost" size="sm" onClick={() => pass(find)}>
            <ThumbsDown className="size-3.5" />
            Pass
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (saved) unsave(find.id);
              else save({ ...find, savedAt: Date.now(), links, notes: "" });
            }}
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {saved ? "Filed" : "File"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onBrief} disabled={briefing}>
            <PenLine className="size-3.5" />
            {briefing ? "Briefing…" : "Discreet brief"}
          </Button>
        </div>
      </div>
    </article>
  );
}
