import { prisma } from '@/lib/db';
import { ExportInterface } from '@/components/export/ExportInterface';
import { authFallback as auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ExportPage() {
  const requireAuth = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (requireAuth) {
    const { userId } = auth();
    if (!userId) {
      redirect('/sign-in');
    }
  }

  // Get dataset statistics
  const stats = await prisma.translationMemory.aggregate({
    _count: {
      id: true,
    },
    where: {
      reviewStatus: 'APPROVED',
    },
  });

  const qualityBreakdown = await prisma.translationMemory.groupBy({
    by: ['qualityScore'],
    _count: { id: true },
    where: { reviewStatus: 'APPROVED' },
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dataset Export</h1>
      <ExportInterface 
        totalTranslations={stats._count.id}
        qualityBreakdown={qualityBreakdown as { qualityScore: string; _count: { id: number } }[]}
      />
    </div>
  );
}
