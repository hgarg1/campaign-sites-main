"use client";

import { useEffect, useRef, useState } from 'react';
import { MarketingLayout } from '../../components/marketing-layout';

export default function ContactPage() {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);

  const timelineOptions = ['Within 2 weeks', 'Within 30 days', '1-3 months'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!timelineRef.current) {
        return;
      }

      if (!timelineRef.current.contains(event.target as Node)) {
        setIsTimelineOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <MarketingLayout>
      <section className="px-6 pt-24 md:pt-32 pb-16 bg-gradient-to-b from-blue-50 via-white to-purple-50">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 mb-6">
            Contact
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-5">
                Let’s architect your
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  campaign growth engine
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-xl mb-8 leading-relaxed">
                Tell us your timeline, team size, and priorities. We’ll map the fastest path from strategy to a live, secure campaign website.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Avg. first response', value: '< 4 hours' },
                  { label: 'Onboarding kickoff', value: '24-48 hours' },
                  { label: 'Platform uptime', value: '99.99%' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <a
                  href="mailto:hello@campaignsites.com"
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <span className="font-semibold text-gray-900">Email Sales</span>
                  <span className="text-blue-600 text-sm font-semibold">hello@campaignsites.com →</span>
                </a>
                <a
                  href="mailto:support@campaignsites.com"
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <span className="font-semibold text-gray-900">Customer Support</span>
                  <span className="text-blue-600 text-sm font-semibold">support@campaignsites.com →</span>
                </a>
                <a
                  href="/careers"
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <span className="font-semibold text-gray-900">Hiring / Talent</span>
                  <span className="text-blue-600 text-sm font-semibold">Open roles →</span>
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white/95 p-6 md:p-8 shadow-xl">
              <h2 className="text-2xl font-bold mb-2">Tell us about your campaign</h2>
              <p className="text-gray-600 mb-6">We’ll send back a tailored rollout plan and timeline.</p>

              <form className="space-y-4" action="mailto:hello@campaignsites.com" method="post" encType="text/plain">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    name="name"
                    placeholder="Full name"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Work email"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    name="campaign"
                    placeholder="Campaign name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="relative" ref={timelineRef}>
                    <input type="hidden" name="timeline" value={selectedTimeline} />
                    <button
                      type="button"
                      onClick={() => setIsTimelineOpen((current) => !current)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left focus:border-blue-500 focus:outline-none bg-white text-gray-700 flex items-center justify-between"
                    >
                      <span className={selectedTimeline ? 'text-gray-700' : 'text-gray-400'}>
                        {selectedTimeline || 'Launch timeline'}
                      </span>
                      <span className={`text-blue-600 transition-transform ${isTimelineOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                    {isTimelineOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {timelineOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setSelectedTimeline(option);
                              setIsTimelineOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="What are you trying to launch or improve?"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />

                <button
                  type="submit"
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-white font-semibold hover:shadow-lg transition-all"
                >
                  Request Strategy Call
                </button>
              </form>

              <p className="text-xs text-gray-500 mt-4">
                By contacting us, you agree to receive follow-up communications about your campaign setup.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">What happens after you reach out</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Discovery Session',
                desc: 'We align on campaign goals, voter segments, integrations, and launch constraints.',
              },
              {
                step: '02',
                title: 'Platform Blueprint',
                desc: 'You get a practical rollout plan: site architecture, content priorities, and timeline.',
              },
              {
                step: '03',
                title: 'Rapid Launch',
                desc: 'We onboard your team, connect tools, and move from draft to live with confidence.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm">
                <p className="text-sm font-bold text-blue-600 mb-2">STEP {item.step}</p>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
