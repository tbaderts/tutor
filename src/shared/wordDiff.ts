/** Lower-cased words without punctuation; elided articles split off ("l'acqua" -> "l'", "acqua"). */
export function normWords(s: string): string[] {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/'/g, "' ")
    .split(/\s+/)
    .filter((w) => w && w !== "'");
}

export type DiffOp =
  | { op: 'equal'; target: string[]; heard: string[] }
  | { op: 'replace'; target: string[]; heard: string[] }
  | { op: 'delete'; target: string[]; heard: [] }
  | { op: 'insert'; target: []; heard: string[] };

export interface WordDiff {
  ops: DiffOp[];
  /** 0-100: share of words in both sentences that line up (like difflib's ratio). */
  score: number;
}

/** Word-level diff of what should have been said against what was heard (longest common subsequence). */
export function diffWords(target: string, heard: string): WordDiff {
  const t = normWords(target);
  const h = normWords(heard);
  const n = t.length;
  const m = h.length;

  // lcs[i][j] = length of the LCS of t[i..] and h[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = t[i] === h[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let pendingT: string[] = [];
  let pendingH: string[] = [];
  const flush = () => {
    if (pendingT.length && pendingH.length) ops.push({ op: 'replace', target: pendingT, heard: pendingH });
    else if (pendingT.length) ops.push({ op: 'delete', target: pendingT, heard: [] });
    else if (pendingH.length) ops.push({ op: 'insert', target: [], heard: pendingH });
    pendingT = [];
    pendingH = [];
  };

  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && t[i] === h[j]) {
      flush();
      const last = ops[ops.length - 1];
      if (last?.op === 'equal') {
        last.target.push(t[i]);
        last.heard.push(h[j]);
      } else {
        ops.push({ op: 'equal', target: [t[i]], heard: [h[j]] });
      }
      i++;
      j++;
    } else if (j >= m || (i < n && lcs[i + 1][j] >= lcs[i][j + 1])) {
      pendingT.push(t[i++]);
    } else {
      pendingH.push(h[j++]);
    }
  }
  flush();

  const total = n + m;
  const score = total === 0 ? 100 : Math.round((200 * lcs[0][0]) / total);
  return { ops, score };
}
