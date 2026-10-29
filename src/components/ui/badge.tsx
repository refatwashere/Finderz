import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: React.ComponentProps<"span"> & { tone?: "muted" | "accent" | "solid" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "solid" && "bg-primary text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
