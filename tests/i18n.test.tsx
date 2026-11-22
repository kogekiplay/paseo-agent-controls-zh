import React, { createContext, useCallback, useRef, useSyncExternalStore, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installI18n } from "../client/i18n";
import type { TranslationController } from "../client/web";
import type { NestedTranslations } from "../shared/paseo-i18n-zh";

const rawReact = React as unknown as { useContext: (...args: unknown[]) => unknown };
const initialUseContext = rawReact.useContext;

type Listener = (...args: unknown[]) => void;

interface MockI18n {
  language: string;
  resolvedLanguage: string;
  resources: Record<string, Record<string, Record<string, unknown>>>;
  listeners: Map<string, Set<Listener>>;
  emitCount: number;
  getResourceBundle(lng: string, ns: string): Record<string, unknown> | undefined;
  addResourceBundle(
    lng: string,
    ns: string,
    bundle: Record<string, unknown>,
    deep?: boolean,
    overwrite?: boolean,
  ): void;
  on(event: string, listener: Listener): void;
  off(event: string, listener: Listener): void;
  emit(event: string, ...args: unknown[]): void;
  t(key: string, params?: Record<string, string | number>): string;
  changeLanguage(lng: string): void;
  loadZhBundle(bundle: Record<string, unknown>): void;
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  overwrite: boolean,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const existing = target[key];
      target[key] = deepMerge(
        typeof existing === "object" && existing !== null && !Array.isArray(existing)
          ? (existing as Record<string, unknown>)
          : {},
        value as Record<string, unknown>,
        overwrite,
      );
    } else if (overwrite || !(key in target)) {
      target[key] = value;
    }
  }
  return target;
}

function lookup(bundle: Record<string, unknown> | undefined, path: string): string | undefined {
  let current: unknown = bundle;
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function createMockI18n(options: {
  language?: string;
  resolvedLanguage?: string;
  zhCN?: Record<string, unknown> | null;
  en?: Record<string, unknown>;
} = {}): MockI18n {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {
    en: {
      translation: structuredClone(options.en ?? {
        subagents: { title: "Subagents", pillLabelOne: "1 subagent", pillLabelMany: "{{count}} subagents" },
      }),
    },
  };
  if (options.zhCN !== null) {
    resources["zh-CN"] = {
      translation: structuredClone(options.zhCN ?? {
        subagents: { title: "Subagents", pillLabelOne: "1 个 subagent", pillLabelMany: "{{count}}个subagent" },
        sidebar: { workspaces: "Workspace", keepUntouched: "保留原样" },
      }),
    };
  }
  const listeners = new Map<string, Set<Listener>>();
  const i18n: MockI18n = {
    language: options.language ?? "zh-CN",
    resolvedLanguage: options.resolvedLanguage ?? options.language ?? "zh-CN",
    resources,
    listeners,
    emitCount: 0,
    getResourceBundle(lng, ns) {
      return resources[lng]?.[ns];
    },
    addResourceBundle(lng, ns, bundle, deep = false, overwrite = false) {
      resources[lng] ??= {};
      const existing = resources[lng][ns];
      if (!existing || !deep) {
        resources[lng][ns] = structuredClone(bundle);
      } else {
        deepMerge(existing, bundle, overwrite);
      }
    },
    on(event, listener) {
      for (const name of event.split(" ")) {
        let set = listeners.get(name);
        if (!set) {
          set = new Set();
          listeners.set(name, set);
        }
        set.add(listener);
      }
    },
    off(event, listener) {
      for (const name of event.split(" ")) {
        listeners.get(name)?.delete(listener);
      }
    },
    emit(event, ...args) {
      if (event === "languageChanged") i18n.emitCount += 1;
      for (const listener of Array.from(listeners.get(event) ?? [])) {
        listener(...args);
      }
    },
    t(key, params) {
      const raw = lookup(resources[i18n.language]?.translation, key)
        ?? lookup(resources.en?.translation, key)
        ?? key;
      return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params?.[name] ?? ""));
    },
    changeLanguage(lng) {
      i18n.language = lng;
      i18n.resolvedLanguage = lng;
      i18n.emit("languageChanged", lng);
    },
    loadZhBundle(bundle) {
      i18n.addResourceBundle("zh-CN", "translation", bundle, false, true);
      i18n.emit("loaded", { "zh-CN": { translation: true } });
    },
  };
  return i18n;
}

// Mirrors Paseo 0.17.1 module 998 (`react-i18next` `useTranslation`):
// reads `{ i18n, defaultNS }` via `React.useContext(I18nContext)` and subscribes
// to `languageChanged` via `useSyncExternalStore`.
const I18nContext = createContext<{ i18n: MockI18n; defaultNS?: string } | null>(null);

