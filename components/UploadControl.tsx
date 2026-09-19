'use client';

import React, { useState } from 'react';
import { UploadCloud, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { AnimatedIcon } from '@/components/AnimatedIcon';

interface UploadControlProps {
  documentId: string;
  onSuccess: () => void;
}

export const UploadControl: React.FC<UploadControlProps> = ({ documentId, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_SIZE) {
        setError('Selected file exceeds the 5MB limit. Please choose a smaller file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const base64Data = await convertToBase64(file);
      const res = await fetch(`/api/documents/${documentId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64Data,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document.');
      }

      setFile(null);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <AnimatedIcon icon={UploadCloud} className="w-5 h-5 text-zinc-900" animationType="bounce" />
        <h3 className="text-sm font-extrabold text-zinc-900 uppercase font-mono tracking-wide">
          Upload Audit Document File
        </h3>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100/80 transition-colors p-4">
            <div className="flex flex-col items-center justify-center text-center">
              <AnimatedIcon icon={UploadCloud} className="w-8 h-8 mb-2 text-zinc-400" animationType="bounce" />
              {file ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="truncate max-w-xs">{file.name}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-zinc-800 mb-0.5">
                    Click to browse or drag & drop document file
                  </p>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    PDF, XLSX, DOCX, Images, MD or TXT (Max payload 5MB)
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <AnimatedIcon icon={UploadCloud} className="w-4 h-4" animationType="bounce" />
                <span>Submit Upload</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
