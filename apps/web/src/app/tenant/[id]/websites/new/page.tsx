'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantLayout } from '@/components/tenant/shared';

const TEMPLATES = [
  { id: 'modern-campaign', name: 'Modern Campaign', description: 'Clean, modern design with bold visuals' },
  { id: 'classic-political', name: 'Classic Political', description: 'Traditional layout with professional look' },
  { id: 'grassroots', name: 'Grassroots Movement', description: 'Community-focused with donation integration' },
  { id: 'issue-focused', name: 'Issue-Focused', description: 'Highlight key policy positions and messaging' },
];

const CAMPAIGN_TYPES = ['Federal', 'State', 'Local', 'Ballot Initiative'];

export default function NewWebsitePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [organization, setOrganization] = useState('');
  const [stateDistrict, setStateDistrict] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');

  const canGoNext = step === 1
    ? campaignName.trim() !== ''
    : step === 2
    ? templateId !== ''
    : true;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/${orgId}/websites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignName, organization, stateDistrict, campaignType, description, templateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as Record<string, string>).error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      router.push(`/tenant/${orgId}/websites/${result.id || result.data?.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create website');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const stepLabels = ['Campaign Info', 'Choose Template', 'Review & Launch'];

  return (
    <TenantLayout title="Create Website" subtitle="Launch your campaign website with AI" orgId={orgId}>
      <div className="max-w-2xl mx-auto">
        <Link href={`/tenant/${orgId}/websites`} className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6 inline-block">
          ← Back to Websites
        </Link>

        <div className="flex items-center mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < step ? 'bg-green-600 text-white' : s === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className={`ml-2 text-sm font-medium ${s === step ? 'text-gray-900' : 'text-gray-400'}`}>
                {stepLabels[s - 1]}
              </span>
              {s < 3 && <div className={`mx-4 h-px w-16 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Campaign Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign / Candidate Name *</label>
                  <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} className={inputClass} placeholder="e.g. Jane Smith for Senate" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization / Party</label>
                  <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} className={inputClass} placeholder="e.g. Democratic Party" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State / District</label>
                  <input type="text" value={stateDistrict} onChange={e => setStateDistrict(e.target.value)} className={inputClass} placeholder="e.g. California, District 12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                  <select value={campaignType} onChange={e => setCampaignType(e.target.value)} className={inputClass}>
                    <option value="">Select type...</option>
                    {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={inputClass} placeholder="Describe your campaign goals and platform..." />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Choose a Template</h2>
                <div className="grid grid-cols-2 gap-4">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        templateId === t.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Review & Launch</h2>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Campaign Name</span><span className="font-medium">{campaignName}</span></div>
                  {organization && <div className="flex justify-between"><span className="text-gray-600">Organization</span><span className="font-medium">{organization}</span></div>}
                  {stateDistrict && <div className="flex justify-between"><span className="text-gray-600">State/District</span><span className="font-medium">{stateDistrict}</span></div>}
                  {campaignType && <div className="flex justify-between"><span className="text-gray-600">Campaign Type</span><span className="font-medium">{campaignType}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-600">Template</span><span className="font-medium">{TEMPLATES.find(t => t.id === templateId)?.name}</span></div>
                  {description && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-gray-600 mb-1">Description</p>
                      <p className="text-gray-900">{description}</p>
                    </div>
                  )}
                </div>
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canGoNext}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Launching...' : 'Launch AI Builder'}
              </button>
            )}
          </div>
        </div>
      </div>
    </TenantLayout>
  );
}