function useMockTranslation() {
  const ctx = rawReact.useContext(I18nContext) as { i18n: MockI18n; defaultNS?: string } | null;
  const i18n = ctx!.i18n;
  const revision = useRef(0);
  const subscribe = useCallback((notify: () => void) => {
    const onChange = () => {
      revision.current += 1;
      notify();
    };
    i18n.on("languageChanged", onChange);
    return () => { i18n.off("languageChanged", onChange); };
  }, [i18n]);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => `${i18n.language}:${revision.current}`,
    () => `${i18n.language}:${revision.current}`,
  );
  void snapshot;
  return {
    t: (key: string, params?: Record<string, string | number>) => i18n.t(key, params),
    i18n,
  };
}

function SubagentPill({ count = 2 }: { count?: number }) {
  const { t } = useMockTranslation();
  return React.createElement(
    "NativeView",
    null,
    React.createElement("NativeText", { testID: "subagent-title" }, t("subagents.title")),
    React.createElement(
      "NativeText",
      { testID: "subagent-pill" },
      count === 1 ? t("subagents.pillLabelOne") : t("subagents.pillLabelMany", { count }),
    ),
    React.createElement("NativeText", { testID: "sidebar-ws" }, t("sidebar.workspaces")),
    React.createElement("NativeText", { testID: "sidebar-keep" }, t("sidebar.keepUntouched")),
  );
}

const sampleOverrides: NestedTranslations = {
  subagents: {
    title: "子智能体",
    pillLabelOne: "1 个子智能体",
    pillLabelMany: "{{count}} 个子智能体",
    missingInHost: "不应写入宿主",
  },
  sidebar: {
    workspaces: "工作区",
  },
};

let controller: TranslationController | undefined;
let renderer: ReactTestRenderer | undefined;

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mountWithI18n(i18n: MockI18n, child: ReactNode = React.createElement(SubagentPill)) {
  await act(async () => {
    renderer = create(React.createElement(I18nContext.Provider, { value: { i18n } }, child));
  });
  await flushMicrotasks();
  return renderer!;
}

beforeEach(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation((message, ...args) => {
    if (!String(message).includes("react-test-renderer is deprecated")) {
      throw new Error([message, ...args].join(" "));
    }
  });
});

afterEach(async () => {
  if (renderer) await act(() => renderer!.unmount());
  renderer = undefined;
  controller?.dispose();
  controller = undefined;
  vi.restoreAllMocks();
  expect(rawReact.useContext).toBe(initialUseContext);
});

