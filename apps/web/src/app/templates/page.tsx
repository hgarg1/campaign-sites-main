import { MarketingLayout } from '../../components/marketing-layout';
import Link from 'next/link';
import { FullScreenHero } from '../../components/full-screen-hero';

export default function TemplatesPage() {
  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="Template Library"
        title="Start with proven templates"
        description="Launch in days, not weeks. Pre-built, mobile-responsive templates for every campaign type, fully customizable to match your brand."
        gradientFrom="from-cyan-600"
        gradientVia="via-teal-600"
        gradientTo="to-emerald-600"
        primaryCta={{ label: 'Browse Templates', href: '/contact' }}
        secondaryCta={{ label: 'View Pricing', href: '/pricing' }}
      />

      {/* Template Categories Grid */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Template Categories</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Five core page types, dozens of variations. Customize any template or mix and match elements.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { name: 'Homepage', desc: 'Hero, features, CTA', icon: '🏠' },
            { name: 'Issues', desc: 'Issue explainer, impact', icon: '📊' },
            { name: 'Volunteer', desc: 'Sign-up flow, logistics', icon: '🤝' },
            { name: 'Donation', desc: 'Gift form, thank you', icon: '💝' },
            { name: 'Event', desc: 'Details, RSVP, tickets', icon: '📅' },
          ].map((cat) => (
            <div
              key={cat.name}
              className="p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="text-4xl mb-3">{cat.icon}</div>
              <h3 className="text-lg font-bold mb-2">{cat.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Customization Engine */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <div className="w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Fully customizable templates</h2>
              <ul className="space-y-4">
                {[
                  'Drag-and-drop page builder—zero coding required',
                  'Hundreds of pre-designed components and sections',
                  'Visual theme editor: custom colors, fonts, spacing',
                  'Mobile-first responsive design—works everywhere',
                  'A/B testing built in—optimize each section',
                  'Form builder with conditional logic and integrations',
                ].map((item) => (
                  <li key={item} className="flex gap-3 items-start">
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold text-lg">✓</span>
                    <span className="text-gray-700 dark:text-gray-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-cyan-200 to-teal-200 dark:from-cyan-900/30 dark:to-teal-900/30 rounded-2xl h-80 flex items-center justify-center border border-cyan-300 dark:border-cyan-700/50">
              <div className="text-center">
                <div className="text-6xl mb-2">🎨</div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">Visual template editor</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Proven, high-converting templates</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Each template has been optimized based on thousands of campaigns and user testing.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Progressive Homepage',
              desc: 'Hero section with trust badges + video embed + issue explainer + call-to-action. Optimized for 40%+ clickthrough.',
              stats: '3,200+ campaigns',
            },
            {
              title: 'Donation Funnel',
              desc: 'Multi-step donation form with suggested amounts, recurring options, and post-donation thank-you sequence.',
              stats: '15% avg increase in donations',
            },
            {
              title: 'Event Landing Page',
              desc: 'Event details with map embed, ticket tiers, speaker bios, and RSVP form with email confirmations.',
              stats: '2,400+ events hosted',
            },
          ].map((tmpl) => (
            <div
              key={tmpl.title}
              className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl font-bold mb-3">{tmpl.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{tmpl.desc}</p>
              <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">{tmpl.stats}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison: Templates vs Custom */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Templates vs. custom builds</h2>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left py-4 px-6 font-bold">Feature</th>
                <th className="text-center py-4 px-6 font-bold">Templates</th>
                <th className="text-center py-4 px-6 font-bold">Custom Build</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
              {[
                { feature: 'Launch time', templates: '2–4 hours', custom: '3–4 weeks' },
                { feature: 'Customization', templates: 'Unlimited', custom: 'Unlimited' },
                { feature: 'Mobile optimized', templates: '✓ Yes', custom: 'Varies' },
                { feature: 'A/B testing', templates: '✓ Built-in', custom: 'Optional' },
                { feature: 'Support', templates: '✓ Full', custom: 'Limited' },
              ].map((row) => (
                <tr key={row.feature}>
                  <td className="py-4 px-6 font-semibold">{row.feature}</td>
                  <td className="py-4 px-6 text-center text-cyan-600 dark:text-cyan-400 font-semibold">
                    {row.templates}
                  </td>
                  <td className="py-4 px-6 text-center text-gray-500 dark:text-gray-400">{row.custom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Template FAQ */}
      <section className="py-20 mx-auto max-w-6xl px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Template FAQ</h2>
        <div className="space-y-6 max-w-3xl mx-auto">
          {[
            {
              q: "Can I combine templates on the same site?",
              a: "Yes. Use the homepage template as your main page and link to issue, donation, or volunteer pages using any template variation. All templates share your brand colors and branding.",
            },
            {
              q: "What if my campaign need is not covered?",
              a: "Start with the closest template and edit any section. Our visual editor gives you full control. Need help? Schedule a design review with our team—included with Growth and Enterprise plans.",
            },
            {
              q: "Are templates mobile-responsive?",
              a: "100% yes. Every template is built on mobile-first principles. All sections adapt across phones, tablets, and desktops. Automatic dark mode support too.",
            },
            {
              q: "Can I white-label templates with my own domain?",
              a: "Yes. On Growth and Enterprise plans, your site has zero branding. Full domain management, SSL, CDN, and custom header/footer code all included.",
            },
            {
              q: "How often are new templates added?",
              a: "We add 1-2 new templates monthly based on user requests. You'll see them immediately in the template library.",
            },
          ].map((faq) => (
            <details
              key={faq.q}
              className="group p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
            >
              <summary className="flex justify-between items-start font-bold text-lg cursor-pointer">
                {faq.q}
                <span className="text-cyan-600 dark:text-cyan-400 text-xl group-open:rotate-180 transition-transform">
                  ⌄
                </span>
              </summary>
              <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 to-emerald-600">
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Choose your template. Launch today.</h2>
          <p className="text-lg mb-8 opacity-95">
            All templates are free with every plan. Start with a pre-built page or build from scratch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="px-8 py-3 bg-white text-cyan-600 rounded-lg font-semibold hover:shadow-xl transition-all hover:-translate-y-1"
            >
              Get Started
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white dark:hover:text-cyan-600 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
