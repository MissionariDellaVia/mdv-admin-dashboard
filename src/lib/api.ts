import { supabase } from './supabase';
import { compressImage } from './image';
import type {
  Gospel,
  GospelDaily,
  CommentSection,
  Media,
  Seed,
  GospelDailyFormData,
  CommentSectionFormData,
  GospelFormData,
  SeedFormData,
  Location,
  LocationFormData,
  LocationInfo,
  LocationInfoFormData
} from './types';

// GOSPELS API
export const gospelsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('gospels')
      .select('*')
      .order('reference', { ascending: true });
    if (error) throw error;
    return data as Gospel[];
  },

  async getCount() {
    const { count, error } = await supabase
      .from('gospels')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  async getPaginated(page: number, pageSize: number, search?: string) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const searchTerm = search?.trim();

    // Se c'è un termine di ricerca, cerca solo su reference
    if (searchTerm) {
      const { data, error, count } = await supabase
        .from('gospels')
        .select('*', { count: 'exact' })
        .ilike('reference', `%${searchTerm}%`)
        .order('reference', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { data: data as Gospel[], totalCount: count || 0 };
    }

    // Senza ricerca, restituisci tutti
    const { data, error, count } = await supabase
      .from('gospels')
      .select('*', { count: 'exact' })
      .order('reference', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data: data as Gospel[], totalCount: count || 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('gospels')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Gospel;
  },

  async create(gospel: GospelFormData) {
    const { data, error } = await supabase
      .from('gospels')
      .insert([gospel])
      .select()
      .single();
    if (error) throw error;
    return data as Gospel;
  },

  async update(id: number, gospel: Partial<GospelFormData>) {
    const { data, error } = await supabase
      .from('gospels')
      .update(gospel)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Gospel;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('gospels')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
// GOSPEL DAILY API
export const gospelDailyApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('gospel_daily')
      .select(`
        *,
        gospel:gospels(*),
        comment_sections(*)
      `)
      .order('date', { ascending: false })
      .range(0, 2999); // Supabase default limit is 1000
    if (error) throw error;
    return data as GospelDaily[];
  },

  async getCount() {
    const { count, error } = await supabase
      .from('gospel_daily')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  async getRecentWithComments(limit: number = 5) {
    const { data, error } = await supabase
      .from('gospel_daily')
      .select(`
        *,
        gospel:gospels(*),
        comment_sections(*)
      `)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as GospelDaily[];
  },

  async getTotalCommentsCount() {
    const { count, error } = await supabase
      .from('comment_sections')
      .select('*', { count: 'exact', head: true })
      .in('section_type', ['main', 'reflection']);
    if (error) throw error;
    return count || 0;
  },

  async getPaginated(page: number, pageSize: number, search?: string) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const searchTerm = search?.trim();

    const selectFields = `
      *,
      gospel:gospels(*),
      comment_sections(*)
    `;

    // Se c'è un termine di ricerca, cerca su saints
    if (searchTerm) {
      const { data, error, count } = await supabase
        .from('gospel_daily')
        .select(selectFields, { count: 'exact' })
        .ilike('saints', `%${searchTerm}%`)
        .order('date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data as GospelDaily[], totalCount: count || 0 };
    }

    // Senza ricerca, restituisci tutti
    const { data, error, count } = await supabase
      .from('gospel_daily')
      .select(selectFields, { count: 'exact' })
      .order('date', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data as GospelDaily[], totalCount: count || 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('gospel_daily')
      .select(`
        *,
        gospel:gospels(*),
        comment_sections(*),
        media(*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as GospelDaily;
  },

  async getByDate(date: string) {
    const { data, error } = await supabase
      .from('gospel_daily')
      .select(`
        *,
        gospel:gospels(*),
        comment_sections(*),
        media(*)
      `)
      .eq('date', date)
      .single();
    if (error) throw error;
    return data as GospelDaily;
  },

  async create(gospelDaily: GospelDailyFormData) {
    const { data, error } = await supabase
      .from('gospel_daily')
      .insert([gospelDaily])
      .select()
      .single();
    if (error) throw error;
    return data as GospelDaily;
  },

  async update(id: number, gospelDaily: Partial<GospelDailyFormData>) {
    const { data, error } = await supabase
      .from('gospel_daily')
      .update(gospelDaily)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as GospelDaily;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('gospel_daily')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
// COMMENT SECTIONS API
export const commentSectionsApi = {
  async getByGospelDailyId(gospelDailyId: number) {
    const { data, error } = await supabase
      .from('comment_sections')
      .select('*')
      .eq('gospel_daily_id', gospelDailyId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as CommentSection[];
  },

  async create(gospelDailyId: number, section: CommentSectionFormData) {
    const { data, error } = await supabase
      .from('comment_sections')
      .insert([{ ...section, gospel_daily_id: gospelDailyId }])
      .select()
      .single();
    if (error) throw error;
    return data as CommentSection;
  },

  async update(id: number, section: Partial<CommentSectionFormData>) {
    const { data, error } = await supabase
      .from('comment_sections')
      .update(section)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CommentSection;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('comment_sections')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
// MEDIA API
export const mediaApi = {
  async getByGospelDailyId(gospelDailyId: number) {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('gospel_daily_id', gospelDailyId);
    if (error) throw error;
    return data as Media[];
  },

  async create(gospelDailyId: number, media: { type: Media['type']; url: string; title?: string | null; storage_path?: string | null; alt_text?: string | null }) {
    const { data, error } = await supabase
      .from('media')
      .insert([{ ...media, gospel_daily_id: gospelDailyId }])
      .select()
      .single();
    if (error) throw error;
    return data as Media;
  },

  async update(id: number, updates: Partial<{ url: string; title: string; alt_text: string }>) {
    const { data, error } = await supabase
      .from('media')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Media;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async uploadFile(file: File, path: string) {
    const { error } = await supabase.storage
      .from('gospel-media')
      .upload(path, file);
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('gospel-media')
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  },

  async deleteFile(path: string) {
    const { error } = await supabase.storage
      .from('gospel-media')
      .remove([path]);
    if (error) throw error;
  }
};
// SEEDS API
export const seedsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Seed[];
  },

  async getCounts() {
    // Count totale
    const { count: total, error: totalError } = await supabase
      .from('seeds')
      .select('*', { count: 'exact', head: true });
    if (totalError) throw totalError;

    // Count attivi
    const { count: active, error: activeError } = await supabase
      .from('seeds')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (activeError) throw activeError;

    return { total: total || 0, active: active || 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Seed;
  },

  async create(seed: SeedFormData) {
    const { data, error } = await supabase
      .from('seeds')
      .insert([seed])
      .select()
      .single();
    if (error) throw error;
    return data as Seed;
  },

  async update(id: number, seed: Partial<SeedFormData>) {
    const { data, error } = await supabase
      .from('seeds')
      .update(seed)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Seed;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('seeds')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id: number, isActive: boolean) {
    const { data, error } = await supabase
      .from('seeds')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Seed;
  },

  async getRandom() {
    const { data, error } = await supabase
      .rpc('get_random_seed');
    if (error) throw error;
    return data?.[0] as Seed | null;
  }
};

// LOCATIONS API
export const locationsApi = {
  async getAll(lang?: string) {
    let q = supabase.from('locations').select('*, location_info(*)').order('position', { ascending: true });
    if (lang) q = q.eq('lang', lang);
    const { data, error } = await q;
    if (error) throw error;
    return data as Location[];
  },
  async getById(id: number) {
    const { data, error } = await supabase.from('locations').select('*, location_info(*)').eq('id', id).single();
    if (error) throw error;
    return data as Location;
  },
  async create(location: LocationFormData) {
    const { data, error } = await supabase.from('locations').insert([location]).select().single();
    if (error) throw error;
    return data as Location;
  },
  async update(id: number, location: Partial<LocationFormData>) {
    const { data, error } = await supabase.from('locations').update(location).eq('id', id).select().single();
    if (error) throw error;
    return data as Location;
  },
  async delete(id: number) {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  },
  async uploadImage(file: File, slug: string) {
    const optimized = await compressImage(file);
    const cleanName = optimized.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${slug}/${Date.now()}_${cleanName}`;
    const { error } = await supabase.storage.from('location-media').upload(path, optimized, { contentType: optimized.type });
    if (error) throw error;
    const { data } = supabase.storage.from('location-media').getPublicUrl(path);
    return data.publicUrl;
  },
};

// LOCATION INFO API
export const locationInfoApi = {
  async create(locationId: number, info: LocationInfoFormData) {
    const { data, error } = await supabase.from('location_info').insert([{ ...info, location_id: locationId }]).select().single();
    if (error) throw error;
    return data as LocationInfo;
  },
  async update(id: number, info: Partial<LocationInfoFormData>) {
    const { data, error } = await supabase.from('location_info').update(info).eq('id', id).select().single();
    if (error) throw error;
    return data as LocationInfo;
  },
  async delete(id: number) {
    const { error } = await supabase.from('location_info').delete().eq('id', id);
    if (error) throw error;
  },
};
