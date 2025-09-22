import { prisma } from '@/lib/db';
import { ReviewList } from '@/components/review/ReviewList';
import { authFallback as auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (requireAuth) {
    const { userId } = auth();
    if (!userId) {
      redirect('/sign-in');
    }
  }

  // Get pending reviews
  const pendingReviews = await prisma.translationMemory.findMany({
    where: {
  reviewStatus: 'PENDING',
  reviewedAt: null,
    },
    include: {
      corrections: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Kö för översättningsgranskning</h1>
      <ReviewList translations={pendingReviews as import('@prisma/client').TranslationMemory[]} />
    </div>
  );
}
