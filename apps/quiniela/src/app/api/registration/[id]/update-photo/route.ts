import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { ticketRegistrations } from '@brakestation/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadRegistrationPhoto } from '@brakestation/storage';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const photo = formData.get('photo');
  if (!(photo instanceof File)) return NextResponse.json({ error: 'missing_photo' }, { status: 400 });
  if (photo.size > MAX_PHOTO_SIZE) return NextResponse.json({ error: 'photo_too_large', message: 'La foto no debe exceder 8 MB.' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(photo.type)) return NextResponse.json({ error: 'invalid_photo_type', message: 'Solo JPEG o PNG.' }, { status: 400 });

  const registration = await db.query.ticketRegistrations.findFirst({
    where: and(
      eq(ticketRegistrations.id, id),
      eq(ticketRegistrations.userId, session.user.id),
      eq(ticketRegistrations.reviewStatus, 'awaiting_new_photo'),
    ),
  });
  if (!registration) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const buffer = Buffer.from(await photo.arrayBuffer());
  let photoUrl: string;
  try {
    photoUrl = await uploadRegistrationPhoto({ ticketCode: registration.ticketCode, buffer, contentType: photo.type });
  } catch (err) {
    console.error('[update-photo] R2 upload failed:', err);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  await db.update(ticketRegistrations).set({
    photoUrl,
    photoUploadedAt: new Date(),
    reviewStatus: 'pending',
    reviewNotes: null,
    reviewedBy: null,
    reviewedAt: null,
    updatedAt: new Date(),
  }).where(eq(ticketRegistrations.id, id));

  return NextResponse.json({ ok: true });
}
