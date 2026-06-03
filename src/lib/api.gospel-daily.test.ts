import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...a: unknown[]) => mockFrom(...a),
  },
}));

import { gospelDailyApi } from './api';

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// getCommentedCount
// ---------------------------------------------------------------------------
describe('gospelDailyApi.getCommentedCount', () => {
  it('usa un count esatto lato DB (head) filtrato su section_type=main', async () => {
    const mockEq = vi.fn().mockResolvedValue({ count: 2706, error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getCommentedCount();

    expect(mockFrom).toHaveBeenCalledWith('comment_sections');
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockEq).toHaveBeenCalledWith('section_type', 'main');
    expect(result).toBe(2706);
  });

  it('ritorna 0 quando il count è null', async () => {
    const mockEq = vi.fn().mockResolvedValue({ count: null, error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getCommentedCount();

    expect(result).toBe(0);
  });

  it('propaga l errore di supabase', async () => {
    const mockEq = vi.fn().mockResolvedValue({ count: null, error: new Error('db error') });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(gospelDailyApi.getCommentedCount()).rejects.toThrow('db error');
  });
});

// ---------------------------------------------------------------------------
// getMonthlyCounts
// ---------------------------------------------------------------------------
describe('gospelDailyApi.getMonthlyCounts', () => {
  it('restituisce un array di lunghezza pari al numero di mesi richiesti', async () => {
    const mockGte = vi.fn().mockResolvedValue({
      data: [{ date: '2025-01-10' }, { date: '2025-02-15' }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getMonthlyCounts(6);

    expect(result).toHaveLength(6);
  });

  it('i bucket sono in ordine cronologico (mesi crescenti)', async () => {
    const mockGte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getMonthlyCounts(4);

    expect(result).toHaveLength(4);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].month > result[i - 1].month).toBe(true);
    }
  });

  it('i bucket vuoti hanno count a 0', async () => {
    const mockGte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const buckets = await gospelDailyApi.getMonthlyCounts(3);

    expect(buckets.every(b => b.count === 0)).toBe(true);
  });

  it('distribuisce le date nel bucket del mese corrente', async () => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const dateInCurrentMonth = `${currentMonth}-15`;

    const mockGte = vi.fn().mockResolvedValue({
      data: [{ date: dateInCurrentMonth }, { date: dateInCurrentMonth }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getMonthlyCounts(1);

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe(currentMonth);
    expect(result[0].count).toBe(2);
  });

  it('ogni elemento ha le proprietà month (stringa) e count (numero)', async () => {
    const mockGte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getMonthlyCounts(6);

    for (const bucket of result) {
      expect(bucket).toHaveProperty('month');
      expect(bucket).toHaveProperty('count');
      expect(typeof bucket.month).toBe('string');
      expect(typeof bucket.count).toBe('number');
    }
  });

  it('propaga l errore di supabase', async () => {
    const mockGte = vi.fn().mockResolvedValue({ data: null, error: new Error('query failed') });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(gospelDailyApi.getMonthlyCounts(6)).rejects.toThrow('query failed');
  });
});

// ---------------------------------------------------------------------------
// getUpcomingCoverage
// ---------------------------------------------------------------------------
describe('gospelDailyApi.getUpcomingCoverage', () => {
  it('conta le date uniche coperte nei prossimi N giorni', async () => {
    const mockLte = vi.fn().mockResolvedValue({
      data: [
        { date: '2026-06-03' },
        { date: '2026-06-03' }, // duplicato: stesso giorno
        { date: '2026-06-04' },
      ],
      error: null,
    });
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getUpcomingCoverage(30);

    expect(mockFrom).toHaveBeenCalledWith('gospel_daily');
    expect(mockSelect).toHaveBeenCalledWith('date');
    expect(result.covered).toBe(2);
    expect(result.total).toBe(30);
  });

  it('ritorna covered=0 quando non ci sono giorni coperti', async () => {
    const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getUpcomingCoverage(30);

    expect(result).toEqual({ covered: 0, total: 30 });
  });

  it('rispetta il parametro days personalizzato', async () => {
    const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await gospelDailyApi.getUpcomingCoverage(7);

    expect(result.total).toBe(7);
  });

  it('propaga l errore di supabase', async () => {
    const mockLte = vi.fn().mockResolvedValue({ data: null, error: new Error('coverage error') });
    const mockGte = vi.fn().mockReturnValue({ lte: mockLte });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    mockFrom.mockReturnValue({ select: mockSelect });

    await expect(gospelDailyApi.getUpcomingCoverage(30)).rejects.toThrow('coverage error');
  });
});
