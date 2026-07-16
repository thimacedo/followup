import { describe, it, expect } from 'vitest';
import { anonymizeText, anonymizeVisitorContext } from './anonymize';

describe('anonymizeText', () => {
  it('should remove email addresses', () => {
    const text = 'Meu email é teste@gmail.com por favor contate.';
    expect(anonymizeText(text)).toBe('Meu email é [E-MAIL REMOVIDO] por favor contate.');
  });

  it('should remove phone numbers', () => {
    const text = 'Pode ligar para (84) 99999-1234 ou +55 84 98888-0000.';
    expect(anonymizeText(text)).toBe('Pode ligar para [TELEFONE REMOVIDO] ou [TELEFONE REMOVIDO].');
  });

  it('should handle undefined or null', () => {
    expect(anonymizeText(null)).toBe('');
    expect(anonymizeText(undefined)).toBe('');
  });
});

describe('anonymizeVisitorContext', () => {
  it('should replace full name and first name with "o visitante"', () => {
    const text = 'João da Silva está doente. João pediu oração.';
    const result = anonymizeVisitorContext(text, 'João da Silva');
    expect(result).toBe('o visitante está doente. o visitante pediu oração.');
  });

  it('should not replace short first names (<= 2 chars) to prevent false positives', () => {
    const text = 'Ze está bem.';
    const result = anonymizeVisitorContext(text, 'Ze Carlos');
    expect(result).toBe('Ze está bem.');
  });

  it('should be case insensitive', () => {
    const text = 'maria pediu ajuda e Mariazinha chorou, mas a mARia vai melhorar.';
    const result = anonymizeVisitorContext(text, 'Maria');
    // Note that Mariazinha contains Maria, we use boundary \b so it shouldn't replace Mariazinha.
    expect(result).toBe('o visitante pediu ajuda e Mariazinha chorou, mas a o visitante vai melhorar.');
  });
});
