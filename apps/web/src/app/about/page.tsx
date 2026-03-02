'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MarketingLayout } from '../../components/marketing-layout';
import { FullScreenHero } from '../../components/full-screen-hero';

export default function AboutPage() {
  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="About CampaignSites"
        title="Giving campaign teams superpowers"
        description="We believe every candidate and cause deserves a modern, secure campaign website. CampaignSites removes complexity so teams can focus on winning voters."
        gradientFrom="from-blue-900"
        gradientVia="via-cyan-900"
        gradientTo="to-blue-900"
        primaryCta={{ label: 'Get Started', href: '/get-started' }}
        secondaryCta={{ label: 'See Features', href: '/features' }}
      />

      {/* Mission Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Mission</h2>
            <p className="text-xl text-gray-600">
              Build the infrastructure that modern political campaigns need to move fast and win.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Speed',
                desc: 'From brief to live in hours, not weeks. No design overhead, no deployment friction.',
              },
              {
                icon: '🛡️',
                title: 'Safety',
                desc: 'Built-in security, accessibility, and compliance. Ship with confidence. Launch qualified.',
              },
              {
                icon: '🎯',
                title: 'Strategy',
                desc: 'Integrated analytics and integrations. Data flows where it matters. Teams stay aligned.',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 hover:shadow-lg transition-all hover:border-blue-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Built This */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why We Built CampaignSites</h2>
          </div>

          <div className="space-y-8">
            {[
              {
                heading: 'Campaign teams were wasting time on infrastructure',
                body: 'Sites were being built from scratch. Teams juggled freelancers, contractors, and incompatible tools. A simple homepage took weeks. Compliance reviews were manual. Integrations were fragile.',
                icon: '⏳',
              },
              {
                heading: 'Campaigns deserved better',
                body: 'Modern platforms exist for SaaS, e-commerce, and nonprofits. But political campaigns? They were still living in 2015. Candidates and causes needed a built-for-purpose platform, not jury-rigged solutions.',
                icon: '🚀',
              },
              {
                heading: 'Technology was leaving teams behind',
                body: 'AI was accelerating development everywhere—except for campaigns. We saw an opportunity to give campaigns the same speed and quality that enterprises use daily.',
                icon: '🤖',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.heading}
                className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-all"
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{item.heading}</h3>
                    <p className="text-gray-600">{item.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How We Work</h2>
            <p className="text-lg text-gray-600">Principles that guide every decision we make.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: 'Bias Toward Action',
                desc: 'Campaign seasons are short. We ship fast. We iterate quickly. We get out of the way so campaigns can move.',
              },
              {
                title: 'Security First',
                desc: 'Political campaigns are targets. We build with hardened security as a foundation, not an afterthought. Audits, certifications, and transparency are standard.',
              },
              {
                title: 'Platform Independence',
                desc: 'Your data is yours. You can export everything. You can move to another provider. We earn your trust by removing lock-in.',
              },
              {
                title: 'Radical Accessibility',
                desc: 'Every feature must be usable by teams with varying technical skills. No obscure CLIs. No steep learning curves. Democratic tools for all.',
              },
              {
                title: 'Inclusivity',
                desc: 'We build for candidates at every level—federal, state, local, and ballot measures. Campaigns of any size deserve modern tooling.',
              },
              {
                title: 'Stewardship',
                desc: 'We take our responsibility to democracy seriously. Our product serves candidates and causes, and we protect that trust.',
              },
            ].map((value, idx) => (
              <motion.div
                key={value.title}
                className="p-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-all hover:border-blue-300"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Journey</h2>
            <p className="text-lg text-gray-600">From idea to impact.</p>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {[
              {
                year: '2023',
                title: 'Initial Research',
                desc: 'Spoke with 50+ campaign teams, vendors, and digital directors. Identified the core pain point: campaign websites take too long.',
              },
              {
                year: '2024',
                title: 'Alpha Launch',
                desc: 'Built and tested MVP with 3 pilot campaigns. Learned what matters: speed, integration, compliance.',
              },
              {
                year: 'Q1 2025',
                title: 'Public Beta',
                desc: 'Opened to select campaigns. Added Salesforce, ActBlue, and Anedot integrations. Iterated based on live feedback.',
              },
              {
                year: 'Q2 2025',
                title: 'General Availability',
                desc: 'Launched publicly with 8+ native integrations, SOC 2 certification, and white-label support.',
              },
              {
                year: '2026+',
                title: 'The Future',
                desc: 'Expanding to state/local races, supporting more fundraising platforms, and bringing AI to every part of campaign digital.',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.year}
                className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                {idx % 2 === 0 ? (
                  <>
                    <div className="md:w-1/3">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{item.year}</div>
                      <div className="hidden md:block w-1 h-12 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
                    </div>
                    <div className="md:w-2/3 p-6 rounded-2xl bg-white border border-blue-200 hover:shadow-lg transition-all">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="md:w-2/3 p-6 rounded-2xl bg-white border border-blue-200 hover:shadow-lg transition-all">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                    <div className="md:w-1/3">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{item.year}</div>
                      <div className="hidden md:block w-1 h-12 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* By the Numbers */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Impact So Far</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { stat: '200+', label: 'Campaign Sites Launched' },
              { stat: '$15M+', label: 'Raised Through CampaignSites' },
              { stat: 'Hours to Days', label: 'Average Build Time' },
              { stat: '99.99%', label: 'Platform Uptime' },
            ].map((item, idx) => (
              <motion.div
                key={item.stat}
                className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 hover:shadow-lg transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-4xl font-bold text-blue-600 mb-2">{item.stat}</div>
                <p className="text-gray-600 font-medium">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What Campaigns Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'We went from concept to live site in 48 hours. That would have taken us 4 weeks with a contractor.',
                author: 'Digital Director, Congressional Race',
                role: '2024 General Election',
              },
              {
                quote: 'Finally, a platform built specifically for how we work. No more duct-taping all our tools together.',
                author: 'Campaign Manager, Senate Race',
                role: '2024 General Election',
              },
              {
                quote: 'The compliance audits caught issues we would have missed. That alone made it worth it.',
                author: 'General Counsel, Statewide Campaign',
                role: '2024 General Election',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.author}
                className="p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-all"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{item.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{item.author}</p>
                  <p className="text-sm text-gray-500">{item.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 p-12 md:p-16 shadow-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
            Help Teams Build Faster
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join the campaigns changing how modern political campaigns launch and win online.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/get-started"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full text-lg font-semibold hover:shadow-2xl transition-all inline-block"
              >
                Get Started Today
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/features"
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-lg font-semibold hover:border-gray-400 hover:shadow-lg transition-all inline-block"
              >
                Explore Features
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
