Vercel deployment notes

Problem: Vercel builds can fail when the Prisma client isn't generated at build-time. You might see errors like:

  Module '"@prisma/client"' has no exported member 'Prisma'.

Recommended steps:

1. Ensure Prisma client generation runs in the build step.
   - The project includes `prisma generate` in the `build` script so Vercel should run it before `next build`.
   - If Vercel blocks lifecycle scripts, allow build scripts in the project settings or approve builds (`pnpm approve-builds`).

2. Allow build scripts in Vercel UI if needed:
   - In Vercel dashboard, open Project Settings -> General -> Build & Development Settings.
   - Ensure Node install/build scripts are allowed. If Vercel prompts about scripts being blocked, follow the guidance to approve them.

3. CI safety net:
   - A GitHub Actions workflow (`.github/workflows/ci.yml`) now runs `pnpm prisma generate` and `pnpm run type-check` on PRs/commits to `main` so missing generated client issues are caught earlier.

4. If you still see the error after enabling the above:
   - Inspect build logs for `prisma generate` output.
   - Confirm `node_modules/.prisma/client/index.d.ts` exists in the build step.

If you'd like, I can also add a small runtime check that fails early if Prisma client is missing, or revert the temporary `any` cast and restore stricter typing once we confirm Vercel runs `prisma generate`.
