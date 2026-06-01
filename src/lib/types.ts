// DATABASE TYPES

export type Evangelist = 'Matteo' | 'Marco' | 'Luca' | 'Giovanni';
export type SectionType = 'intro' | 'main' | 'reflection' | 'application' | 'prayer' | 'conclusion';
export type ContentFormat = 'html' | 'markdown' | 'plain';
export type MediaType = 'image' | 'video' | 'audio';
export type LiturgicalSeason = 'Avvento' | 'Natale' | 'Quaresima' | 'Pasqua' | 'Ordinario';

// TABLE INTERFACES

export interface Gospel {
  id: number;
  reference: string;
  evangelist: Evangelist;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface GospelDaily {
  id: number;
  date: string;
  gospel_id: number;
  saints: string | null;
  liturgical_season: string | null;
  sacred_texts: string | null;
  created_at: string;
  updated_at: string;
  gospel?: Gospel;
  comment_sections?: CommentSection[];
  media?: Media[];
}

export interface CommentSection {
  id: number;
  gospel_daily_id: number;
  section_type: SectionType;
  title: string | null;
  content: string;
  content_format: ContentFormat;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: number;
  gospel_daily_id: number;
  type: MediaType;
  url: string;
  storage_path: string | null;
  title: string | null;
  alt_text: string | null;
  created_at: string;
}

export interface Seed {
  id: number;
  verse_text: string;
  reference: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// FORM TYPES - simplified for compatibility

export interface GospelDailyFormData {
  date: string;
  gospel_id: number;
  saints?: string | null;
  liturgical_season?: string | null;
  sacred_texts?: string | null;
}

export interface CommentSectionFormData {
  section_type: SectionType;
  title?: string;
  content: string;
  content_format?: ContentFormat;
  sort_order?: number;
}

export interface GospelFormData {
  reference: string;
  evangelist: Evangelist;
  text: string;
}

export interface SeedFormData {
  verse_text: string;
  reference?: string;
  category?: string;
  is_active?: boolean;
}

// LOCATIONS

export interface LocationInfo {
  id: number;
  location_id: number;
  title: string | null;
  body: string;
  images: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  slug: string;
  name: string;
  lang: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image: string | null;
  intro: string | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  location_info?: LocationInfo[];
}

export interface LocationFormData {
  slug: string;
  name: string;
  lang: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cover_image?: string | null;
  intro?: string | null;
  position?: number;
  is_published?: boolean;
}

export interface LocationInfoFormData {
  title?: string | null;
  body: string;
  images?: string[];
  position?: number;
}

// EVENTS (Attività)
export type EventType = 'text' | 'flyer';

export interface ActivityEvent {
  id: number;
  location_slug: string;
  lang: string | null;
  type: EventType;
  title: string | null;
  body: string | null;
  image: string | null;
  event_date: string | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityEventFormData {
  location_slug: string;
  lang?: string | null;
  type: EventType;
  title?: string | null;
  body?: string | null;
  image?: string | null;
  event_date?: string | null;
  position?: number;
  is_published?: boolean;
}
