'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/shared';
import { TemplateList } from '@/components/admin/email';
import { TemplatePreview } from '@/components/admin/email';

interface TemplateDetails {
  key: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  requiredVars: string[];
  optionalVars: string[];
}

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch template details when one is selected
  useEffect(() => {
    if (!selectedTemplate) {
      setCurrentTemplate(null);
      return;
    }

    const fetchTemplateDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/admin/email/templates/${selectedTemplate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch template details');
        }
        const data = await response.json();
        setCurrentTemplate(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template');
        setCurrentTemplate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateDetails();
  }, [selectedTemplate]);

  return (
    <AdminLayout title="Email Templates" subtitle="Manage, preview, and test email templates">
      <div>
        {/* Error State */}
        {error && selectedTemplate && (
          <div className="mb-6 rounded-md bg-red-50 p-4 flex gap-3">
            <span className="text-red-600 flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <h3 className="font-medium text-red-900">Error Loading Template</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar - Template List */}
          <div className="lg:col-span-1">
            <TemplateList
              selectedKey={selectedTemplate || undefined}
              onSelectTemplate={setSelectedTemplate}
            />

            {/* Info Card */}
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">Tip</h3>
              <p className="mt-1 text-xs text-blue-800">
                Select a template to view its preview, settings, and send test emails.
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {loading && selectedTemplate ? (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                <span className="mx-auto block h-12 w-12 text-4xl animate-spin">⟳</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Loading template...</h3>
              </div>
            ) : selectedTemplate && currentTemplate ? (
              <div className="space-y-6">
                {/* Template Metadata */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {currentTemplate.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        Key: <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                          {currentTemplate.key}
                        </code>
                      </p>
                      <div className="mt-3 flex gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                          {currentTemplate.category}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            currentTemplate.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {currentTemplate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Variables */}
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Variables</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Required Variables
                        </p>
                        <div className="space-y-1">
                          {currentTemplate.requiredVars.length > 0 ? (
                            currentTemplate.requiredVars.map((v) => (
                              <code
                                key={v}
                                className="block text-sm bg-red-50 text-red-900 px-2 py-1 rounded border border-red-200"
                              >
                                {v}
                              </code>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">None</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Optional Variables
                        </p>
                        <div className="space-y-1">
                          {currentTemplate.optionalVars.length > 0 ? (
                            currentTemplate.optionalVars.map((v) => (
                              <code
                                key={v}
                                className="block text-sm bg-blue-50 text-blue-900 px-2 py-1 rounded border border-blue-200"
                              >
                                {v}
                              </code>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">None</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Template Preview</h3>
                  <TemplatePreview
                    templateKey={selectedTemplate}
                    variables={{}}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
                <span className="mx-auto block h-12 w-12 text-4xl">📧</span>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No template selected
                </h3>
                <p className="mt-2 text-gray-600">
                  Select a template from the list to view its details and preview.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
