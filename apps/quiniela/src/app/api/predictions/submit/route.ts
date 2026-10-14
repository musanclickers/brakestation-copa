import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'deprecated',
      message: 'Este endpoint fue reemplazado por POST /api/phases/{phase}/predictions/submit',
    },
    { status: 410 },
  );
}
