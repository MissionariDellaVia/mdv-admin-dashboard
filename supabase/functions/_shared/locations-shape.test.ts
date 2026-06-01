import { describe, it, expect } from 'vitest';
import { shapeLocations } from './locations-shape';

describe('shapeLocations', () => {
  it('ordina le info per position e applica la regola immagini (1=stringa, >1=array, 0=null)', () => {
    const rows = [{
      id: 1, slug: 'madonna-dc', name: 'Santuario', address: 'Cassano', latitude: 39.79, longitude: 16.32, intro: 'Intro',
      location_info: [
        { id: 2, title: 'B', body: '<p>b</p>', images: ['u1', 'u2'], position: 1 },
        { id: 1, title: 'A', body: '<p>a</p>', images: ['only'], position: 0 },
        { id: 3, title: 'C', body: '', images: [], position: 2 },
      ],
    }];
    const out = shapeLocations(rows, 'it');
    expect(out.groups).toHaveLength(1);
    const g = out.groups[0];
    expect(g.key).toBe('madonna-dc');
    expect(g.title).toBe('Santuario');
    expect(g.sections[0].title).toBe('A');
    expect(g.sections[0].image.url).toBe('only');
    expect(g.sections[1].image.url).toEqual(['u1', 'u2']);
    expect(g.sections[2].image.url).toBeNull();
    expect(g.sections[0].articles).toEqual(['<p>a</p>']);
    expect(g.sections[0].image.align).toBe('right');
    expect(g.sections[2].articles).toEqual([]);
    expect(out.main.caption).toBe('Intro');
  });

  it('ritorna struttura vuota coerente senza righe', () => {
    const out = shapeLocations([], 'it');
    expect(out.groups).toEqual([]);
    expect(out.main.caption).toBe('');
  });
});
