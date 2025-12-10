#!/usr/bin/env python3
"""
Script di Migrazione: gospel_way (legacy) -> Nuova Struttura Database

Tabella Legacy (gospel_way):
- id, date, saints, liturgy, sacred_texts, evangelist (1-4), text, comment, extra, image, video

Nuove Tabelle:
- gospels: id, reference, evangelist, text
- gospel_daily: id, date, gospel_id, saints, liturgical_season, sacred_texts
- comment_sections: id, gospel_daily_id, section_type, title, content, content_format, sort_order
- media: id, gospel_daily_id, type, url, storage_path, title, alt_text

Mapping Evangelisti:
- 1 = Marco
- 2 = Matteo
- 3 = Luca
- 4 = Giovanni
"""

import csv
import re
import html
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# ============================================
# CONFIGURAZIONE
# ============================================

INPUT_CSV = Path(__file__).parent.parent / 'backup' / 'gospel_way.csv'
OUTPUT_DIR = Path(__file__).parent / 'output'

EVANGELIST_MAP = {
    '1': 'Marco',
    '2': 'Matteo',
    '3': 'Luca',
    '4': 'Giovanni'
}

# Pattern per estrarre il riferimento dal testo (es. "(Mt 5,1-12)" alla fine)
# Supporta vari formati:
# - (Mt 5,1-12) - standard
# - (Mc 10.1-12) - punto invece di virgola
# - (Lc 6,17.20-26) - versetti con punto
# - (Mt 6,1-6.16-18) - versetti multipli
# - (Gv 15,26-27;16,12-15) - riferimenti multipli
# Il pattern cerca alla fine del testo, prima di </p>, </div>, </span></p> e newline
REFERENCE_PATTERN = re.compile(
    r'\(([A-Za-z]{1,3})\s*(\d+)[,\.]\s*([0-9a-z\s,\.\-;:]+)\)\s*\.?[a-z]?\s*(?:&nbsp;)*\s*(?:</span>)?\s*(?:</p>|</div>)',
    re.IGNORECASE
)

# ============================================
# FUNZIONI HELPER
# ============================================

def clean_html(text: str, strip_tags: bool = True) -> str:
    """
    Pulisce il testo HTML.

    Args:
        text: Testo da pulire
        strip_tags: Se True, rimuove i tag HTML. Se False, li mantiene ma decodifica le entità.

    Returns:
        Testo pulito
    """
    if not text:
        return ''

    # Decodifica entità HTML (&nbsp;, &egrave;, &rsquo;, etc.)
    text = html.unescape(text)

    if strip_tags:
        # Rimuove tutti i tag HTML
        text = re.sub(r'<[^>]+>', '', text)
        # Rimuove spazi multipli
        text = re.sub(r'\s+', ' ', text)
        # Rimuove spazi all'inizio/fine
        text = text.strip()

    return text


def clean_gospel_text(text: str) -> str:
    """
    Pulisce il testo del vangelo: rimuove tag HTML ma mantiene il testo leggibile.
    """
    if not text:
        return ''

    # Prima decodifica le entità HTML
    text = html.unescape(text)

    # Sostituisce <p> e </p> con newline
    text = re.sub(r'<p[^>]*>', '', text)
    text = re.sub(r'</p>', '\n', text)

    # Sostituisce <br> con newline
    text = re.sub(r'<br\s*/?>', '\n', text)

    # Rimuove tutti gli altri tag
    text = re.sub(r'<[^>]+>', '', text)

    # Normalizza newline multipli
    text = re.sub(r'\n\s*\n+', '\n\n', text)

    # Rimuove spazi extra
    text = re.sub(r'[ \t]+', ' ', text)

    # Rimuove spazi all'inizio/fine di ogni riga
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)

    return text.strip()


def clean_comment_html(text: str) -> str:
    """
    Pulisce i commenti: mantiene la struttura HTML ma normalizza e pulisce.
    I commenti possono contenere formattazione che vogliamo preservare per il rich text editor.
    """
    if not text:
        return ''

    # Decodifica entità HTML
    text = html.unescape(text)

    # Rimuove style attributes (inline styles)
    text = re.sub(r'\s*style="[^"]*"', '', text)

    # Rimuove classi
    text = re.sub(r'\s*class="[^"]*"', '', text)

    # Rimuove tag IMG con prefisso "IMG1" (sembra essere un placeholder)
    text = re.sub(r'IMG\d+', '', text)

    # Normalizza spazi
    text = re.sub(r'[ \t]+', ' ', text)

    # Rimuove &nbsp; ridondanti
    text = text.replace('\u00a0', ' ')  # nbsp decodificato

    # Rimuove tag vuoti
    text = re.sub(r'<(\w+)[^>]*>\s*</\1>', '', text)

    # Rimuove <p>&nbsp;</p> e simili
    text = re.sub(r'<p>\s*</p>', '', text)
    text = re.sub(r'<div>\s*</div>', '', text)

    return text.strip()

