import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import React, { useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const jsx = require("react/jsx-runtime");
const rawReact = require("react");
const bundlePath = process.env.PASEO_TEST_BUNDLE;

// Exact namespace shape used by Metro in Paseo v0.15.4's plugins/evaluate.ts:
// named exports are getters; `default` points to the underlying CommonJS module.
function hostNamespace(module: Record<string, unknown>) {
  const result: Record<string, unknown> = { default: module };
  for (const key of Object.keys(module)) {
    Object.defineProperty(result, key, { enumerable: true, get: () => module[key] });
  }
  return result;
}

it.skipIf(!bundlePath).each(["ios", "android"])(
  "executes the daemon-compiled bundle with Paseo's %s host module boundary",
  async (platform) => {
    const originalJsx = jsx.jsx;
    const originalCreate = rawReact.createElement;
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
      expect(commands).toHaveLength(1);
      function ThinkingControl(props: Record<string, unknown>) {
        const { surface: _surface, ...rest } = props;
        return jsx.jsx("NativeControl", {
          ...rest,
          style: ({ pressed }: { pressed: boolean }) => [{ flexShrink: 1 }, pressed && { opacity: 0.8 }],
        });
      }
      function Controls(props: Record<string, unknown>) {
        const ref = useRef(null);
        return jsx.jsx(ThinkingControl, {
          testID: "agent-controls-thinking", ref,
          surface: "toolbar",
          label: "Thinking", value: (props.thinkingOptions as any[])[0].label,
          showToolbarLabel: (props.presentation as Record<string, unknown>).showThinkingLabel,
          accessibilityLabel: `Select thinking option (${(props.thinkingOptions as any[])[0].label})`,
        });
      }
      await act(() => {
        app = create(jsx.jsxs("NativeView", { children: ["claude", "codex"].map((provider) =>
          jsx.jsx(Controls, {
            provider, thinkingOptions: [{ id: "ultra", label: "Ultra code" }],
            modelSelectorProviders: [], comboboxThinkingOptions: [{ id: "ultra", label: "Ultra code" }],
            thinkingAnchorRef: rawReact.createRef(), canSelectThinking: true, glyphSize: 20,
            displayThinking: "Ultra code",
            presentation: {
              showThinkingLabel: false, showModeLabel: true, showCarets: false, aggregateFeatures: true,
            },
            modeControl: { modeOptions: [{ id: "full", label: "Full access" }], selectedModeId: "full" },
            features: [{ id: "speed", type: "toggle" }, { id: "plan", type: "toggle" }],
          }, provider),
        ) }));
      });
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
      await act(() => release!());
      expect(app!.root.findAllByType("NativeControl").map((node) => node.props.value))
        .toEqual(["Ultra code", "Ultra code"]);
    } finally {
      if (app) await act(() => app!.unmount());
      if (settings) await act(() => settings!.unmount());
      release?.();
      error.mockRestore();
    }
    expect(jsx.jsx).toBe(originalJsx);
    expect(rawReact.createElement).toBe(originalCreate);
  },
);
