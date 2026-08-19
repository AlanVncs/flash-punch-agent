import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Installed copy and user data. Override with FLASH_PUNCH_HOME. */
export function agentHome(): string {
  const fromEnv = process.env.FLASH_PUNCH_HOME?.trim();
  if (fromEnv) return fromEnv;
  return join(homedir(), ".flash-punch-agent");
}

export function dataDir(): string {
  return join(agentHome(), "data");
}

export function configPath(): string {
  return join(dataDir(), "config.json");
}

export function sessionPath(): string {
  return join(dataDir(), "session.json");
}

export function packageRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function isHomeInstalled(home = agentHome()): boolean {
  return existsSync(join(home, "src", "cli.ts")) && existsSync(join(home, "package.json"));
}

export function cursorSkillDir(): string {
  return join(homedir(), ".cursor", "skills", "flash-punch-agent");
}

export function localBinPath(): string {
  return join(homedir(), ".local", "bin", "flash-punch-agent");
}
