import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React, { useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const jsx = require("react/jsx-runtime");
const rawReact = require("react");
const bundlePath = process.env.PASEO_TEST_BUNDLE;

// Namespace shape used by Metro in Paseo 0.15.4 and 0.16's plugins/evaluate.ts:
// named exports are getters; `default` points to the underlying CommonJS module.
function hostNamespace(module: Record<string, unknown>) {
  const result: Record<string, unknown> = { default: module };
  for (const key of Object.keys(module)) {
    Object.defineProperty(result, key, { enumerable: true, get: () => module[key] });
  }
  return result;
}

it.skipIf(!bundlePath).each([
  ["0.15", "ios"], ["0.15", "android"], ["0.16", "ios"], ["0.16", "android"],
  ["0.17", "ios"], ["0.17", "android"],
])(
  "executes the daemon-compiled bundle with Paseo %s's %s host boundary",
  async (version, platform) => {
    const usesItems = version === "0.16" || version === "0.17";
    const originalJsx = jsx.jsx;
    const originalCreate = rawReact.createElement;
    const originalUseContext = rawReact.useContext;
    let release: (() => void) | undefined;
    let app: ReactTestRenderer | undefined;
    let settings: ReactTestRenderer | undefined;
    let Settings: React.ComponentType<any> | undefined;
    const commands: unknown[] = [];
    const error = vi.spyOn(console, "error").mockImplementation((message, ...args) => {
      if (!String(message).includes("react-test-renderer is deprecated")) {
        throw new Error([message, ...args].join(" "));
      }
    });
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    try {
      const factory = (0, eval)(readFileSync(bundlePath!, "utf8"));
      const exported = factory((name: string) => {
        if (name === "react") return hostNamespace(rawReact);
        if (name === "react/jsx-runtime") return hostNamespace(jsx);
        if (name === "react-native") return {
          Platform: { OS: platform }, Pressable: "NativePressable",
          ScrollView: "NativeScrollView", Text: "NativeText", View: "NativeView",
          useWindowDimensions: () => ({ fontScale: 1 }),
        };
        throw new Error(`Unexpected native runtime dependency: ${name}`);
      });
      release = exported.default({
        addSettingsScreen: ({ Component }: { Component: React.ComponentType }) => {
          Settings = Component;
          return () => {};
        },
        addCommandCenterItem: (command: unknown) => { commands.push(command); return () => {}; },
      });
      expect(jsx.jsx).not.toBe(originalJsx);
      expect(rawReact.useContext).not.toBe(originalUseContext);
      expect(commands).toHaveLength(1);
      const I18nContext = rawReact.createContext(null);
      const zhBundle: Record<string, any> = {
        subagents: { title: "Subagents", pillLabelOne: "1 个 subagent", pillLabelMany: "{{count}}个subagent" },
      };
      const i18nListeners = new Map<string, Set<(...args: unknown[]) => void>>();
      const mockI18n = {
        language: "zh-CN",
        resolvedLanguage: "zh-CN",
        getResourceBundle: (lng: string, ns: string) => (lng === "zh-CN" && ns === "translation" ? zhBundle : undefined),
        addResourceBundle: (lng: string, ns: string, patch: Record<string, any>) => {
          if (lng !== "zh-CN" || ns !== "translation") return;
          for (const [k, v] of Object.entries(patch)) {
            if (v && typeof v === "object" && !Array.isArray(v)) {
              zhBundle[k] = { ...(zhBundle[k] ?? {}), ...v };
            } else {
              zhBundle[k] = v;
            }
          }
        },
        on: (event: string, listener: (...args: unknown[]) => void) => {
          let set = i18nListeners.get(event);
          if (!set) { set = new Set(); i18nListeners.set(event, set); }
          set.add(listener);
        },
        off: (event: string, listener: (...args: unknown[]) => void) => {
          i18nListeners.get(event)?.delete(listener);
        },
        emit: (event: string, ...args: unknown[]) => {
          for (const listener of Array.from(i18nListeners.get(event) ?? [])) listener(...args);
        },
      };
      function SubagentPill() {
        const ctx = rawReact.useContext(I18nContext) as { i18n: typeof mockI18n } | null;
        const rev = useRef(0);
        const subscribe = rawReact.useCallback((notify: () => void) => {
          const onChange = () => { rev.current += 1; notify(); };
          ctx!.i18n.on("languageChanged", onChange);
          return () => ctx!.i18n.off("languageChanged", onChange);
        }, [ctx]);
        rawReact.useSyncExternalStore(subscribe, () => rev.current, () => rev.current);
        const text = String(zhBundle.subagents.pillLabelMany).replace("{{count}}", "2");
        return jsx.jsx("NativeSubagentPill", { children: text });
      }
      function ThinkingControl(props: Record<string, unknown>) {
        const { surface: _surface, ...rest } = props;
        return jsx.jsx("NativeControl", {
          ...rest,
          style: ({ pressed }: { pressed: boolean }) => [{ flexShrink: 1 }, pressed && { opacity: 0.8 }],
        });
      }
      function Controls(props: Record<string, unknown>) {
        const ref = useRef(null);
        const item = (props.thinkingItems as any[] | undefined)?.[0];
        const label = item?.choices[0].label ?? (props.thinkingOptions as any[])[0].label;
        return jsx.jsx(ThinkingControl, {
          testID: "agent-controls-thinking", ref,
          surface: "toolbar",
          label: "Thinking", value: label,
          showToolbarLabel: item ? !item.iconOnly
            : (props.presentation as Record<string, unknown>).showThinkingLabel,
          accessibilityLabel: `Select thinking option (${label})`,
        });
      }
      function WordBoundaryModelLabel(props: Record<string, unknown>) {
        return jsx.jsx("WordBoundaryLabel", props);
      }
      function FoldedModel(props: Record<string, unknown>) {
        return jsx.jsx(WordBoundaryModelLabel, {
          text: "GPT-6.1 Sol · routing group", testID: "combined-model-selector-model-label",
          style: { fontSize: 17, minWidth: 0, flexShrink: 1 },
        });
      }
      function ModeTrigger(props: Record<string, unknown>) {
        return jsx.jsx("NativeModeTrigger", props);
      }
      function ModeMenu(props: Record<string, unknown>) {
        return jsx.jsx("NativeModeMenu", props);
      }
      function ModeControl(props: Record<string, unknown>) {
        const anchorRef = useRef(null);
        const modeOptions = props.modeOptions as { id: string; label: string }[];
        const current = modeOptions.find((option) => option.id === props.selectedModeId) ?? modeOptions[0];
        return jsx.jsxs("NativeView", { children: [
          jsx.jsx(ModeTrigger, {
            testID: "mode-control", ref: anchorRef, surface: "toolbar",
            label: "Mode", value: current.label,
            accessibilityLabel: `选择 Agent mode（${current.label}）`,
          }),
          jsx.jsx(ModeMenu, {
            anchorRef, options: modeOptions, value: current.id, open: true,
            onOpenChange: () => {}, onSelect: props.onSelectMode,
            header: {
              title: "Mode",
              search: { placeholder: "搜索 modes...", testID: "mode-search-input", onChange: () => {} },
            },
          }),
        ] });
      }
      function AntigravityControls(props: Record<string, unknown>) {
        const thinkingRef = useRef(null);
        const item = (props.thinkingItems as any[])[0];
        const selectedChoice = item.choices.find((choice: any) => choice.value === item.value);
        return jsx.jsxs("NativeView", { children: [
          jsx.jsx("NativeAntigravityThinking", {
            testID: item.testID, ref: thinkingRef, surface: "toolbar",
            label: item.title, value: selectedChoice.label, choices: item.choices,
          }),
          jsx.jsx(ModeControl, props.modeControl as Record<string, unknown>),
        ] });
      }
      await act(async () => {
        app = create(jsx.jsxs("NativeView", { children: [...["claude", "codex"].map((provider) =>
          jsx.jsx(Controls, {
            provider, modelSelectorProviders: [],
            ...(usesItems ? {
              thinkingItems: [{
                id: "thinking", testID: "agent-thinking-selector", type: "select", title: "Thinking",
                value: "ultra", choices: [{ value: "ultra", label: "Ultra code" }], iconOnly: true,
              }],
              featureItems: [{ id: "plan", testID: "agent-feature-plan_mode", type: "toggle", title: "Plan mode", value: true }],
              glyphs: { label: { size: 20 }, icon: { size: 20 } },
            } : {
              thinkingOptions: [{ id: "ultra", label: "Ultra code" }],
              comboboxThinkingOptions: [{ id: "ultra", label: "Ultra code" }],
              thinkingAnchorRef: rawReact.createRef(), canSelectThinking: true, glyphSize: 20,
            }),
            displayThinking: "Ultra code",
            presentation: {
              showThinkingLabel: false, showModeLabel: true, showCarets: false, aggregateFeatures: true,
            },
            modeControl: { modeOptions: [{ id: "full", label: "Full access" }], selectedModeId: "full" },
            features: [{ id: "speed", type: "toggle" }, { id: "plan", type: "toggle" }],
          }, provider),
        ), usesItems ? jsx.jsx(FoldedModel, {
          providers: [], selectedProvider: "codex", thinkingLabel: "Extra high", onSelect: () => {},
        }) : null, version === "0.17" ? jsx.jsx(AntigravityControls, {
          provider: "antigravity", modelSelectorProviders: [],
          thinkingItems: [{
            id: "thinking", testID: "agent-thinking-selector", type: "select", title: "Thinking",
            value: "xhigh",
            choices: [
              { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
              { value: "high", label: "High" }, { value: "xhigh", label: "Extra" },
            ],
            iconOnly: false,
          }],
          featureItems: [],
          glyphs: { label: { size: 20 }, icon: { size: 20 } },
          modeControl: {
            provider: "antigravity",
            modeOptions: [
              { id: "default", label: "Default" },
              { id: "accept-edits", label: "Accept edits" },
              { id: "auto", label: "Auto" },
              { id: "plan", label: "Plan" },
              { id: "full-access", label: "Full access" },
            ],
            selectedModeId: "full-access",
            onSelectMode: () => {},
          },
        }) : null, version === "0.17"
          ? jsx.jsx(I18nContext.Provider, { value: { i18n: mockI18n }, children: jsx.jsx(SubagentPill, {}) })
          : null, version === "0.17"
          ? jsx.jsx("NativeFactsRow", {
            testID: "subagents-track-row-facts-ag-1",
            children: "Gemini 4 Neon · High · Full access · 258k / 1m tokens (25%)",
          })
          : null] }));
      });
      if (version === "0.17") {
        expect(rawReact.useContext).toBe(originalUseContext);
        expect(app!.root.findByType("NativeSubagentPill").props.children).toBe("2 个子智能体");
        expect(app!.root.findByType("NativeFactsRow").props.children)
          .toBe("Gemini 4 Neon · 高 · 完全访问 · 258k / 1m tokens (25%)");
      }
      if (usesItems) {
        expect(app!.root.findByType("NativeText").props).toMatchObject({
          children: "GPT-6.1 Sol · routing group", numberOfLines: 1, ellipsizeMode: "tail",
        });
      }
      if (version === "0.17") {
        const agThinking = app!.root.findByType("NativeAntigravityThinking");
        expect(agThinking.props.value).toBe("极高");
        expect(agThinking.props.choices.map((choice: any) => choice.label))
          .toEqual(["轻度", "中", "高", "极高"]);
        const modeTrigger = app!.root.findByType("NativeModeTrigger");
        expect(modeTrigger.props).toMatchObject({
          label: "模式", value: "完全访问", accessibilityLabel: "选择权限模式（完全访问）",
        });
        const modeMenu = app!.root.findByType("NativeModeMenu");
        expect(modeMenu.props.header.title).toBe("模式");
        expect(modeMenu.props.header.search.placeholder).toBe("搜索模式…");
        expect(modeMenu.props.options.map((option: any) => option.label))
          .toEqual(["默认", "自动接受编辑", "自动", "计划", "完全访问"]);
      }
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.value))
        .toEqual(["Ultracode", "Ultra"]);
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.label))
        .toEqual(["思考强度", "思考强度"]);
      await act(() => {
        for (const probe of app!.root.findAllByProps({ testID: "agent-controls-zh-toolbar-measure" })) {
          probe.props.onLayout({ nativeEvent: { layout: { width: 430 } } });
        }
      });
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.showToolbarLabel))
        .toEqual([true, true]);
      const nativeStyle = () => Object.assign({}, ...app!.root.findAllByType("NativeControl")[0]
        .props.style({ pressed: true }).flat(Infinity).filter(Boolean));
      expect(nativeStyle()).toMatchObject({ flexShrink: 0, opacity: 0.8 });
      await act(() => {
        settings = create(React.createElement(Settings!, {
          layout: { compact: true, platform },
          theme: { colors: {
            surface0: "#fff", foreground: "#111", foregroundMuted: "#555", border: "#ddd",
          } },
        }));
      });
      expect(settings!.root.findByType("NativePressable").props.disabled).toBe(false);
      await act(() => settings!.root.findByType("NativePressable").props.onPress());
      if (usesItems) {
        expect(app!.root.findByType("WordBoundaryLabel").props.text).toBe("GPT-6.1 Sol · routing group");
      }
      if (version === "0.17") {
        expect(app!.root.findByType("NativeAntigravityThinking").props.value).toBe("Extra");
        expect(app!.root.findByType("NativeModeTrigger").props.value).toBe("Full access");
        expect(app!.root.findByType("NativeModeMenu").props.header.search.placeholder).toBe("搜索 modes...");
        expect(app!.root.findByType("NativeSubagentPill").props.children).toBe("2个subagent");
        expect(app!.root.findByType("NativeFactsRow").props.children)
          .toBe("Gemini 4 Neon · High · Full access · 258k / 1m tokens (25%)");
      }
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.value))
        .toEqual(["Ultra code", "Ultra code"]);
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.showToolbarLabel))
        .toEqual([false, false]);
      for (const control of app!.root.findAllByType("NativeControl")) {
        expect(control.props.style({ pressed: false })).toEqual([{ flexShrink: 1 }, false]);
      }
      await act(() => settings!.root.findByType("NativePressable").props.onPress());
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.value))
        .toEqual(["Ultracode", "Ultra"]);
      if (version === "0.17") {
        expect(app!.root.findByType("NativeAntigravityThinking").props.value).toBe("极高");
        expect(app!.root.findByType("NativeModeMenu").props.header.search.placeholder).toBe("搜索模式…");
        expect(app!.root.findByType("NativeSubagentPill").props.children).toBe("2 个子智能体");
        expect(app!.root.findByType("NativeFactsRow").props.children)
          .toBe("Gemini 4 Neon · 高 · 完全访问 · 258k / 1m tokens (25%)");
      }
      await act(() => release!());
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.value))
        .toEqual(["Ultra code", "Ultra code"]);
      if (version === "0.17") {
        expect(app!.root.findByType("NativeAntigravityThinking").props.value).toBe("Extra");
        expect(app!.root.findByType("NativeModeMenu").props.header.search.placeholder).toBe("搜索 modes...");
        expect(app!.root.findByType("NativeSubagentPill").props.children).toBe("2个subagent");
        expect(app!.root.findByType("NativeFactsRow").props.children)
          .toBe("Gemini 4 Neon · High · Full access · 258k / 1m tokens (25%)");
      }
    } finally {
      if (app) await act(() => app!.unmount());
      if (settings) await act(() => settings!.unmount());
      release?.();
      error.mockRestore();
    }
    expect(jsx.jsx).toBe(originalJsx);
    expect(rawReact.createElement).toBe(originalCreate);
    expect(rawReact.useContext).toBe(originalUseContext);
  },
);
