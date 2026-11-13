import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient shadow-gold">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" aria-hidden="true">
          <path d="M12 3 4 21h3.2l1.6-4h6.4l1.6 4H20L12 3Zm-2 11 2-5.2 2 5.2h-4Z" fill="currentColor" />
        </svg>
      </span>
      {withText && (
        <span className="font-display text-2xl font-semibold tracking-wide">
          Ad<span className="text-gold-gradient">Select</span>
        </span>
      )}
    </div>
  );
}
