'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type MarketingLayoutProps = {
  children: ReactNode;
};

const topNavLinks = [
  { href: '/features', label: 'Features' },
  { href: '/product', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
];

const footerSections = [
  {
    title: 'Product',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/templates', label: 'Templates' },
      { href: '/integrations', label: 'Integrations' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/blog', label: 'Blog' },
      { href: '/careers', label: 'Careers' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/security', label: 'Security' },
    ],
  },
];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={[
        'relative px-4 py-2 font-medium transition-all duration-200 rounded-lg group',
        isActive
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50',
      ].join(' ')}
    >
      {label}
      {isActive ? (
        <div className="absolute bottom-1 left-2 right-2 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
      ) : (
        <div className="absolute bottom-1 left-2 right-2 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100 transition-all duration-300 origin-left"></div>
      )}
    </Link>
  );
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            CampaignSites
          </Link>
          <div className="hidden md:flex items-center gap-2">
            {topNavLinks.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
            <Link
              href="/get-started"
              className="ml-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-110 active:scale-95 font-semibold"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link
                href="/"
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 inline-block"
              >
                CampaignSites
              </Link>
              <p className="text-gray-400 text-sm">
                AI-powered campaign website builder for the modern era.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:from-blue-500 hover:to-purple-500 hover:shadow-blue-700/30"
              >
                Special Login
              </Link>
            </div>

            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            © 2026 CampaignSites. Built with ❤️ for democracy.
          </div>
        </div>
      </footer>
    </div>
  );
}
