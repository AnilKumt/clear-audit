'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { AnimatedIcon } from '@/components/AnimatedIcon';

interface AvailableActions {
  canUpload: boolean;
  canStartReview: boolean;
  canApprove: boolean;
  canRequestCorrection: boolean;
}

interface DocumentActionsProps {
  documentId: string;
  availableActions: AvailableActions;
  onSuccess: () => void;
}

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  documentId,
  availableActions,
  onSuccess,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state for requesting correction
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionComment, setCorrectionComment] = useState('');

  const handleStartReview = async () => {
    setLoadingAction('start-review');
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/start-review`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start review.');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting review.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async () => {
    setLoadingAction('approve');
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Document reviewed and approved.' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve document.');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error approving document.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRequestCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionComment.trim()) {
      setError('Correction reason comment is required.');
      return;
    }

    setLoadingAction('request-correction');
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/request-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: correctionComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request correction.');
      setShowCorrectionModal(false);
      setCorrectionComment('');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error requesting correction.');
    } finally {
      setLoadingAction(null);
    }
  };

  if (
    !availableActions.canStartReview &&
    !availableActions.canApprove &&
    !availableActions.canRequestCorrection
  ) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
      <h3 className="text-sm font-extrabold text-zinc-900 uppercase font-mono tracking-wide">
        Reviewer Action Controls
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {availableActions.canStartReview && (
          <button
            onClick={handleStartReview}
            disabled={loadingAction !== null}
            className="btn-amber"
          >
            {loadingAction === 'start-review' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AnimatedIcon icon={Eye} className="w-4 h-4" animationType="bounce" />
            )}
            <span>Start Review</span>
          </button>
        )}

        {availableActions.canApprove && (
          <button
            onClick={handleApprove}
            disabled={loadingAction !== null}
            className="btn-success"
          >
            {loadingAction === 'approve' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AnimatedIcon icon={CheckCircle2} className="w-4 h-4" animationType="bounce" />
            )}
            <span>Approve Document</span>
          </button>
        )}

        {availableActions.canRequestCorrection && (
          <button
            onClick={() => setShowCorrectionModal(true)}
            disabled={loadingAction !== null}
            className="btn-warning"
          >
            <AnimatedIcon icon={AlertTriangle} className="w-4 h-4" animationType="wiggle" />
            <span>Request Correction</span>
          </button>
        )}
      </div>

      {/* Correction Modal */}
      <AnimatePresence>
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-extrabold text-zinc-900 flex items-center gap-2 uppercase font-mono tracking-tight">
                  <AnimatedIcon icon={AlertTriangle} className="w-5 h-5 text-red-600" animationType="wiggle" />
                  Request Correction
                </h4>
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRequestCorrectionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wide mb-1">
                    Reason for Correction Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={correctionComment}
                    onChange={(e) => setCorrectionComment(e.target.value)}
                    placeholder="e.g. Page 3 has missing tax totals, please reconcile and re-upload..."
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingAction === 'request-correction'}
                    className="btn-warning"
                  >
                    {loadingAction === 'request-correction' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Submit Request'
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
};
