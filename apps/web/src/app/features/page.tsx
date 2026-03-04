'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MarketingLayout } from '../../components/marketing-layout';
import { FullScreenHero } from '../../components/full-screen-hero';
import { IntegrationModal, type Integration } from '../../components/integration-modal';

const integrations: Integration[] = [
  {
    id: 'actblue',
    name: 'ActBlue',
    icon: '💳',
    category: 'fundraising',
    description: 'The most trusted online fundraising platform for Democratic campaigns',
    features: [
      'Direct donation form integration',
      'Real-time donation tracking and reporting',
      'Recurring donation support',
      'Multi-language form customization',
    ],
    useCases: [
      'Senate campaigns',
      'House campaigns',
      'Ballot measures',
      'Party committees',
      'Nonprofits',
    ],
    setupTime: '5-10 minutes',
  },
  {
    id: 'anedot',
    name: 'Anedot',
    icon: '🎯',
    category: 'fundraising',
    description: 'Complete donation and engagement platform for Republican campaigns',
    features: [
      'One-click donation processing',
      'Text-to-donate capabilities',
      'Peer-to-peer fundraising',
      'Event registration integration',
    ],
    useCases: [
      'Federal campaigns',
      'State campaigns',
      'Local races',
      'Grassroots movements',
      'Event fundraising',
    ],
    setupTime: '5-10 minutes',
  },
  {
    id: 'salesforce',
    name: 'Salesforce (NPSP)',
    icon: '☁️',
    category: 'crm',
    description: 'Comprehensive CRM system for managing donor and volunteer relationships',
    features: [
      'Contact and account management',
      'Campaign opportunity tracking',
      'Donation history and attribution',
      'Volunteer management integration',
    ],
    useCases: [
      'Major donor programs',
      'Volunteer coordination',
      'Multi-office campaigns',
      'Large organizations',
      'Data-driven strategy',
    ],
    setupTime: '15-30 minutes',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '📊',
    category: 'crm',
    description: 'Marketing automation and CRM platform for campaign communications',
    features: [
      'Email campaign automation',
      'Lead scoring and tracking',
      'Contact segmentation',
      'Analytics and reporting dashboards',
    ],
    useCases: [
      'Email marketing campaigns',
      'Voter engagement',
      'Automated workflows',
      'Campaign analytics',
      'Team collaboration',
    ],
    setupTime: '10-15 minutes',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    icon: '✉️',
    category: 'marketing',
    description: 'Email marketing made simple for campaigns at any scale',
    features: [
      'Email template builder',
      'Audience segmentation',
      'A/B testing capabilities',
      'Detailed performance analytics',
    ],
    useCases: [
      'Newsletter campaigns',
      'Voter outreach',
      'Volunteer updates',
      'Donation acknowledgments',
      'Event invitations',
    ],
    setupTime: '5 minutes',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    icon: '⚙️',
    category: 'workflow',
    description: 'Connect CampaignSites with 5,000+ apps without custom code',
    features: [
      'Automated workflow creation',
      'Conditional logic triggers',
      'Data transformation and mapping',
      'Multi-app orchestration',
    ],
    useCases: [
      'Slack notifications',
      'Google Sheets syncing',
      'Database automation',
      'Workflow integration',
      'Custom workflows',
    ],
    setupTime: '10-20 minutes',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics 4',
    icon: '📈',
    category: 'analytics',
    description: 'Advanced analytics to understand visitor behavior and campaign performance',
    features: [
      'Real-time visitor tracking',
      'Conversion funnel analysis',
      'Event tracking setup',
      'Custom audience creation',
    ],
    useCases: [
      'Traffic analysis',
      'Conversion tracking',
      'Visitor behavior insights',
      'Attribution modeling',
      'Goal tracking',
    ],
    setupTime: 'Automatic',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💰',
    category: 'fundraising',
    description: 'Global payment processing for flexible fundraising options',
    features: [
      'Credit/debit card processing',
      'Bank transfer support',
      'Subscription billing',
      'Dispute management',
    ],
    useCases: [
      'Direct donations',
      'Merchandise sales',
      'Recurring contributions',
      'International donations',
      'Event ticketing',
    ],
    setupTime: '10 minutes',
  },
];

