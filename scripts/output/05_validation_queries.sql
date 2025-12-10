-- ============================================
-- QUERY DI VALIDAZIONE MIGRAZIONE
-- ============================================

-- Eseguire queste query PRIMA e DOPO la migrazione per verificare l'integrità dei dati

-- ============================================
-- 1. CONTEGGI ATTESI DAL LEGACY (valori dal CSV)
-- ============================================

-- Totale righe nel CSV legacy: 2527
-- Righe con commento principale: 2525
-- Righe con riflessione/extra: 1922
-- Righe con video: 209
-- Vangeli unici estratti: 491

-- ============================================
-- 2. QUERY DI CONTEGGIO POST-MIGRAZIONE
-- ============================================

-- Conteggio gospels (deve essere >= 491)
SELECT 'gospels' as tabella, COUNT(*) as conteggio FROM gospels;

-- Conteggio gospel_daily (deve essere = 2527)
SELECT 'gospel_daily' as tabella, COUNT(*) as conteggio FROM gospel_daily;

-- Conteggio comment_sections totale (deve essere = 4447)
SELECT 'comment_sections' as tabella, COUNT(*) as conteggio FROM comment_sections;

-- Conteggio comment_sections per tipo
SELECT section_type, COUNT(*) as conteggio
FROM comment_sections
GROUP BY section_type
ORDER BY section_type;
-- Atteso: main = 2525, reflection = 1922

-- Conteggio media (deve essere = 209)
SELECT 'media' as tabella, COUNT(*) as conteggio FROM media;

-- ============================================
-- 3. QUERY DI INTEGRITÀ REFERENZIALE
-- ============================================

-- Gospel_daily senza gospel associato (deve essere 0)
SELECT COUNT(*) as gospel_daily_senza_gospel
FROM gospel_daily gd
WHERE gd.gospel_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM gospels g WHERE g.id = gd.gospel_id
);

-- Comment_sections senza gospel_daily (deve essere 0)
SELECT COUNT(*) as comments_orfani
FROM comment_sections cs
WHERE NOT EXISTS (
    SELECT 1 FROM gospel_daily gd WHERE gd.id = cs.gospel_daily_id
);

-- Media senza gospel_daily (deve essere 0)
SELECT COUNT(*) as media_orfani
FROM media m
WHERE NOT EXISTS (
    SELECT 1 FROM gospel_daily gd WHERE gd.id = m.gospel_daily_id
);

-- ============================================
-- 4. QUERY DI CONSISTENZA DATE
-- ============================================

-- Date duplicate in gospel_daily (non dovrebbero esserci nel legacy)
SELECT date, COUNT(*) as occorrenze
FROM gospel_daily
GROUP BY date
HAVING COUNT(*) > 1;

-- Range date
SELECT
    MIN(date) as data_minima,
    MAX(date) as data_massima,
    COUNT(DISTINCT date) as giorni_unici
FROM gospel_daily;

-- ============================================
-- 5. QUERY DI SAMPLE PER VERIFICA MANUALE
-- ============================================

-- Campione di 5 record completi per verifica manuale
SELECT
    gd.id,
    gd.date,
    gd.saints,
    g.reference,
    g.evangelist,
    (SELECT COUNT(*) FROM comment_sections cs WHERE cs.gospel_daily_id = gd.id) as num_comments,
    (SELECT COUNT(*) FROM media m WHERE m.gospel_daily_id = gd.id) as num_media
FROM gospel_daily gd
JOIN gospels g ON g.id = gd.gospel_id
ORDER BY gd.date DESC
LIMIT 5;

-- ============================================
-- 6. REPORT RIFERIMENTI NON TROVATI
-- ============================================

-- I seguenti record hanno riferimenti biblici non estratti correttamente:
-- (controllare manualmente e correggere se necessario)
-- ID: 1170, Date: 2019-04-20
-- ID: 1954, Date: 2021-05-19
-- ID: 2871, Date: 2023-10-24
-- ID: 2902, Date: 2023-11-23
-- ID: 2906, Date: 2023-11-27
-- ID: 2973, Date: 2024-02-01
-- ID: 3031, Date: 2024-03-30
-- ID: 3133, Date: 2024-07-06
-- ID: 3140, Date: 2024-07-13
-- ID: 3179, Date: 2024-08-19
-- ID: 3253, Date: 2024-10-31
-- ID: 3256, Date: 2024-11-03
-- ID: 3264, Date: 2024-11-11
-- ID: 3280, Date: 2024-11-27
-- ID: 3287, Date: 2024-12-04
-- ID: 3288, Date: 2024-12-05
-- ID: 3305, Date: 2024-12-20
-- ID: 3310, Date: 2024-12-25
-- ID: 3311, Date: 2024-12-26
-- ID: 3322, Date: 2025-01-06
-- ID: 3426, Date: 2025-04-19
