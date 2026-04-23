# SM Frontend - Next.js Application

## Overview
This is a Next.js frontend application for a System Management Dashboard with complete RBAC (Role-Based Access Control) functionality. It connects to a backend API and implements username-based JWT authentication.

## Project Structure
```
src/
  app/                           # Next.js App Router pages
    page.tsx                    # Homepage (redirects to login or dashboard)
    layout.tsx                  # Root layout with providers
    globals.css                 # Global styles (Tailwind)
    login/page.tsx              # Login page
    (protected)/                # Protected routes (requires authentication)
      layout.tsx               # Auth guard layout with Header
      dashboard/page.tsx       # Dashboard home page
      masters/                 # Masters module (grouped structure)
        page.tsx              # Masters overview with group analytics
        layout.tsx            # Masters layout with group tabs
        character/            # Character group
          page.tsx           # Character overview with 6 section stats
          layout.tsx         # Character layout with left sidebar
          emotions/page.tsx     # Emotions management
          tones/page.tsx        # Tones management
          communication-styles/page.tsx  # Communication styles management
          modes/page.tsx        # Modes management
          domains/page.tsx      # Domains management
          delivery/page.tsx     # Delivery management
      roles-users/             # Users & Access module
        page.tsx              # RBAC overview with stats
        layout.tsx            # Tab navigation layout
        actions/page.tsx      # Actions management
        modules/page.tsx      # Modules management
        permissions/page.tsx  # Permissions management
        roles/page.tsx        # Roles management
        roles/[id]/permissions/page.tsx  # Role permissions assignment
        users/page.tsx        # Users management
        logs/page.tsx         # Activity logs
  components/                    # React components
    ui/                         # UI primitives (Button, Input, Modal, Select, etc.)
    forms/                      # Form components (LoginForm, RegisterForm)
    layout/                     # Layout components (Header, Sidebar, TopNav)
    permissions/                # Permission-based components
  context/                       # React Context providers
    AuthContext.tsx             # Authentication context with JWT tokens
    ToastContext.tsx            # Toast notifications context
  hooks/                         # Custom React hooks
    useAuth.ts                  # Authentication hook
    usePermission.ts            # Permission checking hook
  lib/                           # Utility libraries
    api.ts                      # Axios API client with auth interceptors
    utils.ts                    # Utility functions (cn, playErrorSound)
  services/                      # API service layer
    rbacService.ts              # RBAC APIs (modules, actions, permissions, roles, users)
    mastersService.ts           # Masters APIs (emotions, tones, styles, modes, domains, delivery)
    authService.ts              # Authentication API calls
  types/                         # TypeScript types
    auth.ts                     # Auth-related types (User, AuthTokens, etc.)
```

## Tech Stack
- **Framework**: Next.js 16.x with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + Radix UI primitives
- **Forms**: react-hook-form
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Running the App
- **Development**: `npm run dev` (runs on port 5000)
- **Build**: `npm run build`
- **Production**: `npm run start`

## API Configuration
- **API Base URL**: Configured via `NEXT_PUBLIC_API_URL` environment variable
- **Current API**: https://api.summonmind.com/api

## Authentication
- **Login**: Username OR Email based login (login_id field accepts both)
- **Token Storage**: JWT tokens (access_token, refresh_token) stored in localStorage
- **Authorization**: Bearer token sent in Authorization header
- **Session**: User data stored in localStorage for client-side state
- **Token Expiry**: Automatic logout when token expires (checked every minute)

## Security Features
- **Centralized HTTP Service**: Single Axios instance (`src/lib/api.ts`) with auth interceptors
- **Request Interceptor**: Adds Bearer token to all requests, checks token expiry before requests
- **Response Interceptor**: Auto-logout and redirect to login on 401 errors
- **Protected Route Guard**: `(protected)/layout.tsx` redirects unauthenticated users to /login
- **Login Page Guard**: Redirects authenticated users away from login page to dashboard
- **Token Expiry Handling**: Stores expiry time, auto-logout on expiry

## Login Credentials (for testing)
- **Username**: admin
- **Password**: 123456