export default function FeaturesPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  return (
    <MarketingLayout>
      <IntegrationModal
        integration={selectedIntegration}
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
      />

      <FullScreenHero
        eyebrow="Platform Features"
        title="Everything you need to launch and win online"
        description="Move from brief to live site in hours—not weeks—with AI-assisted generation, built-in quality checks, and campaign-ready workflows."
        gradientFrom="from-gray-900"
        gradientVia="via-blue-900"
        gradientTo="to-purple-900"
        primaryCta={{ label: 'Start Building', href: '/get-started' }}
        secondaryCta={{ label: 'See Pricing', href: '/pricing' }}
      />

      <section id="content-section" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
              Core Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Core Capabilities</h2>
            <p className="text-lg text-gray-600">Built for campaign teams that need speed, control, and confidence.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Site Generation',
                text: 'Generate complete campaign pages from your message pillars and brand guidance.',
                icon: '🤖',
              },
              {
                title: 'Template System',
                text: 'Launch with proven layouts for home, issues, volunteer, donation, and events.',
                icon: '📋',
              },
              {
                title: 'Deep Integrations',
                text: 'Connect fundraising and CRM tools without brittle custom glue code.',
                icon: '🔗',
              },
              {
                title: 'Compliance & Accessibility',
                text: 'Use built-in checks to ship pages aligned with WCAG and campaign standards.',
                icon: '✓',
              },
              {
                title: 'Collaboration Workflow',
                text: 'Move faster with team-friendly review loops and clear publishing checkpoints.',
                icon: '👥',
              },
              {
                title: 'White-Labeling',
                text: 'Offer fully branded experiences for parties, agencies, and larger organizations.',
                icon: '🎨',
              },
            ].map((item) => (
              <motion.article
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 hover:shadow-xl transition-all hover:border-blue-300"
                whileHover={{ y: -4 }}
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600 mb-5">{item.text}</p>
                <Link
                  href="/contact"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors text-sm"
                >
                  Learn more →
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Four-stage quality assurance for launch confidence.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Builder Ring', text: 'Three models generate and refine candidate site structures.', icon: '🏗️' },
              { step: '2', title: 'Auditor 1', text: 'Security and accessibility pass catches issues early.', icon: '🔍' },
              { step: '3', title: 'CI/CD Builder', text: 'Deployment-ready configurations and pipelines are created.', icon: '⚙️' },
              { step: '4', title: 'Auditor 2', text: 'Final production-readiness checks before publishing.', icon: '✅' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="rounded-2xl bg-white p-6 border border-gray-200 hover:shadow-lg transition-all hover:border-blue-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center mb-4 text-sm">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              Integrations
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Integrations That Matter</h2>
            <p className="text-lg text-gray-600">
              Connect your existing stack in minutes. Click any integration to see details and get started.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {integrations.map((integration) => (
              <motion.button
                key={integration.id}
                onClick={() => setSelectedIntegration(integration)}
                className="group rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 p-5 text-left transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                whileHover={{ y: -2 }}
              >
                <div className="text-4xl mb-3">{integration.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                  {integration.name}
                </h3>
                <p className="text-xs text-gray-600 group-hover:text-gray-700">
                  {integration.category}
                </p>
                <div className="mt-3 text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to explore →
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              Real Results
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Proof in Practice</h2>
            <p className="text-lg text-gray-600">Results that matter for your campaign.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Faster Launches', text: 'Campaign teams reduce site build cycles from weeks to days.', icon: '⚡' },
              { title: 'Cleaner Hand-offs', text: 'Digital, compliance, and comms teams align in one workflow.', icon: '🤝' },
              { title: 'Higher Confidence', text: 'Pre-publish audits reduce launch-day surprises.', icon: '🎯' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className="rounded-2xl border border-gray-200 p-7 bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-all hover:border-green-300"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">CampaignSites vs Manual Build</h2>
            <p className="text-lg text-gray-600">See why teams choose the faster path.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
            <table className="w-full text-left">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-6 py-4 text-sm font-semibold text-green-700">CampaignSites</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-500">Manual Build</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  ['Launch speed', 'Hours to days', 'Days to weeks'],
                  ['Compliance confidence', 'Built-in checkpoints', 'Ad hoc review'],
                  ['Maintenance effort', 'Centralized workflow', 'Fragmented tools'],
                  ['Deployment readiness', 'Pipeline-generated', 'Custom setup each time'],
                ].map((row) => (
                  <tr key={row[0]} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{row[0]}</td>
                    <td className="px-6 py-4 text-gray-700 font-semibold text-green-600">✓ {row[1]}</td>
                    <td className="px-6 py-4 text-gray-500">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
              Common Questions
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: 'How long does setup take?',
                a: 'Most teams can create a first production-ready draft within a single work session.',
                icon: '⏱️',
              },
              {
                q: 'Who owns the data and content?',
                a: 'Your organization retains ownership of campaign content and connected platform data.',
                icon: '🔐',
              },
              {
                q: 'How is security handled?',
                a: 'Security checks are integrated into generation and pre-deployment validation stages.',
                icon: '🛡️',
              },
              {
                q: 'Can we customize templates deeply?',
                a: 'Yes. Templates are starting points; teams can adjust structure, messaging, and styling.',
                icon: '🎨',
              },
              {
                q: 'Do you support white-label deployment?',
                a: 'Yes, white-label options are available for qualifying organizations and partners.',
                icon: '🏷️',
              },
            ].map((item, index) => (
              <motion.div
                key={item.q}
                className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-purple-300"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">{item.q}</h3>
                    <p className="text-gray-600">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-10 md:p-14 shadow-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
            Ready to accelerate your campaign?
          </h2>
          <p className="text-xl text-gray-600 mb-9">
            Join teams that launch faster, with more confidence, and less friction.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/get-started"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-lg font-semibold hover:shadow-2xl transition-all inline-block"
              >
                Start Building Today
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/pricing"
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-lg font-semibold hover:border-gray-400 hover:shadow-lg transition-all inline-block"
              >
                View Pricing
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
