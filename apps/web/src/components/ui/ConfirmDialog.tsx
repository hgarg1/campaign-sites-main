'use client';

/**
 * Confirmation for a consequential action.
 *
 * Replaces `window.confirm`, which could not name what was about to happen —
 * "Are you sure?" with no mention of the proposal, the organization, or that
 * co-owners had already voted. A native confirm is also unstyleable,
 * untranslatable, and suppressed outright by some mobile browsers, in which
 * case the action proceeded with no confirmation at all.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  /** What will happen, in the user's terms. Not "Are you sure?". */
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Require a typed reason, for actions that others will have to account for. */
  requireReason?: boolean;
  reasonLabel?: string;
}

export function useConfirm() {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (value: string | null) => void }) | null
  >(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  /** Resolves with the reason string (or '') on confirm, and null on cancel. */
  const confirm = useCallback((options: ConfirmOptions) => {
    setReason('');
    return new Promise<string | null>((resolve) => setState({ ...options, resolve }));
  }, []);

  const close = useCallback(
    (value: string | null) => {
      state?.resolve(value);
      setState(null);
      setBusy(false);
    },
    [state]
  );

  const dialog = state ? (
    <Dialog
      open
      onClose={() => close(null)}
      title={state.title}
      size="sm"
      // A destructive flow should not vanish on a stray click outside it.
      dismissOnOverlayClick={!state.destructive}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => close(null)}>
            {state.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            type="button"
            variant={state.destructive ? 'danger' : 'primary'}
            loading={busy}
            disabled={state.requireReason && !reason.trim()}
            onClick={() => {
              setBusy(true);
              close(reason);
            }}
          >
            {state.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-gray-700">
        <div>{state.body}</div>
        {state.requireReason && (
          <div className="space-y-1">
            <label htmlFor="confirm-reason" className="block text-xs font-medium text-gray-700">
              {state.reasonLabel ?? 'Reason'}
            </label>
            <textarea
              id="confirm-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </Dialog>
  ) : null;

  return { confirm, dialog };
}
