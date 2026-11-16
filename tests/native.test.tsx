import React, { createRef, useRef, useState, type ReactNode } from "react";
import JsxRuntime from "react/jsx-runtime";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Yoga from "yoga-layout";
import { installNative } from "../client/native";
import type { TranslationController } from "../client/web";

const nativeMetrics = vi.hoisted(() => ({ fontScale: 1 }));
vi.mock("react-native", () => ({
  View: "NativeMeasure", useWindowDimensions: () => nativeMetrics,
}));

// Matches the native AgentControls -> AgentControlTrigger -> Combobox prop
// boundaries in getpaseo/paseo v0.15.4. Host JSX calls use the real shared runtime.
const rawReact = React as unknown as { createElement: (...args: unknown[]) => React.ReactElement };
const rawJsx = JsxRuntime as unknown as {
  jsx: (...args: unknown[]) => React.ReactElement;
  jsxs: (...args: unknown[]) => React.ReactElement;
};
const initialCreate = rawReact.createElement;
const initialJsx = rawJsx.jsx;
const initialJsxs = rawJsx.jsxs;
let controller: TranslationController | undefined;
let renderer: ReactTestRenderer | undefined;
let selected: string[] = [];
const levels = [
  { id: "low", label: "Low" }, { id: "medium", label: "Medium" },
  { id: "high", label: "High" }, { id: "xhigh", label: "Extra high" },
  { id: "max", label: "Max" }, { id: "ultra", label: "Ultra code" },
];

function Control(props: Record<string, unknown>) {
  return rawJsx.jsx("NativeControl", { ...props });
}
function Option(props: Record<string, unknown>) {
  return rawJsx.jsx("NativeOption", { ...props });
}
function Menu({ options, open, onSelect, header, title }: Record<string, unknown>) {
  if (!open) return null;
  return rawJsx.jsxs("NativeMenu", {
    header, title,
    children: (options as typeof levels).map((option) => rawJsx.jsx(Option, {
      label: option.label, selected: false, active: false,
      onPress: () => (onSelect as (id: string) => void)(option.id),
    }, option.id)),
  });
}
function HostControls(props: Record<string, unknown>) {
  const anchorRef = useRef(null);
  const modeAnchor = useRef(null);
  const [open, setOpen] = useState(false);
  const thinkingOptions = props.thinkingOptions as typeof levels;
  const modes = (props.modeOptions ?? [{ id: "full-access", label: "Full access" }]) as typeof levels;
  return rawJsx.jsxs("NativeView", { children: [
    rawJsx.jsx("NativeModel", { label: props.model ?? "Max" }),
    rawJsx.jsx(Control, {
      testID: props.compact ? "agent-controls-thinking" : "agent-thinking-selector",
      ref: anchorRef, label: "Thinking", value: thinkingOptions[4].label,
      accessibilityLabel: `Select thinking option (${thinkingOptions[4].label})`,
      onPress: () => setOpen(!open),
    }),
    rawJsx.jsx(Menu, {
      anchorRef, options: thinkingOptions, open,
      onOpenChange: setOpen, onSelect: (id: string) => selected.push(id), title: "Thinking",
      presentation: props.compact ? "push" : undefined,
    }),
    rawJsx.jsx(Control, {
      testID: "mode-control", ref: modeAnchor,
      label: "Mode", value: modes[0].label,
      accessibilityLabel: `Select agent mode (${modes[0].label})`,
    }),
    rawJsx.jsx(Menu, {
      anchorRef: modeAnchor, options: modes, open: true,
      onOpenChange: () => {}, onSelect: (id: string) => selected.push(id),
      header: { title: "Mode", search: { placeholder: "Search modes...", onChange: () => {} } },
    }),
  ] });
}
function group(provider: string, extra: Record<string, unknown> = {}) {
  return rawJsx.jsx(HostControls, {
    provider, thinkingOptions: levels, modelSelectorProviders: [],
    onSelectThinkingOption: (id: string) => selected.push(id),
    ...extra,
  });
}
async function mount(element: ReactNode) {
  await act(() => { renderer = create(element); });
  return renderer!;
}
function controls() { return renderer!.root.findAllByType("NativeControl"); }
function options() { return renderer!.root.findAllByType("NativeOption").map((node) => node.props.label); }

