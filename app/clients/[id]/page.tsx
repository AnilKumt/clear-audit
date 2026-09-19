'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar, NavbarUser } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { AnimatedIcon } from '@/components/AnimatedIcon';
import {
  FileText,
  Plus,
  ArrowLeft,
  ChevronRight,
  Loader2,
  X,
  FilePlus,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { Role, DocumentStatus } from '@prisma/client';

interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    role: Role;
  };
}

interface DocumentItem {
  id: string;
  name: string;
  status: DocumentStatus;
  updatedAt: string;
  versions: DocumentVersion[];
}

interface ClientDetail {
  id: string;
  name: string;
  createdAt: string;
}

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [user, setUser] = useState<NavbarUser | null>(null);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal for adding required document
  const [showModal, setShowModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        window.location.href = '/login';
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const res = await fetch(`/api/clients/${clientId}/documents`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load client documents.');
      }

      const data = await res.json();
      setClient(data.client);
      setDocuments(data.documents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: docName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add required document.');
      }

      setDocName('');
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error adding document requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-900 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
          Loading Client File...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 max-w-md w-full text-center shadow-md">
          <AnimatedIcon icon={AlertCircle} className="w-12 h-12 text-zinc-400 mx-auto mb-3" animationType="bounce" />
          <h2 className="text-lg font-extrabold text-zinc-900">Client Not Found</h2>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            The requested client entity does not exist or belongs to another firm environment.
          </p>
          <Link
            href="/dashboard"
            className="btn-primary mt-6"
          >
            <AnimatedIcon icon={ArrowLeft} className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!user || !client) return null;

  const canAddDocument = user.role === Role.STAFF || user.role === Role.PARTNER;

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col pb-16">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500 bg-white px-4 py-2 rounded-full border border-zinc-200 w-fit">
          <Link href="/dashboard" className="hover:text-zinc-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Clients
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 font-bold">{client.name}</span>
        </nav>

        {/* Client Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs md:flex md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl">
              <AnimatedIcon icon={Folder} className="w-6 h-6" animationType="scale" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{client.name}</h1>
              <p className="mt-0.5 text-xs text-zinc-600 font-medium">
                Audit Compliance Document Checklist & Status Records
              </p>
            </div>
          </div>

          {canAddDocument && (
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-4 md:mt-0"
            >
              <AnimatedIcon icon={Plus} className="w-4 h-4" animationType="rotate" />
              <span>Add Required Document</span>
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Documents Table / Checklist Container */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 uppercase font-mono tracking-wide">
              <AnimatedIcon icon={FileText} className="w-4 h-4 text-zinc-900" animationType="scale" />
              Required Audit Documents ({documents.length})
            </h3>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-medium">
              No document requirements have been added for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Document Name</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Latest Version</th>
                    <th className="py-4 px-6">Uploaded By</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {documents.map((doc) => {
                    const latestVersion = doc.versions[0];

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                        onClick={() => (window.location.href = `/documents/${doc.id}`)}
                      >
                        <td className="py-4 px-6 font-extrabold text-zinc-900">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="hover:text-blue-600 flex items-center gap-2.5"
                          >
                            <AnimatedIcon icon={FileText} className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 flex-shrink-0" animationType="scale" />
                            <span>{doc.name}</span>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="py-4 px-6 text-zinc-700 font-mono font-medium">
                          {latestVersion ? (
                            <span>
                              v{latestVersion.versionNumber} ({latestVersion.fileName})
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic font-sans text-[11px]">No file uploaded</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-zinc-700">
                          {latestVersion ? (
                            <div>
                              <div className="font-bold text-zinc-900">
                                {latestVersion.uploadedBy.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {new Date(latestVersion.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900 hover:underline"
                          >
                            Open File
                            <AnimatedIcon icon={ChevronRight} className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ADD REQUIRED DOCUMENT MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-extrabold text-zinc-900 flex items-center gap-2 uppercase font-mono tracking-tight">
                  <AnimatedIcon icon={FilePlus} className="w-5 h-5 text-zinc-900" animationType="bounce" />
                  Add Required Audit Document
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDocument} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1">
                    Document Requirement Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank Statement Q4, Form 26AS, GST Return"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
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
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add Requirement'
                    )}
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