def extract_reference(text: str, evangelist_id: str) -> tuple[str, str]:
    """
    Estrae il riferimento biblico dal testo del vangelo.

    Returns:
        tuple: (reference_string, cleaned_text)

    Esempio:
        Input: "...la fanciulla la diede a sua madre (Mc 6,14-29).</p>"
        Output: ("Mc 6,14-29", "...la fanciulla la diede a sua madre")
    """
    if not text:
        evangelist = EVANGELIST_MAP.get(evangelist_id, 'Sconosciuto')
        return f"{evangelist[:2]} ?", text

    match = REFERENCE_PATTERN.search(text)
    if match:
        book = match.group(1)
        chapter = match.group(2)
        verses = match.group(3).strip().replace(' ', '')  # Rimuove spazi
        # Normalizza: sostituisce . con , nel capitolo se necessario
        reference = f"{book} {chapter},{verses}"
        # Rimuove il riferimento dal testo
        cleaned_text = text[:match.start()].strip()
        # Rimuove eventuale </p> rimasto
        cleaned_text = re.sub(r'</p>\s*$', '', cleaned_text)
        return reference, cleaned_text

    # Prova pattern alternativo per casi speciali (es. "Lc 22,14-23,56", "Mc 8,34 – 9,1")
    alt_pattern = re.compile(
        r'\(([A-Za-z]{1,3})\s+([0-9,\.\-\s;&ndash;]+)\)\s*\.?[a-z]?\s*(?:&nbsp;)*\s*(?:</span>)?\s*(?:</p>|</div>)',
        re.IGNORECASE
    )
    alt_match = alt_pattern.search(text)
    if alt_match:
        book = alt_match.group(1)
        full_ref = alt_match.group(2).strip().replace(' ', '').replace('&ndash;', '-')
        reference = f"{book} {full_ref}"
        cleaned_text = text[:alt_match.start()].strip()
        cleaned_text = re.sub(r'</p>\s*$', '', cleaned_text)
        cleaned_text = re.sub(r'</div>\s*$', '', cleaned_text)
        return reference, cleaned_text

    # Se non trova il pattern, genera un riferimento parziale
    evangelist = EVANGELIST_MAP.get(evangelist_id, '??')
    prefix_map = {'Marco': 'Mc', 'Matteo': 'Mt', 'Luca': 'Lc', 'Giovanni': 'Gv'}
    prefix = prefix_map.get(evangelist, '??')
    return f"{prefix} ?", text

def escape_sql(value: str) -> str:
    """Escapa una stringa per SQL."""
    if value is None:
        return 'NULL'
    # Escape single quotes
    escaped = value.replace("'", "''")
    return f"'{escaped}'"

def is_null_or_empty(value: str) -> bool:
    """Controlla se il valore è NULL o vuoto."""
    return value is None or value.strip() == '' or value.strip().upper() == 'NULL'


def clean_video_url(url: str) -> str | None:
    """
    Pulisce e valida un URL video YouTube.

    Gestisce:
    - URL con tag HTML (<p>, </p>, <div>, etc.)
    - Entità HTML (&amp; -> &)
    - Parametri extra (ab_channel, t=, etc.) - li mantiene
    - URL youtu.be (short form)

    Returns:
        URL pulito o None se non è un URL YouTube valido
    """
    if not url:
        return None

    # Decodifica entità HTML
    url = html.unescape(url)

    # Rimuove tag HTML
    url = re.sub(r'<[^>]+>', '', url)

    # Rimuove spazi e newline
    url = url.strip()
    url = re.sub(r'\s+', '', url)

    # Estrae URL YouTube se presente nel testo
    # Pattern per youtube.com/watch?v=
    yt_match = re.search(r'(https?://(?:www\.)?youtube\.com/watch\?v=[a-zA-Z0-9_-]+(?:[&][^"\s<>]*)?)', url)
    if yt_match:
        return yt_match.group(1)

    # Pattern per youtu.be (short URL)
    ytbe_match = re.search(r'(https?://youtu\.be/[a-zA-Z0-9_-]+(?:\?[^"\s<>]*)?)', url)
    if ytbe_match:
        return ytbe_match.group(1)

    # Se l'URL inizia con http e contiene youtube, potrebbe essere valido
    if url.startswith('http') and ('youtube.com' in url or 'youtu.be' in url):
        return url

    # Non è un URL YouTube valido
    return None

