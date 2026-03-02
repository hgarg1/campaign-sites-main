'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MarketingLayout } from '../../components/marketing-layout';
import {
  DEFAULT_PASSWORD_POLICY,
  PasswordPolicy,
  passwordPolicyRequirementText,
  validatePasswordAgainstPolicy,
} from '../../lib/password-policy';
import { DEFAULT_INTAKE_STEP4_POLICY, IntakeStep4Policy } from '../../lib/intake-policy';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type CustomDropdownProps = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function CustomDropdown({ label, placeholder, value, options, onChange }: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left focus:border-blue-500 focus:outline-none bg-white flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>{value || placeholder}</span>
        <span className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                value === option ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GetStartedPage() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [existingUserMode, setExistingUserMode] = useState(false);
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>(DEFAULT_PASSWORD_POLICY);
  const [intakeStep4Policy, setIntakeStep4Policy] = useState<IntakeStep4Policy>(DEFAULT_INTAKE_STEP4_POLICY);

  const [campaignName, setCampaignName] = useState('');
  const [officeSought, setOfficeSought] = useState('');
  const [electionDate, setElectionDate] = useState('');

  const [timeline, setTimeline] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [budgetRange, setBudgetRange] = useState('');

  const [donationPlatform, setDonationPlatform] = useState('');
  const [crmPlatform, setCrmPlatform] = useState('');
  const [emailPlatform, setEmailPlatform] = useState('');
  const [goals, setGoals] = useState<string[]>([]);

  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [campaignBrief, setCampaignBrief] = useState<File | null>(null);
  const [complianceFile, setComplianceFile] = useState<File | null>(null);

  const [privacyContact, setPrivacyContact] = useState('');
  const [incidentContact, setIncidentContact] = useState('');
  const [dataResidency, setDataResidency] = useState('');

  const [teamInvites, setTeamInvites] = useState('');
  const [notes, setNotes] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const stepProgress = useMemo(() => (step / 7) * 100, [step]);
  const passwordValidation = useMemo(() => validatePasswordAgainstPolicy(password, passwordPolicy), [password, passwordPolicy]);
  const confirmPasswordMatches = useMemo(() => password.length > 0 && confirmPassword.length > 0 && password === confirmPassword, [password, confirmPassword]);
  const passwordRequirements = useMemo(() => passwordPolicyRequirementText(passwordPolicy), [passwordPolicy]);

  const goalOptions = ['Fundraising', 'Volunteer Acquisition', 'Rapid Launch', 'Constituent Communications', 'Compliance'];
  const timelineOptions = ['Within 2 weeks', 'Within 30 days', '1-3 months'];
  const teamSizeOptions = ['1-3', '4-10', '11-25', '26+'];
  const budgetOptions = ['<$5K', '$5K-$20K', '$20K-$50K', '$50K+'];

  const encouragementMessages = {
    1: { text: 'Let\'s start with the basics', subtext: 'Create your account and secure your campaign' },
    2: { text: 'Great! Now tell us about your campaign', subtext: 'We\'re learning your electoral goals' },
    3: { text: 'Perfect! Let\'s talk about your team', subtext: 'Understanding your capacity and timeline' },
    4: { text: 'You\'re doing amazing', subtext: 'Select the goals that matter most to you' },
    5: { text: 'Almost halfway there!', subtext: 'Share your assets and campaign details' },
    6: { text: 'Getting close! Security matters', subtext: 'Let\'s ensure your campaign is protected' },
    7: { text: 'Final step! You\'re almost done', subtext: 'Review everything and launch your campaign' },
  };

  useEffect(() => {
    const loadPasswordPolicy = async () => {
      try {
        const response = await fetch('/api/auth/password-policy', { cache: 'no-store' });
        const data = await response.json();

        if (response.ok && data?.policy) {
          setPasswordPolicy(data.policy);
        }

        if (response.ok && data?.intakeStep4Policy) {
          setIntakeStep4Policy(data.intakeStep4Policy);
        }
      } catch {
        setPasswordPolicy(DEFAULT_PASSWORD_POLICY);
        setIntakeStep4Policy(DEFAULT_INTAKE_STEP4_POLICY);
      }
    };

    loadPasswordPolicy();
  }, []);

  const toggleGoal = (goal: string) => {
    setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]));
  };

  const next = () => {
    if (step === 1) {
      if (!email || !password) {
        setError('Please complete all account fields.');
        return;
      }

      if (!existingUserMode && !fullName) {
        setError('Please enter your full name for account creation.');
        return;
      }

      if (!existingUserMode && !passwordValidation.valid) {
        setError('Password does not meet the current policy requirements.');
        return;
      }

      if (!existingUserMode && password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    if (step === 2 && (!campaignName || !officeSought)) {
      setError('Please provide campaign basics.');
      return;
    }

    if (step === 3 && (!timeline || !teamSize || !budgetRange)) {
      setError('Please complete timeline, team size, and budget.');
      return;
    }

    if (step === 4 && goals.length === 0) {
      setError('Please select at least one campaign goal.');
      return;
    }

    if (step === 4 && (!donationPlatform || !crmPlatform || !emailPlatform)) {
      setError('Please select donation, CRM, and email platforms.');
      return;
    }

    if (step === 5 && !campaignBrief) {
      setError('Campaign brief file is required.');
      return;
    }

    setError(null);
    setStep((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 3;
      if (prev === 3) return 4;
      if (prev === 4) return 5;
      if (prev === 5) return 6;
      if (prev === 6) return 7;
      return 7;
    });
  };

  const back = () => {
    setError(null);
    setStep((prev) => {
      if (prev === 7) return 6;
      if (prev === 6) return 5;
      if (prev === 5) return 4;
      if (prev === 4) return 3;
      if (prev === 3) return 2;
      if (prev === 2) return 1;
      return 1;
    });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agreeToTerms) {
      setError('You must accept the terms to submit.');
      return;
    }

    if (!campaignBrief) {
      setError('Campaign brief file is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      formData.append('existingUser', existingUserMode ? 'true' : 'false');
      formData.append('campaignName', campaignName);
      formData.append('officeSought', officeSought);
      formData.append('electionDate', electionDate);
      formData.append('timeline', timeline);
      formData.append('teamSize', teamSize);
      formData.append('budgetRange', budgetRange);
      formData.append('donationPlatform', donationPlatform);
      formData.append('crmPlatform', crmPlatform);
      formData.append('emailPlatform', emailPlatform);
      formData.append('goals', goals.join(', '));
      formData.append('privacyContact', privacyContact);
      formData.append('incidentContact', incidentContact);
      formData.append('dataResidency', dataResidency);
      formData.append('teamInvites', teamInvites);
      formData.append('notes', notes);
      formData.append('agreeToTerms', agreeToTerms ? 'yes' : '');

      if (brandLogo) {
        formData.append('brandLogo', brandLogo);
      }

      formData.append('campaignBrief', campaignBrief);

      if (complianceFile) {
        formData.append('complianceFile', complianceFile);
      }

      const response = await fetch('/api/get-started/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Could not submit intake.');
        return;
      }

      setSuccess(data?.message || 'Success! Intake submitted.');
      setShowCompletion(true);
    } catch (submitError) {
      console.error('Get started submission failed:', submitError);
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (showCompletion) {
    return (
      <MarketingLayout>
        <section className="px-6 pt-24 md:pt-32 pb-16 bg-gradient-to-b from-blue-50 via-white to-purple-50 min-h-screen">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-3xl border border-blue-100 bg-white shadow-xl p-8 md:p-10 text-center"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-2xl mb-4">
                ✓
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Onboarding Intake Complete</h1>
              <p className="text-gray-600 mb-8">
                {success || 'Your intake has been submitted successfully. We are preparing your campaign workspace now.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/welcome"
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
                >
                  Continue to Welcome
                </Link>
                <Link
                  href="/contact"
                  className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Contact Support
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="px-6 pt-24 md:pt-30 pb-16 bg-gradient-to-b from-blue-50 via-white to-purple-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 mb-4">
              7-Step Onboarding Wizard
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">Get started with full intake + account creation</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Complete this comprehensive workflow once. We’ll configure your account, team workspace, and campaign launch plan automatically.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white shadow-xl p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Step {step} of 7</span>
                <span>{Math.round(stepProgress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                  animate={{ width: `${stepProgress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>

              <motion.div
                key={`encouragement-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mt-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-4"
              >
                <p className="text-lg font-semibold text-gray-900">{encouragementMessages[step].text}</p>
                <p className="text-sm text-gray-600 mt-1">{encouragementMessages[step].subtext}</p>
              </motion.div>
            </div>

            <form onSubmit={submit} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                        <label className="inline-flex items-center gap-2 text-gray-700 font-medium">
                          <input
                            type="checkbox"
                            checked={existingUserMode}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setExistingUserMode(enabled);
                              if (enabled) {
                                setConfirmPassword('');
                              }
                              setError(null);
                            }}
                          />
                          I already have an account (log in and continue intake)
                        </label>
                        <p className="mt-2 text-xs text-gray-600">
                          Existing users can also use <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">the login page</Link>.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        {!existingUserMode && (
                          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name *" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                        )}
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work Email *" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={existingUserMode ? 'Password *' : 'Password *'} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                        {!existingUserMode && (
                          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password *" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                        )}
                      </div>

                      {!existingUserMode && (
                        <div className="rounded-xl border border-gray-200 p-4 bg-white">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Password requirements</p>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li className={passwordValidation.checks.minLength ? 'text-green-700' : 'text-gray-600'}>
                              {passwordValidation.checks.minLength ? '✓' : '○'} At least {passwordPolicy.minLength} characters
                            </li>
                            {passwordPolicy.requireUppercase && (
                              <li className={passwordValidation.checks.uppercase ? 'text-green-700' : 'text-gray-600'}>
                                {passwordValidation.checks.uppercase ? '✓' : '○'} One uppercase letter
                              </li>
                            )}
                            {passwordPolicy.requireLowercase && (
                              <li className={passwordValidation.checks.lowercase ? 'text-green-700' : 'text-gray-600'}>
                                {passwordValidation.checks.lowercase ? '✓' : '○'} One lowercase letter
                              </li>
                            )}
                            {passwordPolicy.requireNumber && (
                              <li className={passwordValidation.checks.number ? 'text-green-700' : 'text-gray-600'}>
                                {passwordValidation.checks.number ? '✓' : '○'} One number
                              </li>
                            )}
                            {passwordPolicy.requireSpecial && (
                              <li className={passwordValidation.checks.special ? 'text-green-700' : 'text-gray-600'}>
                                {passwordValidation.checks.special ? '✓' : '○'} One special character
                              </li>
                            )}
                          </ul>
                          <p className={`mt-3 text-xs font-medium ${confirmPassword.length === 0 ? 'text-gray-500' : confirmPasswordMatches ? 'text-green-700' : 'text-red-600'}`}>
                            {confirmPassword.length === 0
                              ? 'Confirm your password to continue.'
                              : confirmPasswordMatches
                              ? 'Confirm password matches.'
                              : 'Confirm password does not match.'}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">Policy is configurable via PASSWORD_POLICY_JSON.</p>
                          <p className="sr-only">{passwordRequirements.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign Name *" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                      <input value={officeSought} onChange={(e) => setOfficeSought(e.target.value)} placeholder="Office Sought *" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                      <input value={electionDate} onChange={(e) => setElectionDate(e.target.value)} placeholder="Election Date (optional)" className="md:col-span-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Launch Timeline *</p>
                        <div className="flex flex-wrap gap-2">
                          {timelineOptions.map((option) => (
                            <button key={option} type="button" onClick={() => setTimeline(option)} className={`px-4 py-2 rounded-full border transition-all ${timeline === option ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'}`}>
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Team Size *</p>
                        <div className="flex flex-wrap gap-2">
                          {teamSizeOptions.map((option) => (
                            <button key={option} type="button" onClick={() => setTeamSize(option)} className={`px-4 py-2 rounded-full border transition-all ${teamSize === option ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'}`}>
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Budget Range *</p>
                        <div className="flex flex-wrap gap-2">
                          {budgetOptions.map((option) => (
                            <button key={option} type="button" onClick={() => setBudgetRange(option)} className={`px-4 py-2 rounded-full border transition-all ${budgetRange === option ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'}`}>
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <CustomDropdown
                          label="Donation Platform"
                          placeholder="Select Donation Platform"
                          value={donationPlatform}
                          options={intakeStep4Policy.donationPlatforms}
                          onChange={setDonationPlatform}
                        />
                        <CustomDropdown
                          label="CRM Platform"
                          placeholder="Select CRM Platform"
                          value={crmPlatform}
                          options={intakeStep4Policy.crmPlatforms}
                          onChange={setCrmPlatform}
                        />
                        <CustomDropdown
                          label="Email Platform"
                          placeholder="Select Email Platform"
                          value={emailPlatform}
                          options={intakeStep4Policy.emailPlatforms}
                          onChange={setEmailPlatform}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Step 4 platform dropdown options are configurable via INTAKE_STEP4_POLICY_JSON.</p>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Primary Goals *</p>
                        <div className="flex flex-wrap gap-2">
                          {goalOptions.map((goal) => (
                            <button key={goal} type="button" onClick={() => toggleGoal(goal)} className={`px-4 py-2 rounded-full border transition-all ${goals.includes(goal) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'}`}>
                              {goal}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Brand Logo (optional)</label>
                        <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(e) => setBrandLogo(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Brief (required)</label>
                        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCampaignBrief(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Compliance Packet (optional)</label>
                        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setComplianceFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-gray-300 px-4 py-3" />
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <input value={privacyContact} onChange={(e) => setPrivacyContact(e.target.value)} placeholder="Privacy Contact" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                      <input value={incidentContact} onChange={(e) => setIncidentContact(e.target.value)} placeholder="Incident Contact" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                      <div className="md:col-span-2">
                        <CustomDropdown
                          label="Preferred Data Residency"
                          placeholder="Select Preferred Data Residency"
                          value={dataResidency}
                          options={intakeStep4Policy.dataResidencyOptions}
                          onChange={setDataResidency}
                        />
                        <p className="mt-1 text-xs text-gray-500">Options are configurable via INTAKE_STEP4_POLICY_JSON.</p>
                      </div>
                    </div>
                  )}

                  {step === 7 && (
                    <div className="space-y-4">
                      <textarea value={teamInvites} onChange={(e) => setTeamInvites(e.target.value)} rows={3} placeholder="Team invite emails (comma-separated)" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Anything else we should know?" className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none" />
                      <label className="flex items-start gap-3 text-sm text-gray-700">
                        <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} className="mt-1" />
                        <span>
                          I confirm the provided information is accurate and I agree to the{' '}
                          <Link href="/terms" className="text-blue-600 font-semibold hover:text-blue-700 underline">
                            onboarding terms
                          </Link>
                          .
                        </span>
                      </label>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-700">{success}</p>}

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={back} disabled={step === 1 || submitting} className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all">
                  Back
                </button>

                {step < 7 ? (
                  <button type="button" onClick={next} disabled={submitting} className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    Continue
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? 'Submitting...' : 'Create Account & Submit'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
