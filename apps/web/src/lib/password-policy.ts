export type PasswordPolicy = {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
};

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

export type PasswordPolicyValidation = {
  valid: boolean;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
};

export function mergePasswordPolicy(candidate?: Partial<PasswordPolicy>): PasswordPolicy {
  if (!candidate) {
    return DEFAULT_PASSWORD_POLICY;
  }

  return {
    minLength: Math.max(6, Math.min(64, Number(candidate.minLength) || DEFAULT_PASSWORD_POLICY.minLength)),
    requireUppercase: candidate.requireUppercase ?? DEFAULT_PASSWORD_POLICY.requireUppercase,
    requireLowercase: candidate.requireLowercase ?? DEFAULT_PASSWORD_POLICY.requireLowercase,
    requireNumber: candidate.requireNumber ?? DEFAULT_PASSWORD_POLICY.requireNumber,
    requireSpecial: candidate.requireSpecial ?? DEFAULT_PASSWORD_POLICY.requireSpecial,
  };
}

export function parsePasswordPolicy(input?: string | null): PasswordPolicy {
  if (!input) {
    return DEFAULT_PASSWORD_POLICY;
  }

  try {
    const parsed = JSON.parse(input) as Partial<PasswordPolicy>;
    return mergePasswordPolicy(parsed);
  } catch {
    return DEFAULT_PASSWORD_POLICY;
  }
}

export function validatePasswordAgainstPolicy(password: string, policy: PasswordPolicy): PasswordPolicyValidation {
  const checks = {
    minLength: password.length >= policy.minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const valid =
    checks.minLength &&
    (!policy.requireUppercase || checks.uppercase) &&
    (!policy.requireLowercase || checks.lowercase) &&
    (!policy.requireNumber || checks.number) &&
    (!policy.requireSpecial || checks.special);

  return { valid, checks };
}

export function passwordPolicyRequirementText(policy: PasswordPolicy): string[] {
  const requirements = [`At least ${policy.minLength} characters`];

  if (policy.requireUppercase) {
    requirements.push('One uppercase letter');
  }

  if (policy.requireLowercase) {
    requirements.push('One lowercase letter');
  }

  if (policy.requireNumber) {
    requirements.push('One number');
  }

  if (policy.requireSpecial) {
    requirements.push('One special character');
  }

  return requirements;
}
