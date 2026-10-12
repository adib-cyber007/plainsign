import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
const root = path.resolve(import.meta.dirname, "../..");
const runtime =
  process.env.PLAINSIGN_RUNTIME_ROOT ??
  path.join(
    os.homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies",
  );
process.env.RUNTIME_NODE_MODULES ??= path.join(runtime, "node/node_modules");
const skill =
  process.env.PLAINSIGN_PRESENTATION_SKILL ??
  path.join(
    os.homedir(),
    ".codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations",
  );
const { Presentation, PresentationFile } = await import(
  pathToFileURL(
    path.join(
      runtime,
      "node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs",
    ),
  ).href
);
const { finalizePresentation } = await import(
  pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs"))
    .href
);
const out = path.join(root, "output/pitch-v2"),
  build = path.join(root, "output/pitch-build");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(build, { recursive: true });
const narration = JSON.parse(
  await fs.readFile(path.join(root, "docs/human-narration.json"), "utf8"),
);
const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const c = {
  paper: "#F4F1E9",
  ink: "#17251F",
  green: "#116948",
  muted: "#52665B",
  dark: "#101D18",
  light: "#EDEFE8",
  red: "#B23B46",
  mint: "#8FE0B2",
};
function text(
  s,
  name,
  value,
  x,
  y,
  w,
  h,
  size = 30,
  color = c.ink,
  bold = false,
) {
  const a = s.shapes.add({
    geometry: "textbox",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  a.text = value;
  a.text.style = {
    typeface: "Segoe UI",
    fontSize: size,
    color,
    bold,
    wrap: "square",
    autoFit: "none",
    insets: 0,
    verticalAlignment: "top",
  };
  return a;
}
function slide(dark = false) {
  const s = p.slides.add();
  s.background.fill = dark ? c.dark : c.paper;
  return s;
}
async function pic(s, file, x, y, w, h, alt) {
  const bytes = await fs.readFile(path.join(root, file));
  s.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit: "contain",
    position: { left: x, top: y, width: w, height: h },
  });
}
function note(s, index, extra = "") {
  s.speakerNotes.text =
    narration.presentation[index].text +
    "\n\nSources: https://github.com/adib-cyber007/plainsign; docs/PRE_EXISTING_WORK.md; docs/VERIFICATION.md. " +
    extra;
}
function foot(s, n, dark = false) {
  text(
    s,
    "slide-number",
    String(n).padStart(2, "0"),
    1170,
    668,
    40,
    24,
    18,
    dark ? c.mint : c.muted,
  );
}

let s = slide();
text(s, "brand", "PlainSign", 72, 48, 600, 50, 32, c.green, true);
text(
  s,
  "hook",
  "The button says\n“Free Mint.”",
  72,
  164,
  1080,
  220,
  84,
  c.ink,
  true,
);
text(
  s,
  "consequence",
  "The request can grant access\nto an entire NFT collection.",
  76,
  440,
  1100,
  112,
  38,
  c.ink,
);
text(
  s,
  "founder",
  "Mohamed Adib · Sri Venkateswara College of Engineering",
  76,
  620,
  1080,
  32,
  23,
  c.muted,
);
note(s, 0);
foot(s, 1);

s = slide(true);
text(
  s,
  "title",
  "Before the\nwallet opens",
  72,
  72,
  520,
  160,
  58,
  c.light,
  true,
);
text(
  s,
  "meaning",
  "Who gets access?\nWhat can they move?",
  76,
  287,
  495,
  108,
  35,
  c.light,
);
text(
  s,
  "reject",
  "Reject stops the request",
  76,
  480,
  460,
  72,
  34,
  c.mint,
  true,
);
text(s, "error", "Standard wallet error 4001", 76, 565, 450, 36, 23, c.light);
await pic(
  s,
  "docs/assets/pitch-v2/collection.png",
  596,
  96,
  620,
  500,
  "Actual PlainSign collection-approval card from the sample walkthrough",
);
text(
  s,
  "disclosure",
  "Controlled sample · simulated metadata",
  628,
  612,
  560,
  30,
  20,
  c.mint,
);
note(
  s,
  1,
  "Product card captured from the actual sample walkthrough, with simulated metadata.",
);
foot(s, 2, true);

s = slide();
text(
  s,
  "title",
  "Signatures can grant permission too",
  72,
  56,
  1120,
  84,
  51,
  c.ink,
  true,
);
text(
  s,
  "permit-label",
  "Permit2: unlimited permission",
  74,
  183,
  540,
  48,
  28,
  c.red,
  true,
);
text(
  s,
  "login-label",
  "Sign in: a login message",
  680,
  183,
  520,
  48,
  28,
  c.green,
  true,
);
await pic(
  s,
  "docs/assets/pitch-v2/permit2.png",
  72,
  245,
  550,
  340,
  "Actual PlainSign Permit2 Danger sample card",
);
await pic(
  s,
  "docs/assets/pitch-v2/login.png",
  676,
  245,
  530,
  340,
  "Actual PlainSign login Safe sample card",
);
text(
  s,
  "caveat",
  "Controlled samples. Metadata is simulated. Safe is a heuristic, not a guarantee.",
  76,
  625,
  1080,
  36,
  21,
  c.muted,
);
note(
  s,
  2,
  "Two actual sample cards. Safe describes the request under current rules, not the trustworthiness of the website.",
);
foot(s, 3);

