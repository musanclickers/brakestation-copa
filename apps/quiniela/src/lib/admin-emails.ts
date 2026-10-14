// Correos que pueden darse de alta como admin sin invitación (env ADMIN_EMAILS,
// separados por coma). Los demás admins entran por /admin/users (invitación).
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