## Features

### Masters Module (Grouped Structure)
Master data management organized in groups with sidebar navigation:

**Character Group** (7 sections with left sidebar):
- **Emotions**: CRUD for emotion types (is_active, name, description - required)
- **Tones**: CRUD for tone types (is_active, name, description - required)
- **Communication Styles**: CRUD for communication style types
- **Modes**: CRUD for mode types (+ advice_depth, directness, steps_limit)
- **Domains**: CRUD for domain types
- **Delivery**: CRUD for delivery styles (+ sentence_length, pause_markers, emotion_pacing, speak_friendly)
- **System Safety**: CRUD for system safety levels (is_active, name, description - required)

**Avatars** (Full CRUD with prompt generation and pricing):
- Create/Edit avatars with character masters selection
- Multi-select for all 7 character masters
- TinyMCE editor for prompt content
- Generate prompt from selected masters
- Pricing Configuration: trial_minutes, credits_per_minute, one_time_price, one_time_minutes
- API: `/avatars` endpoints

**AI Settings** (Full CRUD):
- Configure AI providers (OpenAI, Anthropic, etc.)
- Store API keys, models, endpoints
- Set current active AI configuration
- API: `/ai-settings` endpoints

**Website Settings** (Single Record):
- Manage website name, phone, email, city, address
- Logo URL and Favicon URL configuration
- About Us content with TinyMCE editor
- Toggle website active/inactive status
- Credits & Billing: currency, credits_per_currency, trial_reset_days, purchase_validity_days, low_balance_warning_mins, deduction_interval_mins
- Referral System: referral_enabled, referrer_reward_credits, referred_signup_bonus, referral_reward_on
- API: `/website-settings` endpoints

**Content Pages** (Full CRUD):
- Create website content pages (About Us, Privacy Policy, etc.)
- TinyMCE editor for HTML content
- Auto-generated slug from title
- Toggle page active/inactive status
- API: `/content-pages` endpoints

**Onboarding Questions** (3 sections with left sidebar):
- **Interests**: CRUD for user interests (key, label, is_active)
- **Support Types**: CRUD for support types (key, label, is_active)
- **Interaction Styles**: CRUD for interaction styles (key, label, is_active)
- API: `/admin/onboarding-masters/{endpoint}` endpoints

**Masters Navigation**:
- `/masters` - Overview page with group analytics cards
- `/masters/character` - Character overview with 7 section analytics
- `/masters/character/emotions` - Emotions CRUD page
- `/masters/avatars` - Avatars list page
- `/masters/avatars/create` - Create new avatar with prompt
- `/masters/ai-settings` - AI Settings CRUD page
- `/masters/website-settings` - Website configuration page
- `/masters/content-pages` - Content pages list
- `/masters/content-pages/create` - Create new content page
- `/masters/onboarding` - Onboarding questions overview
- `/masters/onboarding/interests` - Interests CRUD
- `/masters/onboarding/support-types` - Support Types CRUD
- `/masters/onboarding/interaction-styles` - Interaction Styles CRUD

All masters use:
- AdvancedDataTable component
- Status filter dropdown (is_active boolean)
- Search functionality
- Toggle status (active/inactive)
- Edit/Delete actions
- Description field is mandatory

### Users & Access Module (RBAC - 6 tabs)
Complete role-based access control:
- **Actions**: CRUD for action types (view, add, update, delete, etc.)
- **Modules**: CRUD for system modules
- **Permissions**: CRUD for permissions (module + action combinations)
- **Roles**: CRUD for user roles
- **Role Permissions**: Assign permissions to roles
- **Users**: CRUD for user accounts
- **Logs**: Activity logs (placeholder)

## Database Schema (Masters)
All masters use `is_active` (boolean) for status:
- `true` = Active (green)
- `false` = Inactive (red)

## Notes
- Frontend bound to `0.0.0.0:5000`
- Cross-origin requests allowed for Replit dev proxy
- Protected routes require authentication
- Auto-redirect to login on 401 errors
- Using system fonts (no Google Fonts dependency)
