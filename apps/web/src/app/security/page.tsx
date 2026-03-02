import { MarketingLayout } from '../../components/marketing-layout';

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <section className="px-6 pt-24 md:pt-32 pb-12 bg-gradient-to-b from-emerald-50 via-white to-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 mb-5">
            Security Overview
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">Layered security for high-trust campaign operations</h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed mb-8">
            CampaignSites applies defense-in-depth controls across identity, infrastructure, data, and auditing so teams can move quickly without sacrificing security posture.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Encryption', value: 'In transit + at rest' },
              { label: 'Authentication', value: 'OAuth + role controls' },
              { label: 'Monitoring', value: 'Continuous logs + alerts' },
              { label: 'Incident SLA', value: 'Priority triage' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 bg-white">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
          {[
            {
              title: 'Identity & Access',
              points: ['Role-based access control', 'Least-privilege defaults', 'Session and token management'],
            },
            {
              title: 'Application Security',
              points: ['Input validation and sanitization', 'Secure deployment pipeline', 'Dependency risk monitoring'],
            },
            {
              title: 'Data Protection',
              points: ['Encrypted storage', 'Scoped data access', 'Backup and recovery routines'],
            },
            {
              title: 'Audit & Compliance',
              points: ['Action traceability', 'Operational logging', 'Policy and control reviews'],
            },
          ].map((card) => (
            <article key={card.title} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">{card.title}</h2>
              <ul className="space-y-2">
                {card.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-gray-700">
                    <span className="mt-1 text-emerald-600">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-6">
          <article className="rounded-2xl border border-red-200 bg-red-50 p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-3 text-red-800">Threat Reporting</h2>
            <p className="text-red-900 leading-relaxed">
              If you discover a vulnerability or suspicious behavior, report immediately to security@campaignsites.com with reproduction steps and impact scope for priority response.
            </p>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}
