import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrder = vi.fn();
const mockOr = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('./supabase', () => ({ supabase: { from: (...a: unknown[]) => mockFrom(...a) } }));

import { eventsApi } from './api';

beforeEach(() => { vi.clearAllMocks(); });

describe('eventsApi.getForLocation', () => {
  it('filtra per slug e (lang null o lang corrente), ordina per position', async () => {
    const rows = [{ id: 1, location_slug: 'madonna-dc', lang: null, type: 'flyer' }];
    mockOrder.mockResolvedValue({ data: rows, error: null });
    mockOr.mockReturnValue({ order: mockOrder });
    mockEq.mockReturnValue({ or: mockOr });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await eventsApi.getForLocation('madonna-dc', 'it');

    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(mockEq).toHaveBeenCalledWith('location_slug', 'madonna-dc');
    expect(mockOr).toHaveBeenCalledWith('lang.is.null,lang.eq.it');
    expect(result).toEqual(rows);
  });
});

describe('eventsApi.create', () => {
  it('inserisce e ritorna la riga', async () => {
    const row = { id: 5, location_slug: 'madonna-dc', lang: null, type: 'flyer', image: 'u' };
    mockSingle.mockResolvedValue({ data: row, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await eventsApi.create({ location_slug: 'madonna-dc', type: 'flyer', image: 'u', lang: null });

    expect(mockFrom).toHaveBeenCalledWith('events');
    expect(result).toEqual(row);
  });
});
