import { clerkMiddleware, clerkClient, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
  '/api/support/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  if (isAdminRoute(req)) {
    const { userId } = await auth.protect();
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    if ((user.publicMetadata as Record<string, unknown>)?.systemAdmin !== true) {
      return Response.redirect(new URL('/', req.url));
    }
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next|static|favicon.ico).*)',
  ],
};
