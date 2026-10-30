import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { isValidSearchTemplate, normalizeSearchTemplate } from "@/lib/finderz/sources";
import { useDesk } from "@/lib/finderz/store";
import type { Source } from "@/lib/finderz/types";

export function SourcesSheet({ children }: { children: ReactNode }) {
  const sources = useDesk((s) => s.sources);
  const includeJavinfo = useDesk((s) => s.includeJavinfo);
  const setIncludeJavinfo = useDesk((s) => s.setIncludeJavinfo);
  const toggleSource = useDesk((s) => s.toggleSource);
  const addSource = useDesk((s) => s.addSource);
  const removeSource = useDesk((s) => s.removeSource);
  const [name, setName] = useState("");
  const [searchUrl, setSearchUrl] = useState("");
  const [homeUrl, setHomeUrl] = useState("");

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name the source.");
      return;
    }
    const normalizedSearchUrl = normalizeSearchTemplate(searchUrl);
    if (!isValidSearchTemplate(normalizedSearchUrl)) {
      toast.error("Use an https URL that includes {q} or {id}.");
      return;
    }
    const source: Source = {
      id: `custom:${crypto.randomUUID()}`,
      name: name.trim(),
      enabled: true,
      kind: /x\.com|twitter\.com/i.test(normalizedSearchUrl) ? "x" : "dispatch",
      searchUrl: normalizedSearchUrl,
      homeUrl: homeUrl.trim() || undefined,
    };
    addSource(source);
    setName("");
    setSearchUrl("");
    setHomeUrl("");
    toast.success(`Added ${source.name}.`);
  }

  const builtins = sources.filter((s) => s.builtin);
  const custom = sources.filter((s) => !s.builtin);

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent title="Sources">
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Finderz queries public catalogs, then opens the sites you enable with the same title,
          genre, or catalog code. Templates use <code className="text-foreground">{`{q}`}</code>,{" "}
          <code className="text-foreground">{`{id}`}</code>,{" "}
          <code className="text-foreground">{`{genre}`}</code>, and{" "}
          <code className="text-foreground">{`{year}`}</code>.
        </p>
        <div className="mb-5 flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Adult JAV catalog results</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Optional, age-restricted metadata search. Uses the app owner's JAVINFO API balance.
            </p>
          </div>
          <Switch
            checked={includeJavinfo}
            onCheckedChange={setIncludeJavinfo}
            aria-label="Include adult JAV catalog results"
          />
        </div>
        <ul className="space-y-3">
          {builtins.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-muted/60 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {s.kind === "catalog" ? "Live catalog" : s.kind === "x" ? "X video search" : "Dispatch"}
                </p>
              </div>
              <Switch checked={s.enabled} onCheckedChange={() => toggleSource(s.id)} aria-label={`Toggle ${s.name}`} />
            </li>
          ))}
        </ul>
        <Separator className="my-5" />
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your sites</p>
        {custom.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">None yet. Add a discovery site below.</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {custom.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-[var(--radius-md)] bg-muted/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{s.searchUrl}</p>
                </div>
                <Switch checked={s.enabled} onCheckedChange={() => toggleSource(s.id)} aria-label={`Toggle ${s.name}`} />
                <Button variant="ghost" size="icon" className="size-9" onClick={() => removeSource(s.id)} aria-label={`Remove ${s.name}`}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={onAdd} className="space-y-3 rounded-[var(--radius-lg)] border border-border p-4">
          <p className="text-sm font-medium">Add a site</p>
          <div className="space-y-1.5">
            <Label htmlFor="src-name">Name</Label>
            <Input id="src-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Criterion Channel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-url">Search URL</Label>
            <Input
              id="src-url"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              placeholder="https://example.com/search?q={q}"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-home">Home URL (optional)</Label>
            <Input id="src-home" value={homeUrl} onChange={(e) => setHomeUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <Button type="submit" className="w-full">
            <Plus className="size-4" />
            Add source
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
