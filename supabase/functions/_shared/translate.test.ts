import { describe, it, expect, vi } from 'vitest';
import { translateTexts, headerTitleFor, type TranslateDeps } from './translate.ts';

function makeDeps(over: Partial<TranslateDeps> = {}): TranslateDeps {
  return {
    getCached: vi.fn(async () => ({})),
    setCached: vi.fn(async () => {}),
    deepl: vi.fn(async (texts: string[]) => texts.map((t) => `[T]${t}`)),
    ...over,
  };
}

describe('translateTexts', () => {
  it('no-op per lang=it (nessuna chiamata a DeepL)', async () => {
    const deps = makeDeps();
    const out = await translateTexts([{ text: 'Ciao', isHtml: false }], 'it', deps);
    expect(out).toEqual(['Ciao']);
    expect(deps.deepl).not.toHaveBeenCalled();
  });

  it('passa invariate le stringhe vuote o solo-spazi', async () => {
    const deps = makeDeps();
    const out = await translateTexts(
      [{ text: '', isHtml: false }, { text: '   ', isHtml: true }],
      'fr',
      deps,
    );
    expect(out).toEqual(['', '   ']);
    expect(deps.deepl).not.toHaveBeenCalled();
  });

  it('usa la cache quando disponibile, senza chiamare DeepL', async () => {
    const deps = makeDeps({
      getCached: vi.fn(async (hashes: string[]) =>
        Object.fromEntries(hashes.map((h) => [h, 'CACHED'])),
      ),
    });
    const out = await translateTexts([{ text: 'Ciao', isHtml: false }], 'fr', deps);
    expect(out).toEqual(['CACHED']);
    expect(deps.deepl).not.toHaveBeenCalled();
  });

  it('traduce i miss splittando plain/HTML e persiste in cache', async () => {
    const deps = makeDeps();
    const out = await translateTexts(
      [
        { text: 'Ciao', isHtml: false },
        { text: '<p>Mondo</p>', isHtml: true },
      ],
      'fr',
      deps,
    );
    expect(out).toEqual(['[T]Ciao', '[T]<p>Mondo</p>']);
    expect(deps.deepl).toHaveBeenCalledTimes(2);
    expect(deps.deepl).toHaveBeenCalledWith(['Ciao'], 'fr', false);
    expect(deps.deepl).toHaveBeenCalledWith(['<p>Mondo</p>'], 'fr', true);
    expect(deps.setCached).toHaveBeenCalledTimes(1);
  });

  it('deduplica testi identici in una sola traduzione', async () => {
    const deepl = vi.fn(async (texts: string[]) => texts.map((t) => `[T]${t}`));
    const deps = makeDeps({ deepl });
    const out = await translateTexts(
      [
        { text: 'Ciao', isHtml: false },
        { text: 'Ciao', isHtml: false },
      ],
      'fr',
      deps,
    );
    expect(out).toEqual(['[T]Ciao', '[T]Ciao']);
    expect(deepl).toHaveBeenCalledWith(['Ciao'], 'fr', false);
  });
});

describe('headerTitleFor', () => {
  it('ritorna la label localizzata, IT come fallback', () => {
    expect(headerTitleFor('en')).toBe('Activities and missions');
    expect(headerTitleFor('zz')).toBe('Attività e missioni');
  });
});
