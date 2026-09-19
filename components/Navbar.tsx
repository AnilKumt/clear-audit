'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, FileText, Activity } from 'lucide-react';

export interface NavbarUser {
  id: string;
  name: string;
  email: string;
  role: 'STAFF' | 'REVIEWER' | 'PARTNER';
  firmId: string;
  firmName: string;
}

interface NavbarProps {
  user: NavbarUser;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isReviewerOrPartner = user.role === 'REVIEWER' || user.role === 'PARTNER';

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-zinc-900 tracking-tight">
            <span className="font-extrabold text-lg tracking-tight uppercase">
              CLEAR<span className="text-zinc-500 font-normal">AUDIT</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all ${
                pathname === '/dashboard' || pathname.startsWith('/clients')
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Clients & Documents
            </Link>

            {isReviewerOrPartner && (
              <Link
                href="/audit"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all ${
                  pathname === '/audit'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Firm Audit Feed
              </Link>
            )}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-zinc-900 flex items-center justify-end gap-1.5">
              <span>{user.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-300 text-zinc-800 text-[10px] font-mono font-bold uppercase">
                {user.role}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-medium">{user.firmName}</div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors border border-zinc-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
