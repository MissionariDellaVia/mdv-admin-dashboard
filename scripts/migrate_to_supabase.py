#!/usr/bin/env python3
"""
Script di Migrazione Diretta a Supabase

Esegue la migrazione direttamente usando l'API di Supabase invece di generare SQL.
Richiede: pip install supabase python-dotenv
"""

import csv
import re
import html
import os
import sys
from datetime import datetime
from pathlib import Path
from collections import defaultdict

try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
except ImportError:
    print("Errore: Installa le dipendenze con:")
    print("  pip install supabase python-dotenv")
    sys.exit(1)

# Carica variabili d'ambiente
load_dotenv(Path(__file__).parent.parent / '.env.local')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
# Usa service_role key per bypassare RLS (necessaria per migration)
SUPABASE_KEY = os.getenv('VITE_SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Errore: Configura in .env.local:")
    print("  VITE_SUPABASE_URL=https://xxx.supabase.co")
    print("  VITE_SUPABASE_SERVICE_KEY=eyJ... (service_role key da Supabase Dashboard)")
    print("")
    print("La service_role key si trova in: Supabase Dashboard > Settings > API > service_role")
    sys.exit(1)

INPUT_CSV = Path(__file__).parent.parent / 'backup' / 'gospel_way.csv'

EVANGELIST_MAP = {
    '1': 'Marco',
    '2': 'Matteo',
    '3': 'Luca',
    '4': 'Giovanni'
}

# Pattern per estrarre il riferimento
REFERENCE_PATTERN = re.compile(
    r'\(([A-Za-z]{1,3})\s*(\d+)[,\.]\s*([0-9a-z\s,\.\-;:]+)\)\s*\.?[a-z]?\s*(?:&nbsp;)*\s*(?:</span>)?\s*(?:</p>|</div>)',
    re.IGNORECASE
)

# ============================================
# FUNZIONI HELPER
# ============================================

def clean_html(text: str, strip_tags: bool = True) -> str:
    if not text:
        return ''
    text = html.unescape(text)
    if strip_tags:
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
    return text


def clean_gospel_text(text: str) -> str:
    if not text:
        return ''
    text = html.unescape(text)
    text = re.sub(r'<p[^>]*>', '', text)
    text = re.sub(r'</p>', '\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    return text.strip()


def clean_comment_html(text: str) -> str:
    if not text:
        return ''
    text = html.unescape(text)
    text = re.sub(r'\s*style="[^"]*"', '', text)
    text = re.sub(r'\s*class="[^"]*"', '', text)
    text = re.sub(r'IMG\d+', '', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = text.replace('\u00a0', ' ')
    text = re.sub(r'<(\w+)[^>]*>\s*</\1>', '', text)
    text = re.sub(r'<p>\s*</p>', '', text)
    text = re.sub(r'<div>\s*</div>', '', text)
    return text.strip()


def extract_reference(text: str, evangelist_id: str) -> tuple:
    if not text:
        evangelist = EVANGELIST_MAP.get(evangelist_id, 'Giovanni')
        prefix_map = {'Marco': 'Mc', 'Matteo': 'Mt', 'Luca': 'Lc', 'Giovanni': 'Gv'}
        prefix = prefix_map.get(evangelist, 'Gv')
        return f"{prefix} ?", text

    match = REFERENCE_PATTERN.search(text)
    if match:
        book = match.group(1)
        chapter = match.group(2)
        verses = match.group(3).strip().replace(' ', '')
        reference = f"{book} {chapter},{verses}"
        cleaned_text = text[:match.start()].strip()
        cleaned_text = re.sub(r'</p>\s*$', '', cleaned_text)
        return reference, cleaned_text

    # Pattern alternativo
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

    evangelist = EVANGELIST_MAP.get(evangelist_id, 'Giovanni')
    prefix_map = {'Marco': 'Mc', 'Matteo': 'Mt', 'Luca': 'Lc', 'Giovanni': 'Gv'}
    prefix = prefix_map.get(evangelist, 'Gv')
    return f"{prefix} ?", text


def is_null_or_empty(value: str) -> bool:
    return value is None or value.strip() == '' or value.strip().upper() == 'NULL'


# ============================================
# MIGRAZIONE
# ============================================

class SupabaseMigrator:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.gospels = {}  # reference|evangelist -> id
        self.gospel_daily_ids = {}  # date -> id
        self.stats = {
            'gospels_inserted': 0,
            'gospel_daily_inserted': 0,
            'comments_inserted': 0,
            'media_inserted': 0,
            'errors': []
        }

    def truncate_tables(self):
        """Pulisce le tabelle (in ordine corretto per FK)."""
        print("Pulizia tabelle...")
        # Nota: TRUNCATE richiede permessi elevati, usiamo DELETE
        try:
            self.supabase.table('media').delete().neq('id', 0).execute()
            print("  - media: pulita")
        except Exception as e:
            print(f"  - media: {e}")

        try:
            self.supabase.table('comment_sections').delete().neq('id', 0).execute()
            print("  - comment_sections: pulita")
        except Exception as e:
            print(f"  - comment_sections: {e}")

        try:
            self.supabase.table('gospel_daily').delete().neq('id', 0).execute()
            print("  - gospel_daily: pulita")
        except Exception as e:
            print(f"  - gospel_daily: {e}")

        try:
            self.supabase.table('gospels').delete().neq('id', 0).execute()
            print("  - gospels: pulita")
        except Exception as e:
            print(f"  - gospels: {e}")

    def insert_gospel(self, reference: str, evangelist: str, text: str) -> int:
        """Inserisce un vangelo e ritorna l'ID."""
        key = f"{reference}|{evangelist}"

        if key in self.gospels:
            return self.gospels[key]

        try:
            result = self.supabase.table('gospels').insert({
                'reference': reference,
                'evangelist': evangelist,
                'text': text
            }).execute()

            gospel_id = result.data[0]['id']
            self.gospels[key] = gospel_id
            self.stats['gospels_inserted'] += 1
            return gospel_id
        except Exception as e:
            # Potrebbe già esistere, prova a recuperarlo
            try:
                result = self.supabase.table('gospels').select('id').eq('reference', reference).eq('evangelist', evangelist).limit(1).execute()
                if result.data:
                    gospel_id = result.data[0]['id']
                    self.gospels[key] = gospel_id
                    return gospel_id
            except:
                pass
            self.stats['errors'].append(f"Gospel {reference}: {e}")
            return None

    def insert_gospel_daily(self, date: str, gospel_id: int, saints: str, liturgical_season: str, sacred_texts: str) -> int:
        """Inserisce un gospel_daily e ritorna l'ID."""
        if date in self.gospel_daily_ids:
            return self.gospel_daily_ids[date]

        try:
            data = {
                'date': date,
                'gospel_id': gospel_id,
            }
            if saints:
                data['saints'] = saints
            if liturgical_season:
                data['liturgical_season'] = liturgical_season
            if sacred_texts:
                data['sacred_texts'] = sacred_texts

            result = self.supabase.table('gospel_daily').insert(data).execute()

            daily_id = result.data[0]['id']
            self.gospel_daily_ids[date] = daily_id
            self.stats['gospel_daily_inserted'] += 1
            return daily_id
        except Exception as e:
            self.stats['errors'].append(f"Gospel Daily {date}: {e}")
            return None

    def insert_comment_section(self, gospel_daily_id: int, section_type: str, content: str, sort_order: int):
        """Inserisce una sezione commento."""
        try:
            self.supabase.table('comment_sections').insert({
                'gospel_daily_id': gospel_daily_id,
                'section_type': section_type,
                'title': None,
                'content': content,
                'content_format': 'html',
                'sort_order': sort_order
            }).execute()
            self.stats['comments_inserted'] += 1
        except Exception as e:
            self.stats['errors'].append(f"Comment {gospel_daily_id}/{section_type}: {str(e)[:100]}")

    def insert_media(self, gospel_daily_id: int, media_type: str, url: str):
        """Inserisce un media."""
        try:
            self.supabase.table('media').insert({
                'gospel_daily_id': gospel_daily_id,
                'type': media_type,
                'url': url
            }).execute()
            self.stats['media_inserted'] += 1
        except Exception as e:
            self.stats['errors'].append(f"Media {gospel_daily_id}: {e}")

    def migrate(self):
        """Esegue la migrazione completa."""
        print(f"\nLeggendo {INPUT_CSV}...")

        rows = []
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Trovate {len(rows)} righe da migrare\n")

        # Prima passa: inserisci gospels e gospel_daily
        print("Fase 1: Inserimento Gospels e Gospel Daily...")
        for i, row in enumerate(rows):
            if i % 100 == 0:
                print(f"  Processate {i}/{len(rows)} righe...")

            evangelist_id = row.get('evangelist', '')
            if evangelist_id not in EVANGELIST_MAP:
                evangelist_id = '4'  # Default Giovanni

            text = row.get('text', '')
            reference, cleaned_text = extract_reference(text, evangelist_id)
            cleaned_gospel_text = clean_gospel_text(cleaned_text)
            evangelist = EVANGELIST_MAP[evangelist_id]

            # Inserisci gospel
            gospel_id = self.insert_gospel(reference, evangelist, cleaned_gospel_text)
            if not gospel_id:
                continue

            # Inserisci gospel_daily
            date = row.get('date', '')
            saints = clean_html(row.get('saints', '')) if not is_null_or_empty(row.get('saints', '')) else None
            liturgy = clean_html(row.get('liturgy', '')) if not is_null_or_empty(row.get('liturgy', '')) else None
            sacred_texts = clean_html(row.get('sacred_texts', '')) if not is_null_or_empty(row.get('sacred_texts', '')) else None

            self.insert_gospel_daily(date, gospel_id, saints, liturgy, sacred_texts)

        print(f"  Gospels inseriti: {self.stats['gospels_inserted']}")
        print(f"  Gospel Daily inseriti: {self.stats['gospel_daily_inserted']}")

        # Seconda passa: inserisci comments e media
        print("\nFase 2: Inserimento Comments e Media...")
        for i, row in enumerate(rows):
            if i % 100 == 0:
                print(f"  Processate {i}/{len(rows)} righe...")

            date = row.get('date', '')
            daily_id = self.gospel_daily_ids.get(date)
            if not daily_id:
                continue

            # Comments
            comment = row.get('comment', '')
            if not is_null_or_empty(comment):
                self.insert_comment_section(daily_id, 'main', clean_comment_html(comment), 1)

            extra = row.get('extra', '')
            if not is_null_or_empty(extra):
                self.insert_comment_section(daily_id, 'reflection', clean_comment_html(extra), 2)

            # Media
            video = row.get('video', '')
            if not is_null_or_empty(video):
                self.insert_media(daily_id, 'video', video.strip())

        print(f"  Comments inseriti: {self.stats['comments_inserted']}")
        print(f"  Media inseriti: {self.stats['media_inserted']}")

        # Report errori
        if self.stats['errors']:
            print(f"\n[!] Errori riscontrati: {len(self.stats['errors'])}")
            for err in self.stats['errors'][:10]:
                print(f"  - {err}")
            if len(self.stats['errors']) > 10:
                print(f"  ... e altri {len(self.stats['errors']) - 10}")

    def print_summary(self):
        """Stampa il riepilogo finale."""
        print("\n" + "="*50)
        print("RIEPILOGO MIGRAZIONE")
        print("="*50)
        print(f"Gospels:        {self.stats['gospels_inserted']}")
        print(f"Gospel Daily:   {self.stats['gospel_daily_inserted']}")
        print(f"Comments:       {self.stats['comments_inserted']}")
        print(f"Media:          {self.stats['media_inserted']}")
        print(f"Errori:         {len(self.stats['errors'])}")
        print("="*50)


def main():
    print("="*50)
    print("MIGRAZIONE DIRETTA A SUPABASE")
    print("="*50)

    if not INPUT_CSV.exists():
        print(f"Errore: File non trovato: {INPUT_CSV}")
        return 1

    migrator = SupabaseMigrator()

    # Chiedi conferma per truncate (skip con --yes)
    if '--yes' not in sys.argv:
        print("\nATTENZIONE: Questo script cancellera' tutti i dati esistenti!")
        response = input("Vuoi procedere? (s/n): ").strip().lower()
        if response != 's':
            print("Migrazione annullata.")
            return 0
    else:
        print("\n[--yes] Confermato automaticamente")

    migrator.truncate_tables()
    migrator.migrate()
    migrator.print_summary()

    print("\n[OK] Migrazione completata!")
    return 0


if __name__ == '__main__':
    sys.exit(main())
