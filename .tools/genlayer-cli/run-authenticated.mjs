import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import keytar from "keytar";

const accountName = "credence-deployer";
const password = await keytar.getPassword(
  "Credence GenLayer CLI",
  `${accountName}-keystore-password`,
);

if (password === null) {
  throw new Error("Credence wallet password was not found in Credential Manager");
}

const cli = fileURLToPath(
  new URL("./node_modules/genlayer/dist/index.js", import.meta.url),
);
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  input: `${password}\n`,
  stdio: ["pipe", "inherit", "inherit"],
  windowsHide: true,
});

process.exitCode = result.status ?? 1;