// AgentControlTrigger supplies the toolbar style to ComboboxTrigger, which
// forwards the callback to Pressable. Preserve that boundary, ref and state.
const toolbarStyle = (state: { pressed: boolean; hovered: boolean }) => [
  { height: 28, minWidth: 0, flexShrink: 1 },
  state.hovered && { backgroundColor: "hover-color" },
  state.pressed && { opacity: 0.8 },
];
function Trigger(props: Record<string, unknown>) {
  return rawJsx.jsx("NativePressable", { ...props });
}
function ToolbarControl(props: Record<string, unknown>) {
  const { surface: _surface, ...rest } = props;
  return rawJsx.jsx(Trigger, { ...rest, style: toolbarStyle });
}
function Toolbar(props: Record<string, unknown>) {
  const ref = useRef(null);
  return rawJsx.jsxs("NativeView", { children: [
    rawJsx.jsx(ToolbarControl, {
      testID: "agent-thinking-selector", ref, surface: props.surface ?? "toolbar",
      label: "Thinking", value: props.displayThinking ?? "Ultra code", showToolbarLabel: props.showToolbarLabel ?? true,
      onPress: props.onPress,
    }),
    rawJsx.jsx(ToolbarControl, {
      testID: "mode-control", surface: props.surface ?? "toolbar",
      label: "Mode", value: "Full access", showToolbarLabel: props.showModeLabel ?? props.showToolbarLabel ?? true,
    }),
    rawJsx.jsx(Trigger, { testID: "agent-controls-model", value: "Max", style: toolbarStyle }),
  ] });
}
function flattenStyle(value: unknown): Record<string, unknown> {
  return Array.isArray(value) ? Object.assign({}, ...value.map(flattenStyle))
    : typeof value === "object" && value !== null ? value : {};
}
function pressableStyles() {
  return renderer!.root.findAllByType("NativePressable").map((node) =>
    flattenStyle(node.props.style({ pressed: true, hovered: true, focused: true })),
  );
}
function layoutToolbar(available: number, fontScale: number, shrink: number[]) {
  const root = Yoga.Node.create();
  root.setWidth(available);
  root.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
  root.setGap(Yoga.GUTTER_COLUMN, 4);
  // Long routed model, thinking label, permission label, two feature icons.
  const natural = [310 * fontScale, 44 + 70 * fontScale, 44 + 56 * fontScale, 28, 28];
  try {
    const nodes = natural.map((width, i) => {
      const node = Yoga.Node.create();
      node.setWidth(width);
      node.setMinWidth(0);
      node.setFlexShrink(shrink[i] ?? 0);
      root.insertChild(node, i);
      return node;
    });
    root.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
    return { natural, widths: nodes.map((node) => node.getComputedWidth()),
      right: nodes.at(-1)!.getComputedLeft() + nodes.at(-1)!.getComputedWidth() };
  } finally {
    root.freeRecursive();
  }
}

function AdaptiveToolbar(props: Record<string, any>) {
  return rawJsx.jsx(Toolbar, {
    provider: props.provider, modelSelectorProviders: props.modelSelectorProviders,
    thinkingOptions: props.thinkingOptions, displayThinking: props.displayThinking,
    showToolbarLabel: props.presentation.showThinkingLabel,
    showModeLabel: props.presentation.showModeLabel,
  });
}
const condensed = {
  showCarets: false, showThinkingLabel: false, showModeLabel: true, aggregateFeatures: true,
};
function adaptiveToolbar(extra: Record<string, unknown> = {}) {
  return rawJsx.jsx(AdaptiveToolbar, {
    provider: "codex", modelSelectorProviders: [], comboboxThinkingOptions: levels,
    thinkingOptions: levels, thinkingAnchorRef: createRef(), glyphSize: 20, canSelectThinking: true,
    displayThinking: "Extra high", presentation: condensed,
    modeControl: { modeOptions: [{ id: "full-access", label: "Full access" }], selectedModeId: "full-access" },
    features: [{ id: "speed", type: "toggle" }, { id: "plan", type: "toggle" }],
    ...extra,
  });
}
async function measureToolbar(width: number) {
  await act(() => renderer!.root.findByType("NativeMeasure").props.onLayout({
    nativeEvent: { layout: { width } },
  }));
}

