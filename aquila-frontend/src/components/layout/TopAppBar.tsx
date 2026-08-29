import { Bell, Activity } from "lucide-react";

export function TopAppBar() {
  return (
    <header className="fixed top-0 left-16 right-0 h-16 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-outline-variant)] flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold tracking-wide text-[var(--color-on-surface)]">
          AQUILA <span className="text-[var(--color-on-surface-variant)] text-sm font-normal ml-2">v2.0.4-STABLE</span>
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* System Health */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <Activity className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-[var(--color-primary)]">SYS_NOMINAL</span>
        </div>
        
        <div className="w-px h-6 bg-[var(--color-outline-variant)]"></div>

        {/* Notifications */}
        <button className="relative p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-error)] rounded-full border border-[var(--color-surface)]"></span>
        </button>
        
        {/* User Profile */}
        <div className="w-8 h-8 rounded border border-[var(--color-outline)] overflow-hidden flex items-center justify-center bg-[var(--color-surface-high)]">
          <span className="text-xs font-bold text-[var(--color-on-surface)]">OP</span>
        </div>
      </div>
    </header>
  );
}
