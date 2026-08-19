export type SlotStatus = "approved" | "pending" | "missing";

export type PunchMark = { hora: string; descricaoTipo: string; descricaoStatus?: string | null };

export type ReviewSlot = { time: string; status: SlotStatus };

export type DayReview = { date: string; slots?: ReviewSlot[]; restLabel?: string; note?: string };

const PRESENT = new Set(["PONTO_ORIGINAL", "PONTO_PENDENTE", "PONTO_AJUSTADO"]);
const SLOT_LABELS = ["entrada", "saída para o intervalo", "volta do intervalo", "saída"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function parseMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutes(total: number): string {
  const mins = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

function nearestIndex(value: number, candidates: number[]) {
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const d = Math.abs(value - candidates[i]);
    if (d < dist) {
      dist = d;
      best = i;
    }
  }
  return best;
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function recordedStatus(marks: PunchMark[]): Map<string, SlotStatus> {
  const map = new Map<string, SlotStatus>();
  for (const mark of marks.filter((m) => PRESENT.has(m.descricaoTipo))) {
    const status: SlotStatus =
      mark.descricaoTipo === "PONTO_PENDENTE" || mark.descricaoStatus === "Em aprovação"
        ? "pending"
        : "approved";
    const prev = map.get(mark.hora);
    if (!prev) map.set(mark.hora, status);
    else if (prev === "approved" && status === "pending") map.set(mark.hora, "pending");
  }
  return map;
}

function isIncreasing(values: number[]) {
  for (let i = 1; i < values.length; i++) {
    if (!(values[i] > values[i - 1])) return false;
  }
  return true;
}

function assignKnownToSlots(known: number[], expected: number[]): Array<number | null> {
  const slots: Array<number | null> = expected.map(() => null);
  const taken = new Set<number>();
  for (const t of known) {
    let best = -1;
    let dist = Infinity;
    for (let i = 0; i < expected.length; i++) {
      if (taken.has(i)) continue;
      const d = Math.abs(t - expected[i]);
      if (d < dist) {
        dist = d;
        best = i;
      }
    }
    if (best >= 0) {
      slots[best] = t;
      taken.add(best);
    }
  }
  return slots;
}

function distanceToRoutine(day: number[], expected: number[]) {
  return day.reduce((sum, time, i) => sum + Math.abs(time - (expected[i] ?? time)), 0);
}

function lunchPairs(
  start: number,
  end: number,
  breakMinutes: number,
  expected: number[],
  fixedB: number | null,
  fixedC: number | null
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  const add = (b: number, c: number) => {
    if (start < b && b < c && c < end) pairs.push([b, c]);
  };

  if (fixedB != null && fixedC != null) {
    add(fixedB, fixedC);
    return pairs;
  }
  if (fixedB != null) {
    add(fixedB, fixedB + breakMinutes);
    return pairs;
  }
  if (fixedC != null) {
    add(fixedC - breakMinutes, fixedC);
    return pairs;
  }

  const lo = start + 1;
  const hi = end - breakMinutes - 1;
  if (lo > hi) return pairs;
  const preferred = expected[1] ?? lo;
  const tries = new Set<number>([
    preferred,
    (expected[2] ?? preferred + breakMinutes) - breakMinutes,
    Math.max(lo, Math.min(hi, preferred)),
  ]);
  for (const b of tries) add(b, b + breakMinutes);
  return pairs;
}

function startCandidates(
  expected: number[],
  span: number,
  fixedA: number | null,
  fixedD: number | null
): number[] {
  if (fixedA != null) return [fixedA];
  if (fixedD != null) return [fixedD - span];
  const e0 = expected[0] ?? 0;
  const e3 = expected[3] ?? e0 + span;
  const aligned = Math.round((e0 + e3 - span) / 2);
  return [...new Set([e0, aligned, e3 - span])];
}

/**
 * 1) Workload and break are hard constraints.
 * 2) Among valid days, stay as close as possible to the usual punches.
 */
function bestValidDay(
  fixed: Array<number | null>,
  expected: number[],
  span: number,
  breakMinutes: number
): number[] | null {
  let best: number[] | null = null;
  let bestCost = Infinity;

  for (const start of startCandidates(expected, span, fixed[0] ?? null, fixed[3] ?? null)) {
    const end = start + span;
    if (fixed[0] != null && start !== fixed[0]) continue;
    if (fixed[3] != null && end !== fixed[3]) continue;

    for (const [lunchOut, lunchIn] of lunchPairs(
      start,
      end,
      breakMinutes,
      expected,
      fixed[1] ?? null,
      fixed[2] ?? null
    )) {
      if (fixed[1] != null && lunchOut !== fixed[1]) continue;
      if (fixed[2] != null && lunchIn !== fixed[2]) continue;
      if (lunchIn - lunchOut !== breakMinutes) continue;
      const day = [start, lunchOut, lunchIn, end];
      if (!isIncreasing(day)) continue;
      const cost = distanceToRoutine(day, expected);
      if (cost < bestCost) {
        bestCost = cost;
        best = day;
      }
    }
  }
  return best;
}

export function suggestSlotTimes(
  recorded: PunchMark[],
  punches: string[],
  workloadHours: number,
  breakMinutes: number
): number[] {
  const expected = punches.map(parseMinutes);
  const known = uniqueSorted(
    recorded.filter((m) => PRESENT.has(m.descricaoTipo)).map((m) => parseMinutes(m.hora))
  );
  const span = Math.round(workloadHours * 60) + breakMinutes;

  if (expected.length === 0) return known;
  if (known.length === 0) return expected;

  const fixed = assignKnownToSlots(known, expected);
  const valid = bestValidDay(fixed, expected, span, breakMinutes);
  if (valid) return valid;

  if (known.every((t) => expected.includes(t))) return expected;
  const fallback = assignKnownToSlots(known, expected);
  if (fallback.length >= 4) {
    if (fallback[1] != null && fallback[2] == null) fallback[2] = fallback[1] + breakMinutes;
    else if (fallback[2] != null && fallback[1] == null) fallback[1] = fallback[2] - breakMinutes;
  }
  const filled = fallback.map((value, i) => value ?? expected[i]);
  if (isIncreasing(filled)) return filled;
  return uniqueSorted([...expected, ...known]);
}

export function reviewSlots(
  recorded: PunchMark[],
  punches: string[],
  workloadHours: number,
  breakMinutes: number
): ReviewSlot[] {
  const byTime = recordedStatus(recorded);
  const targets = suggestSlotTimes(recorded, punches, workloadHours, breakMinutes);
  const knownMins = [...byTime.keys()].map(parseMinutes);
  const times = uniqueSorted([...targets, ...knownMins]);
  return times.map((mins) => {
    const time = formatMinutes(mins);
    return { time, status: byTime.get(time) ?? "missing" };
  });
}

/** When a single atypical punch is mapped by proximity, explain the assumed slot. */
export function atypicalPunchNote(
  recorded: PunchMark[],
  punches: string[]
): string | undefined {
  const known = uniqueSorted(
    recorded.filter((m) => PRESENT.has(m.descricaoTipo)).map((m) => parseMinutes(m.hora))
  );
  const expected = punches.map(parseMinutes);
  if (known.length !== 1 || expected.length < 2) return;
  if (expected.includes(known[0])) return;
  const slot = nearestIndex(known[0], expected);
  const punched = formatMinutes(known[0]);
  const nearest = formatMinutes(expected[slot]);
  const label = SLOT_LABELS[slot] ?? `horário ${slot + 1}`;
  return `${punched} considerado como ${label} (mais próximo de ${nearest} do que dos outros horários da escala).`;
}
