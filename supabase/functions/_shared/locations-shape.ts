// supabase/functions/_shared/locations-shape.ts
// Pure: trasforma righe DB (locations + events) nella forma consumata da webapp + mobile.

interface InfoRow { id: number; title: string | null; body: string; images: string[] | null; position: number; }
interface LocationRow {
  id: number; slug: string; name: string; address?: string | null;
  latitude?: number | null; longitude?: number | null; intro?: string | null;
  location_info?: InfoRow[];
}
interface EventRow {
  id: number; location_slug: string; lang: string | null; type: string;
  title: string | null; body: string | null; image: string | null;
  event_date: string | null; position: number;
}

export function imageUrlValue(images: string[] | null | undefined): string | string[] | null {
  if (!images || images.length === 0) return null;
  return images.length === 1 ? images[0] : images;
}

export function shapeLocations(rows: LocationRow[], events: EventRow[] = []) {
  const groups = (rows || []).map((loc) => {
    const slug = loc.slug;
    const locEvents = (events || []).filter((e) => e.location_slug === slug);
    const flyers = locEvents
      .filter((e) => e.type === 'flyer' && e.image)
      .slice().sort((a, b) => a.position - b.position)
      .map((e) => e.image as string);
    const infos = (loc.location_info || []).slice().sort((a, b) => a.position - b.position);

    // Schedule sections (location_info); flyer carousel goes on the first section (only when present).
    const sections = infos.map((info, idx) => ({
      title: info.title,
      articles: info.body ? [info.body] : [],
      image: {
        url: (idx === 0 && flyers.length > 0) ? imageUrlValue(flyers) : imageUrlValue(info.images),
        align: 'right' as const,
      },
    }));

    // If there is no info block but there are flyers, still expose them.
    if (infos.length === 0 && flyers.length) {
      sections.push({ title: null, articles: [], image: { url: imageUrlValue(flyers), align: 'right' as const } });
    }

    // Text events become additional sections (title + optional date, body as article).
    locEvents
      .filter((e) => e.type === 'text')
      .slice().sort((a, b) => a.position - b.position)
      .forEach((e) => {
        const d = e.event_date ? ` (${e.event_date})` : '';
        sections.push({
          title: (e.title || '') + d,
          articles: e.body ? [e.body] : [],
          image: { url: null, align: 'right' as const },
        });
      });

    return {
      key: slug,
      title: loc.name,
      address: loc.address ?? null,
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
      sections,
    };
  });
  return {
    header: { title: groups.length ? 'Attività e missioni' : '' },
    main: { caption: rows && rows[0] ? (rows[0].intro || '') : '' },
    groups,
  };
}
