-- Migration: Add sacred_texts column to gospel_daily
-- Date: 2024-12-09
-- Description: Adds the sacred_texts field to store references to daily readings

ALTER TABLE gospel_daily
ADD COLUMN IF NOT EXISTS sacred_texts TEXT;

-- Add a comment explaining the field
COMMENT ON COLUMN gospel_daily.sacred_texts IS 'Riferimenti ai testi sacri del giorno (es. Is 40,1-11; Sal 84; 2Pt 3,8-14)';
