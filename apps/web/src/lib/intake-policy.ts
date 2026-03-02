export type IntakeStep4Policy = {
  donationPlatforms: string[];
  crmPlatforms: string[];
  emailPlatforms: string[];
  dataResidencyOptions: string[];
};

export const DEFAULT_INTAKE_STEP4_POLICY: IntakeStep4Policy = {
  donationPlatforms: ['ActBlue', 'Anedot', 'WinRed', 'Stripe', 'Other'],
  crmPlatforms: ['NGP VAN', 'Salesforce', 'HubSpot', 'NationBuilder', 'Other'],
  emailPlatforms: ['Mailchimp', 'Constant Contact', 'HubSpot', 'Campaign Monitor', 'Other'],
  dataResidencyOptions: ['US', 'EU', 'Canada', 'UK', 'Australia'],
};

function sanitizeOptions(values: unknown, fallback: string[]): string[] {
  if (!Array.isArray(values)) {
    return fallback;
  }

  const normalized = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? normalized : fallback;
}

export function mergeIntakeStep4Policy(candidate?: Partial<IntakeStep4Policy>): IntakeStep4Policy {
  if (!candidate) {
    return DEFAULT_INTAKE_STEP4_POLICY;
  }

  return {
    donationPlatforms: sanitizeOptions(candidate.donationPlatforms, DEFAULT_INTAKE_STEP4_POLICY.donationPlatforms),
    crmPlatforms: sanitizeOptions(candidate.crmPlatforms, DEFAULT_INTAKE_STEP4_POLICY.crmPlatforms),
    emailPlatforms: sanitizeOptions(candidate.emailPlatforms, DEFAULT_INTAKE_STEP4_POLICY.emailPlatforms),
    dataResidencyOptions: sanitizeOptions(candidate.dataResidencyOptions, DEFAULT_INTAKE_STEP4_POLICY.dataResidencyOptions),
  };
}

export function parseIntakeStep4Policy(input?: string | null): IntakeStep4Policy {
  if (!input) {
    return DEFAULT_INTAKE_STEP4_POLICY;
  }

  try {
    const parsed = JSON.parse(input) as Partial<IntakeStep4Policy>;
    return mergeIntakeStep4Policy(parsed);
  } catch {
    return DEFAULT_INTAKE_STEP4_POLICY;
  }
}
