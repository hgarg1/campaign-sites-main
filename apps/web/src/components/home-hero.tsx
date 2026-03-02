'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function HomeHero() {
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
    <section ref={heroRef} className="relative min-h-screen snap-start px-6 pb-16 pt-28 overflow-hidden flex items-center">
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-70" />
      <motion.div
        style={{ y: orbY }}
        className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-blue-400/20 to-purple-600/20 blur-3xl rounded-full"
      />
      <motion.div
        style={{ y: orbY }}
        className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-pink-400/20 to-blue-600/20 blur-3xl rounded-full"
      />

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative max-w-6xl mx-auto text-center">
        <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          ✨ Powered by Multi-LLM AI Pipeline
        </div>

        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
            Campaign websites
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">in minutes, not weeks</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          Build beautiful, effective campaign websites with AI. Party-neutral platform with deep integrations to ActBlue, Anedot,
          Salesforce, and HubSpot.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/get-started"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all"
          >
            Start Building Free
          </Link>
          <Link
            href="/product"
            className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-lg font-semibold hover:border-gray-400 hover:shadow-lg transition-all"
          >
            Explore Product
          </Link>
        </div>

        <div className="mt-14">
          <a
            href="#home-content"
            className="group inline-flex items-center gap-3 rounded-full border border-blue-200/80 bg-white/90 px-5 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-100/70 ring-1 ring-blue-100 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-blue-200/70"
          >
            <span className="tracking-wide">Scroll to explore</span>
            <span className="inline-flex h-7 w-7 items-center justify-center text-blue-700 animate-bounce group-hover:animate-none group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M12 5v14m0 0l-6-6m6 6l6-6" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
        </div>
      </motion.div>
    </section>
  );
}
