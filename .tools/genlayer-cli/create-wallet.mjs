import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import keytar from "keytar";

const accountName = "credence-deployer";
const service = "Credence GenLayer CLI";
const credentialAccount = `${accountName}-keystore-password`;
const cli = fileURLToPath(
  new URL("./node_modules/genlayer/dist/index.js", import.meta.url),
);

let password = `${randomBytes(32).toString("base64url")}!Aa7`;

const created = spawnSync(
  process.execPath,
  [cli, "account", "create", "--name", accountName, "--password", password],
  { stdio: "inherit", windowsHide: true },
);

if (created.status !== 0) {
  password = "";
  throw new Error(`GenLayer account creation failed with ${created.status}`);
}

await keytar.setPassword(service, credentialAccount, password);

const unlocked = spawnSync(
  process.execPath,
  [
    cli,
    "account",
    "unlock",
    "--account",
    accountName,
    "--password",
    password,
  ],
  { stdio: "inherit", windowsHide: true },
);
password = "";

if (unlocked.status !== 0) {
  await keytar.deletePassword(service, credentialAccount);
  throw new Error(`GenLayer account unlock failed with ${unlocked.status}`);
}

const shown = spawnSync(
  process.execPath,
  [cli, "account", "show", "--account", accountName],
  { stdio: "inherit", windowsHide: true },
);

if (shown.status !== 0) {
  throw new Error(`GenLayer account show failed with ${shown.status}`);
}
