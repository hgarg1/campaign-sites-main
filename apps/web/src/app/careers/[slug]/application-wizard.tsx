'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

type WizardStep = 1 | 2 | 3;

interface ApplicationWizardProps {
  jobSlug: string;
  jobTitle: string;
}

export function ApplicationWizard({ jobSlug, jobTitle }: ApplicationWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [resume, setResume] = useState<File | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');

  const [yearsExperience, setYearsExperience] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [startDate, setStartDate] = useState('');
  const [workAuthorization, setWorkAuthorization] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const progress = useMemo(() => (step / 3) * 100, [step]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === '#application-wizard' || window.location.hash === '#apply') {
        setIsOpen(true);
      }
    };

    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    return () => {
      window.removeEventListener('hashchange', openFromHash);
    };
  }, []);

  const nextStep = () => {
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !phone.trim()) {
        setErrorMessage('Please complete full name, email, and phone to continue.');
        return;
      }
    }

    if (step === 2) {
      if (!resume || !cv) {
        setErrorMessage('Please upload both resume and CV to continue.');
        return;
      }
    }

    setErrorMessage(null);
    setStep((current) => {
      if (current === 1) return 2;
      if (current === 2) return 3;
      return 3;
    });
  };

  const prevStep = () => {
    setErrorMessage(null);
    setStep((current) => {
      if (current === 3) return 2;
      if (current === 2) return 1;
      return 1;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resume || !cv) {
      setErrorMessage('Resume and CV are required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('jobSlug', jobSlug);
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('location', location);
      formData.append('linkedInUrl', linkedInUrl);
      formData.append('portfolioUrl', portfolioUrl);
      formData.append('yearsExperience', yearsExperience);
      formData.append('currentCompany', currentCompany);
      formData.append('currentTitle', currentTitle);
      formData.append('expectedSalary', expectedSalary);
      formData.append('startDate', startDate);
      formData.append('workAuthorization', workAuthorization);
      formData.append('coverLetter', coverLetter);
      formData.append('additionalInfo', additionalInfo);
      formData.append('resume', resume);
      formData.append('cv', cv);

      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data?.error || 'Failed to submit application.');
        return;
      }

      setSuccessMessage(data?.message || 'Application submitted successfully.');
      setStep(1);
      setFullName('');
      setEmail('');
      setPhone('');
      setLocation('');
      setLinkedInUrl('');
      setPortfolioUrl('');
      setResume(null);
      setCv(null);
      setCoverLetter('');
      setYearsExperience('');
      setCurrentCompany('');
      setCurrentTitle('');
      setExpectedSalary('');
      setStartDate('');
      setWorkAuthorization('');
      setAdditionalInfo('');
    } catch (error) {
      console.error('Application submission failed:', error);
      setErrorMessage('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="apply" className="mt-10">
      {!isOpen && (
        <div className="rounded-3xl border border-green-100 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to apply for {jobTitle}?</h2>
          <p className="text-gray-600 mb-5">
            Start the 3-step application process. Resume and CV uploads are required.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            Start Application →
          </button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="application-wizard-form"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-3xl border border-green-100 bg-white p-6 md:p-10 shadow-sm"
          >
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2">Apply for {jobTitle}</h2>
              <p className="text-gray-600">Complete this 3-step application. Resume and CV uploads are required.</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Step {step} of 3</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-600 to-emerald-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
              <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" placeholder="https://..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resume (PDF/DOC/DOCX, max 5MB) *</label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files?.[0] ?? null)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" required />
              {resume && <p className="text-xs text-gray-500 mt-1">Selected: {resume.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CV (PDF/DOC/DOCX, max 5MB) *</label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] ?? null)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" required />
              {cv && <p className="text-xs text-gray-500 mt-1">Selected: {cv.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
              <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={6} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" placeholder="Tell us why you're a great fit..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
              <input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
              <input value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
              <input value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Earliest Start Date</label>
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" placeholder="e.g. 2 weeks" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Authorization</label>
              <input value={workAuthorization} onChange={(e) => setWorkAuthorization(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" placeholder="e.g. US Citizen, Visa" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
              <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
        )}

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={submitting}
                className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1 || submitting}
                  className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                >
                  Back
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={submitting}
                    className="px-6 py-2 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                )}
              </div>
            </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
