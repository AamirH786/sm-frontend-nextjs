import api from '@/lib/api';

export interface HeroSection {
  badge_text?: string;
  headline?: string;
  headline_highlight?: string;
  subheadline?: string;
  description?: string;
  cta_button?: string;
  gif_url?: string;
  memory_badge_title?: string;
  memory_badge_subtitle?: string;
  security_badge_title?: string;
  security_badge_subtitle?: string;
}

export interface CategoryItem {
  title: string;
  image_url: string;
}

export interface AvatarCategoriesSection {
  section_label?: string;
  section_title?: string;
  section_description?: string;
  categories?: CategoryItem[];
}

export interface StepItem {
  number: string;
  title: string;
  description: string;
  image_url: string;
}

export interface HowItWorksSection {
  section_label?: string;
  section_title?: string;
  section_description?: string;
  steps?: StepItem[];
}

export interface FeatureItem {
  title: string;
  description: string;
  tag: string;
  color: string;
}

export interface FeaturesSection {
  section_label?: string;
  section_title?: string;
  section_description?: string;
  features?: FeatureItem[];
}

export interface CommentItem {
  name: string;
  text: string;
  avatar_url: string;
}

export interface SocialProofSection {
  section_label?: string;
  section_title?: string;
  section_description?: string;
  comments?: CommentItem[];
  cta_badge_text?: string;
  cta_title?: string;
  cta_description?: string;
  cta_button_text?: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface LandingPageData {
  hero?: HeroSection;
  avatar_categories?: AvatarCategoriesSection;
  how_it_works?: HowItWorksSection;
  features?: FeaturesSection;
  social_proof?: SocialProofSection;
  stats?: StatItem[];
}

export const landingPageService = {
  get: async (): Promise<LandingPageData> => {
    const res = await api.get('/landing-page');
    return res.data;
  },

  update: async (data: Partial<LandingPageData>): Promise<LandingPageData> => {
    const res = await api.patch('/landing-page', data);
    return res.data;
  },
};
