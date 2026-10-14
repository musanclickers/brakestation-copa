-- Detect + dedupe trivia_responses that double-counted points because the same
-- (phase_label, question) was inserted multiple times by seed_trivias_j2_j3.sql
-- running on every deploy.
--
-- Run sections one at a time. Section 1 = detect, section 2 = aggregate by user,
-- section 3 = destructive cleanup (transactional), section 4 = verify.
--
-- IMPORTANT: take a backup before section 3:
--   pg_dump "$DATABASE_URL" --table=trivia_responses --data-only > trivia_responses_backup.sql

-- ─── Section 1: detail per (user, ticket, question) ───────────────────
\echo '── Duplicados por (usuario, boleto, pregunta) ──'
WITH per_user_question AS (
  SELECT
    tr.user_id,
    tr.ticket_code,
    t.phase_label,
    t.question,
    COUNT(*) AS respuestas,
    SUM(CASE WHEN tr.selected_option = t.correct_option THEN 2 ELSE 0 END) AS pts_actuales,
    (
      SELECT CASE WHEN tr2.selected_option = t2.correct_option THEN 2 ELSE 0 END
      FROM trivia_responses tr2
      JOIN trivias t2 ON tr2.trivia_id = t2.id
      WHERE tr2.user_id = tr.user_id
        AND tr2.ticket_code = tr.ticket_code
        AND t2.phase_label = t.phase_label
        AND t2.question = t.question
      ORDER BY tr2.submitted_at ASC, tr2.id ASC
      LIMIT 1
    ) AS pts_si_solo_primera
  FROM trivia_responses tr
  JOIN trivias t ON tr.trivia_id = t.id
  GROUP BY tr.user_id, tr.ticket_code, t.phase_label, t.question
  HAVING COUNT(*) > 1
)
SELECT
  user_id, ticket_code, phase_label,
  LEFT(question, 60) AS pregunta,
  respuestas,
  pts_actuales,
  pts_si_solo_primera,
  (pts_actuales - pts_si_solo_primera) AS pts_inflados
FROM per_user_question
ORDER BY pts_inflados DESC, ticket_code, phase_label;

-- ─── Section 2: total inflado por boleto ──────────────────────────────
\echo ''
\echo '── Total de puntos inflados por boleto ──'
WITH per_user_question AS (
  SELECT
    tr.user_id, tr.ticket_code, t.phase_label, t.question,
    COUNT(*) AS respuestas,
    SUM(CASE WHEN tr.selected_option = t.correct_option THEN 2 ELSE 0 END) AS pts_actuales,
    (
      SELECT CASE WHEN tr2.selected_option = t2.correct_option THEN 2 ELSE 0 END
      FROM trivia_responses tr2 JOIN trivias t2 ON tr2.trivia_id = t2.id
      WHERE tr2.user_id = tr.user_id AND tr2.ticket_code = tr.ticket_code
        AND t2.phase_label = t.phase_label AND t2.question = t.question
      ORDER BY tr2.submitted_at ASC, tr2.id ASC LIMIT 1
    ) AS pts_si_solo_primera
  FROM trivia_responses tr
  JOIN trivias t ON tr.trivia_id = t.id
  GROUP BY tr.user_id, tr.ticket_code, t.phase_label, t.question
  HAVING COUNT(*) > 1
)
SELECT
  ticket_code,
  user_id,
  SUM(respuestas) AS respuestas_total,
  SUM(pts_actuales) AS pts_actuales,
  SUM(pts_si_solo_primera) AS pts_justos,
  SUM(pts_actuales - pts_si_solo_primera) AS pts_inflados
FROM per_user_question
GROUP BY ticket_code, user_id
ORDER BY pts_inflados DESC;

-- ─── Section 3: destructive cleanup (uncomment to apply) ──────────────
-- This keeps the FIRST response per (user, ticket, phase_label, question)
-- ordered by submitted_at ASC, deleting the rest. Runs inside a transaction
-- so you can ROLLBACK if the counts look wrong.
--
-- BEGIN;
--
-- WITH ranked AS (
--   SELECT
--     tr.id AS response_id,
--     ROW_NUMBER() OVER (
--       PARTITION BY tr.user_id, tr.ticket_code, t.phase_label, t.question
--       ORDER BY tr.submitted_at ASC, tr.id ASC
--     ) AS rn
--   FROM trivia_responses tr
--   JOIN trivias t ON tr.trivia_id = t.id
-- ),
-- to_delete AS (
--   SELECT response_id FROM ranked WHERE rn > 1
-- )
-- DELETE FROM trivia_responses WHERE id IN (SELECT response_id FROM to_delete);
--
-- -- Run sections 1+2 again HERE inside the transaction to confirm 0 duplicates
-- -- left. If the result is what you expect:
-- -- COMMIT;
-- -- If anything looks wrong:
-- -- ROLLBACK;

-- ─── Section 4: verify (run after COMMIT) ─────────────────────────────
\echo ''
\echo '── Conteo final ──'
SELECT
  COUNT(*) AS total_respuestas,
  COUNT(DISTINCT (tr.user_id, tr.ticket_code, t.phase_label, t.question)) AS combinaciones_unicas,
  COUNT(*) - COUNT(DISTINCT (tr.user_id, tr.ticket_code, t.phase_label, t.question)) AS duplicados_restantes
FROM trivia_responses tr
JOIN trivias t ON tr.trivia_id = t.id;
