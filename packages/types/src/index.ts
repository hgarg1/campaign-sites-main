// Common types shared across the monorepo

export interface BuildRequest {
  websiteId: string;
  prompt: string;
  templateId?: string;
  customization?: Record<string, any>;
}

export interface BuildResponse {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  stages: {
    builder?: StageResult;
    auditor1?: StageResult;
    cicdBuilder?: StageResult;
    auditor2?: StageResult;
  };
}

export interface StageResult {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: any;
  errors?: string[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface WebsiteConfig {
  name: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    font: string;
  };
  features: {
    donate: boolean;
    volunteer: boolean;
    events: boolean;
    blog: boolean;
  };
  integrations: {
    fundraising?: 'actblue' | 'anedot';
    crm?: 'salesforce' | 'hubspot';
  };
}

export interface ComponentLibrary {
  hero: ComponentDefinition[];
  navigation: ComponentDefinition[];
  footer: ComponentDefinition[];
  forms: ComponentDefinition[];
  content: ComponentDefinition[];
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: string;
  props: Record<string, any>;
  code: string;
  preview?: string;
}

export interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'aws' | 'custom';
  domain?: string;
  env: Record<string, string>;
  buildCommand?: string;
  outputDirectory?: string;
}
