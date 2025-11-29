# Project Architecture Documentation

## 1. Project Overview
**Maanid AI** is a comprehensive Next.js application designed to provide AI-powered customer support and engagement. It integrates multiple AI providers (Anthropic, OpenAI, Google Gemini, AWS Bedrock) and communication channels (Vapi AI for voice, Twilio, Telegram) to create a robust "AI Employee" system.

## 2. Technology Stack

### Core Framework
- **Frontend/Backend**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Radix UI](https://www.radix-ui.com/) primitives and [Framer Motion](https://www.framer.com/motion/) for animations.

### Database & Authentication
- **Platform**: [Supabase](https://supabase.com/)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (Email Magic Links, Google OAuth)
- **ORM/Querying**: Raw SQL via API & Supabase Client

### AI & Machine Learning
- **LLM Providers**: 
  - Anthropic (Claude)
  - OpenAI (GPT)
  - Google (Gemini)
  - AWS Bedrock
- **Frameworks**: [LangChain](https://js.langchain.com/) for orchestration.

### Communication & Voice
- **Voice AI**: [Vapi AI](https://vapi.ai/)
- **Messaging**: Twilio (SMS/WhatsApp), Telegraf (Telegram Bot)

## 3. Directory Structure

```
maanid/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/             # Backend API endpoints
│   │   ├── login/           # Login page
│   │   ├── admin/           # Admin dashboard
│   │   └── page.tsx         # Landing page
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Core logic and utilities
│   │   ├── ai/              # AI integration logic
│   │   ├── auth/            # Authentication helpers
│   │   ├── supabase/        # Supabase client configuration
│   │   └── schema.ts        # Database schema definitions
│   └── middleware.ts        # Auth middleware for route protection
├── public/                  # Static assets
└── package.json             # Dependencies and scripts
```

## 4. Database Architecture

The project uses a **PostgreSQL** database hosted on Supabase.

### Core Schema (`src/lib/schema.ts`)

#### Tables
1.  **`contacts`**
    *   `id`: Serial Primary Key
    *   `name`: Text (Indexed)
    *   `contact_info`: Text (Email/Phone)
    *   `created_at`: Timestamp

2.  **`messages`**
    *   `id`: Serial Primary Key
    *   `contact_id`: Foreign Key referencing `contacts(id)` (Indexed)
    *   `content`: Text
    *   `created_at`: Timestamp

### Schema Management
Schema updates are handled programmatically via the `applySchema` function in `src/lib/schema.ts`, which executes SQL commands through the `/api/sql` endpoint.

## 5. API Architecture

The backend is built using Next.js API Routes (`src/app/api`).

### Key Endpoints

| Endpoint | Purpose |
| :--- | :--- |
| `/api/auth/*` | Authentication and credential management |
| `/api/sql` | Execute raw SQL queries (Admin only) |
| `/api/chat` | Core chat interface for AI interaction |
| `/api/agent-chat` | Advanced agentic chat capabilities |
| `/api/bots` | Manage AI bots configuration |
| `/api/contacts` | CRUD operations for contacts |
| `/api/messages` | CRUD operations for messages |
| `/api/make-call` | Trigger Vapi AI voice calls |

### Testing
Testing scripts are located in `src/app/testing_endpoint`.
*   `chat_test.ts`: Validates chat responses.
*   `sentiments_test.ts`: Tests sentiment analysis logic.

## 6. Authentication Flow

Authentication is a hybrid model using Supabase Auth and custom cookie management.

1.  **Entry**: User visits `/login` or `/admin`.
2.  **Method**:
    *   **User**: Email Magic Link or Google OAuth.
    *   **Admin**: Custom credential check (currently hardcoded/demo mode) or Supabase Admin login.
3.  **Process**:
    *   `middleware.ts` intercepts requests.
    *   It checks for `supabase_access_token` and other credentials in cookies.
    *   If missing, it attempts to sync from `localStorage` or redirects to login (for protected routes).
4.  **Storage**: Credentials are securely stored in HttpOnly cookies via `/api/auth/store-credentials`.

## 7. User Workflow & User Story

### The "AI Support Manager" Story

**Persona**: Sarah, a Customer Support Lead.

1.  **Onboarding**:
    *   Sarah visits the landing page (`/`) and sees the "AI Employee" value proposition.
    *   She clicks "Get Started" and logs in via Google (`/login`).

2.  **Setup**:
    *   She enters her Supabase credentials (if self-hosting) or uses the provided cloud instance.
    *   The system initializes the database schema automatically via `applySchema`.

3.  **Configuration**:
    *   Sarah navigates to the **Dashboard** (`/dashboard`).
    *   She creates a new "Support Bot" in the **Bots** section, defining its personality and knowledge base.

4.  **Operation**:
    *   The bot is deployed to handle incoming queries via Chat or Voice.
    *   Sarah monitors interactions in real-time.
    *   When a complex query arrives, the "Autopilot" agent (`/api/autopilot`) analyzes it and drafts a response.

5.  **Analytics**:
    *   Sarah views conversation logs (`messages` table) and sentiment analysis to improve bot performance.

## 8. Development & Deployment

### Local Development
```bash
npm install
npm run dev
```

### Environment Variables
Required `.env` variables:
*   `NEXT_PUBLIC_SUPABASE_URL`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`
*   `ANTHROPIC_API_KEY` (and other AI keys)
