import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, '../seeds/fifa_calendar_2026.csv');
const sqlOut = path.join(__dirname, '../drizzle/seed_matches.sql');

const rows = fs.readFileSync(csvPath, 'utf-8').trim().split('\n').slice(1);
const values = rows.map((line) => {
  const [code, phase, group, home, away, ts, country, stadium] = line.split(',');
  const groupVal = group ? `'${group}'` : 'NULL';
  const countryVal = country ? `'${country}'` : 'NULL';
  const stadiumVal = stadium ? `'${stadium.replace(/'/g, "''")}'` : 'NULL';
  return `('${code}','${phase}',${groupVal},'${home.replace(/'/g, "''")}','${away.replace(/'/g, "''")}','${ts}'::timestamptz,${countryVal},${stadiumVal})`;
}).join(',\n  ');

const sql = `-- Seed: 104 matches del Mundial FIFA 2026
INSERT INTO matches (match_code, phase, group_letter, team_home, team_away, scheduled_at, venue_country, venue_stadium)
VALUES
  ${values}
ON CONFLICT (match_code) DO NOTHING;
`;

fs.writeFileSync(sqlOut, sql);
console.log(`Wrote ${rows.length} matches to ${sqlOut}`);
