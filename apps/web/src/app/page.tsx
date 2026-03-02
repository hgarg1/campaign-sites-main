import Link from 'next/link';
import { MarketingLayout } from '../components/marketing-layout';
import { HomeHero } from '../components/home-hero';

export default function Home() {
  return (
    <MarketingLayout>
      <div className="snap-y snap-mandatory">
        <HomeHero />

      <section id="home-content" className="snap-start py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Everything you need to win
            </h2>
            <p className="text-xl text-gray-600">Four-stage AI pipeline ensures quality, security, and compliance</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
              <p className="text-gray-600 mb-5">Generate complete campaign websites in minutes with our multi-LLM AI pipeline.</p>
              <Link href="/features" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Explore features →
              </Link>
            </div>

            <div className="p-8 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-2">Secure & Compliant</h3>
              <p className="text-gray-600 mb-5">Built-in security audits and WCAG 2.1 AA accessibility compliance checks.</p>
              <Link href="/security" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                View security →
              </Link>
            </div>

            <div className="p-8 bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-2">Fully Customizable</h3>
              <p className="text-gray-600 mb-5">Start from templates or scratch. Every element is customizable to match your brand.</p>
              <Link href="/templates" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Browse templates →
              </Link>
            </div>

            <div className="p-8 bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-2">Deep Integrations</h3>
              <p className="text-gray-600 mb-5">Connect ActBlue, Anedot, Salesforce, and HubSpot with one click.</p>
              <Link href="/integrations" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                See integrations →
              </Link>
            </div>

            <div className="p-8 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-2">Party Neutral</h3>
              <p className="text-gray-600 mb-5">Built for all campaigns. No bias, no partisanship, just great technology.</p>
              <Link href="/about" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Why CampaignSites →
              </Link>
            </div>

            <div className="p-8 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-2">White Label Ready</h3>
              <p className="text-gray-600 mb-5">Political parties can white-label the entire platform with custom branding.</p>
              <Link href="/pricing" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Compare plans →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="snap-start py-20 px-6 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block mb-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">AI Pipeline</div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Four-stage validation</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Our unique multi-LLM pipeline ensures every website is secure, accessible, and campaign-ready.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold mb-1">Builder Ring (3 LLMs)</h4>
                    <p className="text-gray-600">OpenAI, Anthropic, and Google generate your site in parallel for optimal results.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold mb-1">Auditor 1 (Security)</h4>
                    <p className="text-gray-600">Validates security, accessibility, and best practices.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-pink-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold mb-1">CI/CD Builder (3 LLMs)</h4>
                    <p className="text-gray-600">Generates deployment configs and infrastructure code.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h4 className="font-bold mb-1">Auditor 2 (Deployment)</h4>
                    <p className="text-gray-600">Final check for production readiness and monitoring setup.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 opacity-20 blur-3xl rounded-full" />
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="space-y-4">
                  <div className="h-4 bg-gradient-to-r from-blue-200 to-blue-300 rounded w-3/4" />
                  <div className="h-4 bg-gradient-to-r from-purple-200 to-purple-300 rounded w-full" />
                  <div className="h-4 bg-gradient-to-r from-pink-200 to-pink-300 rounded w-5/6" />
                  <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Build Progress</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Builder Ring</span>
                        <span className="text-green-600 font-semibold">✓ Complete</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Security Audit</span>
                        <span className="text-green-600 font-semibold">✓ Complete</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">CI/CD Builder</span>
                        <span className="text-blue-600 font-semibold">● In Progress</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="snap-start py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ready to launch your campaign?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12">Join campaigns using CampaignSites to build beautiful, effective websites in minutes.</p>
          <Link
            href="/get-started"
            className="inline-flex px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all"
          >
            Get Started Free
          </Link>
          <p className="mt-6 text-sm text-gray-500">No credit card required • 14-day free trial</p>
        </div>
      </section>
    </div>
    </MarketingLayout>
  );
}
