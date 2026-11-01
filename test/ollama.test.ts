import { describe, expect, it } from 'vitest';
import { stripThink, ThinkFilter } from '../src/main/services/OllamaService';
import { assistantPrompt, translatePrompt } from '@shared/prompts';

describe('ThinkFilter', () => {
  it('drops a think block spread over several chunks', () => {
    // Ollama streams the tags as whole tokens, so tags are never split inside a chunk.
    const f = new ThinkFilter();
    expect(['Hello ', '<think>', 'secret ', 'stuff', '</think>', ' world'].map((c) => f.push(c)).join('')).toBe('Hello  world');
  });

  it('handles open and close tags in one chunk', () => {
    expect(new ThinkFilter().push('a<think>b</think>c<think>d</think>e')).toBe('ace');
  });
});

describe('stripThink', () => {
  it('removes think blocks and trims', () => {
    expect(stripThink('<think>\nhmm\n</think>\n\nVorrei un caffè.')).toBe('Vorrei un caffè.');
  });
});

describe('prompts', () => {
  it('names both languages', () => {
    expect(translatePrompt('German', 'Spanish')).toContain("Translate the user's German into natural, everyday spoken Spanish.");
  });

  it('adds the practice context only when there is a sentence', () => {
    expect(assistantPrompt('English', 'Italian')).not.toContain('Current practice sentence');
    const p = assistantPrompt('English', 'Italian', { target: 'Vorrei un caffè', heard: 'Voglio un caffè', verdict: 'almost' });
    expect(p).toContain('Current practice sentence (Italian): «Vorrei un caffè»');
    expect(p).toContain('«Voglio un caffè»');
    expect(p).toContain('Last verdict: almost');
  });
});
