# Flash punch agent — attendance API mapping

Status: login, timesheet read, and **manual punch POST** mapped.

## Product surface

- Company query: `?company=<companyId>`
- Menu: Controle de jornada
  - Marcação de ponto → `/time-and-attendance/clock-in`
  - Espelho de ponto → `/time-and-attendance/timesheet`
  - Férias → `/time-and-attendance/vacation`

Missing punches show as `--:--` (`PONTO_FALTANTE`). Click opens:

- Incluir ponto manual
- Ver jornada do dia

Manual punches appear as `PONTO_PENDENTE` / status `Em aprovação` until a manager approves.

## HTTP

Host: `https://people-public.us.flashapp.services`

### Auth (never commit tokens)

- `x-flash-auth: Bearer <FlashIdentityProvider.accessToken>`
- `x-flash-companyid`
- `x-flash-origin: flashos-web`
- `x-flash-device-id`
- `x-aws-waf-token`
- `content-type: application/json`

Session is in `localStorage` (`FlashIdentityProvider.*`, Cognito). MFA is the Flash app code.

### tRPC

Time sheet BFF: `/attendance-time-sheet-bff/v1/trpc/<procedures>?batch=1`

| Procedure | Method | Use |
|-----------|--------|-----|
| `folhaCertaAuthRouter.Configuration.GetConfigurationUser` | GET | User config |
| `folhaCertaEspelhoPontoRouter.EspelhoPonto.GetEspelhopontoTotal` | GET | Period hour-bank (`UsuarioId`, `Periodo` e.g. `JULHO`, `Ano`). Fields `bancoHora*` are minutes. |
| `folhaCertaEspelhoPontoRouter.EspelhoPonto.GetEspelhopontoCabecalho` | GET | Header |
| `folhaCertaEspelhoPontoRouter.EspelhoPonto.GetEspelhopontoDiaResumido` | GET | Day rows |
| `folhaCertaEspelhoPontoRouter.EspelhoPonto.GetEspelhopontoJornadaDia` | GET | Single day |
| `folhaCertaMarcacaoPontoRouter.Motivo.GetMotivoCombo` | GET | Reason list |
| `folhaCertaMarcacaoPontoRouter.MarcacaoPonto.PostMarcacaopontoManual` | POST | Insert manual punch |

Also: `GET /time-and-attendance-bff/v1/api/configuration/user`

### POST manual punch

`POST .../folhaCertaMarcacaoPontoRouter.MarcacaoPonto.PostMarcacaopontoManual?batch=1`

```json
{
  "0": {
    "body": {
      "justificativa": "",
      "diaSeguinte": false,
      "identificadorColetor": "Browser",
      "hora": 10,
      "minuto": 0,
      "motivoId": 41351,
      "usuarioId": 777272,
      "dia": 14,
      "mes": 8,
      "ano": 2026
    }
  }
}
```

Agent defaults: `motivoId` 41351 (Esquecimento de marcação). Do not set `diaSeguinte` or `justificativa` unless the user asks.

Motivos:

| id | descricao |
|----|-----------|
| 41351 | Esquecimento de marcação |
| 41352 | Ajuste de horário |
| 41353 | Evento Sistêmico |
| 41354 | Home Office |

### Timesheet day fields

- `tipoJornada`: Trabalho, Folga, Dia útil não trabalhado
- `escala`: `SEG - SEX 10:00 13:00 - 14:00 18:00`
- `horariosMarcacoes[].descricaoTipo`: `PONTO_ORIGINAL`, `PONTO_FALTANTE`, `PONTO_PENDENTE`, `PONTO_AJUSTADO`, `INTERVALO_MARCADO`, `PONTO_DESCONSIDERADO`
- Treat `PONTO_ORIGINAL`, `PONTO_PENDENTE`, and `PONTO_AJUSTADO` as present; ignore interval and discarded rows; `PONTO_FALTANTE` is a slot, not a time. `PONTO_AJUSTADO` with `descricaoStatus` Aprovado counts as approved.

## Agent schedule and HQ city

Do not hardcode. On first use, ask the user and save to `$HOME/.flash-punch-agent/data/config.json`:

- `hqCity.city` / `hqCity.state` — company HQ for holidays
- `schedule.punches` / `schedule.weekdays` — this user's punch times
- `schedule.workloadHours` / `schedule.breakMinutes` — daily workload and lunch break

`check` / `punch` must fail until all are set. Atypical suggestions, in this order: (1) workload + break duration must hold; (2) stay as close as possible to the usual punches. Examples: 12:19 → 10:00, 12:19, 13:19, 18:00; late start 10:20 → 10:20, 13:00, 14:00, 18:20. Tell the user the slot interpretation.
