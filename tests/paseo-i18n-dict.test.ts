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

it("uses consistent terms for child and parent agents, composer controls and Git actions", () => {
  expect(paseoZhOverrides).toMatchObject({
    subagents: {
      parent: {
        backToParent: "返回父智能体",
        parentAgent: "父智能体",
        openParent: "打开父智能体",
      },
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
      hints: { thinking: "思考模式", mode: "切换模式", model: "切换模型" },
    },
    workspace: {
      git: {
        actions: {
          commit: { label: "提交" },
          pull: { label: "拉取" },
          push: { label: "推送" },
          mergePr: { squash: "压缩合并 PR", rebase: "变基合并 PR" },
        },
      },
    },
  });
});

const appContents = "/Applications/Paseo.app/Contents";
const appInfo = join(appContents, "Info.plist");
const bundleDirectory = join(appContents, "Resources/app-dist/_expo/static/js/web");
const bundleFiles = existsSync(appInfo)
  && /<key>CFBundleShortVersionString<\/key>\s*<string>0\.17\.1<\/string>/.test(readFileSync(appInfo, "utf8"))
  && existsSync(bundleDirectory)
  ? readdirSync(bundleDirectory).filter((file) => /^index-.*\.js$/.test(file))
  : [];

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

it.skipIf(bundleFiles.length === 0)("matches built-in Paseo 0.17.1 keys and interpolation tokens", () => {
  const host = loadHostDictionary();
  for (const [path, translation] of entries(paseoZhOverrides)) {
    const original = lookup(host, path);
    expect(typeof original, path).toBe("string");
    expect(interpolations(translation), path).toEqual(interpolations(original as string));
  }
});
