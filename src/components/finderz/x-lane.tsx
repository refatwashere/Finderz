import { useState, type FormEvent } from "react";
import { ExternalLink, Pin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { embedXPost } from "@/lib/finderz/hunt";
import { xVideoSearchUrl } from "@/lib/finderz/sources";
import { useDesk } from "@/lib/finderz/store";
import type { HuntQuery } from "@/lib/finderz/types";

export function XLane({ query }: { query: HuntQuery }) {
  const pinX = useDesk((s) => s.pinX);
  const pins = useDesk((s) => s.pins);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const href = xVideoSearchUrl({
    title: query.query,
    code: query.code,
    genre: query.genre,
  });

  async function pin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await embedXPost({ data: { url: url.trim() } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      pinX({
        id: crypto.randomUUID(),
        url: res.pin.url,
        authorName: res.pin.authorName,
        authorUrl: res.pin.authorUrl,
        title: res.pin.title,
        pinnedAt: Date.now(),
      });
      setUrl("");
      toast.success("Pinned to your file.");
    } catch {
      toast.error("Could not read that X post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">X video lane</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight">Posted clips matching this hunt</h2>
        </div>
        <Button asChild variant="outline">
          <a href={href} target="_blank" rel="noreferrer">
            Open on X
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
        X does not offer a public scrape. Finderz builds a video-only search from your title, code, and
        genre. Pin a specific public post to keep it with the find.
      </p>
      <form onSubmit={pin} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/user/status/…"
          aria-label="X post URL"
        />
        <Button type="submit" variant="secondary" disabled={busy || !url.trim()}>
          <Pin className="size-4" />
          Pin post
        </Button>
      </form>
      {pins.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {pins.slice(0, 4).map((p) => (
            <li key={p.id}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-muted/70 px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="truncate">
                  <span className="font-medium">{p.authorName}</span>
                  <span className="text-muted-foreground"> — {p.title}</span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
