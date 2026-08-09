/**
 * Portal-neutral entry point for the toast system.
 *
 * The provider and hook were written under `components/admin/`, so tenant
 * screens never reached for them and hand-rolled inline red divs instead —
 * 72 files with bespoke error banners against 26 using the real thing.
 * Re-exported here so neither portal has to import from the other's directory.
 * The implementation stays where it is to avoid churning 27 existing imports.
 */

export { ToastProvider, useToast } from '@/components/admin/shared/ToastContext';
