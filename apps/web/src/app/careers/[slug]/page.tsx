import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@campaignsites/database';
import { cacheGet, cacheSet } from '../../../lib/redis';
import { MarketingLayout } from '../../../components/marketing-layout';
import { ApplicationWizard } from './application-wizard';

interface JobDetail {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  salary: string | null;
  applyUrl: string;
  featured: boolean;
  active: boolean;
  createdAt: Date;
}

export default async function CareerDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const cacheKey = `careers:job:v1:${params.slug}`;

  let job = await cacheGet<JobDetail>(cacheKey);

  if (!job) {
    job = await prisma.jobOpening.findFirst({
      where: {
        slug: params.slug,
        active: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        department: true,
        location: true,
        type: true,
        description: true,
        responsibilities: true,
        qualifications: true,
        salary: true,
        applyUrl: true,
        featured: true,
        active: true,
        createdAt: true,
      },
    });

    if (job) {
      await cacheSet(cacheKey, job, 3600);
    }
  }

  if (!job) {
    notFound();
  }

  return (
    <MarketingLayout>
      <article className="px-6 pt-24 md:pt-28 pb-16 bg-gradient-to-b from-white via-green-50/20 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <Link
              href="/careers"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-green-100 bg-white text-sm font-semibold text-green-700 hover:text-green-800 hover:shadow-sm transition-all"
            >
              ← Back to Careers
            </Link>
          </div>

          <header className="rounded-3xl border border-green-100 bg-white/90 shadow-sm p-6 md:p-10 lg:p-12 mb-10">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                {job.department}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-medium">
                {job.type}
              </span>
              {job.featured && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">{job.title}</h1>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed max-w-3xl">{job.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-8">
              <span>📍 {job.location}</span>
              <span>•</span>
              <span>💼 {job.type}</span>
              {job.salary && (
                <>
                  <span>•</span>
                  <span>💰 {job.salary}</span>
                </>
              )}
            </div>

            <div id="apply" className="flex flex-wrap items-center gap-3">
              <a
                href="#application-wizard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                Apply Now →
              </a>
              <a
                href={job.applyUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition-all"
              >
                External Apply Link
              </a>
              <Link
                href="/careers#jobs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                View Other Roles
              </Link>
            </div>
          </header>

          <section className="grid lg:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Responsibilities</h2>
              <ul className="space-y-3">
                {job.responsibilities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 leading-relaxed">
                    <span className="mt-1 text-green-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Qualifications</h2>
              <ul className="space-y-3">
                {job.qualifications.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 leading-relaxed">
                    <span className="mt-1 text-green-600">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div id="application-wizard">
            <ApplicationWizard jobSlug={job.slug} jobTitle={job.title} />
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}
