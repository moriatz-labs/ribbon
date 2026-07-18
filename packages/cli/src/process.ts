import { spawn } from "node:child_process";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

function executable(name: string) {
  if (process.platform !== "win32") {
    return name;
  }

  if (["node", "git", "hostinger"].includes(name)) {
    return `${name}.exe`;
  }

  return `${name}.cmd`;
}

export function runCommand(
  name: string,
  args: string[],
  cwd = process.cwd()
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : executable(name);
    if (isWindows && args.some((argument) => !/^[A-Za-z0-9_./:?=&-]+$/.test(argument))) {
      resolve({ code: 2, stdout: "", stderr: "Unsafe command argument rejected" });
      return;
    }
    const commandArgs = isWindows
      ? ["/d", "/s", "/c", [executable(name), ...args].join(" ")]
      : args;
    const child = spawn(command, commandArgs, {
      cwd,
      env: process.env,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ code: 127, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}
