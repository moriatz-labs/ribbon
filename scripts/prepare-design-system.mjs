import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const manifest = JSON.parse(readFileSync(resolve("vscd.json"), "utf8"));
const configuredSource = process.env.DESIGN_SYSTEM_SOURCE ?? manifest.providers?.designSystem?.source;
const localRoot = resolve(configuredSource ?? "../../../design-system");
const localEntry = join(localRoot, "packages/ui_core/src/index.ts");
const remoteRoot = resolve(".vercel-design-system");
const remoteEntry = join(remoteRoot, "packages/ui_core/src/index.ts");

if (existsSync(localEntry) || existsSync(remoteEntry)) process.exit(0);

const key = process.env.DESIGN_SYSTEM_DEPLOY_KEY
  ?.replace(/^\uFEFF/, "")
  .replace(/\\n/g, "\n")
  .replace(/\r/g, "")
  .replace(/^['\"]|['\"]$/g, "");
const githubToken = process.env.DESIGN_SYSTEM_GITHUB_TOKEN;
const commit = readFileSync(resolve(".design-system-version"), "utf8").trim();

if ((!key && !githubToken) || !/^[0-9a-f]{40}$/.test(commit)) {
  throw new Error("A server-only design-system credential and exact pinned commit are required for remote builds.");
}

rmSync(remoteRoot, { force: true, recursive: true });
rmSync(resolve(".vercel-design-system-ssh"), { force: true, recursive: true });

let repository = "git@github.com:Paul-M-Kallarackal/design-system.git";
const env = { ...process.env };

if (githubToken) {
  repository = `https://x-access-token:${githubToken}@github.com/Paul-M-Kallarackal/design-system.git`;
} else {
  const sshDirectory = resolve(".vercel-design-system-ssh");
  mkdirSync(sshDirectory, { recursive: true });
  const keyPath = join(sshDirectory, "deploy_key");
  writeFileSync(keyPath, `${key.trim()}\n`, { mode: 0o600 });
  env.GIT_SSH_COMMAND = `ssh -i "${keyPath}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`;
}

for (const [command, args] of [
  ["git", ["clone", "--filter=blob:none", repository, remoteRoot]],
  ["git", ["-C", remoteRoot, "checkout", commit]],
  ["npx", ["--yes", "bun@1.3.14", "install", "--cwd", remoteRoot, "--frozen-lockfile"]],
]) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
