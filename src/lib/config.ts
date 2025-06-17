// Environment variables configuration
// Note: In Next.js, environment variables need to be prefixed with NEXT_PUBLIC_ to be accessible in the browser

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_KEY,
  },
} as const;

// Validate required environment variables
export function validateConfig() {
  const requiredVars = [
    ['Anthropic API Key', config.anthropic.apiKey],
    ['Supabase URL', config.supabase.url],
    ['Supabase Key', config.supabase.key],
  ];

  for (const [name, value] of requiredVars) {
    if (!value) {
      throw new Error(`${name} is not set in environment variables`);
    }
  }
}

// Call validation on import
validateConfig(); 