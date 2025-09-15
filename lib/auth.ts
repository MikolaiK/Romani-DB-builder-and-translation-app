export function authFallback() {
  const hasClerk = !!process.env.CLERK_SECRET_KEY;
  if (hasClerk) {
    // In real app we'd re-export Clerk's auth, but we avoid adding the dep for local dev
    return { userId: null };
  }
  // Local dev: allow all requests as a fake user
  return { userId: 'dev-user' } as const;
}
// Simple auth helper: allow a fake user in dev; placeholders for production auth.
export function auth() {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (hasClerk) {
    // Placeholder: integrate Clerk here in production
    return { userId: null };
  }
  return { userId: 'dev-user' } as { userId: string | null };
}
