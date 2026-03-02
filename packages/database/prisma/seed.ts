import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.jobOpening.deleteMany();
  await prisma.blogPost.deleteMany();

  // Seed Blog Posts
  const blogPosts = await Promise.all([
    prisma.blogPost.create({
      data: {
        slug: 'launching-campaigns-faster',
        title: 'How We Help Campaigns Launch Websites in Hours',
        excerpt: 'Modern campaigns deserve modern tools. Learn how CampaignSites is changing the game.',
        author: 'Sarah Chen',
        coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop',
        content: `
# How We Help Campaigns Launch Websites in Hours

Modern political campaigns move fast. Your website infrastructure shouldn't slow you down.

## The Old Way

Building campaign websites used to mean:
- Hiring freelancers or agencies
- Weeks of back-and-forth design reviews
- Manual integration setup
- Last-minute compliance concerns
- Deploying with fingers crossed

That workflow doesn't match the pace of modern campaigns.

## The CampaignSites Way

We've automated the boring parts so your team can focus on messaging:

### 1. Start with AI-generated drafts
Upload your message pillars, and our AI generates multiple candidate site structures within minutes.

### 2. Review in one place
No more jumping between tools. Compliance checks, accessibility audits, and deployment configs happen in one integrated workflow.

### 3. Connect your stack instantly
Your fundraising tool, CRM, and email platform connect in seconds. No custom glue code required.

### 4. Publish with confidence
Pre-deployment audits catch issues before they reach voters.

## Real Numbers

Teams using CampaignSites have reduced their website build cycles from 4-6 weeks to 24-48 hours. That's time your team can spend on voter outreach, fundraising, and message development.

## What's Next

We're expanding our integration library and adding more AI-assisted features. If you want to be part of shaping the future of campaign digital infrastructure, reach out.
        `,
        tags: ['product', 'case-study'],
        published: true,
        publishedAt: new Date('2025-08-15'),
      },
    }),
    prisma.blogPost.create({
      data: {
        slug: 'why-security-matters-campaigns',
        title: 'Why Your Campaign Website Needs Enterprise-Grade Security',
        excerpt: 'Political campaigns are targets. Here\'s why security can\'t be an afterthought.',
        author: 'Alex Martinez',
        coverImage: 'https://picsum.photos/id/1015/1200/600',
        content: `
# Why Your Campaign Website Needs Enterprise-Grade Security

Let's be direct: political campaigns are targets.

From voter database attacks to donation platform breaches, the stakes are high. Your campaign website is often the entry point to your entire digital ecosystem.

## The Risk Landscape

Campaign websites handle:
- Donation data (PCI compliance required)
- Voter information (GDPR/CCPA regulated)
- Volunteer signups
- Email list captures
- Contact information

A single breach exposes your supporters and contradicts your message.

## What Enterprise-Grade Means

At CampaignSites, we built security into the foundation:

- **OAuth 2.0 authentication** — You never share passwords with us
- **End-to-end encryption** — Data is encrypted in transit and at rest
- **SOC 2 Type II certified** — Third-party audited annually
- **GDPR/CCPA compliant** — Data handling meets the highest standards
- **Webhook signing** — Verify that integration updates are authentic
- **Full audit logs** — Every API call and data transfer is logged

## The Human Side

Security isn't just technology. It's process:
- Regular penetration testing
- Incident response training
- Data retention policies
- Vendor security assessments

Your campaign data deserves that level of care.

## What You Should Ask Your Platform

If you're evaluating website platforms for your campaign, ask:
- Are you SOC 2 certified?
- What's your incident response process?
- Can I audit who accessed my data?
- How do you handle voter data?
- What's your compliance certification?

If they can't answer clearly, that's a red flag.
        `,
        tags: ['security', 'compliance'],
        published: true,
        publishedAt: new Date('2025-09-10'),
      },
    }),
    prisma.blogPost.create({
      data: {
        slug: 'integrations-transform-fundraising',
        title: 'How Smart Integrations Transform Campaign Fundraising',
        excerpt: 'Stop duplicate data entry. Start winning donors.',
        author: 'Jamie Liu',
        coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop',
        content: `
# How Smart Integrations Transform Campaign Fundraising

Fundraising is core to modern campaigns. So is the data that comes with it.

When someone donates through your website, that data should flow to your CRM, appear in your fundraoting platform, and trigger follow-up workflows—automatically.

Instead, most campaigns are copy-pasting donor data between tools. That's not just inefficient; it's error-prone and creates compliance risks.

## The Integration Advantage

CampaignSites connects your entire fundraising stack:

**ActBlue + Salesforce + HubSpot**
- Donations sync instantly
- Donor profiles enrich in real-time
- Trigger personalized thank-you emails

**Anedot + Slack Notifications**
- New donations ping your team
- Large gifts trigger alerts
- Celebrate wins together

**Custom Workflows with Zapier**
- Donation > $500 → add to major donor tracking
- Repeated donors → segment for mid-level asks
- Donation anniversary → send renewal ask

## Real Impact

One campaign using CampaignSites integrations reduced donor data cleanup from 40 hours/month to effectively zero.

Another discovered duplicate donors they didn't know about—and recovered $12K in unrealized repeat giving.

## Start Simple, Go Deep

You don't need to wire up everything on day one:
- Start with ActBlue + CRM sync
- Add email automation next
- Build custom workflows as you discover patterns

The platform grows with your needs.

## Next Steps

Ready to stop data entry and start winning donors? Let's talk about your stack.
        `,
        tags: ['integrations', 'fundraising'],
        published: true,
        publishedAt: new Date('2025-10-05'),
      },
    }),
    prisma.blogPost.create({
      data: {
        slug: 'accessibility-is-not-optional',
        title: 'Accessibility Isn\'t Optional for Campaign Websites',
        excerpt: 'A website that doesn\'t work for everyone doesn\'t work for your campaign.',
        author: 'Morgan Klein',
        coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=600&fit=crop',
        content: `
# Accessibility Isn't Optional for Campaign Websites

1 in 4 Americans have some type of disability.

That's not a niche audience. That's your voters, donors, and volunteers.

A website that isn't accessible isn't just ethically wrong—it's a missed opportunity.

## What Accessible Means

- **Screen reader compatible** — Visually impaired visitors can navigate your site
- **Keyboard navigable** — Not everyone uses a mouse
- **Color contrast** — Text is readable on all backgrounds
- **Captions** — Video and audio are transcribed
- **Mobile responsive** — Works on any device

## The Business Case

Accessible websites:
- Reach more voters
- Improve SEO rankings
- Reduce form abandonment
- Work better for everyone (not just people with disabilities)

## How CampaignSites Helps

Every site generated through our platform includes:
- Automatic WCAG 2.1 AA compliance
- Built-in accessibility audits
- Pre-launch validation
- Recommendations for improvements

Accessibility isn't a post-launch checkbox. It's built in from the start.

## Your Responsibility

Even with a platform that prioritizes accessibility, you have responsibilities:
- Write descriptive image alt text
- Use meaningful heading structures
- Test with real assistive technologies
- Listen to feedback from people with disabilities

## The Bottom Line

Saying your campaign is for everyone means your website needs to work for everyone.
        `,
        tags: ['accessibility', 'best-practices'],
        published: true,
        publishedAt: new Date('2025-11-02'),
      },
    }),
  ]);

  console.log(`Created ${blogPosts.length} blog posts`);

  // Seed Job Openings
  const jobs = await Promise.all([
    prisma.jobOpening.create({
      data: {
        slug: 'senior-fullstack-engineer',
        title: 'Senior Full-Stack Engineer',
        department: 'Engineering',
        location: 'San Francisco, CA (Remote OK)',
        type: 'Full-time',
        description: `We're looking for a senior full-stack engineer to lead the development of new features across our platform. You'll work with cutting-edge AI, modern infrastructure, and be directly responsible for the reliability and performance that campaigns depend on.

This is a high-impact role where you'll:
- Own full product areas from design through deployment
- Mentor junior engineers
- Optimize for campaign season (intense periods, critical uptime)
- Shape our technical culture and practices`,
        responsibilities: [
          'Design and implement comprehensive features across our Next.js/Node.js stack',
          'Optimize database queries and API performance for massive concurrent users',
          'Lead architectural discussions and code reviews',
          'Build integrations with third-party platforms (Salesforce, ActBlue, HubSpot)',
          'Mentor team members and foster code quality',
          'Participate in on-call rotation during campaign season',
        ],
        qualifications: [
          '5+ years of professional full-stack development',
          'Deep expertise in TypeScript and React',
          'Experience with PostgreSQL and system design',
          'Passion for building reliable, user-focused products',
          'Experience with political tech or mission-driven products (preferred)',
          'Available for high-impact work during election cycles',
        ],
        salary: '$160K - $220K + equity',
        applyUrl: 'mailto:jobs@campaignsites.com?subject=Senior Full-Stack Engineer',
        featured: true,
        active: true,
      },
    }),
    prisma.jobOpening.create({
      data: {
        slug: 'product-manager',
        title: 'Product Manager',
        department: 'Product',
        location: 'San Francisco, CA (Remote)',
        type: 'Full-time',
        description: `Drive product strategy for the most critical tool political campaigns use. You'll work directly with campaigns, understand their needs, and prioritize features that move the needle on their outcomes.

You'll shape the future of campaign digital infrastructure through user research, data analysis, and strategic thinking.`,
        responsibilities: [
          'Conduct user research with campaign teams across geographies and levels',
          'Define product roadmap and prioritization framework',
          'Work with engineering to ship features and iterate based on feedback',
          'Analyze product metrics and user behavior',
          'Build partnerships with campaign infrastructure partners',
          'Represent our users\' needs internally',
        ],
        qualifications: [
          '4+ years of product management experience',
          'Experience shipping products at scale',
          'Strong communication and stakeholder management',
          'Data-driven approach to decision-making',
          'Curiosity about politics and campaigns (we\'ll teach the rest)',
          'Ability to think long-term while shipping incrementally',
        ],
        salary: '$130K - $170K + equity',
        applyUrl: 'mailto:jobs@campaignsites.com?subject=Product Manager',
        featured: true,
        active: true,
      },
    }),
    prisma.jobOpening.create({
      data: {
        slug: 'security-engineer',
        title: 'Security Engineer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        description: `Political campaigns handle sensitive data. We need security professionals who take that responsibility seriously.

You'll design and implement security systems that protect campaign data while keeping our platform fast and usable.`,
        responsibilities: [
          'Conduct security audits and penetration testing',
          'Design threat models for the platform',
          'Implement encryption, authentication, and authorization systems',
          'Manage incident response processes',
          'Develop security training for the team',
          'Stay current on emerging threats and best practices',
        ],
        qualifications: [
          '4+ years of security engineering experience',
          'CISSP, OSCP, or equivalent certification preferred',
          'Experience with threat modeling and security design',
          'Knowledge of compliance frameworks (SOC 2, GDPR, CCPA)',
          'Ability to communicate security concerns to non-technical stakeholders',
          'Passion for protecting user data',
        ],
        salary: '$140K - $190K + equity',
        applyUrl: 'mailto:jobs@campaignsites.com?subject=Security Engineer',
        featured: false,
        active: true,
      },
    }),
    prisma.jobOpening.create({
      data: {
        slug: 'customer-success-manager',
        title: 'Customer Success Manager',
        department: 'Customer Success',
        location: 'Remote',
        type: 'Full-time',
        description: `Be the trusted advisor to campaign teams using our platform. You'll help them launch websites, solve integration challenges, and maximize their success.

You'll be the voice of the customer internally and drive improvements based on what you learn.`,
        responsibilities: [
          'Onboard new campaigns to the platform',
          'Provide technical and strategic guidance',
          'Troubleshoot integration and feature issues',
          'Gather feedback and communicate customer needs to product',
          'Build relationships and grow accounts',
          'Document processes and create guides',
        ],
        qualifications: [
          '2+ years of customer success or account management',
          'Technical aptitude but not necessarily code experience',
          'Excellent communication and problem-solving skills',
          'Availability during campaign season (September-November)',
          'Understanding of political campaigns (or willingness to learn)',
          'Obsession with customer outcomes',
        ],
        salary: '$80K - $120K + equity',
        applyUrl: 'mailto:jobs@campaignsites.com?subject=Customer Success Manager',
        featured: false,
        active: true,
      },
    }),
    prisma.jobOpening.create({
      data: {
        slug: 'devops-engineer',
        title: 'DevOps / Infrastructure Engineer',
        department: 'Engineering',
        location: 'Remote',
        type: 'Full-time',
        description: `Build and maintain the infrastructure that powers campaign websites. You'll design systems for reliability, scalability, and campaign season surges.`,
        responsibilities: [
          'Design and implement cloud infrastructure (AWS/GCP/Azure)',
          'Implement CI/CD pipelines and automation',
          'Optimize costs while maintaining performance',
          'Implement monitoring, logging, and alerting',
          'Manage database scaling and optimization',
          'Prepare for and manage campaign season load increases',
        ],
        qualifications: [
          '3+ years of DevOps / infrastructure experience',
          'Expertise with Kubernetes, Terraform, or similar tools',
          'Strong database knowledge (PostgreSQL preferred)',
          'Experience with monitoring and observability tools',
          'Ability to learn quickly and adapt',
          'Unix/Linux proficiency',
        ],
        salary: '$130K - $180K + equity',
        applyUrl: 'mailto:jobs@campaignsites.com?subject=DevOps Engineer',
        featured: false,
        active: true,
      },
    }),
  ]);

  console.log(`Created ${jobs.length} job openings`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
