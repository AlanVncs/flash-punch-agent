#!/usr/bin/env node
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { agentHome, install, isHomeInstalled } from "./install-home.mjs";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.FLASH_PUNCH_HOME?.trim()) {
  process.env.FLASH_PUNCH_HOME = join(homedir(), ".flash-punch-agent");
}
const env = { ...process.env };

function insideNodeModules(dir) {
  return dir.split(sep).includes("node_modules");
}

function runCli(cliRoot, argv) {
  const cli = join(cliRoot, "src", "cli.ts");
  const child = spawn(process.execPath, ["--experimental-strip-types", cli, ...argv], {
    stdio: "inherit",
    env,
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const wantsInstall = !cmd || cmd === "install" || cmd === "init";

// npx puts the package under node_modules; Node refuses to strip types there.
if (insideNodeModules(pkgRoot)) {
  if (wantsInstall || !isHomeInstalled()) {
    install({ sourceRoot: pkgRoot });
  }
  if (wantsInstall) process.exit(0);
  runCli(agentHome(), argv);
} else {
  runCli(pkgRoot, argv);
}
