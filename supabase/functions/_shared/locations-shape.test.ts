import { describe, it, expect } from 'vitest';
import { shapeLocations } from './locations-shape';

describe('shapeLocations', () => {
  it('ordina info per position e applica regola immagini su info.images quando non ci sono flyer', () => {
    const rows = [{
      id: 1, slug: 'madonna-dc', name: 'Santuario', intro: 'Intro',
      location_info: [
        { id: 2, title: 'B', body: '<p>b</p>', images: ['u1', 'u2'], position: 1 },
        { id: 1, title: 'A', body: '<p>a</p>', images: ['only'], position: 0 },
        { id: 3, title: 'C', body: '<p>c</p>', images: [], position: 2 },
      ],
    }];
    const out = shapeLocations(rows, []);
    const g = out.groups[0];
    expect(g.key).toBe('madonna-dc');
    expect(g.sections[0].title).toBe('A');
    expect(g.sections[0].articles).toEqual(['<p>a</p>']);
    expect(g.sections[0].image.url).toBe('only');     // no flyers -> uses info.images
    expect(g.sections[1].image.url).toEqual(['u1', 'u2']);
    expect(g.sections[2].image.url).toBeNull();
    expect(out.main.caption).toBe('Intro');
  });

  it('mette i flyer (carosello) sulla prima sezione e aggiunge gli eventi testuali come sezioni', () => {
    const rows = [{ id: 1, slug: 'madonna-dc', name: 'Santuario',
      location_info: [{ id: 1, title: 'Orari', body: '<ul></ul>', images: [], position: 0 }] }];
    const events = [
      { id: 1, location_slug: 'madonna-dc', lang: null, type: 'flyer', title: null, body: null, image: 'f1', event_date: null, position: 0 },
      { id: 2, location_slug: 'madonna-dc', lang: null, type: 'flyer', title: null, body: null, image: 'f2', event_date: null, position: 1 },
      { id: 3, location_slug: 'madonna-dc', lang: 'it', type: 'text', title: 'Festa', body: '<p>desc</p>', image: null, event_date: '2026-08-15', position: 0 },
    ];
    const out = shapeLocations(rows, events);
    const g = out.groups[0];
    expect(g.sections[0].image.url).toEqual(['f1', 'f2']);   // flyer carousel on first section
    expect(g.sections[0].articles).toEqual(['<ul></ul>']);
    const textSec = g.sections[g.sections.length - 1];
    expect(textSec.title).toBe('Festa (2026-08-15)');
    expect(textSec.articles).toEqual(['<p>desc</p>']);
    expect(textSec.image.url).toBeNull();
  });

  it('ritorna struttura vuota coerente senza righe', () => {
    const out = shapeLocations([], []);
    expect(out.groups).toEqual([]);
    expect(out.main.caption).toBe('');
  });
});
