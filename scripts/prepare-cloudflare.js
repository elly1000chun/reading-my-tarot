import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const outputDir = new URL("../public/", import.meta.url);

await rm(outputDir, { recursive: true, force: true });
await mkdir(new URL("./src/", outputDir), { recursive: true });

await cp(new URL("../index.html", import.meta.url), new URL("./index.html", outputDir));
await cp(new URL("../favicon.ico", import.meta.url), new URL("./favicon.ico", outputDir));
await cp(new URL("../src/tarot.js", import.meta.url), new URL("./src/tarot.js", outputDir));
await cp(new URL("../decks/", import.meta.url), new URL("./decks/", outputDir), {
  recursive: true
});

await writeFile(
  new URL("./.assetsignore", outputDir),
  [
    "**/node_modules",
    "**/.git",
    "**/.DS_Store",
    "**/Thumbs.db",
    ""
  ].join("\n")
);
