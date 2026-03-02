import { MarketingLayout } from '../../components/marketing-layout';
import Link from 'next/link';
import { FullScreenHero } from '../../components/full-screen-hero';

export default function IntegrationsPage() {
  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="Integrations"
        title="Your stack, amplified"
        description="Connect ActBlue, Anedot, Salesforce, HubSpot, and NGP VAN in one click. Data flows seamlessly across your entire fundraising ecosystem."
        gradientFrom="from-purple-600"
        gradientVia="via-pink-600"
        gradientTo="to-red-600"
        primaryCta={{ label: 'See Integrations', href: '/contact' }}
        secondaryCta={{ label: 'View Pricing', href: '/pricing' }}
      />

      {/* Native Integrations Grid */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Native integrations</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Plug into your favorite tools. Built-in API connectors for all major fundraising and CRM platforms.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: 'ActBlue',
              desc: 'Donation forms, recurring gifts, receipts',
              icon: '🎯',
            },
            {
              name: 'Anedot',
              desc: 'Payment processing, compliance, reporting',
              icon: '💳',
            },
            {
              name: 'Salesforce',
              desc: 'CRM sync, contact enrichment, workflows',
              icon: '☁️',
            },
            {
              name: 'HubSpot',
              desc: 'Marketing automation, lead tracking, email',
              icon: '🔄',
            },
            {
              name: 'NGP VAN',
              desc: 'Voter file, canvassing, survey imports',
              icon: '🗳️',
            },
            {
              name: 'Slack',
              desc: 'Real-time alerts, campaign notifications',
              icon: '💬',
            },
            {
              name: 'Zapier',
              desc: '2,000+ app compatibility via webhooks',
              icon: '⚡',
            },
            {
              name: 'Email\nProviders',
              desc: 'SendGrid, Mailchimp, custom SMTP',
              icon: '📧',
            },
          ].map((int) => (
            <div
              key={int.name}
              className="p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="text-4xl mb-3">{int.icon}</div>
              <h3 className="text-lg font-bold mb-2">{int.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{int.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Flow Architecture */}
      <section className="py-20 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 w-full overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-4xl font-bold text-center mb-16">Data architecture</h2>
          <div className="space-y-8">
            {/* Flow steps */}
            <div className="space-y-4 md:space-y-0 overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 w-full">
                {[
                  { step: '1', label: 'Campaign Site', icon: '🏠' },
                  { step: '2', label: 'CampaignSites', icon: '🔗' },
                  { step: '3', label: 'Your Stack', icon: '☁️' },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-full bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-purple-200 dark:border-purple-900">
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Step {item.step}</p>
                      <p className="font-bold text-gray-900 dark:text-white">{item.label}</p>
                    </div>
                    {idx < 2 && (
                      <div className="hidden md:flex items-center justify-center py-2 text-2xl text-purple-600 dark:text-purple-400 font-bold">
                        →
                      </div>
                    )}
                    {idx < 2 && (
                      <div className="md:hidden flex items-center justify-center py-2 text-2xl text-purple-600 dark:text-purple-400 font-bold">
                        ↓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Details */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  title: 'Flexible routing',
                  desc: 'Choose which data flows where. Route donations to ActBlue + Salesforce, contact form submissions to HubSpot and Slack.',
                },
                {
                  title: 'Real-time sync',
                  desc: 'Data syncs within seconds. Donations appear in CRM instantly. Segment lists update as supporters take action.',
                },
                {
                  title: 'Custom workflows',
                  desc: 'Build multi-step automations. Trigger email sequences, SMS notifications, and webhook calls based on any campaign event.',
                },
              ].map((detail) => (
                <div
                  key={detail.title}
                  className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-bold text-lg mb-3">{detail.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{detail.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">Enterprise-grade security</h2>
            <ul className="space-y-4">
              {[
                'OAuth 2.0 authentication—no password sharing',
                'End-to-end encryption for sensitive data',
                'SOC 2 Type II certified with annual audits',
                'CCPA and GDPR compliant data handling',
                'Webhook signing and rate limiting',
                'Full audit logs of all API access and data transfers',
              ].map((item) => (
                <li key={item} className="flex gap-3 items-start">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">✓</span>
                  <span className="text-gray-700 dark:text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl h-80 flex items-center justify-center border border-purple-300 dark:border-purple-700/50">
            <div className="text-center">
              <div className="text-6xl mb-2">🔒</div>
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Enterprise security</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Maturity Levels */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <h2 className="text-4xl font-bold text-center mb-16">What you can do with integrations</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              level: 'Basic',
              features: [
                'Sync donation data to CRM',
                'Add subscribers to email lists',
                'Send Slack notifications',
                'Log all activity with webhooks',
              ],
            },
            {
              level: 'Advanced',
              features: [
                'Multi-step automation workflows',
                'Conditional routing (if donation > $500, then...)',
                'Real-time segment updates',
                'Custom field mapping',
                'Bulk historical data sync',
              ],
            },
          ].map((level) => (
            <div
              key={level.level}
              className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-2xl font-bold mb-6 text-purple-600 dark:text-purple-400">{level.level}</h3>
              <ul className="space-y-3">
                {level.features.map((feat) => (
                  <li key={feat} className="flex gap-2 items-start">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">✓</span>
                    <span className="text-gray-700 dark:text-gray-200">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations FAQ */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Integration FAQ</h2>
        <div className="space-y-6 max-w-3xl mx-auto">
          {[
            {
              q: 'How is data secured when it leaves CampaignSites?',
              a: 'All data is encrypted in transit using TLS 1.2+. Integrations use OAuth 2.0 or API keys you control. We never store credentials—only encrypted tokens that you can revoke anytime in account settings.',
            },
            {
              q: 'What if my tool isn\'t on the integration list?',
              a: 'Use our Zapier integration to connect 2,000+ apps, or build a custom integration with our REST API and webhooks. Full API documentation is included.',
            },
            {
              q: 'Can I test integrations before going live?',
              a: 'Yes. Every integration has a sandbox mode. Test the flow with sample data, then switch to production when ready.',
            },
            {
              q: 'What happens if an integration fails?',
              a: 'We log all errors and send you alerts. Retries are automatic for transient failures. Critical integrations (Salesforce, ActBlue) have guaranteed delivery with manual retry options.',
            },
            {
              q: 'Are there rate limits on API calls?',
              a: 'Starter plans: 10k calls/day. Growth: 100k calls/day. Enterprise: unlimited. Each integration respects your platform\'s rate limits as well.',
            },
          ].map((faq) => (
            <details
              key={faq.q}
              className="group p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
            >
              <summary className="flex justify-between items-start font-bold text-lg cursor-pointer">
                {faq.q}
                <span className="text-purple-600 dark:text-purple-400 text-xl group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 w-full overflow-x-hidden">
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Bring your entire stack together</h2>
          <p className="text-lg mb-8 opacity-95">
            Connect your tools in minutes. Start with one integration or wire up your entire ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-xl transition-all hover:-translate-y-1"
            >
              Set Up Integration
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white dark:hover:text-purple-600 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
