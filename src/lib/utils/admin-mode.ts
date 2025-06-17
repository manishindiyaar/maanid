/**
 * Utility function to check if the user is in admin mode
 * Admin mode is determined by a 'admin_mode' cookie set to 'true'
 */
export function isAdminMode(): boolean {
  // Check if we're in a browser environment
  if (typeof document !== 'undefined') {
    // Client-side check
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'admin_mode' && value === 'true') {
        return true;
      }
    }
    return false;
  }
  
  // In server components, we'll need to use the cookies() from next/headers
  // This function should only be used client-side
  return false;
}

/**
 * Server-side function to check if admin mode is enabled
 * This should be used in API routes and Server Components
 */
export function isAdminModeServer(cookieStore: { get: (name: string) => { value: string } | undefined }): boolean {
  const adminModeCookie = cookieStore.get('admin_mode');
  return adminModeCookie?.value === 'true';
} 