import { describe, expect, it } from 'vitest';
import { diffWords, normWords } from '@shared/wordDiff';

describe('normWords', () => {
  it('lower-cases, drops punctuation and keeps accents', () => {
    expect(normWords('Vorrei un caffè, per favore.')).toEqual(['vorrei', 'un', 'caffè', 'per', 'favore']);
  });

  it("splits elided articles and normalises typographic apostrophes", () => {
    expect(normWords('L’acqua è fredda')).toEqual(["l'", 'acqua', 'è', 'fredda']);
    expect(normWords("l'acqua")).toEqual(["l'", 'acqua']);
  });

  it('treats composed and decomposed accents alike', () => {
    expect(normWords('caffè')).toEqual(normWords('caffè'));
  });
});

describe('diffWords', () => {
  it('scores an exact match (ignoring case and punctuation) as 100', () => {
    const d = diffWords('Vorrei un caffè, per favore.', 'vorrei un caffè per favore');
    expect(d.score).toBe(100);
    expect(d.ops).toEqual([{ op: 'equal', target: ['vorrei', 'un', 'caffè', 'per', 'favore'], heard: ['vorrei', 'un', 'caffè', 'per', 'favore'] }]);
  });

  it('reports replaced, missing and extra words', () => {
    const d = diffWords('vorrei un caffè per favore', 'voglio un caffè favore grazie');
    expect(d.ops.map((o) => o.op)).toEqual(['replace', 'equal', 'delete', 'equal', 'insert']);
    expect(d.ops[0]).toEqual({ op: 'replace', target: ['vorrei'], heard: ['voglio'] });
    expect(d.ops[2]).toEqual({ op: 'delete', target: ['per'], heard: [] });
    expect(d.ops[4]).toEqual({ op: 'insert', target: [], heard: ['grazie'] });
    // 3 matching words of 5 + 5: 2*3/10
    expect(d.score).toBe(60);
  });

  it('handles nothing heard', () => {
    expect(diffWords('ciao', '').score).toBe(0);
    expect(diffWords('', '').score).toBe(100);
  });
});
