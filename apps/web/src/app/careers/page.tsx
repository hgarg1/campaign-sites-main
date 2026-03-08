'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MarketingLayout } from '../../components/marketing-layout';
import { FullScreenHero } from '../../components/full-screen-hero';

interface JobOpening {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  featured: boolean;
  active: boolean;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch('/api/careers');
        const data = await response.json();
        setJobs(data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredJobs = selectedDepartment
    ? jobs.filter((job) => job.department === selectedDepartment)
    : jobs;

  const departments = Array.from(new Set(jobs.map((job) => job.department))).sort();
  const featuredJobs = jobs.filter((job) => job.featured && job.active);

  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="Careers"
        title="Build technology that wins campaigns"
        description="Join our team in creating the infrastructure that powers modern political campaigns."
        gradientFrom="from-green-600"
        gradientVia="via-emerald-600"
        gradientTo="to-teal-600"
        primaryCta={{ label: 'View Open Positions', href: '#jobs' }}
        secondaryCta={{ label: 'Learn About Us', href: '/about' }}
      />

      {/* Company Culture */}
      <section id="content-section" className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Join CampaignSites</h2>
            <p className="text-xl text-gray-600">
              We're building the most critical infrastructure for modern campaigns.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Mission-Driven Work',
                desc: 'Your work directly impacts campaign outcomes and helps candidates who are fighting to win.',
              },
              {
                icon: '⚡',
                title: 'Technical Excellence',
                desc: 'Work with the latest technologies, mentor smart engineers, and build systems that scale.',
              },
              {
                icon: '🌍',
                title: 'Remote-First Culture',
                desc: 'Work from anywhere. We have team members across the country, distributed by design.',
              },
              {
                icon: '💰',
                title: 'Competitive Compensation',
                desc: 'Top-of-market salary, equity that means something, and comprehensive health benefits.',
              },
              {
                icon: '📈',
                title: 'Growth & Learning',
                desc: 'Access to conferences, training budgets, and mentorship from industry leaders.',
              },
              {
                icon: '🏢',
                title: 'Flexible Schedule',
                desc: 'Work flexibly most of the year. Intense collaboration during campaign season (by choice).',
              },
            ].map((benefit, idx) => (
              <motion.div
                key={benefit.title}
                className="p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:shadow-lg transition-all hover:border-green-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Roles */}
      {featuredJobs.length > 0 && (
        <section className="px-6 py-20 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block mb-4 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                Hiring Now
              </div>
              <h2 className="text-4xl font-bold">Featured Roles</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {featuredJobs.map((job, idx) => (
                <motion.article
                  key={job.id}
                  className="p-8 rounded-2xl bg-white border-2 border-green-200 hover:shadow-xl transition-all hover:border-green-400"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{job.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{job.department}</span>
                        <span>•</span>
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.type}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Featured
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6 line-clamp-3">{job.description}</p>
                  <Link
                    href={`/careers/${job.slug}#apply`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full font-semibold hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    Learn More & Apply →
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Open Positions */}
      <section className="px-6 py-20 bg-white" id="jobs">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">All Open Positions</h2>
            <p className="text-gray-600">We're hiring talented people across all functions.</p>
          </div>

          {/* Department Filter */}
          <div className="mb-12 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setSelectedDepartment(null)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedDepartment === null
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedDepartment === dept
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Jobs List */}
          {loading ? (
            <div className="space-y-8 py-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-green-50 border border-green-100">
                  <motion.span
                    className="h-2.5 w-2.5 rounded-full bg-green-600"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="text-sm font-semibold text-green-700">Loading open positions...</span>
                </div>
              </div>

              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="h-6 w-2/5 rounded bg-gray-100 animate-pulse" />
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
                          <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                          <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
                        </div>
                      </div>
                      <div className="h-10 w-20 rounded-full bg-gray-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No open positions in this department right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job, idx) => (
                <motion.div
                  key={job.id}
                  className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all hover:border-green-300 hover:bg-green-50"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/careers/${job.slug}`}
                        className="text-xl font-bold hover:text-green-600 transition-colors"
                      >
                        {job.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">📍 {job.location}</span>
                        <span className="flex items-center gap-1">💼 {job.type}</span>
                        <span className="flex items-center gap-1">🏢 {job.department}</span>
                      </div>
                    </div>
                    <Link
                      href={`/careers/${job.slug}`}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all text-sm whitespace-nowrap"
                    >
                      View
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Hiring FAQ</h2>

          <div className="space-y-6">
            {[
              {
                q: 'What\'s your hiring process like?',
                a: 'Phone screen → Technical/skills assessment → Interview with team → Offer. We aim to move quickly while being thorough.',
              },
              {
                q: 'Do you offer remote work?',
                a: 'Yes, all positions are remote-first. We have team members across the US and beyond. You can work from anywhere.',
              },
              {
                q: 'What about benefits?',
                a: 'We offer competitive salaries, equity, health insurance, 401(k) matching, PTO, and professional development budget.',
              },
              {
                q: 'Do I need campaign experience?',
                a: 'No. We look for talented engineers, designers, and operators who care about impact. We\'ll teach you campaign politics.',
              },
              {
                q: 'When is campaign season?',
                a: 'Election season peaks September-November in even years. Many team members increase hours during that period. It\'s optional but encouraged.',
              },
            ].map((faq, idx) => (
              <motion.details
                key={faq.q}
                className="group p-6 rounded-xl bg-white border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <summary className="flex justify-between items-start font-bold text-lg cursor-pointer select-none">
                  {faq.q}
                  <span className="text-green-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.a}</p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="content-section" className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 p-12 md:p-16 shadow-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
            Don't see your fit?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            We're always looking for talented people. Send us your resume and tell us what you're interested in.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="mailto:jobs@campaignsites.com"
              className="inline-block px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full text-lg font-semibold hover:shadow-2xl transition-all"
            >
              Get in Touch
            </Link>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}
