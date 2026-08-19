import { getTimesheetDays, postManualPunch } from "./flash-client.ts";
import { assertOnboarded, loadConfig, loadSession, onboardingGaps } from "./config.ts";
import { formatCapabilitiesPt } from "./capabilities.ts";
import { buildMonthReview, formatAnomalySummary } from "./anomalies.ts";
import { install } from "./install.ts";
import { agentHome, isHomeInstalled } from "./paths.ts";

const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.flatMap((item, i, arr) => (item.startsWith("--") ? [[item.slice(2), arr[i + 1]]] : []))
);

function usage(): string {
  return [
    "Comandos: install | help | status | check [--year YYYY --month M] | punch --date YYYY-MM-DD --time HH:MM",
    "",
    "Instalação (Ubuntu): npx --yes github:AlanVncs/flash-punch-agent",
    `Dados e cópia local: ${agentHome()}`,
  ].join("\n");
}

function session() {
  return loadSession();
}

function config() {
  const cfg = loadConfig();
  assertOnboarded(cfg);
  return cfg;
}

function status() {
  const cfg = loadConfig();
  const gaps = onboardingGaps(cfg);
  console.log(
    JSON.stringify(
      {
        home: agentHome(),
        onboarded: gaps.length === 0,
        missing: gaps,
        hqCity: cfg.hqCity,
        schedule: cfg.schedule,
      },
      null,
      2
    )
  );
}

async function check() {
  const cfg = config();
  const now = new Date();
  const year = Number(args.year ?? now.getFullYear());
  const month = Number(args.month ?? now.getMonth() + 1);
  const days = await getTimesheetDays(session(), cfg.folhaCertaUserId, year, month);
  const reviews = buildMonthReview(days, cfg, year, month);
  console.log(formatAnomalySummary(reviews));
}

async function punch() {
  const date = String(args.date ?? "");
  const time = String(args.time ?? "");
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const clock = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match || !clock) {
    throw new Error("Uso: punch --date YYYY-MM-DD --time HH:MM");
  }
  const result = await postManualPunch(session(), config(), {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(clock[1]),
    minute: Number(clock[2]),
  });
  console.log(JSON.stringify(result, null, 2));
}

if (!cmd || cmd === "install" || cmd === "init") {
  if (!cmd && isHomeInstalled()) {
    console.log(`Já instalado em ${agentHome()}`);
    console.log("Para atualizar: flash-punch-agent install");
    console.log("");
    console.log(usage());
  } else {
    install();
  }
} else if (cmd === "status") status();
else if (cmd === "help" || cmd === "capabilities") console.log(formatCapabilitiesPt());
else if (cmd === "check") await check();
else if (cmd === "punch") await punch();
else {
  console.error(usage());
  process.exit(1);
}
