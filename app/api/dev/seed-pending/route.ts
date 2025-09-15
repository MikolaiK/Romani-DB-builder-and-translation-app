import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const samples = [
      {
        sourceText: 'Kan du hjälpa mig att hitta sjukhuset?',
        targetText: 'Saro tu mange te dikhav o spitalo?',
        context: 'Asking for directions to a hospital',
        domain: 'medical',
      },
      {
        sourceText: 'Var snäll och fyll i det här formuläret.',
        targetText: 'Te del te phirel akava formularo.',
        context: 'Receptionist asking a patient to fill a form',
        domain: 'medical',
      },
      {
        sourceText: 'Rätten är ajournerad till i morgon klockan nio.',
        targetText: 'O kherutni khelipe avelke te xabarde pe vakti 9 te avri.',
        context: 'Court scheduling announcement',
        domain: 'legal',
      },
      {
        sourceText: 'Slå av strömmen innan du reparerar maskinen.',
        targetText: 'Starda o bijli anglal te kerel o trubipen pe makina.',
        context: 'Safety instruction in a workshop',
        domain: 'technical',
      },
      {
        sourceText: 'Kan vi träffas för att diskutera rapporten?',
        targetText: 'Masho te phiramas te vakeraspe pal o raporti?',
        context: 'Workplace meeting request',
        domain: 'conversation',
      },
    ];

  const quality: ('A'|'B'|'C'|'D')[] = ['C','B','D','C','B'];
  await prisma.translationMemory.createMany({
      data: samples.map((s, i) => ({
        sourceText: s.sourceText,
        targetText: s.targetText,
        context: s.context,
        domain: s.domain,
        reviewStatus: 'PENDING',
    qualityScore: quality[i],
      })),
    });

    return NextResponse.json({ success: true, inserted: samples.length });
  } catch (error) {
    console.error('Seed pending error', error);
    return NextResponse.json({ error: 'Failed to seed' }, { status: 500 });
  }
}
