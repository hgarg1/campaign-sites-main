'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../shared/ToastContext';

interface Template {
  key: string;
  name: string;
  description: string;
  category: string;
  requiredVarsCount: number;
  optionalVarsCount: number;
  isActive: boolean;
  isArchived: boolean;
}

interface TemplateListProps {
  onSelectTemplate?: (key: string) => void;
  selectedKey?: string;
}

const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  'Password Reset': { bg: 'bg-red-100', text: 'text-red-800', icon: '🔐' },
  Welcome: { bg: 'bg-green-100', text: 'text-green-800', icon: '👋' },
  Verification: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '✓' },
  Notification: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🔔' },
  Confirmation: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '✅' },
  Alert: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '⚠️' },
  Information: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: 'ℹ️' },
};

/**
 * Template browser component with search, filter, and quick actions
 */
export function TemplateList({ onSelectTemplate, selectedKey }: TemplateListProps) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/email/templates');
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.status}`);
        }

        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : data.templates || []);
      } catch (err) {
        console.error('Fetch templates error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleToggleActive = useCallback(
    async (templateKey: string, currentState: boolean) => {
      try {
        setUpdating(templateKey);

        const response = await fetch(`/api/admin/email/templates/${templateKey}/toggle`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !currentState }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update template: ${response.status}`);
        }

        setTemplates((prev) =>
          prev.map((t) => (t.key === templateKey ? { ...t, isActive: !currentState } : t)),
        );

        showToast(
          'success',
          'Updated',
          `Template ${!currentState ? 'enabled' : 'disabled'}`,
        );
      } catch (err) {
        console.error('Toggle template error:', err);
        showToast('error', 'Failed', 'Could not update template status');
      } finally {
        setUpdating(null);
      }
    },
    [showToast],
  );

  const handleArchive = useCallback(
    async (templateKey: string) => {
      try {
        setUpdating(templateKey);

        const response = await fetch(`/api/admin/email/templates/${templateKey}/archive`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to archive template: ${response.status}`);
        }

        setTemplates((prev) =>
          prev.map((t) => (t.key === templateKey ? { ...t, isArchived: true } : t)),
        );

        showToast('success', 'Archived', 'Template archived successfully');
      } catch (err) {
        console.error('Archive template error:', err);
        showToast('error', 'Failed', 'Could not archive template');
      } finally {
        setUpdating(null);
      }
    },
    [showToast],
  );

  const filteredTemplates = templates.filter((template) => {
    if (!showArchived && template.isArchived) return false;
    if (selectedCategory && template.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />
        ))}
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 border border-red-200 rounded-lg p-6"
      >
        <h3 className="text-red-900 font-semibold mb-2">Error Loading Templates</h3>
        <p className="text-red-700 text-sm">{error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-700">Show Archived</span>
          </label>

          <div className="text-sm text-gray-600 ml-auto">
            {filteredTemplates.length} template(s)
          </div>
        </div>
      </div>

      {/* Template Cards */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No templates found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map((template) => {
            const categoryStyle = categoryColors[template.category] || {
              bg: 'bg-gray-100',
              text: 'text-gray-800',
              icon: '📧',
            };
            const isSelected = template.key === selectedKey;
            const isUpdating = updating === template.key;

            return (
              <motion.div
                key={template.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${template.isArchived ? 'opacity-50' : ''}`}
                onClick={() => onSelectTemplate?.(template.key)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                      {template.isArchived && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          Archived
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{template.description}</p>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}
                      >
                        {categoryStyle.icon} {template.category}
                      </span>

                      <span className="text-xs text-gray-600">
                        {template.requiredVarsCount} required
                      </span>
                      {template.optionalVarsCount > 0 && (
                        <span className="text-xs text-gray-600">
                          {template.optionalVarsCount} optional
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-auto flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(template.key, template.isActive);
                      }}
                      disabled={isUpdating}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        template.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {template.isActive ? '✓ Active' : '○ Inactive'}
                    </button>

                    {!template.isArchived && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(template.key);
                        }}
                        disabled={isUpdating}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
