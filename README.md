# flash-punch-agent

HTTP-first helper for Flash HROS time clock (Folha Certa). Playwright is only for login / MFA / unmapped screens.

## Config

On first use the agent must ask for **company HQ city** (city + UF), **work hours** (punch times + weekdays), **daily workload**, and **lunch/break duration**. Those go in `data/config.json`. Do not guess them.

After a browser login, save tokens to `data/session.json` (`accessToken`, `companyId`, `deviceId`, `wafToken`).

Do not commit `data/`.

```bash
npm run help
npm run status
npm run check -- --year 2026 --month 8
npm run punch -- --date 2026-08-14 --time 10:00
```

Manual punches stay pending until a manager approves them.

`npm run check` prints a Portuguese summary of days with anomalies (missing punches, absences, pending, extra times).

See `docs/api-mapping.md` and `.cursor/skills/flash-punch-agent/SKILL.md`.
