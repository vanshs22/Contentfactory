import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import { env } from "../config/index.js";
import { hasLLM } from "../services/llm.js";
import { hasBuffer } from "../services/buffer.js";

const exec = promisify(execFile);

async function check(cmd: string, args: string[]) {
  try {
    const { stdout } = await exec(cmd, args, { timeout: 15_000 });
    return { ok: true, out: stdout.trim().slice(0, 200) };
  } catch (e: any) {
    return { ok: false, out: e.message };
  }
}

async function main() {
  const node = process.version;
  const ffmpeg = await check("ffmpeg", ["-version"]);
  const hyper = await check("npx", ["hyperframes", "--version"]);
  console.log(
    JSON.stringify(
      {
        node,
        ffmpeg: ffmpeg.ok,
        hyperframes: hyper.ok,
        hyperframes_version: hyper.ok ? hyper.out : hyper.out,
        llm_configured: hasLLM(),
        buffer_configured: hasBuffer(),
        storage_root_exists: fs.existsSync(env.STORAGE_ROOT),
        port: env.PORT,
      },
      null,
      2
    )
  );
}

main();
