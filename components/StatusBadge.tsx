import React from 'react';
import { DocumentStatus } from '@prisma/client';

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.PENDING:
        return {
          label: 'PENDING UPLOAD',
          style: 'bg-zinc-100 text-zinc-700 border-zinc-300',
        };
      case DocumentStatus.UPLOADED:
        return {
          label: 'UPLOADED',
          style: 'bg-blue-50 text-blue-800 border-blue-300',
        };
      case DocumentStatus.UNDER_REVIEW:
        return {
          label: 'UNDER REVIEW',
          style: 'bg-amber-50 text-amber-900 border-amber-300',
        };
      case DocumentStatus.CORRECTION_REQUIRED:
        return {
          label: 'CORRECTION REQUIRED',
          style: 'bg-red-50 text-red-800 border-red-300',
        };
      case DocumentStatus.APPROVED:
        return {
          label: 'APPROVED',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        };
      default:
        return {
          label: status,
          style: 'bg-zinc-100 text-zinc-800 border-zinc-300',
        };
    }
  };

  const { label, style } = getBadgeStyle(status);

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider border uppercase ${style} ${className}`}
    >
      {label}
    </span>
  );
};
