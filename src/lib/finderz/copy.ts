const SPOILER_LEAD =
  /^(warning:|spoilers?|the film (begins|opens|ends)|in the (opening|ending)|at the end)/i;

export function discreet(text: string, max = 280): string {
  const clean = text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const picked: string[] = [];
  for (const s of sentences) {
    if (SPOILER_LEAD.test(s)) continue;
    picked.push(s);
    if (picked.join(" ").length >= 160 || picked.length >= 2) break;
  }
  const out = (picked.length ? picked.join(" ") : clean).trim();
  if (out.length <= max) return out;
  return `${out.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function runtimeLabel(minutes?: number | null): string | undefined {
  if (!minutes || minutes < 1) return undefined;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
