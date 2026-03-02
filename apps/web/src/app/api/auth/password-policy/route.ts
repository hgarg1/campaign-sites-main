import { NextResponse } from 'next/server';
import { parsePasswordPolicy } from '../../../../lib/password-policy';

function getConfiguredPasswordPolicy() {
  return parsePasswordPolicy(process.env.PASSWORD_POLICY_JSON ?? process.env.NEXT_PUBLIC_PASSWORD_POLICY_JSON ?? null);
}

export async function GET() {
  return NextResponse.json({ policy: getConfiguredPasswordPolicy() });
}
