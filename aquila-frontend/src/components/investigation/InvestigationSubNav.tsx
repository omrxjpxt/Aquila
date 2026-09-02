"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Droplet, Wind, ShieldAlert, FileText, Crosshair, Activity } from "lucide-react";

export function InvestigationSubNav({ incidentId }: { incidentId: string }) {
  const pathname = usePathname();

  const tabs = [
    { name: "Overview", href: `/investigation/${incidentId}`, icon: LayoutDashboard, exact: true },
    { name: "Slick Assessment", href: `/investigation/${incidentId}/slick-assessment`, icon: Droplet },
    { name: "Origin & Drift", href: `/investigation/${incidentId}/drift-reconstruction`, icon: Wind },
    { name: "Vessel Attribution", href: `/investigation/${incidentId}/vessel-attribution`, icon: Crosshair },
    { name: "Simulation", href: `/investigation/${incidentId}/simulation`, icon: Activity },
    { name: "Timeline", href: `/investigation/${incidentId}/timeline`, icon: ShieldAlert },
    { name: "Report", href: `/investigation/${incidentId}/report`, icon: FileText },
  ];

  return (
    <div className="h-12 bg-surface-lowest border-b border-outline-variant flex items-center px-4 shrink-0 shadow-sm z-20 overflow-x-auto overflow-y-hidden no-scrollbar">
      <div className="flex gap-2 min-w-max">
        {tabs.map(tab => {
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.startsWith(tab.href);
            
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-[11px] font-bold uppercase tracking-wider ${
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
