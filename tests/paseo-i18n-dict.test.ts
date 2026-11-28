import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { paseoZhOverrides } from "../shared/paseo-i18n-zh";

function* entries(node: object, prefix = ""): Generator<[string, string]> {
  const items = Object.entries(node);
  expect(Object.getPrototypeOf(node), prefix).toBe(Object.prototype);
  expect(items.length, prefix).toBeGreaterThan(0);
  for (const [key, value] of items) {
    const path = prefix ? `${prefix}.${key}` : key;
    expect(key, path).toMatch(/^[\w-]+$/);
    expect(["constructor", "__proto__", "prototype"], path).not.toContain(key);
    if (typeof value === "object" && value !== null) {
      yield* entries(value, path);
    } else {
      expect(typeof value, path).toBe("string");
      expect(value.trim(), path).not.toBe("");
      yield [path, value];
    }
  }
}

it("contains only valid nested keys and non-empty translations", () => {
  expect(Array.from(entries(paseoZhOverrides))).not.toHaveLength(0);
});

it("translates English labels for subagents, composer controls and Git actions", () => {
  expect(paseoZhOverrides).toMatchObject({
    subagents: {
      title: "子智能体",
      pillLabelOne: "1 个子智能体",
      pillLabelMany: "{{count}} 个子智能体",
      detachTooltip: "分离子智能体",
      archiveTooltip: "归档子智能体",
      archiveFinishedAction: "归档已完成的子智能体",
    },
    sidebar: {
      project: { actions: { openFolder: "在文件管理器中打开" } },
    },
    composer: {
      attachments: { addFile: "上传文件" },
    },
    agentControls: {
      thinking: { title: "思考强度", extraHigh: "极高" },
      mode: { title: "权限模式", searchPlaceholder: "搜索模式…" },
      features: { title: "功能", open: "打开智能体功能" },
      hints: { thinking: "思考模式", model: "切换模型" },
    },
    workspace: {
      git: {
        actions: {
          commit: { label: "提交" },
          pull: { label: "拉取" },
          push: { label: "推送" },
          mergePr: { squash: "压缩合并 PR", rebase: "变基合并 PR" },
          unavailable: { pushUpstreamGone: "此分支跟踪的远程分支已不存在，无法推送" },
        },
      },
    },
    settings: {
      host: { agentProfiles: { systemPromptLabel: "系统提示词" } },
    },
  });
});

const appContents = "/Applications/Paseo.app/Contents";
const appInfo = join(appContents, "Info.plist");
const bundleDirectory = join(appContents, "Resources/app-dist/_expo/static/js/web");
const hostSeries = existsSync(appInfo)
  ? readFileSync(appInfo, "utf8").match(/<key>CFBundleShortVersionString<\/key>\s*<string>0\.(17|18)\.\d+<\/string>/)?.[1]
  : undefined;
const bundleFiles = hostSeries && existsSync(bundleDirectory)
  ? readdirSync(bundleDirectory).filter((file) => /^index-.*\.js$/.test(file))
  : [];

// Only allow missing keys when they were added or removed between these series.
const addedIn018 = new Set([
  "workspace.git.actions.unavailable.pushUpstreamGone",
  "desktop.updates.status.downloadingProgress",
  "desktop.updates.status.downloadAvailable",
  "desktop.updates.status.downloadAvailableWithLastChecked",
  "settings.host.agentProfiles.sectionDescription",
  "settings.host.agentProfiles.systemPromptLabel",
  "settings.host.agentProfiles.systemPromptHint",
]);
const removedIn018 = new Set([
  "onboarding.setup.steps.phone.tailscale.hint",
  "settings.host.pairDevices.rowHint",
]);

type MetroExports = Record<string, unknown>;
type LocaleFactory = (
  global: undefined,
  requireModule: (id: number) => MetroExports,
  importDefault: undefined,
  importAll: undefined,
  module: { exports: MetroExports },
  exports: MetroExports,
  dependencies: number[],
) => void;

function loadHostDictionary(): MetroExports {
  const lines = bundleFiles.flatMap((file) => readFileSync(join(bundleDirectory, file), "utf8")
    .split("\n")
    .filter((line) => line.startsWith("__d(function") && /,"(?:en|zhCN|pluginGallery|pluginSettings)",\{enumerable:!0,get:function/.test(line)));
  const modules = new Map<number, MetroExports>();
  // Load only the four locale modules. The Chinese module spreads resources
  // from English and the plugin settings module into its own dictionary.
  for (const name of ["pluginGallery", "en", "pluginSettings", "zhCN"]) {
    const line = lines.find((candidate) => candidate.includes(`,"${name}",{enumerable:!0,get:function`));
    if (!line) throw new Error(`Paseo locale module not found: ${name}`);
    const exports: MetroExports = {};
    runInNewContext(line, {
      __d(factory: LocaleFactory, id: number, dependencies: number[]) {
        factory(undefined, (dependency) => {
          const module = modules.get(dependency);
          if (!module) throw new Error(`Missing locale dependency ${dependency} for ${name}`);
          return module;
        }, undefined, undefined, { exports }, exports, dependencies);
        modules.set(id, exports);
      },
    }, { timeout: 1_000 });
    if (name === "zhCN") return exports.zhCN as MetroExports;
  }
  throw new Error("Paseo did not export its zhCN dictionary");
}

function lookup(root: unknown, path: string): unknown {
  let node = root;
  for (const key of path.split(".")) {
    if (!node || typeof node !== "object" || !Object.hasOwn(node, key)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

function interpolations(text: string): string[] {
  return (text.match(/\{\{[^{}]+\}\}/g) ?? []).sort();
}

const retainedEnglish = new Set(`
  ai antigravity anthropic api bitbucket ci claude cli cmd codex cookie ctrl enter esc forgejo
  gemini git gitea github gitlab html http https intel issue json localhost markdown mcp mr navigator
  npm openai paseo pr qr rosetta shell ssh ssl tailnet tailscale tcp tls tokens ultra ultracode url vim vpn
`.trim().split(/\s+/));

function englishWords(text: string): string[] {
  // Ignore placeholders, code, variables and product or protocol terms.
  const copy = text
    .replace(/\{\{[^{}]+\}\}|`[^`]*`|\$[A-Z_]+/g, "")
    .toLowerCase()
    .replace(/\b(?:app store|apple silicon|google play|owner\/slug|requestpermission|test plan|web notification api)\b|设计\s*token\b/g, "");
  return (copy.match(/[a-z]+/g) ?? []).filter((word) => !retainedEnglish.has(word));
}

it.skipIf(bundleFiles.length === 0)("matches built-in Paseo 0.17.x and 0.18.x keys and interpolation tokens", () => {
  const host = loadHostDictionary();
  const allowedMissing = hostSeries === "17" ? addedIn018 : removedIn018;
  for (const [path, translation] of entries(paseoZhOverrides)) {
    const original = lookup(host, path);
    if (original === undefined && allowedMissing.has(path)) continue;
    expect(typeof original, path).toBe("string");
    const hostText = original as string;
    expect(interpolations(translation), path).toEqual(interpolations(hostText));
    if (hostSeries === "18") {
      const remainingWords = new Set(englishWords(translation));
      expect(
        englishWords(hostText).some((word) => !remainingWords.has(word)),
        `${path}: override must translate English words still present in "${hostText}"`,
      ).toBe(true);
    }
  }
});
