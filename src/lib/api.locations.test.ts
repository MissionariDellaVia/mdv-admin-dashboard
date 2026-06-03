import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('./supabase', () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

import { locationsApi, locationInfoApi, eventsApi } from './api';

beforeEach(() => { vi.clearAllMocks(); });

describe('locationsApi.getAll', () => {
  it('filtra per lang e ordina per position', async () => {
    const rows = [{ id: 1, slug: 'madonna-dc', name: 'Santuario', lang: 'it', location_info: [] }];
    mockOrder.mockReturnValue({ eq: () => Promise.resolve({ data: rows, error: null }) });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await locationsApi.getAll('it');

    expect(mockFrom).toHaveBeenCalledWith('locations');
    expect(mockSelect).toHaveBeenCalledWith('*, location_info(*)');
    expect(result).toEqual(rows);
  });

  it('propaga l errore Supabase', async () => {
    mockOrder.mockReturnValue({ eq: () => Promise.resolve({ data: null, error: new Error('boom') }) });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(locationsApi.getAll('it')).rejects.toThrow('boom');
  });
});

describe('locationInfoApi.create', () => {
  it('inserisce con location_id e ritorna la riga', async () => {
    const row = { id: 9, location_id: 1, title: 'Orari', body: '<ul></ul>', images: [], position: 0 };
    mockSingle.mockResolvedValue({ data: row, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await locationInfoApi.create(1, { body: '<ul></ul>', title: 'Orari', images: [], position: 0 });

    expect(mockFrom).toHaveBeenCalledWith('location_info');
    expect(mockInsert).toHaveBeenCalledWith([{ body: '<ul></ul>', title: 'Orari', images: [], position: 0, location_id: 1 }]);
    expect(result).toEqual(row);
  });
});

describe('eventsApi.update', () => {
  it('aggiorna per id (es. position per il riordino) e ritorna la riga', async () => {
    const row = { id: 5, location_slug: 'madonna-dc', type: 'text', position: 2, is_published: true };
    mockSingle.mockResolvedValue({ data: row, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const result = await eventsApi.update(5, { position: 2 });

    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(mockUpdate).toHaveBeenCalledWith({ position: 2 });
    expect(mockEq).toHaveBeenCalledWith('id', 5);
    expect(result).toEqual(row);
  });
});

describe('eventsApi.getCountsBySlug', () => {
  it('conta gli eventi raggruppati per location_slug', async () => {
    const rows = [
      { location_slug: 'madonna-dc' },
      { location_slug: 'madonna-dc' },
      { location_slug: 'altro-luogo' },
    ];
    mockSelect.mockResolvedValue({ data: rows, error: null });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await eventsApi.getCountsBySlug();

    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(mockSelect).toHaveBeenCalledWith('location_slug');
    expect(result).toEqual({ 'madonna-dc': 2, 'altro-luogo': 1 });
  });
});
