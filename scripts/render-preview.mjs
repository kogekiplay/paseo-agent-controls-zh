import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const image = resolve(process.argv[2] ?? join(root, "assets/controls-demo.png"));
const candidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const chrome = candidates.find(existsSync);
if (!chrome) throw new Error("Set CHROME_BIN to a locally installed Chrome/Chromium executable.");

const files = new Map([["/", {
  type: "text/html; charset=utf-8",
  content: readFileSync(join(root, "tests/preview.html"), "utf8"),
}]]);
for (const name of ["client/web.ts", "shared/translations.ts", "shared/speed-icon.ts"]) {
  const { outputText } = ts.transpileModule(readFileSync(join(root, name), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  files.set("/" + name.replace(/\.ts$/, ".js"), {
    type: "application/javascript",
    content: outputText.replace(/"\.\.\/shared\/(translations|speed-icon)"/g, '"../shared/$1.js"'),
  });
}
const server = createServer((request, response) => {
  const file = files.get(request.url);
  response.writeHead(file ? 200 : 404, { "Content-Type": file?.type ?? "text/plain" });
  response.end(file?.content ?? "Not found");
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const scratch = join(tmpdir(), "paseo-agent-controls-preview");
mkdirSync(scratch, { recursive: true });
mkdirSync(dirname(image), { recursive: true });
try {
  const output = await new Promise((done, fail) => {
    const process = spawn(chrome, [
      "--headless=new", "--no-first-run", "--no-default-browser-check",
      "--disable-background-networking", "--disable-sync", "--hide-scrollbars",
      `--user-data-dir=${join(scratch, "profile")}`,
      "--force-device-scale-factor=2", "--window-size=1220,790",
      "--virtual-time-budget=2000", `--screenshot=${image}`,
      `http://127.0.0.1:${server.address().port}/`,
    ]);
    let log = "";
    process.stdout.on("data", (data) => { log += data; });
    process.stderr.on("data", (data) => { log += data; });
    process.once("error", fail);
    process.once("close", (code) => code === 0 ? done(log) : fail(new Error(log)));
  });
  writeFileSync(join(scratch, "render.log"), output);
  if (!existsSync(image)) throw new Error("Chrome did not produce the preview image.");
  console.log(image);
} finally {
  await new Promise((done) => server.close(done));
}
