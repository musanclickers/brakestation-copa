-- Diagnóstico: confirmar que J2 y J3 están listas para captura.
-- Para correrlo: psql -f packages/db/drizzle/check_matches_j2_j3.sql
-- O abre psql en la terminal de Coolify y pega el contenido completo.

\echo '── Resumen por fase ──────────────────────────────────'
SELECT
  phase,
  COUNT(*) AS total,
  COUNT(starts_at) AS con_starts_at,
  COUNT(*) FILTER (WHERE starts_at IS NULL) AS sin_starts_at,
  COUNT(*) FILTER (WHERE starts_at > NOW()) AS futuros,
  COUNT(*) FILTER (WHERE starts_at <= NOW()) AS ya_iniciaron
FROM matches
WHERE phase IN ('groups_m1','groups_m2','groups_m3')
GROUP BY phase
ORDER BY phase;

\echo ''
\echo '── Próximos partidos de J2 (los primeros 5 por kickoff) ──'
SELECT match_code, team_home, team_away,
       starts_at AT TIME ZONE 'America/Mexico_City' AS starts_at_cdmx
FROM matches
WHERE phase = 'groups_m2' AND starts_at > NOW()
ORDER BY starts_at ASC
LIMIT 5;

\echo ''
\echo '── Próximos partidos de J3 (los primeros 5 por kickoff) ──'
SELECT match_code, team_home, team_away,
       starts_at AT TIME ZONE 'America/Mexico_City' AS starts_at_cdmx
FROM matches
WHERE phase = 'groups_m3' AND starts_at > NOW()
ORDER BY starts_at ASC
LIMIT 5;

\echo ''
\echo '── Si futuros=0 o sin_starts_at>0 en alguna fase, corre /admin/matches → Resincronizar ──'
