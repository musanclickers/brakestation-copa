export function waApprovedMessage(ticketCode: string, magicLink: string): string {
  return [
    `¡Tu boleto ${ticketCode} fue aprobado! 🎉`,
    '',
    'Ya puedes llenar tu quiniela:',
    magicLink,
    '',
    'Este enlace es válido por 24 horas.',
  ].join('\n');
}

export function waRejectedMessage(ticketCode: string, notes: string): string {
  return [
    `Tu registro del boleto ${ticketCode} fue rechazado.`,
    `Motivo: ${notes}`,
    '',
    'Puedes reintentar con una nueva foto en:',
    `https://goleadora.brakestation.com.mx/activar?ticket=${ticketCode}`,
  ].join('\n');
}

export function waNewPhotoMessage(ticketCode: string, reason: string): string {
  return [
    `Necesitamos una nueva foto de tu boleto ${ticketCode}.`,
    `Motivo: ${reason}`,
    '',
    'Tus datos quedan intactos, solo sube la foto nueva:',
    'https://goleadora.brakestation.com.mx/activar',
  ].join('\n');
}

export function waReminderMessage(ticketCode: string, phaseLabel: string, magicLink: string): string {
  return [
    `⚠️ Aún no has sellado tus pronósticos de ${phaseLabel}`,
    `Boleto: ${ticketCode}`,
    '',
    'Entra y sella antes de que cierre la fase:',
    magicLink,
  ].join('\n');
}

export function waSealedMessage(ticketCode: string, phase: string, shortcode: string): string {
  return [
    `✓ Predicciones de ${phase} selladas`,
    `Boleto: ${ticketCode}`,
    `Sello: ${shortcode}`,
    '',
    `Verifica en: https://goleadora.brakestation.com.mx/verifica/${shortcode}`,
  ].join('\n');
}

export function waReminderSealJ3Message(name: string, magicLink?: string): string {
  const safeName = name && name.trim() ? name.trim() : 'participante';
  const prediccionesUrl = magicLink
    ? `${magicLink}&next=/predicciones`
    : 'https://goleadora.brakestation.com.mx/predicciones';
  const triviasUrl = magicLink
    ? `${magicLink}&next=/trivias`
    : 'https://goleadora.brakestation.com.mx/trivias';
  return [
    `⏰ ¡Hola ${safeName}!`,
    '',
    'Tienes TRIVIAS sin contestar y RESULTADOS DE PARTIDOS sin enviar de la Jornada 3. Cada uno son puntos que estás dejando ir... y la oportunidad de llevarte la motocicleta. ⚽🏍️',
    '',
    '🔮 Envía tus resultados pronosticados de J3:',
    prediccionesUrl,
    '',
    '🧠 Contesta las trivias (2 pts c/u):',
    triviasUrl,
    '',
    '📅 Y en cuanto termine la fase de grupos se abrirá la NUEVA FASE para que envíes tus pronósticos. Mantente al pendiente, te avisamos en cuanto abra.',
    '',
    'No dejes ir tu oportunidad. ¡Sigue sumando!',
    '— Brake Station × CanaBRAKE',
  ].join('\n');
}

export function waOpeningJ2J3Message(name: string, magicLink?: string): string {
  const safeName = name && name.trim() ? name.trim() : 'participante';
  const prediccionesUrl = magicLink
    ? `${magicLink}&next=/predicciones`
    : 'https://goleadora.brakestation.com.mx/predicciones';
  const triviasUrl = magicLink
    ? `${magicLink}&next=/trivias`
    : 'https://goleadora.brakestation.com.mx/trivias';
  return [
    `⚽ ¡Hola ${safeName}!`,
    '',
    'Ya están ABIERTAS las predicciones y trivias de las jornadas 2 y 3 del Mundial 2026.',
    '',
    '🔮 Captura tus predicciones:',
    prediccionesUrl,
    '',
    '🧠 Contesta las trivias (2 pts por respuesta correcta):',
    triviasUrl,
    '',
    'Recuerda: cada PARTIDO se sella hasta su propio kickoff. Mientras no haya comenzado, puedes capturar o modificar tu predicción.',
    '',
    '💯 Cada partido te da:',
    '• 5 pts marcador exacto',
    '• 2 pts solo resultado',
    '• 0 pts si no aciertas',
    '',
    '🏆 Sigue sumando — el que más sabe del Mundial y de balatas CanaBRAKE se lleva la motocicleta.',
    '',
    'No te quedes fuera de lugar.',
    '— Brake Station × CanaBRAKE',
  ].join('\n');
}