s = slide();
text(
  s,
  "title",
  "Open rules, visible reasons",
  72,
  58,
  1120,
  100,
  58,
  c.ink,
  true,
);
for (const [label, body, y] of [
  ["Decode", "Read the transaction or signature", 208],
  ["Enrich", "Check relevant public chain information", 344],
  ["Decide", "Show the rules behind the verdict", 480],
]) {
  text(s, label + "-label", label, 76, y, 260, 65, 38, c.green, true);
  text(s, label + "-body", body, 385, y + 3, 820, 80, 32, c.ink);
}
text(
  s,
  "AI-disabled",
  "AI rewording is disabled in the public build",
  76,
  625,
  1060,
  34,
  23,
  c.muted,
);
note(s, 3);
foot(s, 4);

s = slide(true);
text(s, "title", "The event work", 72, 56, 1120, 94, 60, c.light, true);
text(
  s,
  "earlier-label",
  "September prototype",
  76,
  203,
  500,
  50,
  32,
  c.light,
  true,
);
text(
  s,
  "earlier",
  "Provider interception\nDecoding and risk rules\nRevoke and community feed",
  76,
  294,
  500,
  205,
  30,
  c.light,
);
text(s, "new-label", "October additions", 680, 203, 510, 50, 32, c.mint, true);
text(
  s,
  "new",
  "Ethereum mainnet metadata\nWarnings during RPC outages\nWalkthrough without a wallet",
  680,
  294,
  530,
  205,
  30,
  c.light,
);
text(
  s,
  "disclosure",
  "Earlier work is disclosed. Mainnet validation used public reads.",
  76,
  620,
  1080,
  38,
  22,
  c.mint,
);
note(s, 4);
foot(s, 5, true);

s = slide();
text(
  s,
  "title",
  "Free for users.\nAn SDK for teams.",
  72,
  82,
  1100,
  185,
  68,
  c.ink,
  true,
);
text(
  s,
  "open-label",
  "Open source extension",
  76,
  342,
  515,
  52,
  31,
  c.green,
  true,
);
text(
  s,
  "open-body",
  "Individuals can inspect the rules\nand try the warning layer.",
  76,
  420,
  510,
  110,
  29,
  c.ink,
);
text(
  s,
  "paid-label",
  "Proposed paid integration",
  680,
  342,
  525,
  52,
  31,
  c.green,
  true,
);
text(
  s,
  "paid-body",
  "Maintained rules, policy controls\nand integration support.",
  680,
  420,
  525,
  110,
  29,
  c.ink,
);
text(
  s,
  "validation",
  "Demand and pricing are not yet validated",
  76,
  625,
  1080,
  34,
  23,
  c.muted,
);
note(s, 5);
foot(s, 6);

s = slide();
text(
  s,
  "title",
  "The next proof is\nuser understanding",
  72,
  65,
  1100,
  170,
  61,
  c.ink,
  true,
);
text(
  s,
  "test",
  "Observe five people\nusing the demo",
  76,
  316,
  490,
  125,
  43,
  c.green,
  true,
);
text(
  s,
  "measure",
  "Can they explain the permission?\nWhich warnings confuse them?\nHow long does the decision take?",
  660,
  315,
  550,
  210,
  29,
  c.ink,
);
text(
  s,
  "partners",
  "Then seek two wallet or dApp design partners",
  76,
  585,
  1080,
  42,
  29,
  c.ink,
);
text(
  s,
  "future",
  "Planned experiments, not current traction",
  76,
  644,
  1070,
  30,
  21,
  c.muted,
);
note(s, 6);
foot(s, 7);

s = slide(true);
text(s, "brand", "PlainSign", 72, 70, 1000, 100, 76, c.light, true);
text(
  s,
  "close",
  "Understand the permission.\nThen decide.",
  76,
  230,
  1100,
  155,
  54,
  c.light,
  true,
);
text(
  s,
  "try",
  "Try the sample requests without a wallet",
  76,
  438,
  1060,
  44,
  30,
  c.mint,
  true,
);
text(
  s,
  "url",
  "adib-cyber007.github.io/plainsign/review.html",
  76,
  497,
  1100,
  48,
  30,
  c.light,
);
text(
  s,
  "entrant",
  "Mohamed Adib · Solo entrant",
  76,
  606,
  1040,
  34,
  25,
  c.light,
);
text(
  s,
  "college",
  "Sri Venkateswara College of Engineering",
  76,
  648,
  1030,
  30,
  21,
  c.mint,
);
note(s, 7);
foot(s, 8, true);

const revision = process.env.PLAINSIGN_PITCH_REVISION ?? String(Date.now());
const candidate = path.join(build, `candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(p)).save(candidate);
const final = path.join(out, `plainsign-pitch-${revision}.pptx`);
await finalizePresentation({
  workspaceDir: root,
  candidatePath: candidate,
  finalPath: final,
  pythonExecutable: path.join(runtime, "python/python.exe"),
  integrityValidatorPath: path.join(
    skill,
    "container_tools/inspect_presentation_package_integrity.py",
  ),
  layoutValidatorPath: path.join(
    skill,
    "container_tools/inspect_presentation_layout_geometry.py",
  ),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  explicitTotalSlideCount: 8,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: ["Segoe UI"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(build, `validation-${revision}.json`),
});
for (let i = 0; i < p.slides.items.length; i++) {
  const blob = await p.export({
    slide: p.slides.items[i],
    format: "png",
    scale: 1.5,
  });
  await fs.writeFile(
    path.join(out, `slide-${String(i + 1).padStart(2, "0")}.png`),
    new Uint8Array(await blob.arrayBuffer()),
  );
}
await fs.writeFile(
  path.join(build, "inspection.ndjson"),
  (await p.inspect({ kind: "slide,textbox,image,notes", maxChars: 100000 }))
    .ndjson,
);
console.log(
  JSON.stringify({
    slides: p.slides.items.length,
    pptx: final,
    font: "Segoe UI",
  }),
);