# ============================================
# CLASSE PRINCIPALE DI MIGRAZIONE
# ============================================

class LegacyMigrator:
    def __init__(self, csv_path: Path):
        self.csv_path = csv_path
        self.gospels = {}  # reference -> gospel_data
        self.gospel_daily_entries = []
        self.comment_sections = []
        self.media_entries = []

        # Contatori per validazione
        self.stats = {
            'total_rows': 0,
            'rows_with_comment': 0,
            'rows_with_extra': 0,
            'rows_with_video': 0,
            'unique_gospels': 0,
            'references_not_found': [],
        }

    def parse_csv(self):
        """Legge e parsa il CSV legacy."""
        print(f"Leggendo {self.csv_path}...")

        with open(self.csv_path, 'r', encoding='utf-8') as f:
            # Il CSV usa virgole come separatore e doppi apici
            reader = csv.DictReader(f)

            for row in reader:
                self.stats['total_rows'] += 1
                self._process_row(row)

        self.stats['unique_gospels'] = len(self.gospels)
        print(f"Processate {self.stats['total_rows']} righe")
        print(f"Trovati {self.stats['unique_gospels']} vangeli unici")

    def _process_row(self, row: dict):
        """Processa una singola riga del CSV."""
        # Estrai campi
        legacy_id = row.get('id', '')
        date = row.get('date', '')
        saints = row.get('saints', '')
        liturgy = row.get('liturgy', '')  # -> liturgical_season
        sacred_texts = row.get('sacred_texts', '')
        evangelist_id = row.get('evangelist', '')
        text = row.get('text', '')
        comment = row.get('comment', '')
        extra = row.get('extra', '')
        video = row.get('video', '')

        # Valida evangelista - deve essere 1-4
        if evangelist_id not in EVANGELIST_MAP:
            self.stats.setdefault('skipped_invalid_evangelist', []).append({
                'legacy_id': legacy_id,
                'date': date,
                'evangelist_id': evangelist_id
            })
            # Usa un default valido (Giovanni = 4) per non perdere il record
            # ma segnala l'anomalia
            evangelist_id = '4'  # Default a Giovanni se manca

        # Estrai riferimento dal testo
        reference, cleaned_text = extract_reference(text, evangelist_id)

        if '?' in reference:
            self.stats['references_not_found'].append({
                'legacy_id': legacy_id,
                'date': date,
                'text_preview': text[:100] if text else ''
            })

        # Pulisci il testo del vangelo (rimuove tag HTML)
        cleaned_gospel_text = clean_gospel_text(cleaned_text)

        # 1. Crea/aggiorna Vangelo
        evangelist = EVANGELIST_MAP.get(evangelist_id, 'Sconosciuto')
        gospel_key = f"{reference}|{evangelist}"

        if gospel_key not in self.gospels:
            self.gospels[gospel_key] = {
                'reference': reference,
                'evangelist': evangelist,
                'text': cleaned_gospel_text,  # Testo pulito senza HTML
            }

        # 2. Crea Gospel Daily
        gospel_daily = {
            'legacy_id': legacy_id,
            'date': date,
            'gospel_key': gospel_key,
            'saints': clean_html(saints) if not is_null_or_empty(saints) else None,
            'liturgical_season': clean_html(liturgy) if not is_null_or_empty(liturgy) else None,
            'sacred_texts': clean_html(sacred_texts) if not is_null_or_empty(sacred_texts) else None,
        }
        self.gospel_daily_entries.append(gospel_daily)

        # 3. Crea Comment Sections (pulisce HTML ma mantiene struttura per rich editor)
        if not is_null_or_empty(comment):
            self.stats['rows_with_comment'] += 1
            self.comment_sections.append({
                'legacy_id': legacy_id,
                'section_type': 'main',
                'title': None,
                'content': clean_comment_html(comment),  # HTML pulito
                'content_format': 'html',
                'sort_order': 1,
            })

        if not is_null_or_empty(extra):
            self.stats['rows_with_extra'] += 1
            self.comment_sections.append({
                'legacy_id': legacy_id,
                'section_type': 'reflection',
                'title': None,
                'content': clean_comment_html(extra),  # HTML pulito
                'content_format': 'html',
                'sort_order': 2,
            })

        # 4. Crea Media (video YouTube)
        if not is_null_or_empty(video):
            cleaned_url = clean_video_url(video)
            if cleaned_url:
                self.stats['rows_with_video'] += 1
                self.media_entries.append({
                    'legacy_id': legacy_id,
                    'type': 'video',
                    'url': cleaned_url,
                    'storage_path': None,
                    'title': None,
                    'alt_text': None,
                })
            else:
                # Traccia URL non validi per debug
                self.stats.setdefault('invalid_video_urls', []).append({
                    'legacy_id': legacy_id,
                    'date': date,
                    'raw_video': video[:100] if len(video) > 100 else video
                })

    def generate_sql(self) -> dict[str, str]:
        """Genera gli statement SQL INSERT."""
        sql_files = {}

        # 1. SQL per gospels
        sql_files['01_gospels.sql'] = self._generate_gospels_sql()

        # 2. SQL per gospel_daily
        sql_files['02_gospel_daily.sql'] = self._generate_gospel_daily_sql()

        # 3. SQL per comment_sections
        sql_files['03_comment_sections.sql'] = self._generate_comment_sections_sql()

        # 4. SQL per media
        sql_files['04_media.sql'] = self._generate_media_sql()

        # 5. Query di validazione
        sql_files['05_validation_queries.sql'] = self._generate_validation_queries()

        return sql_files

    def _generate_gospels_sql(self) -> str:
        """Genera INSERT per tabella gospels."""
        lines = [
            "-- ============================================",
            "-- INSERIMENTO GOSPELS (Testi dei Vangeli)",
            "-- ============================================",
            "",
            "-- Pulisce la tabella (opzionale, commentare se si vuole preservare)",
            "-- TRUNCATE TABLE gospels CASCADE;",
            "",
        ]

        for i, (key, gospel) in enumerate(self.gospels.items(), 1):
            ref = escape_sql(gospel['reference'])
            evang = escape_sql(gospel['evangelist'])
            text = escape_sql(gospel['text'])

            lines.append(
                f"INSERT INTO gospels (reference, evangelist, text) "
                f"VALUES ({ref}, {evang}, {text});"
            )

        lines.append("")
        lines.append(f"-- Totale gospels inseriti: {len(self.gospels)}")

        return '\n'.join(lines)

    def _generate_gospel_daily_sql(self) -> str:
        """Genera INSERT per tabella gospel_daily."""
        lines = [
            "-- ============================================",
            "-- INSERIMENTO GOSPEL_DAILY",
            "-- ============================================",
            "",
            "-- NOTA: gospel_id deve essere risolto con una subquery",
            "-- basata su reference ed evangelist (LIMIT 1 per evitare duplicati)",
            "",
        ]

        for entry in self.gospel_daily_entries:
            # Recupera info del vangelo
            gospel = self.gospels[entry['gospel_key']]
            ref = escape_sql(gospel['reference'])
            evang = escape_sql(gospel['evangelist'])

            date = escape_sql(entry['date'])
            saints = escape_sql(entry['saints']) if entry['saints'] else 'NULL'
            season = escape_sql(entry['liturgical_season']) if entry['liturgical_season'] else 'NULL'
            sacred = escape_sql(entry['sacred_texts']) if entry['sacred_texts'] else 'NULL'

            lines.append(
                f"INSERT INTO gospel_daily (date, gospel_id, saints, liturgical_season, sacred_texts) "
                f"SELECT {date}, g.id, {saints}, {season}, {sacred} "
                f"FROM gospels g WHERE g.reference = {ref} AND g.evangelist = {evang} LIMIT 1;"
            )

        lines.append("")
        lines.append(f"-- Totale gospel_daily inseriti: {len(self.gospel_daily_entries)}")

        return '\n'.join(lines)

    def _generate_comment_sections_sql(self) -> str:
        """Genera INSERT per tabella comment_sections."""
        lines = [
            "-- ============================================",
            "-- INSERIMENTO COMMENT_SECTIONS",
            "-- ============================================",
            "",
            "-- NOTA: gospel_daily_id deve essere risolto con una subquery",
            "-- basata sulla data (che è unica nel legacy)",
            "",
        ]

        # Raggruppa per legacy_id per poter fare la subquery
        by_legacy_id = defaultdict(list)
        for section in self.comment_sections:
            by_legacy_id[section['legacy_id']].append(section)

        # Mappa legacy_id -> date
        legacy_to_date = {e['legacy_id']: e['date'] for e in self.gospel_daily_entries}

        for legacy_id, sections in by_legacy_id.items():
            date = legacy_to_date.get(legacy_id)
            if not date:
                continue

            date_sql = escape_sql(date)

            for section in sections:
                s_type = escape_sql(section['section_type'])
                title = escape_sql(section['title']) if section['title'] else 'NULL'
                content = escape_sql(section['content'])
                c_format = escape_sql(section['content_format'])
                sort_order = section['sort_order']

                lines.append(
                    f"INSERT INTO comment_sections (gospel_daily_id, section_type, title, content, content_format, sort_order) "
                    f"SELECT gd.id, {s_type}, {title}, {content}, {c_format}, {sort_order} "
                    f"FROM gospel_daily gd WHERE gd.date = {date_sql};"
                )

        lines.append("")
        lines.append(f"-- Totale comment_sections inserite: {len(self.comment_sections)}")

        return '\n'.join(lines)

    def _generate_media_sql(self) -> str:
        """Genera INSERT per tabella media."""
        lines = [
            "-- ============================================",
            "-- INSERIMENTO MEDIA (Video YouTube)",
            "-- ============================================",
            "",
        ]

        if not self.media_entries:
            lines.append("-- Nessun media da inserire")
            return '\n'.join(lines)

        # Mappa legacy_id -> date
        legacy_to_date = {e['legacy_id']: e['date'] for e in self.gospel_daily_entries}

        for media in self.media_entries:
            date = legacy_to_date.get(media['legacy_id'])
            if not date:
                continue

            date_sql = escape_sql(date)
            m_type = escape_sql(media['type'])
            url = escape_sql(media['url'])

            lines.append(
                f"INSERT INTO media (gospel_daily_id, type, url) "
                f"SELECT gd.id, {m_type}, {url} "
                f"FROM gospel_daily gd WHERE gd.date = {date_sql};"
            )

        lines.append("")
        lines.append(f"-- Totale media inseriti: {len(self.media_entries)}")

        return '\n'.join(lines)

    def _generate_validation_queries(self) -> str:
        """Genera query SQL per validare la migrazione."""
        return f"""-- ============================================
-- QUERY DI VALIDAZIONE MIGRAZIONE
-- ============================================

-- Eseguire queste query PRIMA e DOPO la migrazione per verificare l'integrità dei dati

-- ============================================
-- 1. CONTEGGI ATTESI DAL LEGACY (valori dal CSV)
-- ============================================

-- Totale righe nel CSV legacy: {self.stats['total_rows']}
-- Righe con commento principale: {self.stats['rows_with_comment']}
-- Righe con riflessione/extra: {self.stats['rows_with_extra']}
-- Righe con video: {self.stats['rows_with_video']}
-- Vangeli unici estratti: {self.stats['unique_gospels']}

-- ============================================
-- 2. QUERY DI CONTEGGIO POST-MIGRAZIONE
-- ============================================

-- Conteggio gospels (deve essere >= {self.stats['unique_gospels']})
SELECT 'gospels' as tabella, COUNT(*) as conteggio FROM gospels;

-- Conteggio gospel_daily (deve essere = {self.stats['total_rows']})
SELECT 'gospel_daily' as tabella, COUNT(*) as conteggio FROM gospel_daily;

-- Conteggio comment_sections totale (deve essere = {len(self.comment_sections)})
SELECT 'comment_sections' as tabella, COUNT(*) as conteggio FROM comment_sections;

-- Conteggio comment_sections per tipo
SELECT section_type, COUNT(*) as conteggio
FROM comment_sections
GROUP BY section_type
ORDER BY section_type;
-- Atteso: main = {self.stats['rows_with_comment']}, reflection = {self.stats['rows_with_extra']}

-- Conteggio media (deve essere = {self.stats['rows_with_video']})
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
{self._format_references_not_found()}
"""

    def _format_references_not_found(self) -> str:
        """Formatta i riferimenti non trovati come commenti SQL."""
        if not self.stats['references_not_found']:
            return "-- Tutti i riferimenti sono stati estratti correttamente!"

        lines = []
        for item in self.stats['references_not_found'][:50]:  # Max 50
            lines.append(f"-- ID: {item['legacy_id']}, Date: {item['date']}")

        if len(self.stats['references_not_found']) > 50:
            lines.append(f"-- ... e altri {len(self.stats['references_not_found']) - 50} record")

        return '\n'.join(lines)

    def save_sql_files(self):
        """Salva i file SQL generati."""
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        sql_files = self.generate_sql()

        # Limite di righe per file (Supabase SQL editor ha limiti)
        MAX_LINES_PER_FILE = 1000

        for filename, content in sql_files.items():
            lines = content.split('\n')

            # Se il file è piccolo, salvalo normalmente
            if len(lines) <= MAX_LINES_PER_FILE:
                filepath = OUTPUT_DIR / filename
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Salvato: {filepath}")
            else:
                # Dividi in parti
                # Estrai header (commenti iniziali)
                header_lines = []
                data_lines = []
                for line in lines:
                    if line.startswith('--') or line.strip() == '':
                        if not data_lines:  # Solo se non abbiamo ancora dati
                            header_lines.append(line)
                        else:
                            data_lines.append(line)
                    else:
                        data_lines.append(line)

                # Dividi data_lines in chunk
                base_name = filename.rsplit('.', 1)[0]
                part_num = 1
                for i in range(0, len(data_lines), MAX_LINES_PER_FILE):
                    chunk = data_lines[i:i + MAX_LINES_PER_FILE]
                    part_filename = f"{base_name}_part{part_num}.sql"
                    filepath = OUTPUT_DIR / part_filename

                    with open(filepath, 'w', encoding='utf-8') as f:
                        # Aggiungi header solo alla prima parte
                        if part_num == 1:
                            f.write('\n'.join(header_lines))
                            f.write('\n')
                        f.write(f"-- Parte {part_num}\n")
                        f.write('\n'.join(chunk))

                    print(f"Salvato: {filepath} ({len(chunk)} righe)")
                    part_num += 1

    def print_stats(self):
        """Stampa le statistiche della migrazione."""
        print("\n" + "="*50)
        print("STATISTICHE MIGRAZIONE")
        print("="*50)
        print(f"Righe totali processate: {self.stats['total_rows']}")
        print(f"Vangeli unici: {self.stats['unique_gospels']}")
        print(f"Righe con commento principale: {self.stats['rows_with_comment']}")
        print(f"Righe con riflessione: {self.stats['rows_with_extra']}")
        print(f"Righe con video validi: {self.stats['rows_with_video']}")
        print(f"Riferimenti non estratti: {len(self.stats['references_not_found'])}")

        # Mostra URL video invalidi
        invalid_videos = self.stats.get('invalid_video_urls', [])
        if invalid_videos:
            print(f"URL video invalidi (scartati): {len(invalid_videos)}")
            for item in invalid_videos[:10]:
                print(f"  - Date: {item['date']}, Raw: {item['raw_video'][:50]}...")

        # Mostra evangelisti invalidi
        invalid_evang = self.stats.get('skipped_invalid_evangelist', [])
        if invalid_evang:
            print(f"Evangelisti invalidi (default a Giovanni): {len(invalid_evang)}")
            for item in invalid_evang[:5]:
                print(f"  - ID: {item['legacy_id']}, Date: {item['date']}, Evang: '{item['evangelist_id']}'")

        print("="*50)


# ============================================
# MAIN
# ============================================

def main():
    print("="*50)
    print("MIGRAZIONE DATI LEGACY -> NUOVA STRUTTURA")
    print("="*50)

    if not INPUT_CSV.exists():
        print(f"ERRORE: File non trovato: {INPUT_CSV}")
        return 1

    migrator = LegacyMigrator(INPUT_CSV)

    # 1. Parsing del CSV
    migrator.parse_csv()

    # 2. Statistiche
    migrator.print_stats()

    # 3. Generazione SQL
    print("\nGenerazione file SQL...")
    migrator.save_sql_files()

    print("\n[OK] Migrazione completata!")
    print(f"  File SQL salvati in: {OUTPUT_DIR}")
    print("\nProssimi passi:")
    print("  1. Revisiona i file SQL generati")
    print("  2. Esegui 05_validation_queries.sql PRIMA della migrazione")
    print("  3. Esegui gli INSERT nell'ordine: 01, 02, 03, 04")
    print("  4. Esegui 05_validation_queries.sql DOPO la migrazione")
    print("  5. Confronta i conteggi per verificare l'integrità")

    return 0


if __name__ == '__main__':
    exit(main())
