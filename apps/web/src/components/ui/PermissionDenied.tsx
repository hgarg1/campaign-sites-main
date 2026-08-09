'use client';

/**
 * Turns a 403 into an explanation.
 *
 * A tenant action can be refused by any of several independent gates — org
 * access, the organization's effective status, a platform policy, a parent
 * organization's policy, or the member's own role. The APIs already return
 * `reason`, `source` and `policyId` on denial and nothing rendered them, so
 * every refusal looked identical and none said who to ask.
 */

import { Dialog } from './Dialog';
import { Button } from './Button';

export interface DenialInfo {
  error?: string;
  /** 'system' for a platform policy, or the org id that imposed it. */
  source?: string;
  policyId?: string;
  reason?: string;
}

/** Best-effort classification of which gate refused the request. */
function classify(info: DenialInfo, orgId?: string) {
  const text = `${info.error ?? ''} ${info.reason ?? ''}`.toLowerCase();

  if (info.source && info.source !== 'system' && info.source !== orgId) {
    return {
      gate: 'A parent organization',
      guidance:
        'A parent organization has restricted this action. It can only be lifted by that organization, through a governance proposal.',
    };
  }
  if (info.source === 'system' || text.includes('system policy')) {
    return {
      gate: 'Platform policy',
      guidance:
        'Platform administrators have restricted this action for your organization. Contact support to have it reviewed.',
    };
  }
  if (text.includes('suspend') || text.includes('deactivat')) {
    return {
      gate: 'Organization status',
      guidance:
        'This organization is suspended or deactivated, so most actions are unavailable until that is lifted.',
    };
  }
  if (text.includes('owner') || text.includes('admin') || text.includes('role')) {
    return {
      gate: 'Your role',
      guidance:
        'Your role in this organization does not include this action. An owner can change your role or grant a custom role.',
    };
  }
  return {
    gate: 'Permission',
    guidance: 'You do not have permission for this action in this organization.',
  };
}

export function PermissionDenied({
  open,
  onClose,
  info,
  orgId,
  action,
}: {
  open: boolean;
  onClose: () => void;
  info: DenialInfo;
  orgId?: string;
  /** What the person was trying to do, in their words. */
  action?: string;
}) {
  const { gate, guidance } = classify(info, orgId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={action ? `You cannot ${action}` : 'Action not permitted'}
      size="sm"
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-gray-700">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Blocked by
          </div>
          <div className="text-gray-900">{gate}</div>
        </div>

        <p>{guidance}</p>

        {info.reason && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Reason given
            </div>
            <p className="text-gray-700">{info.reason}</p>
          </div>
        )}

        {info.policyId && (
          <p className="text-xs text-gray-500">
            Policy reference <code className="font-mono">{info.policyId}</code> — quote this if you
            raise it with support.
          </p>
        )}
      </div>
    </Dialog>
  );
}
