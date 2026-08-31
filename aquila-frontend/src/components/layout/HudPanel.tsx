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
      "bg-surface border border-outline-variant rounded-lg flex flex-col shadow-sm overflow-hidden",
      className
    )}>
      {(title || headerRight) && (
        <div className="bg-surface-container-low border-b border-outline-variant px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="text-xs font-bold tracking-wider text-on-surface uppercase">{title}</h3>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="p-4 flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
