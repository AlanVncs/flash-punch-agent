import { loadJson, getTimesheetDays, postManualPunch } from "./flash-client.ts";
import type { Session } from "./flash-client.ts";
import { assertOnboarded, loadConfig, onboardingGaps } from "./config.ts";
import { formatCapabilitiesPt } from "./capabilities.ts";

const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.flatMap((item, i, arr) => (item.startsWith("--") ? [[item.slice(2), arr[i + 1]]] : []))
);

function session(): Session {
  return loadJson<Session>("data/session.json");
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
    throw new Error("Usage: punch --date YYYY-MM-DD --time HH:MM");
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

if (cmd === "status") status();
else if (cmd === "help" || cmd === "capabilities") console.log(formatCapabilitiesPt());
else if (cmd === "check") await check();
else if (cmd === "punch") await punch();
else {
  console.error(
    "Commands: help | status | check [--year YYYY --month M] | punch --date YYYY-MM-DD --time HH:MM"
  );
  process.exit(1);
}
