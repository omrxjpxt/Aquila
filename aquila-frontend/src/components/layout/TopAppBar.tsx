"use client";

import { Bell, Clock, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopAppBar() {
  const pathname = usePathname();
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-14 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-6 h-full">
        <Link href="/" className="text-lg font-bold text-primary tracking-tight uppercase flex items-center h-full">
          AQUILA
        </Link>
        <nav className="hidden md:flex gap-6 h-full items-center">
          <Link 
            href="/monitoring" 
            className={`font-medium h-full flex items-center px-1 transition-colors ${pathname.startsWith('/monitoring') || pathname === '/' ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Live Monitoring
          </Link>
          <Link 
            href="/investigation/INC-AQ-001" 
            className={`font-medium h-full flex items-center px-1 transition-colors ${pathname.startsWith('/investigation') ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Investigations
          </Link>
          <Link 
            href="/vessels" 
            className={`font-medium h-full flex items-center px-1 transition-colors ${pathname.startsWith('/vessels') ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Vessel Fleet
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 p-2 rounded-full">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 p-2 rounded-full">
          <Clock className="w-5 h-5" />
        </button>
        <button className="text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 p-2 rounded-full">
          <UserCircle2 className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
