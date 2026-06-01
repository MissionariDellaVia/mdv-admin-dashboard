import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('./supabase', () => ({
  supabase: { from: (...a: unknown[]) => mockFrom(...a) },
}));

import { locationsApi, locationInfoApi } from './api';

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
