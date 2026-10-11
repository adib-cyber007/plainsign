import { readFile, readdir, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

async function resolvePackage(name, from) {
  let directory = path.resolve(from);
  while (true) {
    const filename = path.join(directory, "node_modules", name, "package.json");
    if (await access(filename).then(() => true, () => false)) return filename;
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Installed dependency missing: ${name}`);
    directory = parent;
  }
}

async function collect(workspace, recursive, direct) {
  const seen = new Set();
  const blocks = [];
  async function visit(name, from, recurse) {
    const filename = await resolvePackage(name, from);
    const directory = path.dirname(filename);
    if (seen.has(directory)) return;
    seen.add(directory);
    const metadata = JSON.parse(await readFile(filename, "utf8"));
    const notices = (await readdir(directory)).filter(file => /^(licen[sc]e|copying|notice)([.-]|$)/i.test(file));
    if (!notices.length) throw new Error(`License notice missing for ${name}`);
    const texts = await Promise.all(notices.map(async file => (await readFile(path.join(directory, file), "utf8")).trimEnd()));
    blocks.push(`${metadata.name} ${metadata.version} (${metadata.license})\n${texts.join("\n\n")}`);
    if (recurse) for (const dependency of Object.keys(metadata.dependencies ?? {})) await visit(dependency, directory, true);
  }
  for (const name of recursive) await visit(name, workspace, true);
  for (const name of direct) await visit(name, workspace, false);
  await mkdir(path.join(workspace, "public"), { recursive: true });
  await writeFile(path.join(workspace, "public", "THIRD_PARTY_NOTICES.txt"), `PlainSign core runtime dependency notices\n\nUpstream notices for core runtime dependency graphs and listed framework packages. Inclusion does not imply endorsement or that every optional package is bundled. See docs/THIRD_PARTY.md for scope and other services.\n\n${blocks.sort().join("\n\n============================================================\n\n")}\n`);
  console.info(`Collected ${blocks.length} upstream notices for ${workspace}`);
}

if (process.argv[2] !== "site") await collect(".", ["react", "react-dom", "viem"], ["wxt", "@wxt-dev/module-react"]);
await collect("demo-dapp", ["react", "react-dom", "viem", "@wagmi/core", "@tanstack/react-query"], ["wagmi", "@wagmi/connectors"]);
