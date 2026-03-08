'use client';

import { useState } from 'react';

interface SetupModalProps {
  orgId: string;
  onComplete: () => void;
}

const PARTY_OPTIONS = [
  { value: 'REPUBLICAN', label: 'Republican', emoji: '🐘', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700' },
  { value: 'DEMOCRAT', label: 'Democrat', emoji: '🔵', bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' },
  { value: 'LIBERTARIAN', label: 'Libertarian', emoji: '🗽', bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700' },
  { value: 'GREEN', label: 'Green', emoji: '🌿', bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700' },
  { value: 'INDEPENDENT', label: 'Independent', emoji: '⚖️', bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-700' },
  { value: 'NONPARTISAN', label: 'Nonpartisan', emoji: '🏛️', bg: 'bg-slate-50', border: 'border-slate-400', text: 'text-slate-700' },
  { value: 'OTHER', label: 'Other', emoji: '🗳️', bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700' },
];

export function SetupModal({ orgId, onComplete }: SetupModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await globalThis.fetch(`/api/tenant/${orgId}/setup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyAffiliation: selected }),
      });
      // 409 = already completed — treat as success so modal dismisses cleanly
      if (res.ok || res.status === 409) {
        onComplete();
        return;
      }
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <span className="text-4xl">🏢</span>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">Welcome! Let&apos;s finish setting up your organization</h2>
          <p className="mt-2 text-sm text-gray-600">Select your party affiliation. We&apos;ll connect you with the right network automatically.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {PARTY_OPTIONS.map((party) => {
            const isSelected = selected === party.value;
            return (
              <button
                key={party.value}
                type="button"
                onClick={() => setSelected(party.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                  isSelected
                    ? `${party.bg} ${party.border} ${party.text} shadow-md`
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 text-xs font-bold">✓</span>
                )}
                <span className="text-2xl">{party.emoji}</span>
                <span className="text-sm font-semibold">{party.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || saving}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
          {saving ? 'Saving...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
}
