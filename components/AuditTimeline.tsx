import React from 'react';
import { AuditAction, Role } from '@prisma/client';
import { motion } from 'framer-motion';
import {
  FilePlus,
  UploadCloud,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Building,
  MessageSquare,
} from 'lucide-react';
import { AnimatedIcon } from '@/components/AnimatedIcon';

export interface AuditEventItem {
  id: string;
  action: AuditAction;
  comment?: string | null;
  createdAt: string | Date;
  actor: {
    id: string;
    name: string;
    role: Role;
  };
}

interface AuditTimelineProps {
  events: AuditEventItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  const getActionConfig = (action: AuditAction) => {
    switch (action) {
      case AuditAction.CLIENT_CREATED:
        return {
          title: 'Client Entity Registered',
          description: 'Added new client entity to firm audit workspace',
          icon: Building,
          animation: 'bounce' as const,
          bg: 'bg-zinc-900 text-white',
          border: 'border-zinc-900',
        };
      case AuditAction.DOCUMENT_REQUIREMENT_ADDED:
        return {
          title: 'Requirement Created',
          description: 'Added required document checklist item',
          icon: FilePlus,
          animation: 'rotate' as const,
          bg: 'bg-zinc-900 text-white',
          border: 'border-zinc-900',
        };
      case AuditAction.DOCUMENT_UPLOADED:
        return {
          title: 'Document File Uploaded',
          description: 'Uploaded file payload version for audit review',
          icon: UploadCloud,
          animation: 'bounce' as const,
          bg: 'bg-blue-600 text-white',
          border: 'border-blue-600',
        };
      case AuditAction.REVIEW_STARTED:
        return {
          title: 'Audit Review Initiated',
          description: 'Reviewer initiated compliance verification',
          icon: Eye,
          animation: 'pulse' as const,
          bg: 'bg-amber-600 text-white',
          border: 'border-amber-600',
        };
      case AuditAction.CORRECTION_REQUESTED:
        return {
          title: 'Correction Requested',
          description: 'Reviewer flagged issues and requested correction',
          icon: AlertTriangle,
          animation: 'wiggle' as const,
          bg: 'bg-red-600 text-white',
          border: 'border-red-600',
        };
      case AuditAction.DOCUMENT_APPROVED:
        return {
          title: 'Document Approved',
          description: 'Reviewer verified compliance and approved document',
          icon: CheckCircle2,
          animation: 'scale' as const,
          bg: 'bg-emerald-600 text-white',
          border: 'border-emerald-600',
        };
      default:
        return {
          title: action,
          description: 'AuditEvent recorded',
          icon: MessageSquare,
          animation: 'scale' as const,
          bg: 'bg-zinc-700 text-white',
          border: 'border-zinc-700',
        };
    }
  };

  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  };

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 text-xs italic font-medium">
        No audit events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
      {events.map((event, idx) => {
        const config = getActionConfig(event.action);

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="relative flex items-start gap-4 group cursor-default"
          >
            {/* Animated Timeline Node Icon */}
            <div
              className={`absolute -left-8 top-1 w-7 h-7 rounded-full flex items-center justify-center shadow-xs ${config.bg} ring-4 ring-white border ${config.border} transition-transform group-hover:scale-110`}
            >
              <AnimatedIcon
                icon={config.icon}
                className="w-3.5 h-3.5"
                animationType={config.animation}
              />
            </div>

            {/* Event Content Card */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-zinc-200 flex-1 hover:border-zinc-300 transition-all hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-zinc-900 text-xs tracking-tight">
                    {event.actor.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono text-[10px] font-bold uppercase border border-zinc-200">
                    {event.actor.role}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 font-medium">
                  {formatDate(event.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 uppercase font-mono tracking-wide">
                    {config.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    {config.description}
                  </p>
                </div>
              </div>

              {event.comment && (
                <div className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 leading-relaxed font-medium">
                  <span className="font-bold text-zinc-900">Note:</span> &quot;{event.comment}&quot;
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
