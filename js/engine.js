export const STORAGE_KEY = 'sacre-coeur.archive.v1';
export const normalizeName = name => name.trim().replace(/\s+/g, ' ').normalize('NFKC').toLocaleLowerCase('es');
export const cleanName = name => name.trim().replace(/\s+/g, ' ').normalize('NFKC').slice(0, 24);
export const expectedMarker = stage => stage === 7 ? 1 : Math.min(stage + 1, 6);

export function createRun(name, practice = false, now = Date.now()) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`,
    name: cleanName(name), practice, startedAt: now, finishedAt: null,
    stage: 0, solved: [], errors: 0, hints: 0, hintLevels: {}, puzzles: {}, evidence: [],
    unlocked: [], finalObject: null
  };
}

export function elapsedSeconds(run, now = Date.now()) {
  return Math.max(0, Math.floor(((run.finishedAt ?? now) - run.startedAt) / 1000));
}

export function scoreRun(run, now = Date.now()) {
  const base = run.solved.reduce((sum, stage) => sum + (stage === 7 ? 400 : 100), 0);
  const speed = run.finishedAt ? Math.max(0, 300 - Math.floor(elapsedSeconds(run, now) / 10)) : 0;
  return Math.max(0, base + speed - run.errors * 20 - run.hints * 50);
}

export function unlockMarker(run, marker) {
  if (run.finishedAt || Number(marker) !== expectedMarker(run.stage)) return false;
  if (!run.unlocked.includes(run.stage)) run.unlocked.push(run.stage);
  return true;
}

export function finishStage(run, evidence, now = Date.now()) {
  const stage = run.stage;
  if (run.finishedAt || stage > 7 || !run.unlocked.includes(stage)) return false;
  if (stage !== 6 && run.solved.includes(stage)) return false;
  if (stage !== 6) run.solved.push(stage);
  run.evidence.push({ stage, text: evidence });
  if (stage === 7) run.finishedAt = now;
  else run.stage++;
  return true;
}

export function useHint(run, maxHints = 2) {
  if (run.finishedAt || !run.unlocked.includes(run.stage)) return false;
  const level = run.hintLevels[run.stage] ?? 0;
  if (level >= maxHints) return false;
  run.hintLevels[run.stage] = level + 1;
  run.hints++;
  return true;
}

export const emptyStore = () => ({ version: 1, runs: {}, records: [] });
export const runKey = (name, practice) => `${practice ? 'practice' : 'ar'}:${normalizeName(name)}`;

function validRun(run) {
  return run && typeof run.name === 'string' && typeof run.id === 'string' &&
    typeof run.practice === 'boolean' && Number.isFinite(run.startedAt) &&
    Number.isInteger(run.stage) && run.stage >= 0 && run.stage <= 7 &&
    Number.isInteger(run.errors) && run.errors >= 0 && Number.isInteger(run.hints) && run.hints >= 0 &&
    Array.isArray(run.solved) && run.solved.every(s => Number.isInteger(s) && s >= 0 && s <= 7 && s !== 6) &&
    new Set(run.solved).size === run.solved.length && Array.isArray(run.evidence) &&
    run.evidence.every(e => Number.isInteger(e.stage) && typeof e.text === 'string') &&
    Array.isArray(run.unlocked) && run.puzzles && typeof run.puzzles === 'object' &&
    run.hintLevels && typeof run.hintLevels === 'object' &&
    (run.finishedAt === null || Number.isFinite(run.finishedAt));
}

export function readStore(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { data: emptyStore(), warning: '' };
    const data = JSON.parse(raw);
    if (data.version !== 1 || !data.runs || !Array.isArray(data.records)) throw Error('invalid');
    const clean = emptyStore();
    for (const [key, run] of Object.entries(data.runs)) if (validRun(run)) {
      // Las partidas que ya resolvieron la antigua balanza conservan su contraseña.
      if (!run.finalObject && typeof run.lightest === 'string') {
        run.finalObject = run.lightest;
        run.evidence = run.evidence.map(clue => clue.stage === 4
          ? { ...clue, text: `${clue.text} Objeto para el guardián: ${run.finalObject}.` }
          : clue);
      }
      clean.runs[key] = run;
    }
    clean.records = data.records.filter(r => typeof r.id === 'string' && typeof r.name === 'string' &&
      Number.isFinite(r.score) && Number.isFinite(r.seconds) && Number.isFinite(r.finishedAt) &&
      Number.isInteger(r.errors) && Number.isInteger(r.hints));
    return { data: clean, warning: '' };
  } catch {
    return { data: emptyStore(), warning: 'No pudimos leer las partidas guardadas. Podés jugar; verificá que el navegador permita almacenamiento local.' };
  }
}

export function writeStore(storage, data) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}

export function recordResult(store, run) {
  if (!run.finishedAt || run.practice || run.solved.length !== 7 || store.records.some(r => r.id === run.id)) return false;
  store.records.push({ id: run.id, name: run.name, score: scoreRun(run), seconds: elapsedSeconds(run),
    errors: run.errors, hints: run.hints, finishedAt: run.finishedAt });
  return true;
}

export function leaderboard(records) {
  const players = new Map();
  for (const record of records) {
    const key = normalizeName(record.name);
    const previous = players.get(key);
    const better = !previous || record.score > previous.score ||
      (record.score === previous.score && record.seconds < previous.seconds);
    players.set(key, { ...(better ? record : previous), attempts: (previous?.attempts ?? 0) + 1 });
  }
  return [...players.values()].sort((a, b) => b.score - a.score || a.seconds - b.seconds || a.finishedAt - b.finishedAt);
}

export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function newSequence(length = 5) {
  return Array.from({ length }, () => Math.floor(Math.random() * 4));
}

export function guardianCorrect(hour, symbol, object, expectedObject) {
  return typeof expectedObject === 'string' && Number(hour) === 7 && symbol === 'diamond' && object === expectedObject;
}
