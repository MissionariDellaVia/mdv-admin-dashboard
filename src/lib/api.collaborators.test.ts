import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();
const mockGetUser = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...a: unknown[]) => mockFrom(...a),
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    auth: { getUser: () => mockGetUser() },
  },
}));

import { collaboratorsApi } from './api';

beforeEach(() => { vi.clearAllMocks(); });

describe('collaboratorsApi.invite', () => {
  it('invoca la edge function admin-invite e ritorna i dati', async () => {
    mockInvoke.mockResolvedValue({ data: { id: 'u1', email: 'x@y.it', tempPassword: 'abc' }, error: null });

    const result = await collaboratorsApi.invite('x@y.it', ['madonna-dc']);

    expect(mockInvoke).toHaveBeenCalledWith('admin-invite', { body: { email: 'x@y.it', slugs: ['madonna-dc'] } });
    expect(result).toEqual({ id: 'u1', email: 'x@y.it', tempPassword: 'abc' });
  });

  it('propaga l errore della function', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Solo gli admin') });
    await expect(collaboratorsApi.invite('x@y.it', ['a'])).rejects.toThrow('Solo gli admin');
  });
});

describe('collaboratorsApi.setAssignments', () => {
  it('cancella le assegnazioni esistenti e reinserisce le nuove', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: mockDelete, insert: mockInsert });

    await collaboratorsApi.setAssignments('u1', ['a', 'b']);

    expect(mockFrom).toHaveBeenCalledWith('location_editors');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: 'u1', location_slug: 'a' },
      { user_id: 'u1', location_slug: 'b' },
    ]);
  });
});
