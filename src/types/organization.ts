export type OrganizationItem = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logo_url?: string | null;
  theme_color?: string | null;
  description?: string | null;
  industry?: string | null;
  contact_person_id?: number | null;
  status: number | string;
  trial_active?: boolean;
  trial_minutes?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OrganizationCreatePayload = {
  name: string;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
  theme_color?: string | null;
  address?: string | null;
  description?: string | null;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_phone?: string | null;
};

export type OrganizationUpdatePayload = {
  name?: string;
  industry?: string | null;
  website?: string | null;
  logo_url?: string | null;
  theme_color?: string | null;
  address?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type OrganizationOnboardResponse = {
  organization: OrganizationItem;
  contact_person_user_id: number;
  contact_person_email: string;
  credentials_email_queued: boolean;
};
