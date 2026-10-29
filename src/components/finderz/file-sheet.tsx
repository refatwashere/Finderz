import { ExternalLink, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useDesk } from "@/lib/finderz/store";

export function FileSheet({ children }: { children: ReactNode }) {
  const file = useDesk((s) => s.file);
  const unsave = useDesk((s) => s.unsave);
  const pins = useDesk((s) => s.pins);
  const unpinX = useDesk((s) => s.unpinX);

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent title="File">
        {file.length === 0 && pins.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Saved finds and pinned X posts land here. They stay on this device.
          </p>
        ) : null}
        {file.length > 0 ? (
          <ul className="space-y-3">
            {file.map((f) => (
              <li key={f.id} className="rounded-[var(--radius-md)] border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[f.year, f.kind, f.catalogCode].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => unsave(f.id)} aria-label="Remove from file">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {f.synopsis ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.synopsis}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {f.links.slice(0, 6).map((l) => (
                    <a
                      key={l.sourceId}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs hover:bg-muted"
                    >
                      {l.label}
                      <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {pins.length > 0 ? (
          <div className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Pinned X</p>
            <ul className="space-y-3">
              {pins.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2 rounded-[var(--radius-md)] bg-muted/60 px-3 py-2.5">
                  <a href={p.url} target="_blank" rel="noreferrer" className="min-w-0 hover:underline">
                    <p className="truncate text-sm font-medium">{p.authorName}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.title}</p>
                  </a>
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => unpinX(p.id)} aria-label="Unpin">
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
