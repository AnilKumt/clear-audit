'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar, NavbarUser } from '@/components/Navbar';
import { StatusBadge } from '@/components/StatusBadge';
import { AuditTimeline, AuditEventItem } from '@/components/AuditTimeline';
import { UploadControl } from '@/components/UploadControl';
import { DocumentActions } from '@/components/DocumentActions';
import { AnimatedIcon } from '@/components/AnimatedIcon';
import {
  FileText,
  ArrowLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Download,
  History,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { DocumentStatus, Role } from '@prisma/client';

interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  fileData: string;
  uploadedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    role: Role;
    email: string;
  };
}

interface DocumentDetail {
  id: string;
  name: string;
  status: DocumentStatus;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
  };
  versions: DocumentVersion[];
  auditEvents: AuditEventItem[];
}

interface AvailableActions {
  canUpload: boolean;
  canStartReview: boolean;
  canApprove: boolean;
  canRequestCorrection: boolean;
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;

  const [user, setUser] = useState<NavbarUser | null>(null);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [availableActions, setAvailableActions] = useState<AvailableActions | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        window.location.href = '/login';
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      const res = await fetch(`/api/documents/${documentId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load document detail.');
      }

      const data = await res.json();
      setDocument(data.document);
      setAvailableActions(data.availableActions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading document.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-900 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-900" />
          Loading Document Record...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 max-w-md w-full text-center shadow-md">
          <AnimatedIcon icon={AlertCircle} className="w-12 h-12 text-zinc-400 mx-auto mb-3" animationType="bounce" />
          <h2 className="text-lg font-extrabold text-zinc-900">Document Not Found</h2>
          <p className="mt-1 text-xs text-zinc-500 font-medium">
            The requested document does not exist or belongs to another firm.
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

  if (!user || !document) return null;

  const latestVersion = document.versions[0];

  const handleDownloadFile = (version: DocumentVersion) => {
    const link = window.document.createElement('a');
    link.href = version.fileData.startsWith('data:')
      ? version.fileData
      : `data:application/octet-stream;base64,${version.fileData}`;
    link.download = version.fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col pb-16">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500 bg-white px-4 py-2 rounded-full border border-zinc-200 w-fit">
          <Link href="/dashboard" className="hover:text-zinc-900">
            Clients
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <Link href={`/clients/${document.client.id}`} className="hover:text-zinc-900">
            {document.client.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 font-bold">{document.name}</span>
        </nav>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* CORRECTION REQUIRED PROMINENT WARNING CALLOUT */}
        {document.status === DocumentStatus.CORRECTION_REQUIRED && document.reviewComment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-red-50 border border-red-200 rounded-2xl shadow-xs"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0">
                <AnimatedIcon icon={AlertTriangle} className="w-5 h-5" animationType="wiggle" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-950 uppercase font-mono tracking-tight">
                  Correction Requested by Reviewer
                </h3>
                <p className="mt-1 text-xs text-red-900 font-bold leading-relaxed">
                  &quot;{document.reviewComment}&quot;
                </p>
                <p className="mt-2 text-[11px] text-red-700 font-medium">
                  Please address the reviewer feedback above and re-upload the corrected document file below.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Document Header Metadata Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{document.name}</h1>
                <StatusBadge status={document.status} />
              </div>
              <p className="text-xs text-zinc-600 font-medium">
                Client Entity: <span className="font-bold text-zinc-900">{document.client.name}</span>
              </p>
            </div>

            {latestVersion && (
              <button
                onClick={() => handleDownloadFile(latestVersion)}
                className="btn-primary self-start md:self-auto"
              >
                <AnimatedIcon icon={Download} className="w-4 h-4" animationType="bounce" />
                <span>Download File (v{latestVersion.versionNumber})</span>
              </button>
            )}
          </div>

          {/* Current File Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <span className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider mb-1">Current File Name</span>
              <span className="font-bold text-zinc-900 font-mono truncate block">
                {latestVersion ? latestVersion.fileName : 'None uploaded'}
              </span>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <span className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider mb-1">Uploaded By</span>
              <span className="font-bold text-zinc-900 block">
                {latestVersion ? `${latestVersion.uploadedBy.name} (${latestVersion.uploadedBy.role})` : 'N/A'}
              </span>
            </div>

            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
              <span className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider mb-1">Upload Date</span>
              <span className="font-bold text-zinc-900 font-mono block">
                {latestVersion ? new Date(latestVersion.uploadedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Section */}
        {availableActions && (
          <>
            {availableActions.canUpload && (
              <UploadControl documentId={document.id} onSuccess={fetchDocument} />
            )}

            <DocumentActions
              documentId={document.id}
              availableActions={availableActions}
              onSuccess={fetchDocument}
            />
          </>
        )}

        {/* File Versions History */}
        {document.versions.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 uppercase font-mono tracking-wide">
                <AnimatedIcon icon={FileCheck} className="w-4 h-4 text-zinc-900" animationType="scale" />
                Uploaded Version History ({document.versions.length})
              </h3>
            </div>
            <div className="divide-y divide-zinc-200">
              {document.versions.map((ver) => (
                <div key={ver.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-zinc-50 text-xs">
                  <div className="min-w-0 pr-4">
                    <span className="font-extrabold text-zinc-900 font-mono mr-2 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-300">
                      v{ver.versionNumber}
                    </span>
                    <span className="font-bold text-zinc-900 truncate">{ver.fileName}</span>
                    <span className="text-zinc-500 font-medium ml-3 hidden sm:inline">
                      uploaded by {ver.uploadedBy.name} on {new Date(ver.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(ver)}
                    className="btn-secondary text-[11px] py-1.5 px-3"
                  >
                    <AnimatedIcon icon={Download} className="w-3.5 h-3.5" animationType="bounce" />
                    <span>Download</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Audit Trail Timeline */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs">
          <h3 className="text-base font-extrabold text-zinc-900 mb-6 flex items-center gap-2 pb-4 border-b border-zinc-200 uppercase font-mono tracking-tight">
            <AnimatedIcon icon={History} className="w-5 h-5 text-zinc-900" animationType="scale" />
            Audit Trail & Traceability Timeline
          </h3>

          <AuditTimeline events={document.auditEvents} />
        </div>
      </main>
    </div>
  );
}
