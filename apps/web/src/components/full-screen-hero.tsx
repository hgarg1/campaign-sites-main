'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface FullScreenHeroProps {
  eyebrow: string;
  title: string | React.ReactNode;
  description: string;
  gradientFrom: string;
  gradientVia?: string;
  gradientTo: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  backgroundGradient?: string;
}

export function FullScreenHero({
  eyebrow,
  title,
  description,
  gradientFrom,
  gradientVia,
  gradientTo,
  primaryCta = { label: 'Get Started', href: '/get-started' },
  secondaryCta = { label: 'Learn More', href: '/features' },
  backgroundGradient = 'from-gray-50 via-blue-50 to-purple-50',
}: FullScreenHeroProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.78]);

  return (
    <section ref={heroRef} className="relative min-h-screen snap-start px-4 sm:px-6 py-12 sm:py-20 overflow-hidden flex items-center justify-center">
      <motion.div
        style={{ y: backgroundY }}
        className={`absolute inset-0 bg-gradient-to-br ${backgroundGradient} opacity-70`}
      />
      <motion.div
        style={{ y: orbY }}
        className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-blue-400/20 to-purple-600/20 blur-3xl rounded-full"
      />
      <motion.div
        style={{ y: orbY }}
        className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-pink-400/20 to-blue-600/20 blur-3xl rounded-full"
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative max-w-6xl mx-auto text-center w-full"
      >
        <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium">
          ✨ {eyebrow}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <span
            className={`bg-gradient-to-r ${gradientFrom} ${gradientVia ? gradientVia : ''} ${gradientTo} dark:from-cyan-300 dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent`}
          >
            {title}
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link
            href={primaryCta.href}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-base sm:text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-base sm:text-lg font-semibold hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-lg transition-all"
          >
            {secondaryCta.label}
          </Link>
        </div>

        <div className="mt-8 sm:mt-14">
          <a
            href="#content-section"
            className="group inline-flex items-center gap-3 rounded-full border border-blue-200/80 dark:border-blue-900/50 bg-white/90 dark:bg-gray-800/80 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-lg shadow-blue-100/70 dark:shadow-blue-900/30 ring-1 ring-blue-100 dark:ring-blue-900/50 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-blue-200/70 dark:hover:shadow-blue-900/50"
          >
            <span className="tracking-wide">Scroll to explore</span>
            <span className="inline-flex h-7 w-7 items-center justify-center text-blue-700 dark:text-blue-300 animate-bounce group-hover:animate-none group-hover:scale-110 transition-transform">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M12 5v14m0 0l-6-6m6 6l6-6"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>
        </div>
      </motion.div>
    </section>
  );
}
