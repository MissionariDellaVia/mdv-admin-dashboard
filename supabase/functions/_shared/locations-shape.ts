// supabase/functions/_shared/locations-shape.ts
// Funzione pura: trasforma le righe DB nella forma consumata da webapp + mobile.
// Tipi "loose" perché condivisa tra Deno (runtime) e Vitest (test).

interface InfoRow { id: number; title: string | null; body: string; images: string[] | null; position: number; }
interface LocationRow {
  id: number; slug: string; name: string; address?: string | null;
  latitude?: number | null; longitude?: number | null; intro?: string | null;
  location_info?: InfoRow[];
}

export function imageUrlValue(images: string[] | null | undefined): string | string[] | null {
  if (!images || images.length === 0) return null;
  return images.length === 1 ? images[0] : images;
}

export function shapeLocations(rows: LocationRow[], _lang: string) {
  const groups = (rows || []).map((loc) => ({
    key: loc.slug,
    title: loc.name,
    address: loc.address ?? null,
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
    sections: (loc.location_info || [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((info) => ({
        title: info.title,
        body: info.body,
        image: { url: imageUrlValue(info.images) },
      })),
  }));
  return {
    header: { title: groups.length ? 'Attività e missioni' : '' },
    main: { caption: rows && rows[0] ? (rows[0].intro || '') : '' },
    groups,
  };
}
