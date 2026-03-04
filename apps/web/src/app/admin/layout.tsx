import { ReactNode } from 'react';

export const metadata = {
  title: 'Admin Portal | CampaignSites',
  description: 'System administration dashboard for CampaignSites',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
