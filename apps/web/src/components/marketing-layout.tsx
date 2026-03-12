'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { FooterAuthButton } from './footer-auth-button';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      pointerEvents: 'none' as const,
    },
    open: {
      opacity: 1,
      y: 0,
      pointerEvents: 'auto' as const,
    },
  };

  const mobileMenuItemVariants = {
    closed: { opacity: 0, x: -20 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
      },
    }),
  };

  const backdropVariants = {
    closed: { opacity: 0 },
    open: { opacity: 1 },
  };

  const hamburgerVariants = {
    closed: { rotate: 0 },
    open: { rotate: 45 },
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent z-10"
          >
            CampaignSites
          </Link>

          {/* Desktop Menu */}
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

          {/* Mobile Hamburger Menu Button */}
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden relative z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            variants={hamburgerVariants}
            animate={mobileMenuOpen ? 'open' : 'closed'}
            transition={{ duration: 0.3 }}
          >
            <div className="w-6 h-5 flex flex-col justify-between relative">
              <motion.span
                className="h-0.5 bg-gray-800 rounded-full"
                animate={
                  mobileMenuOpen ? { rotate: 45, y: 10 } : { rotate: 0, y: 0 }
                }
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="h-0.5 bg-gray-800 rounded-full"
                animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.span
                className="h-0.5 bg-gray-800 rounded-full"
                animate={
                  mobileMenuOpen ? { rotate: -45, y: -10 } : { rotate: 0, y: 0 }
                }
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-30"
              variants={backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-40"
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.3 }}
            >
              <div className="px-6 py-8 max-w-7xl mx-auto">
                <div className="space-y-3 mb-6">
                  {topNavLinks.map((link, i) => (
                    <motion.div
                      key={link.href}
                      custom={i}
                      variants={mobileMenuItemVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 rounded-lg text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 transform hover:translate-x-1"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  custom={topNavLinks.length}
                  variants={mobileMenuItemVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="pt-6 border-t border-gray-200"
                >
                  <Link
                    href="/get-started"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 font-semibold text-center transform hover:scale-105"
                  >
                    Get Started
                  </Link>
                </motion.div>

                {/* Mobile Menu Footer Info */}
                <motion.div
                  custom={topNavLinks.length + 1}
                  variants={mobileMenuItemVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600"
                >
                  <p className="mb-4">Quick Links:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Link
                      href="/blog"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Blog
                    </Link>
                    <Link
                      href="/careers"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Careers
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Contact
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>{children}</main>

      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Mobile: Horizontal scrollable chip layout, Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link
                href="/"
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 inline-block"
              >
                CampaignSites
              </Link>
              <p className="text-gray-400 text-sm mb-5">
                AI-powered campaign website builder for the modern era.
              </p>
              <FooterAuthButton />
            </div>

            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-4 text-white">{section.title}</h4>
                <ul className="space-y-2.5 text-gray-400 text-sm">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link 
                        href={link.href} 
                        className="hover:text-white transition-colors inline-block py-0.5"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile: Innovative chip-based layout */}
          <div className="md:hidden mb-8">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 block"
            >
              CampaignSites
            </Link>
            <p className="text-gray-400 text-xs mb-6 leading-relaxed">
              AI-powered campaign website builder for the modern era.
            </p>
            
            {/* All links as wrapping chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {footerSections.flatMap((section) =>
                section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-800 hover:bg-blue-600/30 text-gray-300 hover:text-white text-xs font-medium transition-all border border-gray-700 hover:border-blue-500/50"
                  >
                    {link.label}
                  </Link>
                ))
              )}
            </div>

            <div className="w-full">
              <FooterAuthButton />
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-xs sm:text-sm">
            © {new Date().getFullYear()} CampaignSites. Built with ❤️ for democracy.
          </div>
        </div>
      </footer>
    </div>
  );
}
