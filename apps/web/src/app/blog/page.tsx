'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MarketingLayout } from '../../components/marketing-layout';
import { FullScreenHero } from '../../components/full-screen-hero';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  author: string;
  tags: string[];
  publishedAt: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog');
        const data = await response.json();
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredPosts = selectedTag
    ? posts.filter((post) => post.tags.includes(selectedTag))
    : posts;

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort();

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setSubscribeError('Please enter an email address.');
      setSubscribeMessage(null);
      return;
    }

    setSubmitting(true);
    setSubscribeError(null);
    setSubscribeMessage(null);

    try {
      const response = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubscribeError(data?.error || 'Failed to subscribe. Please try again.');
        return;
      }

      setSubscribeMessage(data?.message || 'Thanks! You are subscribed.');
      setEmail('');
    } catch (error) {
      console.error('Failed to subscribe:', error);
      setSubscribeError('Failed to subscribe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      <FullScreenHero
        eyebrow="Blog"
        title="Campaign Digital Leadership"
        description="Strategy, technology, and insights for modern political campaigns."
        gradientFrom="from-blue-600"
        gradientVia="via-purple-600"
        gradientTo="to-pink-600"
        primaryCta={{ label: 'Get Started', href: '/get-started' }}
        secondaryCta={{ label: 'See Features', href: '/features' }}
      />

      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Tag Filter */}
          <div className="mb-12">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Articles
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-2 rounded-full font-medium transition-all capitalize ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div className="space-y-8 py-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-blue-50 border border-blue-100">
                  <motion.span
                    className="h-2.5 w-2.5 rounded-full bg-blue-600"
                    animate={{ scale: [1, 1.45, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="text-sm font-semibold text-blue-700">Loading fresh campaign insights...</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm"
                  >
                    <div className="h-48 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
                    <div className="p-6 space-y-4">
                      <div className="flex gap-2">
                        <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse" />
                        <div className="h-6 w-24 rounded-full bg-gray-100 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-6 w-4/5 rounded bg-gray-100 animate-pulse" />
                        <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
                        <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="space-y-2">
                          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
                          <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
                        </div>
                        <div className="h-10 w-32 rounded-full bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No articles found with that tag.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredPosts.map((post, idx) => (
                <motion.article
                  key={post.id}
                  className="rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all hover:border-blue-300 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  {post.coverImage && (
                    <div className="h-48 overflow-hidden bg-gray-200">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{post.author}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                      >
                        Read Article
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="px-6 py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Get campaign insights in your inbox</h2>
          <p className="text-gray-600 mb-8">
            Tactical advice on digital strategy, infrastructure, and winning modern campaign elections.
          </p>
          <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="you@campaign.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email address"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {subscribeMessage && <p className="text-sm text-green-700 mt-3">{subscribeMessage}</p>}
          {subscribeError && <p className="text-sm text-red-600 mt-3">{subscribeError}</p>}
          <p className="text-xs text-gray-500 mt-3">No spam. One email per week. Unsubscribe anytime.</p>
        </div>
      </section>
    </MarketingLayout>
  );
}
