#!/usr/bin/env node
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(pkgRoot, "src", "cli.ts");
const env = { ...process.env };
if (!env.FLASH_PUNCH_HOME?.trim()) {
  env.FLASH_PUNCH_HOME = join(homedir(), ".flash-punch-agent");
}

const child = spawn(process.execPath, ["--experimental-strip-types", cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
