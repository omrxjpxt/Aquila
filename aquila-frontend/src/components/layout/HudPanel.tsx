import { ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface HudPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  headerRight?: ReactNode;
}

export function HudPanel({ children, className, title, headerRight }: HudPanelProps) {
  return (
    <div className={cn(
      "bg-[var(--color-surface-container)]/80 backdrop-blur-sm border border-[var(--color-outline-variant)] rounded-lg flex flex-col shadow-lg overflow-hidden",
      className
    )}>
      {(title || headerRight) && (
        <div className="bg-[var(--color-surface-high)] border-b border-[var(--color-outline-variant)] px-4 py-2 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold tracking-wider text-[var(--color-on-surface)] uppercase">{title}</h3>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="p-4 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
