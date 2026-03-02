import { NextResponse } from 'next/server';
import { parsePasswordPolicy } from '../../../../lib/password-policy';
import { parseIntakeStep4Policy } from '../../../../lib/intake-policy';

function getConfiguredPasswordPolicy() {
  return parsePasswordPolicy(process.env.PASSWORD_POLICY_JSON ?? process.env.NEXT_PUBLIC_PASSWORD_POLICY_JSON ?? null);
}

function getConfiguredIntakeStep4Policy() {
  return parseIntakeStep4Policy(
    process.env.INTAKE_STEP4_POLICY_JSON ?? process.env.NEXT_PUBLIC_INTAKE_STEP4_POLICY_JSON ?? null
  );
}

export async function GET() {
  return NextResponse.json({
    policy: getConfiguredPasswordPolicy(),
    intakeStep4Policy: getConfiguredIntakeStep4Policy(),
  });
}
