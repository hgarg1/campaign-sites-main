'use client';

import React, { ReactNode } from 'react';
import { useSystemAdminPermissions } from '@/hooks/use-system-admin-permissions';

interface PermissionGateProps {
  claim: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders children only if user has required permission(s)
 * If claim is an array, user must have ALL permissions
 * If claim is a string, user must have that permission
 */
export function PermissionGate({
  claim,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasAllPermissions, hasPermission } = useSystemAdminPermissions();

  const hasAccess = Array.isArray(claim)
    ? hasAllPermissions(claim)
    : hasPermission(claim);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface PermissionGatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  claim: string | string[];
  children: ReactNode;
  fallbackText?: string;
}

/**
 * Button that disables if user lacks required permission(s)
 * Shows tooltip on hover explaining why disabled
 */
export function PermissionGatedButton({
  claim,
  children,
  fallbackText = 'No permission',
  ...props
}: PermissionGatedButtonProps) {
  const { hasAllPermissions, hasPermission } = useSystemAdminPermissions();

  const hasAccess = Array.isArray(claim)
    ? hasAllPermissions(claim)
    : hasPermission(claim);

  return (
    <button
      {...props}
      disabled={!hasAccess || props.disabled}
      title={!hasAccess ? fallbackText : props.title}
      className={`${props.className} ${
        !hasAccess ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
}

interface PermissionGatedActionProps {
  claim: string | string[];
  onPermissionDenied?: () => void;
  children: (execute: boolean) => ReactNode;
}

/**
 * Provides permission check for async actions
 * Children receive a boolean indicating if action is allowed
 */
export function PermissionGatedAction({
  claim,
  onPermissionDenied,
  children,
}: PermissionGatedActionProps) {
  const { hasAllPermissions, hasPermission } = useSystemAdminPermissions();

  const hasAccess = Array.isArray(claim)
    ? hasAllPermissions(claim)
    : hasPermission(claim);

  if (!hasAccess && onPermissionDenied) {
    onPermissionDenied();
  }

  return <>{children(hasAccess)}</>;
}
