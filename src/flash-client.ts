import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TIMESHEET_BFF =
  "https://people-public.us.flashapp.services/attendance-time-sheet-bff/v1/trpc";

export type AgentConfig = {
  companyId: string;
  folhaCertaUserId: number;
  schedule: { weekdays: number[]; punches: string[]; workloadHours?: number; breakMinutes?: number };
  defaults: {
    motivoId: number;
    justificativa: string;
    diaSeguinte: boolean;
    identificadorColetor: string;
  };
  hqCity: { city: string | null; state: string | null };
};

export type Session = {
  accessToken: string;
  companyId: string;
  deviceId: string;
  wafToken: string;
};

export type DayRow = {
  dia: number;
  mes: number;
  ano: number;
  titulo: string;
  tipoJornada?: string;
  consideradoDia?: string;
  horariosMarcacoes?: Array<{
    hora: string;
    descricaoTipo: string;
    descricaoStatus?: string | null;
  }>;
};

export function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T;
}

function headers(session: Session): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-flash-auth": `Bearer ${session.accessToken}`,
    "x-flash-companyid": session.companyId,
    "x-flash-origin": "flashos-web",
    "x-flash-device-id": session.deviceId,
    "x-aws-waf-token": session.wafToken,
  };
}

async function trpcGet(session: Session, procedures: string, input: unknown) {
  const url = `${TIMESHEET_BFF}/${procedures}?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`;
  const res = await fetch(url, { headers: headers(session) });
  if (!res.ok) {
    throw new Error(`GET ${procedures} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function trpcPost(session: Session, procedure: string, body: unknown) {
  const url = `${TIMESHEET_BFF}/${procedure}?batch=1`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(session),
    body: JSON.stringify({ "0": { body } }),
  });
  if (!res.ok) {
    throw new Error(`POST ${procedure} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getTimesheetDays(
  session: Session,
  userId: number,
  year: number,
  month: number
): Promise<DayRow[]> {
  const payload = await trpcGet(
    session,
    "folhaCertaEspelhoPontoRouter.EspelhoPonto.GetEspelhopontoDiaResumido",
    {
      "0": {
        queryParams: {
          usuarioId: userId,
          mes: month,
          ano: year,
          mostrarSelfie: false,
          hasSobreaviso: true,
        },
      },
    }
  );
  return payload[0].result.data as DayRow[];
}

const PERIOD_NAMES = [
  "",
  "JANEIRO",
  "FEVEREIRO",
  "MARCO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
];

export type HourBankTotals = {
  creditMinutes: number;
  debitMinutes: number;
  previousMinutes: number;
  periodMinutes: number;
  accumulatedMinutes: number;
};

type FlashHourField = { ativo?: boolean; valor?: number };

export function formatSignedHours(minutes: number): string {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "−" : "";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export async function getTimesheetTotals(
  session: Session,
  userId: number,
  year: number,
  month: number
): Promise<HourBankTotals> {
  const payload = await trpcGet(
    session,
    "folhaCertaEspelhoPontoRouter.EspelhoPonto.GetEspelhopontoTotal",
    {
      "0": {
        queryParams: {
          UsuarioId: userId,
          Periodo: PERIOD_NAMES[month],
          Ano: year,
        },
      },
    }
  );
  const data = payload[0].result.data as Record<string, FlashHourField>;
  return {
    creditMinutes: data.bancoHoraCredito?.valor ?? 0,
    debitMinutes: data.bancoHoraDebito?.valor ?? 0,
    previousMinutes: data.bancoHoraSaldoAnterior?.valor ?? 0,
    periodMinutes: data.bancoHoraSaldoPeriodo?.valor ?? 0,
    accumulatedMinutes: data.bancoHoraSaldoAcumulado?.valor ?? 0,
  };
}

export async function postManualPunch(
  session: Session,
  config: AgentConfig,
  when: { year: number; month: number; day: number; hour: number; minute: number },
  overrides?: { motivoId?: number; justificativa?: string; diaSeguinte?: boolean }
) {
  return trpcPost(
    session,
    "folhaCertaMarcacaoPontoRouter.MarcacaoPonto.PostMarcacaopontoManual",
    {
      justificativa: overrides?.justificativa ?? config.defaults.justificativa,
      diaSeguinte: overrides?.diaSeguinte ?? config.defaults.diaSeguinte,
      identificadorColetor: config.defaults.identificadorColetor,
      hora: when.hour,
      minuto: when.minute,
      motivoId: overrides?.motivoId ?? config.defaults.motivoId,
      usuarioId: config.folhaCertaUserId,
      dia: when.day,
      mes: when.month,
      ano: when.year,
    }
  );
}
