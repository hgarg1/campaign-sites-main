import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { ToastProvider } from '@/components/admin/shared/ToastContext';

export const metadata: Metadata = {
  title: 'CampaignSites - AI-Powered Campaign Website Builder',
  description: 'Create beautiful, effective campaign websites in minutes with AI',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', type: 'image/svg+xml' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Campaign Sites',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Declared light because that is the only theme the application actually
         * has. Only 7 of 190 components define `dark:` variants — all of them on
         * the marketing pages — so advertising "light dark" made the browser
         * render native inputs, selects and scrollbars dark inside portal cards
         * that stayed white.
         *
         * The script below promotes this to "light dark" for anyone who opts in.
         */}
        <meta name="color-scheme" content="light" />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            /*
             * Dark mode is opt-in, never inferred from the OS.
             *
             * This previously followed `prefers-color-scheme`, which handed every
             * dark-OS visitor a near-black page behind an admin portal that has
             * no dark styling at all. Worse, it toggled a `.dark` class while the
             * Tailwind config still defaulted to `darkMode: 'media'` — so the
             * class matched nothing in the compiled CSS (verified: zero `.dark`
             * selectors in the deployed stylesheet) and the preference could not
             * be overridden by anyone, ever.
             *
             * With `darkMode: 'class'` set, this is now the single switch.
             */
            __html: `
              try {
                if (localStorage.getItem('theme') === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.querySelector('meta[name="color-scheme"]').setAttribute('content', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
