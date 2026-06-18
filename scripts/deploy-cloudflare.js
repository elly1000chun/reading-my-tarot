import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const requiredSecrets = ["OPENAI_API_KEY"];
const deployArgs = process.argv.slice(2);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

function getAvailableSecretNames(secretNames) {
  return secretNames.filter((name) => Boolean(process.env[name]));
}

function createDotEnvContent(secretNames) {
  return secretNames
    .map((name) => {
      return `${name}=${JSON.stringify(process.env[name])}`;
    })
    .join("\n");
}

let tempDir;

try {
  const availableSecrets = getAvailableSecretNames(requiredSecrets);

  if (availableSecrets.length > 0) {
    tempDir = await mkdtemp(join(tmpdir(), "reading-my-tarot-secrets-"));
    const secretsFile = join(tempDir, ".env.production");

    await writeFile(secretsFile, `${createDotEnvContent(availableSecrets)}\n`, {
      mode: 0o600
    });

    await run(process.execPath, [getWranglerBin(), "deploy", "--secrets-file", secretsFile, ...deployArgs]);
  } else {
    await run(process.execPath, [getWranglerBin(), "deploy", ...deployArgs]);
  }
} finally {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function getWranglerBin() {
  return fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
}
