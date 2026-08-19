import type { DayReview, ReviewSlot, SlotStatus } from "./suggestions.ts";

export type DayPreview = {
  date: string;
  restLabel?: string;
  before: ReviewSlot[];
  after: ReviewSlot[];
  inserts: string[];
};

const STATUS_PT: Record<SlotStatus, string> = {
  approved: "aprovado",
  pending: "em aprovação",
  missing: "a marcar",
};

function slotsOf(day: DayReview): ReviewSlot[] {
  return day.slots ?? [];
}

function formatSlots(slots: ReviewSlot[]): string {
  if (!slots.length) return "—";
  return slots.map((slot) => `${slot.time} (${STATUS_PT[slot.status]})`).join("  ");
}

/** Mark listed times as pending inserts; keep existing approved/pending punches. */
export function applyPendingInserts(slots: ReviewSlot[], times: string[]): ReviewSlot[] {
  const extra = new Set(times);
  const next = slots.map((slot) => {
    if (extra.has(slot.time) && slot.status === "missing") {
      extra.delete(slot.time);
      return { ...slot, status: "pending" as const };
    }
    extra.delete(slot.time);
    return slot;
  });
  for (const time of extra) {
    next.push({ time, status: "pending" });
  }
  return next.sort((a, b) => a.time.localeCompare(b.time));
}

export function previewInserts(day: DayReview, times: string[]): DayPreview {
  const before = slotsOf(day);
  const inserts = times.filter((time) => {
    const slot = before.find((item) => item.time === time);
    return !slot || slot.status === "missing";
  });
  return {
    date: day.date,
    restLabel: day.restLabel,
    before,
    after: applyPendingInserts(before, inserts),
    inserts,
  };
}

export function formatAdjustmentPreview(days: DayPreview[]): string {
  const body = days
    .map((day) => {
      const label = day.restLabel ? `${day.date}  ${day.restLabel}` : day.date;
      const inserts = day.inserts.length ? day.inserts.join(", ") : "nenhum lançamento";
      return [
        label,
        `Agora:   ${formatSlots(day.before)}`,
        `Depois:  ${formatSlots(day.after)}`,
        `Incluir: ${inserts}`,
      ].join("\n");
    })
    .join("\n\n");
  return `${body}\n\nFaço o ajuste conforme esse resumo?`;
}
