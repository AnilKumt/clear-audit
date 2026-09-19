'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar, NavbarUser } from '@/components/Navbar';
import { AnimatedIcon } from '@/components/AnimatedIcon';
import {
  Plus,
  Users,
  ArrowRight,
  Loader2,
  X,
  Building,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { Role, DocumentStatus } from '@prisma/client';

interface ClientItem {
  id: string;
  name: string;
  createdAt: string;
  documents: {
    id: string;
    status: DocumentStatus;
  }[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<NavbarUser | null>(null);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // New Client Modal State
  const [showModal, setShowModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        window.location.href = '/login';
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const clientsRes = await fetch('/api/clients');
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create client');
      }

      setNewClientName('');
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-900 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
          Loading Audit Dashboard...
        </div>
      </div>
    );
  }

  if (!user) return null;

  const canCreateClient = user.role === Role.STAFF || user.role === Role.PARTNER;

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col pb-16">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-white font-mono text-[10px] font-bold uppercase">
                {user.firmName}
              </span>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight font-sans">
                Client Audit Workspaces
              </h1>
            </div>
            <p className="mt-1 text-xs text-zinc-600 font-medium">
              Manage client compliance requirements, document uploads, and audit review workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <AnimatedIcon icon={Search} className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" animationType="scale" />
              <input
                type="text"
                placeholder="Filter clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-zinc-300 rounded-full text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {canCreateClient && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
              >
                <AnimatedIcon icon={Plus} className="w-4 h-4" animationType="rotate" />
                <span>New Client</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Client Card Grid */}
        {filteredClients.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center shadow-xs">
            <AnimatedIcon icon={Building} className="w-12 h-12 text-zinc-300 mx-auto mb-3" animationType="bounce" />
            <h3 className="text-sm font-bold text-zinc-900">No clients found</h3>
            <p className="mt-1 text-xs text-zinc-500 font-medium max-w-sm mx-auto">
              {searchQuery ? 'No client entity matches your search filter.' : 'Get started by adding your first client.'}
            </p>
            {canCreateClient && !searchQuery && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary mt-4"
              >
                <AnimatedIcon icon={Plus} className="w-4 h-4" animationType="rotate" />
                <span>Add First Client</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => {
              const totalDocs = client.documents.length;
              const approvedCount = client.documents.filter(
                (d) => d.status === DocumentStatus.APPROVED
              ).length;
              const reviewCount = client.documents.filter(
                (d) => d.status === DocumentStatus.UNDER_REVIEW || d.status === DocumentStatus.UPLOADED
              ).length;
              const actionCount = client.documents.filter(
                (d) => d.status === DocumentStatus.CORRECTION_REQUIRED || d.status === DocumentStatus.PENDING
              ).length;

              return (
                <motion.div
                  key={client.id}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded-xl">
                        <AnimatedIcon icon={Users} className="w-5 h-5" animationType="scale" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-zinc-900 line-clamp-1 tracking-tight">
                        {client.name}
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        {totalDocs} Required Audit Documents
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">Approved</span>
                        <span className="font-extrabold text-emerald-700 text-sm font-serif-accent">{approvedCount}</span>
                      </div>
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">Review</span>
                        <span className="font-extrabold text-amber-700 text-sm font-serif-accent">{reviewCount}</span>
                      </div>
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase">Action</span>
                        <span className="font-extrabold text-red-700 text-sm font-serif-accent">{actionCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link
                      href={`/clients/${client.id}`}
                      className="btn-primary w-full"
                    >
                      <span>Open Checklist</span>
                      <AnimatedIcon icon={ArrowRight} className="w-3.5 h-3.5" animationType="scale" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* NEW CLIENT MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2 uppercase font-mono tracking-tight">
                  <AnimatedIcon icon={Building} className="w-5 h-5 text-zinc-900" animationType="bounce" />
                  Add New Audit Client
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1">
                    Client Entity Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Enterprises Pvt. Ltd."
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Client'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
