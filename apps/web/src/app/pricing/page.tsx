'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MarketingLayout } from '../../components/marketing-layout';
import { FullScreenHero } from '../../components/full-screen-hero';
import { PricingModal } from '../../components/pricing-modal';

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      name: 'Starter',
      price: '$99',
      cadence: '/mo',
      subtitle: 'For early-stage campaigns launching quickly',
      cta: 'Start Starter',
      highlight: false,
      features: ['1 campaign site', 'Template library access', 'Basic integrations', 'Email support'],
      details: {
        description:
          'Perfect for new campaigns and organizations testing the platform. Get started with essential tools to launch your first campaign site in hours.',
        includes: [
          '1 campaign website',
          'Template library with 50+ designs',
          'Basic integrations (email, webhooks)',
          'Mobile-responsive by default',
          'Community support & docs',
          '99.9% uptime SLA',
          '5GB storage',
          'Basic analytics',
        ],
        support: 'Email support with 24-hour response time. Community forum access.',
        bestFor: 'Startups and first-time campaigners',
      },
    },
    {
      name: 'Growth',
      price: '$299',
      cadence: '/mo',
      subtitle: 'For active campaigns with faster iteration needs',
      cta: 'Choose Growth',
      highlight: true,
      features: ['Everything in Starter', 'Multi-LLM workflow controls', 'Advanced integrations', 'Priority support'],
      details: {
        description:
          'The most popular plan for active campaign teams. Get advanced AI controls, priority support, and integrations with your entire fundraising stack.',
        includes: [
          'Everything in Starter, plus:',
          'Up to 5 campaign websites',
          'Multi-LLM workflow with custom controls',
          'Advanced integrations (ActBlue, Anedot, Salesforce, HubSpot, NGP VAN)',
          'A/B testing tools',
          'Advanced analytics & reporting',
          'Custom domain support',
          '50GB storage',
          'API access',
          'Priority email support (4-hour response)',
        ],
        support: 'Priority email support with 4-hour response time. Dedicated Slack channel. Monthly strategy calls.',
        bestFor: 'Active campaign teams and agencies',
      },
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      cadence: '',
      subtitle: 'For parties, agencies, and white-label deployments',
      cta: 'Contact Sales',
      highlight: false,
      features: ['White-label platform', 'Custom onboarding', 'Security review support', 'Dedicated success manager'],
      details: {
        description:
          'Fully customized solution for large organizations and agencies. White-label your deployment, unlock unlimited campaigns, and get dedicated support.',
        includes: [
          'Unlimited campaign websites',
          'White-label platform (custom branding)',
          'Custom onboarding and training',
          'Advanced security features and compliance',
          'Custom integrations',
          'Unlimited storage',
          'Advanced workflow automation',
          'Priority API access with 99.99% SLA',
          'Custom reporting and BI tools',
          'Dedicated infrastructure options',
        ],
        support: 'Dedicated success manager. 24/7 priority support. Quarterly business reviews. Custom SLA agreements.',
        bestFor: 'Enterprise organizations and agencies',
      },
    },
  ];

  const selectedPlanData = plans.find((p) => p.name === selectedPlan) || null;

  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="Pricing"
        title="Flexible plans for campaigns of every size"
        description="Start quickly with a self-serve plan, then scale to team and white-label options as your campaign operation grows."
        gradientFrom="from-cyan-600"
        gradientVia="via-blue-600"
        gradientTo="to-purple-600"
        primaryCta={{ label: 'Talk to Sales', href: '/contact' }}
        secondaryCta={{ label: 'View Features', href: '/features' }}
      />

      <section className="px-6 py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Click any plan to see details. Scale anytime.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={[
                  'rounded-3xl border transition-all duration-300 cursor-pointer hover:shadow-2xl',
                  plan.highlight
                    ? 'border-blue-400 shadow-2xl shadow-blue-200/50 scale-105 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-xl hover:border-gray-300',
                ].join(' ')}
                onClick={() => setSelectedPlan(plan.name)}
              >
                <div className="p-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold">{plan.name}</h2>
                    {plan.highlight ? (
                      <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap ml-2">
                        Most Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 line-clamp-2">{plan.subtitle}</p>
                  <div className="mb-10 pb-8 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-6xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2 text-lg">{plan.cadence}</span>
                  </div>
                  <ul className="space-y-4 mb-10 text-gray-700 dark:text-gray-300">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xl flex-shrink-0">✓</span>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.name);
                    }}
                    className={[
                      'w-full rounded-full px-6 py-3 font-semibold transition-all',
                      plan.highlight
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
                    ].join(' ')}
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-10">Plan Comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Capability</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Starter</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Growth</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  ['Campaign websites', '1', 'Up to 5', 'Unlimited'],
                  ['Integrations', 'Basic', 'Advanced', 'Advanced + custom'],
                  ['Workflow controls', 'Standard', 'Advanced', 'Advanced + policy controls'],
                  ['Support', 'Email', 'Priority', 'Dedicated'],
                  ['White-labeling', '—', 'Optional add-on', 'Included'],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{row[0]}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{row[1]}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{row[2]}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-10">Frequently Asked Pricing Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can we switch plans as our campaign scales?',
                a: 'Yes. Teams can move between plans as needs evolve during election cycles.',
              },
              {
                q: 'Do you offer discounts for annual commitments?',
                a: 'Annual terms and organizational discounts are available through sales.',
              },
              {
                q: 'Is onboarding included?',
                a: 'Growth and Enterprise include enhanced onboarding support.',
              },
              {
                q: 'Are integrations included in every plan?',
                a: 'All plans include integrations; available depth depends on plan tier.',
              },
              {
                q: 'How does Enterprise pricing work?',
                a: 'Enterprise is scoped based on deployment model, support, and white-label needs.',
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{item.q}</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto text-center rounded-3xl border border-cyan-100 dark:border-cyan-900/50 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm p-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 bg-gradient-to-r from-cyan-700 to-purple-700 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent">
            Pick a plan and launch confidently
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-9">Get a recommendation based on your timeline, team size, and campaign goals.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Talk to Sales
            </Link>
            <Link
              href="/product"
              className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-lg font-semibold hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-lg transition-all"
            >
              Product Tour
            </Link>
          </div>
        </div>
      </section>

      <PricingModal
        plan={selectedPlanData}
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </MarketingLayout>
  );
}
