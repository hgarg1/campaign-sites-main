'use client';

import { FullScreenHero } from './full-screen-hero';

type MarketingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;
};

export function MarketingPage({
  eyebrow,
  title,
  description,
  gradientFrom = 'from-gray-900',
  gradientVia = 'via-blue-900',
  gradientTo = 'to-purple-900',
}: MarketingPageProps) {
  return (
    <FullScreenHero
      eyebrow={eyebrow}
      title={title}
      description={description}
      gradientFrom={gradientFrom}
      gradientVia={gradientVia}
      gradientTo={gradientTo}
      primaryCta={{ label: 'Talk to Sales', href: '/contact' }}
      secondaryCta={{ label: 'See Pricing', href: '/pricing' }}
    />
  );
}