beforeEach(() => {
  nativeMetrics.fontScale = 1;
  selected = [];
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
  expect(rawReact.createElement).toBe(initialCreate);
  expect(rawJsx.jsx).toBe(initialJsx);
  expect(rawJsx.jsxs).toBe(initialJsxs);
});

describe("native render adapter", () => {
  it("restores the tablet effort label using the actual local row width and keeps feature grouping", async () => {
    controller = installNative();
    await mount(adaptiveToolbar());
    await measureToolbar(430);
    const controls = renderer!.root.findAllByType("NativePressable");
    expect(controls[0].props.value).toBe("极高");
    expect(controls[0].props.showToolbarLabel).toBe(true);
    expect(controls[1].props.showToolbarLabel).toBe(true);
    expect(renderer!.root.findByType(AdaptiveToolbar).props.presentation.aggregateFeatures).toBe(true);
    await measureToolbar(280);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(false);
    await measureToolbar(430);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(true);
    await act(() => controller!.setEnabled(false));
    expect(renderer!.root.findByType(AdaptiveToolbar).props.presentation).toBe(condensed);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(false);
    await act(() => controller!.setEnabled(true));
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(true);
  });

  it("budgets larger system fonts and the longer Claude Ultracode label before revealing effort", async () => {
    nativeMetrics.fontScale = 2;
    controller = installNative();
    await mount(adaptiveToolbar({ provider: "claude", displayThinking: "Ultra code" }));
    await measureToolbar(430);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(false);
    await measureToolbar(680);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(true);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.value).toBe("Ultracode");
  });

  it("leaves a tablet's tight icon layout intact at small split-view widths", async () => {
    controller = installNative();
    const tight = { ...condensed, showModeLabel: false };
    await mount(adaptiveToolbar({ presentation: tight }));
    await measureToolbar(260);
    expect(renderer!.root.findByType(AdaptiveToolbar).props.presentation).toBe(tight);
    expect(renderer!.root.findAllByType("NativePressable").slice(0, 2)
      .map((node) => node.props.showToolbarLabel)).toEqual([false, false]);
  });

  it("reserves native toolbar label widths while preserving trigger styles, refs and actions", async () => {
    const onPress = vi.fn();
    controller = installNative();
    await mount(rawJsx.jsx(Toolbar, {
      provider: "codex", modelSelectorProviders: [], thinkingOptions: levels, onPress,
    }));
    const styles = pressableStyles();
    expect(styles.slice(0, 2).map((style) => style.flexShrink)).toEqual([0, 0]);
    expect(styles[0]).toMatchObject({ height: 28, backgroundColor: "hover-color", opacity: 0.8 });
    expect(styles[2].flexShrink).toBe(1);
    const pressable = renderer!.root.findAllByType("NativePressable")[0];
    expect(pressable.props.value).toBe("Ultra");
    expect(pressable.props.ref).toBe(renderer!.root.findAllByType(ToolbarControl)[0].props.ref);
    await act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalledOnce();
    await act(() => controller!.setEnabled(false));
    expect(pressableStyles().map((style) => style.flexShrink)).toEqual([1, 1, 1]);
    await act(() => controller!.setEnabled(true));
    expect(pressableStyles().map((style) => style.flexShrink)).toEqual([0, 0, 1]);
  });

  it.each([[430, 1], [560, 1.4], [720, 2]])(
    "keeps tablet controls in the row at width %s and font scale %s with Yoga",
    async (available, fontScale) => {
      const baseline = layoutToolbar(available, fontScale, [1, 1, 1]);
      expect(baseline.widths[1]).toBeLessThan(baseline.natural[1]);
      controller = installNative();
      await mount(rawJsx.jsx(Toolbar, {
        provider: "claude", modelSelectorProviders: [], thinkingOptions: levels,
      }));
      const styles = pressableStyles();
      const fixed = layoutToolbar(available, fontScale, [1, ...styles.slice(0, 2).map((s) => Number(s.flexShrink))]);
      expect(fixed.widths[1]).toBeCloseTo(fixed.natural[1], 0);
      expect(fixed.widths[2]).toBeCloseTo(fixed.natural[2], 0);
      expect(fixed.widths[0]).toBeGreaterThan(40);
      expect(fixed.widths[0]).toBeLessThan(baseline.widths[0]);
      expect(fixed.right).toBeLessThanOrEqual(available);
    },
  );

  it("keeps native sheet row widths and compact icon presentation unchanged", async () => {
    controller = installNative();
    await mount(rawJsx.jsx(Toolbar, {
      provider: "codex", modelSelectorProviders: [], thinkingOptions: levels, surface: "sheet",
    }));
    expect(pressableStyles().map((style) => style.flexShrink)).toEqual([1, 1, 1]);
    await act(() => renderer!.update(rawJsx.jsx(Toolbar, {
      provider: "codex", modelSelectorProviders: [], thinkingOptions: levels, showToolbarLabel: false,
    })));
    expect(renderer!.root.findAllByType("NativePressable").slice(0, 2)
      .map((node) => node.props.showToolbarLabel)).toEqual([false, false]);
  });

  it.each(["claude", "codex"])("renders %s's thinking labels and keeps original option IDs", async (provider) => {
    controller = installNative();
    expect(controller.supported).toBe(true);
    await mount(group(provider));
    expect(controls()[0].props.value).toBe(provider === "claude" ? "最高" : "最大");
    expect(controls()[0].props.label).toBe("思考强度");
    expect(controls()[0].props.accessibilityLabel).toBe(
      provider === "claude" ? "选择思考强度（最高）" : "选择思考强度（最大）",
    );
    await act(() => controls()[0].props.onPress());
    expect(options().slice(0, 6)).toEqual(provider === "claude"
      ? ["低", "中", "高", "极高", "最高", "Ultracode"]
      : ["轻度", "中", "高", "极高", "最大", "Ultra"]);
    await act(() => renderer!.root.findAllByType("NativeOption")[4].props.onPress());
    expect(selected).toEqual(["max"]);
    expect(levels[4]).toEqual({ id: "max", label: "Max" });
  });

  it("localizes native push sheets and their search placeholders", async () => {
    controller = installNative();
    await mount(group("claude", { compact: true }));
    expect(controls()[0].props.testID).toBe("agent-controls-thinking");
    expect(controls()[1].props.value).toBe("完全访问");
    const menu = renderer!.root.findByType("NativeMenu");
    expect(menu.props.header.title).toBe("模式");
    expect(menu.props.header.search.placeholder).toBe("搜索模式…");
    await act(() => controls()[0].props.onPress());
    expect(options()[0]).toBe("低");
  });

  it("leaves chat content, input content and model labels unchanged", async () => {
    controller = installNative();
    await mount(rawJsx.jsxs("NativeView", { children: [
      rawJsx.jsx("NativeChat", { children: "Low Max Full access" }),
      rawJsx.jsx("NativeInput", { value: "High", placeholder: "Plan" }),
      group("claude", { model: "Max" }),
    ] }));
    expect(renderer!.root.findByType("NativeChat").props.children).toBe("Low Max Full access");
    expect(renderer!.root.findByType("NativeInput").props.value).toBe("High");
    expect(renderer!.root.findByType("NativeModel").props.label).toBe("Max");
  });

  it("does not translate model pickers sharing the same Combobox component", async () => {
    function WithModelPicker(props: Record<string, unknown>) {
      const modelAnchor = useRef(null);
      return rawJsx.jsxs("NativeView", { children: [
        rawJsx.jsx(Control, { testID: "agent-controls-model", label: "Model", value: "Max", ref: modelAnchor }),
        rawJsx.jsx(Menu, {
          anchorRef: modelAnchor, options: [{ id: "Max", label: "Max" }], open: true,
          onOpenChange: () => {}, onSelect: () => {},
        }),
      ] });
    }
    controller = installNative();
    await mount(rawJsx.jsx(WithModelPicker, {
      provider: "claude", thinkingOptions: levels, modelSelectorProviders: [],
    }));
    expect(options()).toEqual(["Max"]);
    expect(controls()[0].props.value).toBe("Max");
  });

  it("does not wrap unrelated menus or menu-item component types", () => {
    controller = installNative();
    const item = rawJsx.jsx(Option, {
      label: "Max", selected: false, active: false, onPress: () => {},
    });
    const unrelated = rawJsx.jsx(Menu, {
      anchorRef: createRef(), options: levels, open: true,
      onOpenChange: () => {}, onSelect: () => {},
    });
    expect(item.type).toBe(Option);
    expect(unrelated.type).toBe(Menu);
  });

  it("restores mounted controls and open menus when disabled, then reenables without resetting selection state", async () => {
    controller = installNative();
    await mount(group("claude"));
    await act(() => controls()[0].props.onPress());
    expect(options()[4]).toBe("最高");
    await act(() => controller!.setEnabled(false));
    expect(controls()[0].props.value).toBe("Max");
    expect(options()[4]).toBe("Max");
    await act(() => controller!.setEnabled(true));
    expect(controls()[0].props.value).toBe("最高");
    expect(options()[4]).toBe("最高");
  });

  it("restores mounted controls and original runtime exports during cleanup", async () => {
    controller = installNative();
    await mount(group("claude"));
    await act(() => controller!.dispose());
    expect(controls()[0].props.value).toBe("Max");
    expect(rawJsx.jsx).toBe(initialJsx);
  });

  it("keeps provider contexts isolated in parallel composers", async () => {
    controller = installNative();
    await mount(rawJsx.jsxs("NativeView", { children: [group("claude"), group("codex")] }));
    expect(controls().filter((node) => node.props.testID === "agent-thinking-selector")
      .map((node) => node.props.value)).toEqual(["最高", "最大"]);
  });

  it("preserves feature values, IDs and event handlers", async () => {
    const onSetFeature = vi.fn();
    const speed = {
      id: "speed", type: "select", value: "fast", label: "Speed", tooltip: "Speed: Fast",
      options: [{ id: "fast", label: "Fast" }, { id: "standard", label: "Standard" }],
    };
    let received: Record<string, unknown>;
    function FeatureGroup(props: Record<string, unknown>) {
      received = props;
      return rawJsx.jsx("NativeFeature", props);
    }
    controller = installNative();
    await mount(rawJsx.jsx(FeatureGroup, {
      provider: "codex", thinkingOptions: levels, modelSelectorProviders: [], features: [speed], onSetFeature,
    }));
    const value = (received!.features as typeof speed[])[0];
    expect(value).toEqual({
      ...speed, label: "速度", tooltip: "速度：快速",
      options: [{ id: "fast", label: "快速" }, { id: "standard", label: "标准" }],
    });
    expect(received!.onSetFeature).toBe(onSetFeature);
    expect(speed.label).toBe("Speed");
  });

  it("supports the host's manual React.createElement path", async () => {
    controller = installNative();
    await mount(rawReact.createElement(HostControls, {
      provider: "claude", thinkingOptions: levels, modelSelectorProviders: [],
    }));
    expect(controls()[0].props.value).toBe("最高");
  });

  it("replaces an earlier installation without letting old cleanup undo the new hooks", async () => {
    controller = installNative();
    const previous = controller;
    controller = installNative();
    previous.dispose();
    await mount(group("claude"));
    expect(controls()[0].props.value).toBe("最高");
  });

  it("safely reports unsupported when the client does not expose a writable render runtime", () => {
    const descriptor = Object.getOwnPropertyDescriptor(rawJsx, "jsx")!;
    Object.defineProperty(rawJsx, "jsx", { ...descriptor, writable: false });
    try {
      controller = installNative();
      expect(controller.supported).toBe(false);
      expect(rawJsx.jsxs).toBe(initialJsxs);
      expect(rawReact.createElement).toBe(initialCreate);
    } finally {
      Object.defineProperty(rawJsx, "jsx", descriptor);
    }
  });

  it("does not remove a later plugin's hook when this plugin is unloaded", () => {
    controller = installNative();
    const ours = rawJsx.jsx;
    const later = (...args: unknown[]) => ours(...args);
    rawJsx.jsx = later;
    controller.dispose();
    expect(rawJsx.jsx).toBe(later);
    expect(rawReact.createElement).toBe(initialCreate);
    rawJsx.jsx = initialJsx;
  });
});
