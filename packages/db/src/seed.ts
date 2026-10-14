import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tickets, trivias } from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function seed() {
  console.log('Seeding tickets...');

  // 700 BS tickets (Brake Station)
  const bsTickets = Array.from({ length: 700 }, (_, i) => ({
    code: `BS-${String(i + 1).padStart(3, '0')}`,
    type: 'BS' as const,
    sourceBranch: i < 400 ? 'Mérida' : 'Villahermosa',
  }));

  // 100 CD tickets (CanaBRAKE Directo — cantidad final TBD)
  const cdTickets = Array.from({ length: 100 }, (_, i) => ({
    code: `CD-${String(i + 1).padStart(3, '0')}`,
    type: 'CD' as const,
    sourceBranch: 'CD-Cliente',
  }));

  await db.insert(tickets).values([...bsTickets, ...cdTickets]).onConflictDoNothing();
  console.log(`Inserted ${bsTickets.length + cdTickets.length} tickets.`);

  console.log('Seeding trivias...');

  // 10 trivias: 2 per phase transition, ~60% futbol / ~40% marca
  const triviaData = [
    // Phase transition 1 (groups_m2): grupos -> 16avos (Jun 11 – Jun 28)
    {
      phaseLabel: 'groups_m2' as const,
      question: '¿En qué año la Selección Mexicana llegó por primera vez a cuartos de final de un Mundial en casa?',
      optionA: '1970',
      optionB: '1986',
      optionC: '1994',
      correctOption: 'a' as const,
      opensAt: new Date('2026-06-11T12:00:00-06:00'),
      closesAt: new Date('2026-06-28T11:00:00-06:00'),
      category: 'futbol' as const,
    },
    {
      phaseLabel: 'groups_m2' as const,
      question: '¿Cuál es la marca premium de balatas que distribuye Brake Station como Centro de Distribución?',
      optionA: 'TRW',
      optionB: 'CanaBRAKE',
      optionC: 'Bosch',
      correctOption: 'b' as const,
      opensAt: new Date('2026-06-11T12:00:00-06:00'),
      closesAt: new Date('2026-06-28T11:00:00-06:00'),
      category: 'marca' as const,
    },
    // Phase transition 2 (groups_m3): 16avos -> octavos (Jun 29 – Jul 3)
    {
      phaseLabel: 'groups_m3' as const,
      question: '¿Cuál es el máximo goleador histórico de los Mundiales?',
      optionA: 'Pelé',
      optionB: 'Miroslav Klose',
      optionC: 'Ronaldo',
      correctOption: 'b' as const,
      opensAt: new Date('2026-06-29T12:00:00-06:00'),
      closesAt: new Date('2026-07-03T11:00:00-06:00'),
      category: 'futbol' as const,
    },
    {
      phaseLabel: 'groups_m3' as const,
      question: '¿En qué año arrancó operaciones Brake Station?',
      optionA: '2010',
      optionB: '2013',
      optionC: '2018',
      correctOption: 'b' as const,
      opensAt: new Date('2026-06-29T12:00:00-06:00'),
      closesAt: new Date('2026-07-03T11:00:00-06:00'),
      category: 'marca' as const,
    },
    // Phase transition 3 (r32): octavos -> cuartos (Jul 4 – Jul 10)
    {
      phaseLabel: 'r32' as const,
      question: '¿Cuántos equipos participan en el Mundial 2026 (formato ampliado)?',
      optionA: '32',
      optionB: '40',
      optionC: '48',
      correctOption: 'c' as const,
      opensAt: new Date('2026-07-04T12:00:00-06:00'),
      closesAt: new Date('2026-07-10T11:00:00-06:00'),
      category: 'futbol' as const,
    },
    {
      phaseLabel: 'r32' as const,
      question: '¿Qué tipo de tecnología usa la línea PosiTech BALATAS de CanaBRAKE?',
      optionA: 'Cerámica positiva',
      optionB: 'Semi-metálica',
      optionC: 'Orgánica baja fricción',
      correctOption: 'a' as const,
      opensAt: new Date('2026-07-04T12:00:00-06:00'),
      closesAt: new Date('2026-07-10T11:00:00-06:00'),
      category: 'marca' as const,
    },
    // Phase transition 4 (r16): cuartos -> semis (Jul 11 – Jul 13)
    {
      phaseLabel: 'r16' as const,
      question: '¿En qué país se jugará la final del Mundial 2026?',
      optionA: 'México',
      optionB: 'Canadá',
      optionC: 'Estados Unidos',
      correctOption: 'c' as const,
      opensAt: new Date('2026-07-11T12:00:00-06:00'),
      closesAt: new Date('2026-07-13T11:00:00-06:00'),
      category: 'futbol' as const,
    },
    {
      phaseLabel: 'r16' as const,
      question: '¿Cuántas sedes tiene el Mundial 2026 en total?',
      optionA: '11',
      optionB: '16',
      optionC: '12',
      correctOption: 'b' as const,
      opensAt: new Date('2026-07-11T12:00:00-06:00'),
      closesAt: new Date('2026-07-13T11:00:00-06:00'),
      category: 'futbol' as const,
    },
    // Phase transition 5 (qf): semis -> final (Jul 14 – Jul 18)
    {
      phaseLabel: 'qf' as const,
      question: '¿Qué selección ha ganado más Copas del Mundo?',
      optionA: 'Alemania',
      optionB: 'Brasil',
      optionC: 'Italia',
      correctOption: 'b' as const,
      opensAt: new Date('2026-07-14T12:00:00-06:00'),
      closesAt: new Date('2026-07-18T11:00:00-06:00'),
      category: 'futbol' as const,
    },
    {
      phaseLabel: 'qf' as const,
      question: '¿Cuál es la especialidad de productos que distribuye Brake Station?',
      optionA: 'Suspensión y dirección',
      optionB: 'Frenos y embrague',
      optionC: 'Motor y transmisión',
      correctOption: 'b' as const,
      opensAt: new Date('2026-07-14T12:00:00-06:00'),
      closesAt: new Date('2026-07-18T11:00:00-06:00'),
      category: 'marca' as const,
    },
  ];

  await db.insert(trivias).values(triviaData).onConflictDoNothing();
  console.log(`Inserted ${triviaData.length} trivias.`);

  console.log('Seed complete.');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
