import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AgentConfig } from "./flash-client.ts";

export const CONFIG_PATH = "data/config.json";

const emptyConfig = (): AgentConfig => ({
  companyId: "",
  folhaCertaUserId: 0,
  schedule: { weekdays: [], punches: [], workloadHours: 0, breakMinutes: 0 },
  defaults: {
    motivoId: 41351,
    justificativa: "",
    diaSeguinte: false,
    identificadorColetor: "Browser",
  },
  hqCity: { city: null, state: null },
});

export function loadConfig(path = CONFIG_PATH): AgentConfig {
  if (!existsSync(resolve(path))) return emptyConfig();
  const parsed = JSON.parse(readFileSync(resolve(path), "utf8")) as AgentConfig;
  const base = emptyConfig();
  return {
    ...base,
    ...parsed,
    schedule: { ...base.schedule, ...parsed.schedule },
    defaults: { ...base.defaults, ...parsed.defaults },
    hqCity: { ...base.hqCity, ...parsed.hqCity },
  };
}

export function saveConfig(config: AgentConfig, path = CONFIG_PATH): void {
  const abs = resolve(path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(config, null, 2)}\n`);
}

export type OnboardingGap = "hqCity" | "schedule" | "workload";

export function onboardingGaps(config: AgentConfig): OnboardingGap[] {
  const gaps: OnboardingGap[] = [];
  const city = config.hqCity?.city?.trim();
  const state = config.hqCity?.state?.trim();
  if (!city || !state) gaps.push("hqCity");
  const punches = config.schedule?.punches ?? [];
  const weekdays = config.schedule?.weekdays ?? [];
  if (punches.length === 0 || weekdays.length === 0) gaps.push("schedule");
  const workloadHours = config.schedule?.workloadHours ?? 0;
  const breakMinutes = config.schedule?.breakMinutes ?? 0;
  if (!(workloadHours > 0) || !(breakMinutes > 0)) gaps.push("workload");
  return gaps;
}

export function assertOnboarded(config: AgentConfig): void {
  const gaps = onboardingGaps(config);
  if (gaps.length === 0) return;
  const hints = gaps.map((gap) => {
    if (gap === "hqCity") return "cidade sede (cidade e UF)";
    if (gap === "schedule") return "horários de trabalho (batidas e dias da semana)";
    return "carga horária diária e tempo de intervalo/almoço";
  });
  throw new Error(`Onboarding incompleto. Pergunte ao usuário: ${hints.join("; ")}.`);
}
