"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, PlusSquare, FolderSearch, Settings } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { href: "/", icon: Radar, label: "Command Center" },
  { href: "/investigation/new", icon: PlusSquare, label: "New Investigation" },
  { href: "/investigation/workspace", icon: FolderSearch, label: "Workspace" },
];

export function SideNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-16 bg-[var(--color-surface-lowest)] border-r border-[var(--color-outline-variant)] flex flex-col items-center py-4 z-50">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-surface)] font-bold text-lg border border-[var(--color-primary)]">
          AQ
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "p-3 rounded-xl flex items-center justify-center transition-colors group relative",
                isActive
                  ? "bg-[var(--color-surface-high)] text-[var(--color-primary)]"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-low)] hover:text-[var(--color-on-surface)]"
              )}
            >
              <item.icon className="w-6 h-6" />
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--color-primary)] rounded-r-md" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto">
        <button className="p-3 rounded-xl text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-low)] hover:text-[var(--color-on-surface)] transition-colors">
          <Settings className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
