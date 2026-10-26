/**
 * Central Brand Configuration for SmartQMS
 * All product names, descriptions, taglines, visual identities, and color tokens
 * are centralized here for easy maintenance and white-labeling.
 */

export interface BrandConfig {
  name: string;
  productSuite: string;
  tagline: string;
  description: string;
  companyName: string;
  contactEmail: string;
  version: string;
  colors: {
    primary: string;      // #2563EB - Primary Blue
    secondary: string;    // #0D9488 - Secondary Teal
    lightBg: string;      // #F5F7FA - Light background
    darkBg: string;       // #0B1220 - Dark background
    success: string;      // #16A34A - Success
    warning: string;      // #D97706 - Warning
    danger: string;       // #DC2626 - Critical failure
  };
  navigation: Array<{ label: string; href: string }>;
}

export const brandConfig: BrandConfig = {
  name: 'SmartQMS',
  productSuite: 'E-Commerce Quality Management Suite',
  tagline: 'Software Quality. Verified at Every Stage.',
  description:
    'An independent enterprise software quality management platform engineered for modern development organizations. Automate requirements traceability, architectural baselines, peer code reviews, continuous test execution, defect remediation, and rule-based Smart Release Gate governance.',
  companyName: 'SmartQMS Technologies',
  contactEmail: 'contact@smartqms.io',
  version: '2.4.0',
  colors: {
    primary: '#2563EB',
    secondary: '#0D9488',
    lightBg: '#F5F7FA',
    darkBg: '#0B1220',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  navigation: [
    { label: 'Overview', href: '#overview' },
    { label: 'Lifecycle Workflow', href: '#workflow' },
    { label: 'Features', href: '#features' },
    { label: 'Smart Release Gate', href: '#release-gate' },
    { label: 'Quality Metrics', href: '#metrics' },
    { label: 'Architecture', href: '#architecture' },
  ],
};
