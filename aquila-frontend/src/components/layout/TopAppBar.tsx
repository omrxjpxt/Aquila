"use client";

import { Bell, Clock, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function TopAppBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
    router.push("/");
  };
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
            href="/reports" 
            className={`font-medium h-full flex items-center px-1 transition-colors ${pathname.startsWith('/investigation') || pathname.startsWith('/reports') ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}
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
        <button 
          className="text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 p-2 rounded-full"
          onClick={() => alert('Notifications unavailable in DEMO.')}
        >
          <Bell className="w-5 h-5" />
        </button>
        <button 
          className="text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200 p-2 rounded-full"
          onClick={() => alert('Task Queue unavailable in DEMO.')}
        >
          <Clock className="w-5 h-5" />
        </button>
        {user ? (
          <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-on-surface-variant max-w-[160px] truncate">{user.email || 'Authenticated'}</span>
            <button 
              onClick={handleSignOut}
              className="ml-1 text-red-500 hover:underline font-semibold"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-outline px-2 py-1">
            <UserCircle2 className="w-4 h-4 text-on-surface-variant" />
            <span>Not Signed In</span>
          </div>
        )}
      </div>
    </header>
  );
}
