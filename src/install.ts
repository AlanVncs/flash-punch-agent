import { install as installHome } from "../bin/install-home.mjs";
import { packageRoot } from "./paths.ts";

export function install(): void {
  installHome({ sourceRoot: packageRoot() });
}
