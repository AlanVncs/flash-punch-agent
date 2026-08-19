# flash-punch-agent

Helper HTTP-first para ponto na Flash HROS (Folha Certa). Playwright só para login / MFA / telas ainda não mapeadas.

Skill de usuário no Cursor (`~/.cursor/skills/`), não um subagente. Código, config e sessão ficam em `~/.flash-punch-agent`.

## Instalação (Ubuntu, Node 22+)

```bash
npx --yes github:AlanVncs/flash-punch-agent
```

Isso copia o app para `~/.flash-punch-agent`, roda `npm install`, grava a skill em `~/.cursor/skills/flash-punch-agent` e liga o CLI em `~/.local/bin/flash-punch-agent`.

Para atualizar: `npx --yes github:AlanVncs/flash-punch-agent install`

Se a sessão ou o `config.json` ainda estiverem numa pasta de projeto (`data/`), o `install` copia para a home **somente se** o destino ainda não tiver esses arquivos.

Abra um chat novo no Cursor (ou reinicie) para a skill valer em qualquer janela.

## Dados

Não invente cidade sede, horários, carga ou intervalo. No primeiro uso o agente pergunta e grava em `~/.flash-punch-agent/data/config.json`.

Depois do login no browser, os tokens vão para `~/.flash-punch-agent/data/session.json` (`accessToken`, `companyId`, `deviceId`, `wafToken`). Não commite isso.

Override: `FLASH_PUNCH_HOME`.

```bash
flash-punch-agent help
flash-punch-agent status
flash-punch-agent check --year 2026 --month 8
flash-punch-agent punch --date 2026-08-14 --time 10:00
```

Marcações manuais ficam em aprovação até o gestor aceitar.

Ver `docs/api-mapping.md` e `.cursor/skills/flash-punch-agent/SKILL.md`.