describe("installI18n runtime resource override", () => {
  it("captures i18n via React.useContext, immediately unhooks useContext, and refreshes subagent labels via microtask", async () => {
    const i18n = createMockI18n();
    controller = installI18n(sampleOverrides);
    expect(controller.supported).toBe(true);
    expect(rawReact.useContext).not.toBe(initialUseContext);

    await mountWithI18n(i18n);

    // Immediately unhooked on first capture so subsequent renders pay zero overhead.
    expect(rawReact.useContext).toBe(initialUseContext);
    expect(renderer!.root.findByProps({ testID: "subagent-title" }).props.children).toBe("子智能体");
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");
    expect(renderer!.root.findByProps({ testID: "sidebar-ws" }).props.children).toBe("工作区");
    expect(renderer!.root.findByProps({ testID: "sidebar-keep" }).props.children).toBe("保留原样");
    // Only leaf keys present in the host zh-CN bundle are written.
    const zhSubagents = i18n.getResourceBundle("zh-CN", "translation")!.subagents as Record<string, unknown>;
    expect("missingInHost" in zhSubagents).toBe(false);
    expect(i18n.emitCount).toBe(1);
  });

  it("waits for lazy-loaded zh-CN resources via the loaded event before applying overrides", async () => {
    const i18n = createMockI18n({ language: "zh-CN", zhCN: null });
    controller = installI18n(sampleOverrides);
    await mountWithI18n(i18n);

    expect(rawReact.useContext).toBe(initialUseContext);
    expect(i18n.getResourceBundle("zh-CN", "translation")).toBeUndefined();
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 subagents");

    await act(async () => {
      i18n.loadZhBundle({
        subagents: { title: "Subagents", pillLabelOne: "1 个 subagent", pillLabelMany: "{{count}}个subagent" },
        sidebar: { workspaces: "Workspace", keepUntouched: "保留原样" },
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");
    expect(renderer!.root.findByProps({ testID: "sidebar-ws" }).props.children).toBe("工作区");
  });

  it("coalesces back-to-back loaded and languageChanged events into a single microtask refresh", async () => {
    const i18n = createMockI18n({ language: "en", zhCN: null });
    controller = installI18n(sampleOverrides);
    await mountWithI18n(i18n);
    expect(i18n.emitCount).toBe(0);

    // Simulate Paseo loading zh-CN and switching language back-to-back.
    let emitsBeforeMicrotask = -1;
    await act(async () => {
      i18n.loadZhBundle({
        subagents: { title: "Subagents", pillLabelOne: "1 个 subagent", pillLabelMany: "{{count}}个subagent" },
        sidebar: { workspaces: "Workspace", keepUntouched: "保留原样" },
      });
      i18n.changeLanguage("zh-CN");
      emitsBeforeMicrotask = i18n.emitCount;
      await Promise.resolve();
      await Promise.resolve();
    });
    // Only the host's own changeLanguage emission fired synchronously; our
    // override refresh was deferred and coalesced into one microtask flush.
    expect(emitsBeforeMicrotask).toBe(1);
    expect(i18n.emitCount).toBe(2);
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");
    expect(renderer!.root.findByProps({ testID: "sidebar-ws" }).props.children).toBe("工作区");
  });

  it("isolates English and other languages without emitting refreshes or modifying en bundles", async () => {
    const i18n = createMockI18n({ language: "en" });
    controller = installI18n(sampleOverrides);
    await mountWithI18n(i18n);

    expect(i18n.emitCount).toBe(0);
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 subagents");
    expect(i18n.getResourceBundle("en", "translation")).toEqual({
      subagents: { title: "Subagents", pillLabelOne: "1 subagent", pillLabelMany: "{{count}} subagents" },
    });

    // Switching to zh-CN renders the overridden Chinese copy immediately.
    await act(async () => {
      i18n.changeLanguage("zh-CN");
      await Promise.resolve();
    });
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");
  });

  it("precisely restores original zh-CN copy on setEnabled(false) and reapplies on setEnabled(true)", async () => {
    const i18n = createMockI18n();
    controller = installI18n(sampleOverrides);
    await mountWithI18n(i18n);
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");

    await act(() => { controller!.setEnabled(false); });
    expect(renderer!.root.findByProps({ testID: "subagent-title" }).props.children).toBe("Subagents");
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2个subagent");
    expect(renderer!.root.findByProps({ testID: "sidebar-ws" }).props.children).toBe("Workspace");

    await act(() => { controller!.setEnabled(true); });
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");

    // Re-applying after host reload preserves the first original snapshot.
    await act(async () => {
      i18n.loadZhBundle({
        subagents: { title: "Subagents", pillLabelOne: "1 个 subagent", pillLabelMany: "{{count}}个subagent" },
        sidebar: { workspaces: "Workspace", keepUntouched: "保留原样" },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");

    await act(() => { controller!.setEnabled(false); });
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2个subagent");
  });

  it("supports starting disabled (initialEnabled = false) and enabling later", async () => {
    const i18n = createMockI18n();
    controller = installI18n(sampleOverrides, false);
    await mountWithI18n(i18n);

    expect(controller.getEnabled()).toBe(false);
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2个subagent");
    expect(i18n.emitCount).toBe(0);

    await act(() => { controller!.setEnabled(true); });
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");
  });

  it("cleans up resources, listeners and useContext on dispose and hot-reload replacement", async () => {
    const i18n = createMockI18n();
    const first = installI18n(sampleOverrides);
    controller = installI18n(sampleOverrides);
    first.dispose();
    await mountWithI18n(i18n);
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2 个子智能体");
    expect(i18n.listeners.get("loaded")?.size).toBe(1);
    expect(i18n.listeners.get("languageChanged")?.size).toBe(2); // component + plugin

    await act(() => { controller!.dispose(); });
    expect(renderer!.root.findByProps({ testID: "subagent-pill" }).props.children).toBe("2个subagent");
    expect(i18n.listeners.get("loaded")?.size).toBe(0);
    expect(i18n.listeners.get("languageChanged")?.size).toBe(1); // component only
    expect(rawReact.useContext).toBe(initialUseContext);
  });

  it("restores useContext when disposed before i18n is captured and degrades safely when non-writable", () => {
    controller = installI18n(sampleOverrides);
    expect(rawReact.useContext).not.toBe(initialUseContext);
    controller.dispose();
    expect(rawReact.useContext).toBe(initialUseContext);

    const descriptor = Object.getOwnPropertyDescriptor(rawReact, "useContext")!;
    Object.defineProperty(rawReact, "useContext", { ...descriptor, writable: false });
    try {
      const degraded = installI18n(sampleOverrides);
      expect(degraded.supported).toBe(false);
      expect(degraded.getEnabled()).toBe(false);
      degraded.setEnabled(true);
      degraded.refresh();
      degraded.dispose();
    } finally {
      Object.defineProperty(rawReact, "useContext", descriptor);
    }
  });
});
