import { chmodSync, cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  agentHome,
  configPath,
  cursorSkillDir,
  dataDir,
  localBinPath,
  packageRoot,
  sessionPath,
} from "./paths.ts";

const COPY_ENTRIES = [
  "bin",
  "src",
  "docs",
  "package.json",
  "config.example.json",
  ".env.example",
  "README.md",
] as const;

function migrateUserData(sourceRoot: string): string[] {
  const notes: string[] = [];
  const candidates = [join(sourceRoot, "data"), join(process.cwd(), "data")];
  mkdirSync(dataDir(), { recursive: true, mode: 0o700 });

  for (const dir of candidates) {
    const srcConfig = join(dir, "config.json");
    const srcSession = join(dir, "session.json");
    if (!existsSync(configPath()) && existsSync(srcConfig)) {
      cpSync(srcConfig, configPath());
      notes.push(`Configuração copiada de ${srcConfig}`);
    }
    if (!existsSync(sessionPath()) && existsSync(srcSession)) {
      cpSync(srcSession, sessionPath());
      chmodSync(sessionPath(), 0o600);
      notes.push(`Sessão copiada de ${srcSession}`);
    }
  }

  if (!existsSync(configPath())) {
    const example = join(agentHome(), "config.example.json");
    if (existsSync(example)) cpSync(example, configPath());
  }

  try {
    chmodSync(dataDir(), 0o700);
  } catch {
    /* ignore */
  }
  return notes;
}

function installSkill(sourceRoot: string): void {
  const from = join(sourceRoot, ".cursor", "skills", "flash-punch-agent", "SKILL.md");
  const destDir = cursorSkillDir();
  const dest = join(destDir, "SKILL.md");
  mkdirSync(destDir, { recursive: true });
  if (!existsSync(from)) {
    throw new Error(`Skill não encontrada em ${from}`);
  }
  cpSync(from, dest);
}

function linkCli(): void {
  const home = agentHome();
  const target = join(home, "bin", "flash-punch-agent.mjs");
  const link = localBinPath();
  mkdirSync(dirname(link), { recursive: true });
  chmodSync(target, 0o755);
  rmSync(link, { force: true });
  symlinkSync(target, link);
}

function npmInstall(home: string): void {
  const result = spawnSync("npm", ["install"], {
    cwd: home,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error("npm install falhou");
  }
}

export function install(): void {
  const sourceRoot = packageRoot();
  const home = agentHome();
  mkdirSync(home, { recursive: true });

  if (sourceRoot !== home) {
    for (const entry of COPY_ENTRIES) {
      const from = join(sourceRoot, entry);
      if (!existsSync(from)) continue;
      cpSync(from, join(home, entry), { recursive: true });
    }
    const skillFrom = join(sourceRoot, ".cursor", "skills", "flash-punch-agent");
    if (existsSync(skillFrom)) {
      cpSync(skillFrom, join(home, ".cursor", "skills", "flash-punch-agent"), { recursive: true });
    }
  }

  const skillSource = existsSync(join(home, ".cursor", "skills", "flash-punch-agent", "SKILL.md"))
    ? home
    : sourceRoot;
  installSkill(skillSource);

  const migrated = migrateUserData(sourceRoot);
  npmInstall(home);
  linkCli();

  const bin = localBinPath();
  console.log(`Instalado em ${home}`);
  console.log(`Skill do Cursor: ${cursorSkillDir()}/SKILL.md`);
  console.log(`Config: ${configPath()}`);
  console.log(`Sessão: ${sessionPath()}`);
  console.log(`CLI: ${bin}`);
  for (const note of migrated) console.log(note);
  console.log("");
  console.log("Abra um chat novo no Cursor (ou reinicie) para a skill valer em qualquer janela.");
  const pathDirs = (process.env.PATH ?? "").split(":");
  if (!pathDirs.includes(join(homedir(), ".local", "bin"))) {
    console.log("Se o comando flash-punch-agent não for encontrado, acrescente ~/.local/bin ao PATH.");
  }
}
