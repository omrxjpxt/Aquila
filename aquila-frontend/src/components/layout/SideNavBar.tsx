"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Microscope, Radio, Ship, FileText, Database, Settings } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { href: "/", icon: Radar, label: "Overview" },
  { href: "/investigation/INC-AQ-001", icon: Microscope, label: "Investigations" },
  { href: "/monitoring", icon: Radio, label: "Monitoring" },
  { href: "/vessels", icon: Ship, label: "Vessels" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/sources", icon: Database, label: "Sources" },
];

export function SideNavBar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-col items-center py-4 w-20 bg-surface-container-low border-r border-outline-variant h-full z-40 shrink-0">
      <div className="flex flex-col gap-2 w-full">
        {NAV_ITEMS.map((item) => {
          let isActive = false;
          if (item.href === "/") {
            isActive = pathname === "/";
          } else {
            isActive = pathname.startsWith(item.href);
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-4 transition-all w-full",
                isActive
                  ? "text-primary bg-primary/10 border-r-4 border-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-variant/50"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="font-semibold text-[10px] tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto w-full">
        <button 
          className="flex flex-col items-center justify-center text-on-surface-variant py-4 hover:text-primary hover:bg-surface-variant/50 transition-all w-full"
          onClick={() => alert('Settings unavailable in DEMO.')}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="font-semibold text-[10px] tracking-wide">Settings</span>
        </button>
      </div>
    </nav>
  );
}
