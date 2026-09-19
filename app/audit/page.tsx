'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar, NavbarUser } from '@/components/Navbar';
import { Activity, ArrowLeft, ExternalLink, Loader2, ShieldAlert } from 'lucide-react';
import { Role, AuditAction } from '@prisma/client';

interface AuditFeedItem {
  id: string;
  action: AuditAction;
  comment: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    role: Role;
    email: string;
  };
  document: {
    id: string;
    name: string;
    status: string;
    client: {
      id: string;
      name: string;
    };
  };
}

export default function AuditFeedPage() {
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          window.location.href = '/login';
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const auditRes = await fetch('/api/audit');
        if (auditRes.status === 403) {
          setForbidden(true);
          return;
        }
        if (!auditRes.ok) {
          throw new Error('Failed to load audit feed.');
        }

        const data = await auditRes.json();
        setAuditEvents(data.auditEvents);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading audit feed.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 text-slate-950 font-extrabold text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-slate-950" />
          Loading Audit Feed...
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-md w-full text-center shadow-lg">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-extrabold text-slate-950">Access Restricted</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            The firm-wide audit feed is restricted to REVIEWER and PARTNER roles only.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        <div className="bg-[#F5F1EB] p-6 sm:p-8 rounded-3xl border border-[#E5E0D8] shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 flex items-center gap-2 tracking-tight">
              <Activity className="w-6 h-6 text-slate-950" />
              Firm Audit Feed — {user.firmName}
            </h1>
            <p className="mt-1 text-xs text-slate-600 font-medium">
              Chronological immutable log of all document events, status changes, and reviewer actions.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-medium">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Actor</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Client Entity</th>
                  <th className="py-4 px-6">Target Document</th>
                  <th className="py-4 px-6">Comment / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors align-top">
                    <td className="py-4 px-6 text-slate-500 font-mono whitespace-nowrap font-medium text-[11px]">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-950">{evt.actor.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold">{evt.actor.role}</div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-950 text-white font-mono">
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-800 font-bold whitespace-nowrap">
                      {evt.document.client.name}
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/documents/${evt.document.id}`}
                        className="font-extrabold text-slate-950 hover:underline inline-flex items-center gap-1"
                      >
                        <span>{evt.document.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-slate-700 min-w-[280px] max-w-lg font-medium">
                      {evt.comment ? (
                        <div className="bg-zinc-50 border border-zinc-200/80 p-3 rounded-xl text-xs leading-relaxed text-zinc-800 break-words whitespace-pre-wrap font-normal">
                          &quot;{evt.comment}&quot;
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
