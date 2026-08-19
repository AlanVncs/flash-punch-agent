---
name: flash-punch-agent
description: Flash punch agent for HROS/Folha Certa. HTTP first, Playwright when needed. Use when the user mentions Flash, flash-punch-agent, batimento de ponto, espelho de ponto, Folha Certa, marcação, pontos faltantes, carga horária, feriados da sede, o que o agente pode fazer, ou capacidades.
---

# Flash punch agent

Prefer HTTP against mapped Folha Certa BFFs. Use a visible browser only for login, MFA (Flash app code), or unmapped UI.

Read [docs/api-mapping.md](../../../docs/api-mapping.md), `config.example.json`, `data/config.json`, and [src/capabilities.ts](../../../src/capabilities.ts). Never commit tokens. Session file: `data/session.json`.

## What is possible (mandatory when asked)

If the user asks what you can do, what is possible, help, capabilities, or similar, answer from `formatCapabilitiesPt()` in `src/capabilities.ts`. Portuguese. Lead with what you **can** do, then a short “ainda não”. Offer examples. Do not invent features that are not in that catalog. Keep the catalog in sync when a real capability is added or removed.

## First use (mandatory)

Before login, timesheet, punches, reminders, or holidays, check `data/config.json`.

Onboarding is incomplete if any of these is missing:

- `hqCity.city` and `hqCity.state` (company HQ, for holidays)
- `schedule.punches` (non-empty) and `schedule.weekdays` (non-empty)
- `schedule.workloadHours` and `schedule.breakMinutes` (daily workload and lunch/break)

If incomplete, **stop and ask only the missing items**. Do not invent city, hours, workload, or break. Save answers into `data/config.json` and confirm before any Flash action.

Ask in Portuguese, for example:

1. Qual é a **cidade sede** da empresa (cidade e UF)? Uso isso para feriados.
2. Quais são seus **horários de trabalho**? Informe os horários de cada batida (ex.: 10:00, 13:00, 14:00, 18:00) e os **dias da semana**.
3. Qual é a **carga horária** diária (ex.: 7 horas)?
4. Qual é o **tempo de intervalo/almoço** (ex.: 1 hora)?

These values are per user, not Flash defaults. If the user later says “configurar carga horária” or “mudar cidade sede”, update the same fields.

## Other defaults

- Manual adjustments use motivo **Esquecimento de marcação** (`motivoId` 41351) unless the user names another reason.
- Leave `justificativa` empty and `diaSeguinte` false unless the user asks to change them.

## HTTP flow (only after onboarding)

1. If `data/session.json` is missing or 401, open `https://hros.flashapp.com.br/`, ask the user to log in (CPF, password, Flash app code), then save `accessToken`, `companyId`, `deviceId`, `wafToken`.
2. Read timesheet: `GetEspelhopontoDiaResumido` and month hour-bank: `GetEspelhopontoTotal` (`Periodo` = Portuguese month name in caps, e.g. `JULHO`; values are **minutes**).
3. Conferência: `buildMonthReview` + `reviewSlots`. Show days from the 1st through **today** (not only anomalies). **Do not show future days** or **future punch times** (including remaining slots later today). Workdays: date + times only (green approved, yellow pending, red to-mark/suggested). Non-working days: date + label — **Sábado**, **Domingo**, **Feriado**, or **Folga** (weekday rest from Flash/DUNT on a work calendar). If someone punched on a rest day, show the label and the times. Hour bank on **one line**: `Anterior: ±HH:MM | Atual: ±HH:MM | Saldo: ±HH:MM` (`bancoHoraSaldoAnterior`, `bancoHoraSaldoPeriodo`, `bancoHoraSaldoAcumulado`).

   Atypical-day suggestions — evaluate the best scenario with this **priority order** (do not invert):
   1. **Must** respect `workloadHours` and `breakMinutes` (work = jornada − intervalo; intervalo duration exact).
   2. Among valid options, stay **as close as possible** to the configured routine punches.

   Map each recorded punch to the nearest routine slot. Example: 12:19 → saída intervalo (closer to 13:00 than 10:00) → **10:00, 12:19, 13:19, 18:00** (7h + 1h, routine ends kept). Example: 10:20 entrada → **10:20, 13:00, 14:00, 18:20** (shift only the exit so carga still matches). Example: 10:00, 13:05, 18:00 → **14:05**. If recorded punches make carga+intervalo impossible, say so in chat and fall back. **Tell the user the interpretation** (`DayReview.note`); canvas stays times-only.

   `PONTO_ORIGINAL` and approved `PONTO_AJUSTADO` = approved, `PONTO_PENDENTE` = pending. Present conferência in a canvas when possible.
4. Punch adjustment — **preview then ask**. When the user asks to adjust or include punches:
   1. Evaluate the request (which days/times). Include **only past times**, unless the user explicitly asks for a future punch.
   2. Show a **dedicated** canvas with **only the days that would change**. Each day: date + **Agora** + **Depois**, colored times (green approved, yellow pending, red to-mark). **Do not** include the month list, hour bank, or other days. Chat asks whether to apply. Use `previewInserts` from `src/preview.ts`.
   3. Ask whether to apply **exactly as shown**. Do **not** call `PostMarcacaopontoManual` in the same turn as the preview.
   4. After an explicit yes, insert with `PostMarcacaopontoManual`. Manual punches stay **Em aprovação**. If they say no or change the plan, do not insert.

## Playwright fallback

Navigate `/time-and-attendance/timesheet` or `/time-and-attendance/clock-in`. Capture new tRPC calls into `docs/api-mapping.md` before repeating them via HTTP.

## Do not

- Skip onboarding or guess HQ city / work hours / workload / break.
- Mix the month timesheet or hour bank into an adjustment preview.
- Store passwords or MFA codes.
