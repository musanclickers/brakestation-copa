import { auth } from '@brakestation/auth';
import { db } from '@brakestation/db';
import {
  tickets,
  ticketRegistrations,
  auditLog,
} from '@brakestation/db/schema';
import {
  uploadRegistrationPhoto,
  deleteRegistrationPhoto,
} from '@brakestation/storage';
import { eq, and, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PHOTO_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

function isValidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('52');
}

const FieldsSchema = z.object({
  ticket_code: z.string().regex(/^(BS|CD|INT)-[A-Z]\d{3}$/),
  participant_name: z.string().min(2).max(120),
  participant_phone: z.string().refine(isValidPhone, 'Teléfono inválido'),
  affiliation_type: z.enum(['negocio', 'consumidor']),
  client_text: z.string().min(2).max(120),
});

export async function POST(req: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Inicia sesión para continuar.' },
      { status: 401 },
    );
  }

  // 2. Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'invalid_form', message: 'Se esperaba multipart/form-data.' },
      { status: 400 },
    );
  }

  // 3. Extract photo
  const photo = formData.get('photo');
  if (!(photo instanceof File)) {
    return NextResponse.json(
      { error: 'missing_photo', message: 'El campo photo es obligatorio y debe ser un archivo.' },
      { status: 400 },
    );
  }

  // 4. Validate photo
  if (photo.size > MAX_PHOTO_SIZE) {
    return NextResponse.json(
      { error: 'photo_too_large', message: 'La foto no debe exceder 8 MB.' },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.includes(photo.type)) {
    return NextResponse.json(
      { error: 'invalid_photo_type', message: 'Solo se aceptan imágenes JPEG o PNG.' },
      { status: 400 },
    );
  }

  // 5. Extract and validate other fields
  const rawFields = {
    ticket_code: formData.get('ticket_code') as string | null,
    participant_name: formData.get('participant_name') as string | null,
    participant_phone: formData.get('participant_phone') as string | null,
    affiliation_type: formData.get('affiliation_type') as string | null,
    client_text: formData.get('client_text') as string | null,
  };

  // Strip nulls so Zod treats them as missing (optional fields)
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawFields)) {
    if (v !== null && v !== '') cleaned[k] = v;
  }

  const parsed = FieldsSchema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', message: 'Datos inválidos.', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { ticket_code, participant_name, participant_phone, affiliation_type, client_text } =
    parsed.data;

  // 6. Verify ticket exists
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.code, ticket_code),
  });
  if (!ticket) {
    return NextResponse.json(
      { error: 'ticket_not_found', message: 'Boleto no encontrado.' },
      { status: 404 },
    );
  }

  // 8. Check no active registration
  const existingReg = await db.query.ticketRegistrations.findFirst({
    where: and(
      eq(ticketRegistrations.ticketCode, ticket_code),
      ne(ticketRegistrations.reviewStatus, 'rejected'),
    ),
  });
  if (existingReg) {
    return NextResponse.json(
      { error: 'already_registered', message: 'Este boleto ya tiene un registro activo.' },
      { status: 409 },
    );
  }

  // 9. Upload photo to R2
  let photoUrl: string;
  try {
    const buffer = Buffer.from(await photo.arrayBuffer());
    photoUrl = await uploadRegistrationPhoto({
      ticketCode: ticket_code,
      buffer,
      contentType: photo.type,
    });
  } catch (err) {
    console.error('[POST /api/registration] R2 upload failed:', err);
    return NextResponse.json(
      { error: 'upload_failed', message: 'Error al subir la foto.' },
      { status: 500 },
    );
  }

  // 11-13. Insert registration, update ticket, and audit log
  try {
    const rows = await db
      .insert(ticketRegistrations)
      .values({
        ticketCode: ticket_code,
        userId: session.user.id,
        photoUrl,
        reviewStatus: 'approved',
        affiliationType: affiliation_type,
        clientId: null,
        clientText: client_text,
        participantName: participant_name,
        participantPhone: participant_phone,
      })
      .returning({ id: ticketRegistrations.id });

    const reg = rows[0];
    if (!reg) throw new Error('Insert returned no rows');

    // 12. Update ticket
    await db
      .update(tickets)
      .set({
        registrationId: reg.id,
        redeemedAt: new Date(),
        assignedUserId: session.user.id,
      })
      .where(eq(tickets.code, ticket_code));

    // 13. Audit log
    await db.insert(auditLog).values({
      eventType: 'ticket_registration',
      userId: session.user.id,
      ticketCode: ticket_code,
      payload: {
        registration_id: reg.id,
        affiliation_type,
        client_text,
      },
    });

    // 14. Success
    return NextResponse.json(
      { ok: true, registration_id: reg.id, photo_url: photoUrl },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/registration] DB insert failed:', err);

    // Best-effort cleanup of uploaded photo
    try {
      await deleteRegistrationPhoto(photoUrl);
    } catch {
      // ignore cleanup failure
    }

    return NextResponse.json(
      { error: 'internal', message: 'Error al guardar el registro.' },
      { status: 500 },
    );
  }
}
