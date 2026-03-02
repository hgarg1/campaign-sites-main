import { MarketingLayout } from '../../components/marketing-layout';

export default function TermsPage() {
  return (
    <MarketingLayout>
      <section className="px-6 pt-24 md:pt-32 pb-12 bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 mb-5">
            Terms of Service
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">Clear platform terms for campaign teams</h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            These terms govern access and use of CampaignSites services by campaign organizations, staff, and authorized users.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20 bg-white">
        <div className="max-w-5xl mx-auto space-y-6">
          {[
            {
              title: '1. Account Responsibility',
              body: 'Organizations are responsible for account security, user access control, and all activity conducted under authorized team accounts.',
            },
            {
              title: '2. Acceptable Use',
              body: 'You may not use the platform for unlawful activity, abusive traffic, unauthorized data extraction, or attempts to compromise systems or third-party services.',
            },
            {
              title: '3. Service Availability',
              body: 'We aim for high availability and resilience but do not guarantee uninterrupted operation. Scheduled maintenance and incident remediation may affect service windows.',
            },
            {
              title: '4. Fees and Billing',
              body: 'Paid plans are billed according to your contract terms. Delinquent balances may result in feature limitations or suspension consistent with agreement terms.',
            },
            {
              title: '5. Termination',
              body: 'Either party may terminate in accordance with contractual notice periods. Data export options are available during defined offboarding windows.',
            },
          ].map((section) => (
            <article key={section.title} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-3">{section.title}</h2>
              <p className="text-gray-700 leading-relaxed">{section.body}</p>
            </article>
          ))}

          <article className="rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-3 text-red-800">Liability & Risk Limitations</h2>
            <p className="text-red-900 leading-relaxed">
              Except where prohibited by law, liability is limited to fees paid for services in the applicable period. Campaign teams remain responsible for legal compliance in content and operations.
            </p>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}
