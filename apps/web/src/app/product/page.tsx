import Link from 'next/link';
import { MarketingLayout } from '../../components/marketing-layout';
import { FullScreenHero } from '../../components/full-screen-hero';

export default function ProductPage() {
  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="Product Overview"
        title="Built on a multi-LLM campaign production system"
        description="CampaignSites combines AI generation, validation, and deployment orchestration so your team can publish better campaign websites with less operational friction."
        gradientFrom="from-gray-900"
        gradientVia="via-indigo-900"
        gradientTo="to-purple-900"
        primaryCta={{ label: 'Book a Product Demo', href: '/contact' }}
        secondaryCta={{ label: 'Explore Features', href: '/features' }}
      />

      <section id="content-section" className="px-6 py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What the Product Handles</h2>
            <p className="text-lg text-gray-600">From first draft to production release, all in one operating layer.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Campaign Brief Intake',
                text: 'Turn messaging priorities and brand direction into structured build inputs.',
              },
              {
                title: 'Parallel Content Generation',
                text: 'Multiple models generate options so teams get stronger first drafts faster.',
              },
              {
                title: 'Automated Quality Gates',
                text: 'Catch accessibility, security, and structural issues before they ship.',
              },
              {
                title: 'Deployment Packaging',
                text: 'Create deployment-ready artifacts and release configurations automatically.',
              },
              {
                title: 'Operational Visibility',
                text: 'Track build progression across each stage with clear handoff checkpoints.',
              },
              {
                title: 'Integration Layer',
                text: 'Sync campaign pages with fundraising and CRM tools from day one.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 hover:shadow-xl transition-all">
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600 mb-5">{item.text}</p>
                <Link href="/contact" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  See it in action →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">Pipeline Architecture</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: 'Stage 1: Builder Ring',
                detail: 'OpenAI, Anthropic, and Google collaborate to generate robust campaign page candidates.',
              },
              {
                title: 'Stage 2: Auditor 1',
                detail: 'Security and accessibility checks evaluate generated output against core standards.',
              },
              {
                title: 'Stage 3: CI/CD Builder',
                detail: 'Infrastructure and release configs are assembled for production-ready deployment.',
              },
              {
                title: 'Stage 4: Auditor 2',
                detail: 'A final validation pass ensures launch readiness and operational resilience.',
              },
            ].map((item, idx) => (
              <div key={item.title} className="rounded-2xl bg-white border border-gray-200 p-7">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold mb-4">
                  {idx + 1}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">Why Product Teams Choose CampaignSites</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Fewer Tool Gaps',
                text: 'Replace disconnected workflows with one consistent product operating model.',
              },
              {
                title: 'Faster Iteration',
                text: 'Ship updates quickly without sacrificing governance and quality standards.',
              },
              {
                title: 'Higher Reliability',
                text: 'Reduce launch risk through structured validation and repeatable deployment.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 p-7 bg-gradient-to-br from-indigo-50/50 to-white">
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto text-center rounded-3xl border border-indigo-100 bg-white/70 backdrop-blur-sm p-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
            See the full product workflow live
          </h2>
          <p className="text-xl text-gray-600 mb-9">Get a guided walkthrough tailored to your campaign team, stack, and launch timeline.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Schedule Demo
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-lg font-semibold hover:border-gray-400 hover:shadow-lg transition-all"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
