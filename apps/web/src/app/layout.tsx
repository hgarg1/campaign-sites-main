import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampaignSites - AI-Powered Campaign Website Builder',
  description: 'Create beautiful, effective campaign websites in minutes with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
