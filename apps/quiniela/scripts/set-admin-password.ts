import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Uso: pnpm tsx scripts/set-admin-password.ts <email> <password>');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('Contraseña debe tener al menos 12 caracteres');
    process.exit(1);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
    columns: { id: true, isAdmin: true },
  });

  if (!user) {
    console.error(`Usuario ${email} no existe. Primero debe hacer login con magic link al menos una vez.`);
    process.exit(1);
  }

  if (!user.isAdmin) {
    console.error(`Usuario ${email} no es admin. Promueve primero: UPDATE users SET is_admin = true WHERE email = '${email}';`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await db.update(users).set({ adminPasswordHash: hash }).where(eq(users.id, user.id));

  console.log(`✓ Contraseña actualizada para ${email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
