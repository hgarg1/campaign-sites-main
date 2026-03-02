import { MarketingLayout } from '../../components/marketing-layout';

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <section className="px-6 pt-24 md:pt-32 pb-12 bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 mb-5">
            Privacy Policy
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">Privacy-first by design</h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed mb-8">
            CampaignSites helps campaign teams launch faster while protecting voter and supporter data. This page explains what we collect, why we collect it, and how you control it.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Last updated', value: 'March 2, 2026' },
              { label: 'Response SLA', value: '< 72 hours' },
              { label: 'Data requests', value: 'privacy@campaignsites.com' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-base font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 bg-white">
        <div className="max-w-5xl mx-auto space-y-6">
          {[
            {
              title: '1. Data We Collect',
              body: 'We collect account identity details (name, email, role), campaign configuration data, integration metadata, and product usage analytics required to operate and improve the platform.',
            },
            {
              title: '2. How We Use Data',
              body: 'We use your data to deliver services, secure accounts, troubleshoot incidents, provide support, and meet legal obligations. We do not sell campaign supporter data.',
            },
            {
              title: '3. Data Sharing',
              body: 'Data is shared only with vetted subprocessors required for hosting, infrastructure, analytics, and service operations, subject to contractual privacy and security obligations.',
            },
            {
              title: '4. Retention',
              body: 'We retain data only as long as needed for operational, legal, and compliance reasons. You may request deletion or export, subject to lawful retention requirements.',
            },
            {
              title: '5. Your Rights',
              body: 'Depending on your jurisdiction, you may request access, correction, deletion, portability, and processing restrictions. We honor verified privacy requests promptly.',
            },
          ].map((section) => (
            <article key={section.title} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-3">{section.title}</h2>
              <p className="text-gray-700 leading-relaxed">{section.body}</p>
            </article>
          ))}

          <article className="rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-3 text-red-800">Sensitive Data Notice</h2>
            <p className="text-red-900 leading-relaxed">
              Do not upload SSNs, payment card numbers, or unnecessary sensitive personal data into free-form fields unless specifically required by your legal or compliance workflow.
            </p>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}
