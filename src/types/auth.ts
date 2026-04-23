export interface UserRole {
  id?: number;
  role_id?: number;
  role_name?: string;
  title?: string;
  slug?: string;
  role_type?: string;
  is_super_admin?: boolean;
}

export interface User {
  id?: number;
  user_id?: number;
  tenant_id?: number;
  tenantId?: number;
  username?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tenant?: {
    id?: number;
    name?: string;
  } | null;
  status?: number;
  role?: UserRole | null;
  role_id?: number;
  permissions?: string[];
  is_super_admin?: boolean;
}

export interface LoginCredentials {
  login_id: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword?: string;
  role_id?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface OrganizationContext {
  id: number;
  name: string;
  email: string;
  logo_url?: string | null;
  theme_color?: string | null;
  role: string;
  access_type: "full" | "limited";
}

export interface UserContext {
  user_id: number;
  context_type: "individual" | "contact_person" | "organization_member";
  organization: OrganizationContext | null;
  organizations?: OrganizationContext[] | null;
  is_individual: boolean;
  is_org_admin: boolean;
  is_org_member: boolean;
}

export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  userContext: UserContext | null;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null, expiresInSeconds?: number) => void;
  setUserContext: (context: UserContext | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}
