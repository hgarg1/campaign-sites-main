'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useToast } from '../shared/ToastContext';

interface TemplateMetadata {
  name: string;
  category: string;
  description: string;
}

interface PreviewData {
  subject: string;
  html: string;
  text: string;
  metadata: TemplateMetadata;
}

interface TemplatePreviewProps {
  templateKey: string;
  variables?: Record<string, any>;
}

/**
 * Email template preview renderer with HTML and text views
 * Supports mobile preview toggle and copy-to-clipboard functionality
 */
export function TemplatePreview({ templateKey, variables = {} }: TemplatePreviewProps) {
  const { showToast } = useToast();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'html' | 'text'>('html');
  const [mobilePreview, setMobilePreview] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/email/templates/${templateKey}/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(variables),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.status}`);
        }

        const data = await response.json();
        setPreview(data);
      } catch (err) {
        console.error('Preview fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [templateKey, variables]);

  const handleCopyHtml = async () => {
    if (!preview?.html) return;

    try {
      await navigator.clipboard.writeText(preview.html);
      showToast('success', 'Copied', 'HTML copied to clipboard');
    } catch (err) {
      console.error('Copy error:', err);
      showToast('error', 'Failed', 'Could not copy to clipboard');
    }
  };

  const handleCopyText = async () => {
    if (!preview?.text) return;

    try {
      await navigator.clipboard.writeText(preview.text);
      showToast('success', 'Copied', 'Text copied to clipboard');
    } catch (err) {
      console.error('Copy error:', err);
      showToast('error', 'Failed', 'Could not copy to clipboard');
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <div className="animate-pulse bg-gray-200 h-10 rounded-lg w-40" />
        <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />
      </motion.div>
    );
  }

  if (error || !preview) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 border border-red-200 rounded-lg p-6"
      >
        <h3 className="text-red-900 font-semibold mb-2">Preview Error</h3>
        <p className="text-red-700 text-sm">{error || 'Failed to load template preview'}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header with Metadata */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{preview.metadata.name}</h3>
            <p className="text-xs text-gray-600 mt-1">{preview.metadata.description}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              {preview.metadata.category}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-100">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Subject:</span> {preview.subject}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('html')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'html'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            HTML View
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Text View
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobilePreview(!mobilePreview)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
            title={mobilePreview ? 'Show full width' : 'Show mobile (600px)'}
          >
            {mobilePreview ? '📱 Mobile' : '🖥️ Full'}
          </button>

          {activeTab === 'html' ? (
            <button
              onClick={handleCopyHtml}
              className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1"
            >
              📋 Copy HTML
            </button>
          ) : (
            <button
              onClick={handleCopyText}
              className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1"
            >
              📋 Copy Text
            </button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        {activeTab === 'html' ? (
          <div className={`${mobilePreview ? 'max-w-[600px] mx-auto' : 'w-full'} bg-gray-50`}>
            <iframe
              srcDoc={preview.html}
              className="w-full min-h-[600px] border-none"
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <pre
            className={`p-4 overflow-auto text-sm text-gray-700 bg-gray-50 whitespace-pre-wrap break-words ${
              mobilePreview ? 'max-w-[600px] mx-auto' : 'w-full'
            }`}
          >
            {preview.text}
          </pre>
        )}
      </div>

      {/* Info Message */}
      <div className="text-xs text-gray-500 text-center py-2">
        Email preview generated at {new Date().toLocaleTimeString()}
      </div>
    </motion.div>
  );
}
