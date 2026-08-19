import type { AgentConfig, DayRow } from "./flash-client.ts";
import { reviewSlots, atypicalPunchNote, type DayReview, type PunchMark } from "./suggestions.ts";

export type { DayReview, PunchMark, ReviewSlot, SlotStatus } from "./suggestions.ts";

const PRESENT = new Set(["PONTO_ORIGINAL", "PONTO_PENDENTE", "PONTO_AJUSTADO"]);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(day: Pick<DayRow, "ano" | "mes" | "dia">) {
  return `${day.ano}-${pad(day.mes)}-${pad(day.dia)}`;
}

function displayDate(day: Pick<DayRow, "mes" | "dia">) {
  return `${pad(day.dia)}/${pad(day.mes)}`;
}

function jsWeekday(day: Pick<DayRow, "ano" | "mes" | "dia">) {
  return new Date(Date.UTC(day.ano, day.mes - 1, day.dia)).getUTCDay();
}

function isoWeekday(jsDay: number) {
  return jsDay === 0 ? 7 : jsDay;
}

function recordedPunches(day: DayRow): PunchMark[] {
  return (day.horariosMarcacoes ?? []).filter((m) => PRESENT.has(m.descricaoTipo));
}

function isFlashRest(day: DayRow) {
  const t = day.tipoJornada ?? "";
  return t === "Folga" || t === "Dia útil não trabalhado";
}

export function nonWorkingLabel(day: DayRow, config: AgentConfig): string | undefined {
  const js = jsWeekday(day);
  if (js === 0) return "Domingo";
  if (js === 6) return "Sábado";

  const blob = `${day.tipoJornada ?? ""} ${day.consideradoDia ?? ""}`.toLowerCase();
  if (blob.includes("feriado")) return "Feriado";
  if (day.tipoJornada === "Dia útil não trabalhado") return "Feriado";
  if (day.tipoJornada === "Folga") return "Folga";

  const workIsoDays = new Set(config.schedule.weekdays);
  if (!workIsoDays.has(isoWeekday(js))) return "Folga";
  return undefined;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function buildMonthReview(
  days: DayRow[],
  config: AgentConfig,
  year: number,
  month: number,
  today = new Date()
): DayReview[] {
  const punches = config.schedule.punches;
  const workloadHours = config.schedule.workloadHours ?? 0;
  const breakMinutes = config.schedule.breakMinutes ?? 0;
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const byDia = new Map(days.map((day) => [day.dia, day]));
  const reviews: DayReview[] = [];

  for (let dia = 1; dia <= daysInMonth(year, month); dia++) {
    const day: DayRow = byDia.get(dia) ?? { dia, mes: month, ano: year, titulo: "" };
    const key = dateKey(day);
    if (key > todayKey) continue;

    const recorded = recordedPunches(day);
    const date = displayDate(day);
    const label = nonWorkingLabel(day, config);

    if (label) {
      reviews.push({
        date,
        restLabel: label,
        slots: recorded.length
          ? recorded.map((m) => ({
              time: m.hora,
              status:
                m.descricaoTipo === "PONTO_PENDENTE" || m.descricaoStatus === "Em aprovação"
                  ? "pending"
                  : "approved",
            }))
          : undefined,
      });
      continue;
    }

    if (isFlashRest(day) && recorded.length === 0) {
      reviews.push({ date, restLabel: day.tipoJornada || day.consideradoDia || "Folga" });
      continue;
    }

    const nowTime = `${pad(today.getHours())}:${pad(today.getMinutes())}`;
    const slots = reviewSlots(recorded, punches, workloadHours, breakMinutes).filter(
      (slot) => key < todayKey || slot.status !== "missing" || slot.time <= nowTime
    );

    reviews.push({
      date,
      slots,
      note: atypicalPunchNote(recorded, punches),
    });
  }

  return reviews;
}

export function findAnomalies(
  days: DayRow[],
  config: AgentConfig,
  today = new Date()
): DayReview[] {
  const sample = days[0];
  const year = sample?.ano ?? today.getFullYear();
  const month = sample?.mes ?? today.getMonth() + 1;
  return buildMonthReview(days, config, year, month, today).filter((day) => {
    if (day.restLabel) return false;
    return (day.slots ?? []).some((slot) => slot.status !== "approved");
  });
}

export function formatAnomalySummary(reviews: DayReview[]): string {
  return reviews
    .map((day) => {
      if (day.restLabel && !day.slots?.length) return `${day.date}  ${day.restLabel}`;
      const times = (day.slots ?? []).map((s) => s.time).join("  ");
      return day.restLabel ? `${day.date}  ${day.restLabel}  ${times}` : `${day.date}  ${times}`;
    })
    .join("\n");
}
