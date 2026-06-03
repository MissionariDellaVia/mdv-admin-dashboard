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

describe('collaboratorsApi.list', () => {
  it('raggruppa i luoghi per collaboratore', async () => {
    const profs = [
      { id: 'u1', email: 'a@x.it' },
      { id: 'u2', email: 'b@x.it' },
    ];
    const links = [
      { user_id: 'u1', location_slug: 'madonna-dc' },
      { user_id: 'u1', location_slug: 'altro' },
    ];
    const mockEqProfiles = vi.fn().mockResolvedValue({ data: profs, error: null });
    const mockSelectProfiles = vi.fn().mockReturnValue({ eq: mockEqProfiles });
    const mockSelectLinks = vi.fn().mockResolvedValue({ data: links, error: null });
    mockFrom
      .mockReturnValueOnce({ select: mockSelectProfiles })
      .mockReturnValueOnce({ select: mockSelectLinks });

    const result = await collaboratorsApi.list();

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'profiles');
    expect(mockSelectProfiles).toHaveBeenCalledWith('id, email');
    expect(mockEqProfiles).toHaveBeenCalledWith('role', 'collaborator');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'location_editors');
    expect(result).toEqual([
      { id: 'u1', email: 'a@x.it', slugs: ['madonna-dc', 'altro'] },
      { id: 'u2', email: 'b@x.it', slugs: [] },
    ]);
  });

  it('propaga l errore della query profiles', async () => {
    const mockEqProfiles = vi.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    const mockSelectProfiles = vi.fn().mockReturnValue({ eq: mockEqProfiles });
    mockFrom.mockReturnValueOnce({ select: mockSelectProfiles });

    await expect(collaboratorsApi.list()).rejects.toThrow('boom');
  });
});

describe('collaboratorsApi.setAssignments con lista vuota', () => {
  it('cancella e NON chiama insert quando slugs è vuoto', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockInsert = vi.fn();
    mockFrom.mockReturnValue({ delete: mockDelete, insert: mockInsert });

    await collaboratorsApi.setAssignments('u1', []);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
