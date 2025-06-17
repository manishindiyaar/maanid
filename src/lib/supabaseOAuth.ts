// OAuth2 state management and verification
interface OAuthState {
  codeVerifier: string;
  state: string;
  redirectUri?: string;
  clientId?: string;
  projectRef?: string;
}

// Generate a random string for PKCE code verifier
export function generateCodeVerifier(length: number = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Generate code challenge from verifier using SHA-256
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  // Convert ArrayBuffer to Base64 URL-safe string
  const base64String = btoa(
    Array.from(new Uint8Array(digest))
      .map(byte => String.fromCharCode(byte))
      .join('')
  );
  
  // Make it URL safe
  return base64String
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate the authorization URL for Supabase OAuth
export async function getSupabaseAuthUrl(clientId: string, redirectUri: string): Promise<{ authUrl: string, codeVerifier: string, state: string }> {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Generate random state for CSRF protection
  const state = generateCodeVerifier(32);
  
  // Construct the authorization URL
  const authUrl = new URL('https://api.supabase.com/v1/oauth/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('state', state);
  
  // Log the full URL for debugging
  console.log('Full authorization URL:', authUrl.toString());
  
  return {
    authUrl: authUrl.toString(),
    codeVerifier,
    state
  };
}

// Save OAuth state to localStorage
export function saveOAuthState(codeVerifier: string, state: string, redirectUri?: string, clientId?: string, projectRef?: string): void {
  // Store in the original format
  const oauthState: OAuthState = {
    codeVerifier,
    state,
    redirectUri,
    clientId,
    projectRef
  };
  
  localStorage.setItem('oauth_state', JSON.stringify(oauthState));
  
  // Also store in the new format used by the setup page
  localStorage.setItem('supabase_oauth_state', state);
  localStorage.setItem('supabase_oauth_code_verifier', codeVerifier);
  
  // Store additional metadata
  const metadata = {
    state,
    codeVerifier,
    timestamp: Date.now(),
    redirectUri,
    clientId,
    projectRef
  };
  
  localStorage.setItem('supabase_oauth_metadata', JSON.stringify(metadata));
}

// Get saved OAuth state from localStorage
export function getOAuthState(): OAuthState | null {
  // First try looking for the original key
  const stateJson = localStorage.getItem('oauth_state');
  
  // Then try the new keys used in the setup page
  const state = localStorage.getItem('supabase_oauth_state');
  const codeVerifier = localStorage.getItem('supabase_oauth_code_verifier');
  const metadataJson = localStorage.getItem('supabase_oauth_metadata');
  
  // Try to use metadata first since it's most complete
  if (metadataJson) {
    try {
      return JSON.parse(metadataJson) as OAuthState;
    } catch (error) {
      console.error('Failed to parse OAuth metadata:', error);
    }
  }
  
  // If we have the individual state and code verifier, construct the state object
  if (state && codeVerifier) {
    return {
      state,
      codeVerifier,
      redirectUri: `${window.location.origin}/setup/complete`
    };
  }
  
  // Fall back to original key
  if (stateJson) {
    try {
      return JSON.parse(stateJson) as OAuthState;
    } catch (error) {
      console.error('Failed to parse OAuth state:', error);
    }
  }
  
  return null;
}

// Clear OAuth state from localStorage
export function clearOAuthState(): void {
  // Clear the original key
  localStorage.removeItem('oauth_state');
  
  // Also clear the new keys used in setup page
  localStorage.removeItem('supabase_oauth_state');
  localStorage.removeItem('supabase_oauth_code_verifier');
  localStorage.removeItem('supabase_oauth_metadata');
}

// Initiate OAuth flow
export async function initiateOAuth(clientId: string, redirectUri: string): Promise<{ authUrl: string, codeVerifier: string, state: string }> {
  try {
    // Log parameters for debugging
    console.log('Initiating OAuth with:');
    console.log('- Client ID:', clientId);
    console.log('- Redirect URI:', redirectUri);
    
    // Get the authorization URL
    const { authUrl, codeVerifier, state } = await getSupabaseAuthUrl(clientId, redirectUri);
    
    return { authUrl, codeVerifier, state };
  } catch (error) {
    console.error('Failed to initiate OAuth:', error);
    throw error;
  }
}

// Exchange authorization code for tokens
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string | null = null
): Promise<TokenResponse> {
  try {
    // Log parameters for debugging
    console.log('Exchanging code for token with:');
    console.log('- Code:', code.substring(0, 5) + '...');
    console.log('- Code Verifier:', codeVerifier.substring(0, 5) + '...');
    console.log('- Client ID:', clientId);
    
    // Get the redirect URI from stored state
    const storedState = getOAuthState();
    const redirectUri = storedState?.redirectUri || 
      (typeof window !== 'undefined' ? 
        `${window.location.protocol}//${window.location.hostname}:${window.location.port || ''}/setup/complete` 
        : '');
    
    // Make the token exchange request
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        codeVerifier,
        clientId,
        clientSecret: clientSecret || "sba_10d2fb3752c525a3f1c9997d8218e3fe943d0d0f",
        redirectUri
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to exchange code for token');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  project_ref?: string;
  project_name?: string;
  anon_key?: string;
  service_role_key?: string;
  project_url?: string;
  error?: string;
} 