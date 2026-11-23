import React, { createRef, useRef, useState, type ReactNode } from "react";
import JsxRuntime from "react/jsx-runtime";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Yoga from "yoga-layout";
import { installNative } from "../client/native";
import type { TranslationController } from "../client/web";

const nativeMetrics = vi.hoisted(() => ({ fontScale: 1 }));
vi.mock("react-native", () => ({
  Text: "NativeText", View: "NativeMeasure", useWindowDimensions: () => nativeMetrics,
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

// Paseo 0.16's Desktop/SheetAgentControlsContent receives already-built items;
// ComposerControl maps their choice values to Combobox option IDs.
function ItemControls(props: Record<string, any>) {
  return rawJsx.jsxs("NativeView", { children: [
    rawJsx.jsx("NativeModel", { label: props.selectedModelId }),
    ...[...props.thinkingItems, ...props.featureItems].map((item: Record<string, any>) => {
      const choices = item.choices ?? [];
      const value = choices.find((choice: Record<string, any>) => choice.value === item.value)?.label;
      return rawJsx.jsx(ToolbarControl, {
        testID: item.testID, surface: props.surface ?? "toolbar",
        label: item.title, value: value ?? item.valueLabel,
        tooltip: item.tooltip, accessibilityLabel: item.accessibilityLabel,
        showToolbarLabel: !item.iconOnly,
        onPress: () => item.onChange(item.value),
      }, item.id);
    }),
  ] });
}
function itemToolbar(extra: Record<string, unknown> = {}) {
  return rawJsx.jsx(ItemControls, {
    provider: "claude", modelSelectorProviders: [], selectedModelId: "Max",
    thinkingItems: [{
      id: "thinking", type: "select", testID: "agent-thinking-selector", title: "Thinking",
      value: "max", choices: levels.map((option) => ({ value: option.id, label: option.label })),
      iconOnly: true, accessibilityLabel: "Select thinking option (Max)",
      onChange: (id: string) => selected.push(id),
    }],
    featureItems: [{
      id: "feature-service_tier", type: "select", testID: "agent-feature-service_tier",
      title: "Speed", tooltip: "Speed: Fast", value: "Fast",
      choices: [{ value: "Fast", label: "Fast" }, { value: "default", label: "Standard" }],
      onChange: (id: string) => selected.push(id),
    }],
    canSelectModel: true,
    modeControl: { modeOptions: [{ id: "full-access", label: "Full access" }], selectedModeId: "full-access" },
    glyphs: { icon: { size: 20 }, label: { size: 20 } },
    presentation: { ...condensed, foldControls: false, showModelLabel: true },
    ...extra,
  });
}

const routedModel = "GPT-6.1 Sol · routing group";
const modelTextStyle = { fontSize: 17, color: "muted", minWidth: 0, flexShrink: 1 };
function WordBoundaryModelLabel(props: Record<string, unknown>) {
  return rawJsx.jsx("WordBoundaryLabel", props);
}
function FoldedModel(props: Record<string, unknown>) {
  return rawJsx.jsxs("NativeModelTrigger", { onPress: props.onSelect, children: [
    rawJsx.jsx(WordBoundaryModelLabel, {
      testID: "combined-model-selector-model-label", text: routedModel, style: modelTextStyle,
    }),
    rawJsx.jsx("NativeEffortLabel", { children: props.thinkingLabel }),
    rawJsx.jsx("NativeModelOption", { label: "Max", value: "Max" }),
  ] });
}
function foldedModel(onSelect = () => {}) {
  return rawJsx.jsx(FoldedModel, {
    providers: [], selectedProvider: "codex", thinkingLabel: "Extra high", onSelect,
  });
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
  it("renders two host lightning glyphs for the Ultrafast option ID", async () => {
    function Bolt(props: Record<string, unknown>) {
      return rawJsx.jsx("NativeBolt", props);
    }
    function SpeedToolbar({ featureItems }: { featureItems: { icon: typeof Bolt; value: string }[] }) {
      return rawJsx.jsx(featureItems[0].icon, { color: "amber", size: 16, strokeWidth: 1.5 });
    }
    function toolbar(value: string) {
      return rawJsx.jsx(SpeedToolbar, {
        provider: "codex", modelSelectorProviders: [], thinkingItems: [],
        featureItems: [{ testID: "agent-feature-service_tier", type: "select", value, icon: Bolt }],
      });
    }
    controller = installNative();
    await mount(toolbar("ultrafast"));
    const bolts = () => renderer!.root.findAllByType("NativeBolt");
    expect(bolts()).toHaveLength(2);
    for (const bolt of bolts()) {
      expect(bolt.props).toMatchObject({ color: "amber", size: 16, strokeWidth: 1.5 });
    }
    const doubleBolt = renderer!.root.findAllByType("NativeMeasure")
      .find((node) => node.props.pointerEvents === "none");
    expect(doubleBolt?.props.style.width).toBeCloseTo(20.667);
    expect(doubleBolt?.props.style.height).toBe(16);
    expect(bolts().map((bolt) => bolt.props.fill)).toEqual([undefined, "amber"]);
    expect(renderer!.root.findByType(SpeedToolbar).props.featureItems[0].value).toBe("ultrafast");
    await act(() => renderer!.update(toolbar("priority")));
    expect(bolts()).toHaveLength(1);
    expect(bolts()[0].props.size).toBe(16);
    await act(() => renderer!.update(toolbar("ultrafast")));
    expect(bolts()).toHaveLength(2);
    await act(() => controller!.setEnabled(false));
    expect(bolts()).toHaveLength(1);
    expect(bolts()[0].props.size).toBe(16);
  });

  it("widens only the anchored Codex speed menu and preserves its selection", async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    const choices = [{ id: "default", label: "Normal" }, { id: "priority", label: "Fast" }];
    function SpeedMenus({ desktopMinWidth }: { desktopMinWidth?: number }) {
      const speedAnchor = useRef(null);
      const otherAnchor = useRef(null);
      const menuProps = { options: choices, value: "priority", open: true, onSelect, onOpenChange };
      return rawJsx.jsxs("NativeView", { children: [
        rawJsx.jsx(Control, { testID: "agent-feature-service_tier", ref: speedAnchor, surface: "toolbar" }),
        rawJsx.jsx(Menu, { ...menuProps, anchorRef: speedAnchor, desktopMinWidth }),
        rawJsx.jsx(Control, { testID: "agent-feature-other", ref: otherAnchor, surface: "toolbar" }),
        rawJsx.jsx(Menu, { ...menuProps, anchorRef: otherAnchor }),
      ] });
    }
    controller = installNative();
    await mount(rawJsx.jsx(SpeedMenus, {}));
    const menus = () => renderer!.root.findAllByType(Menu).map((node) => node.props);
    expect(menus()[0]).toMatchObject({
      desktopMinWidth: 160,
      value: "priority",
      options: [{ id: "default", label: "普通" }, { id: "priority", label: "快速" }],
      onSelect,
      onOpenChange,
    });
    expect(menus()[1].desktopMinWidth).toBeUndefined();
    await act(() => renderer!.root.findAllByType("NativeOption")[1].props.onPress());
    expect(onSelect).toHaveBeenCalledWith("priority");
    await act(() => renderer!.update(rawJsx.jsx(SpeedMenus, { desktopMinWidth: 220 })));
    expect(menus()[0].desktopMinWidth).toBe(220);
    await act(() => controller!.setEnabled(false));
    expect(menus()[0].options).toBe(choices);
    expect(menus()[0].desktopMinWidth).toBe(220);
    await act(() => renderer!.update(rawJsx.jsx(SpeedMenus, {})));
    expect(menus()[0].desktopMinWidth).toBeUndefined();
  });

  it("uses native tail ellipsis for the folded model without changing its text, font or trigger", async () => {
    const onSelect = vi.fn();
    controller = installNative();
    await mount(foldedModel(onSelect));
    const label = renderer!.root.findByType("NativeText");
    expect(label.props).toMatchObject({
      testID: "combined-model-selector-model-label", children: routedModel,
      numberOfLines: 1, ellipsizeMode: "tail",
    });
    expect(label.props.style).toBe(modelTextStyle);
    expect(renderer!.root.findAllByType("WordBoundaryLabel")).toHaveLength(0);
    expect(renderer!.root.findByType("NativeEffortLabel").props.children).toBe("极高");
    expect(renderer!.root.findByType("NativeModelOption").props).toMatchObject({ label: "Max", value: "Max" });
    await act(() => renderer!.root.findByType("NativeModelTrigger").props.onPress());
    expect(onSelect).toHaveBeenCalledOnce();
    await act(() => controller!.setEnabled(false));
    expect(renderer!.root.findByType("WordBoundaryLabel").props.text).toBe(routedModel);
    expect(renderer!.root.findByType("NativeEffortLabel").props.children).toBe("Extra high");
    await act(() => controller!.setEnabled(true));
    expect(renderer!.root.findByType("NativeText").props.children).toBe(routedModel);
    await act(() => controller!.dispose());
    expect(renderer!.root.findAllByType("NativeText")).toHaveLength(0);
    expect(renderer!.root.findByType("WordBoundaryLabel").props.text).toBe(routedModel);
  });

  it("retains whole-word ellipsis outside the recognized folded model control", async () => {
    controller = installNative();
    await mount(rawJsx.jsxs("NativeView", { children: [
      rawJsx.jsx(WordBoundaryModelLabel, {
        testID: "combined-model-selector-model-label", text: routedModel, style: modelTextStyle,
      }),
      rawJsx.jsx(FoldedModel, {
        provider: "codex", thinkingOptions: levels, modelSelectorProviders: [], onSelect: () => {},
      }),
    ] }));
    expect(renderer!.root.findAllByType("NativeText")).toHaveLength(0);
    expect(renderer!.root.findAllByType("WordBoundaryLabel")).toHaveLength(2);
  });

  it.each(["claude", "codex"])("translates 0.16 %s item arrays without changing IDs or actions", async (provider) => {
    controller = installNative();
    await mount(itemToolbar({ provider }));
    const host = renderer!.root.findByType(ItemControls);
    expect(host.props.thinkingItems[0].choices.map((choice: Record<string, any>) => choice.label))
      .toEqual(provider === "claude"
        ? ["低", "中", "高", "极高", "最高", "Ultracode"]
        : ["轻度", "中", "高", "极高", "最大", "Ultra"]);
    expect(host.props.featureItems[0]).toMatchObject({
      title: "速度", tooltip: "速度：快速", value: "Fast",
      choices: [{ value: "Fast", label: "快速" }, { value: "default", label: "标准" }],
    });
    expect(host.props.modeControl.modeOptions[0]).toEqual({ id: "full-access", label: "完全访问" });
    expect(renderer!.root.findByType("NativeModel").props.label).toBe("Max");
    await act(() => renderer!.root.findAllByType("NativePressable").forEach((node) => node.props.onPress()));
    expect(selected).toEqual(["max", "Fast"]);
  });

  it("restores 0.16 precomputed effort visibility at the local width and cleans up mounted items", async () => {
    controller = installNative();
    await mount(itemToolbar());
    await measureToolbar(430);
    const thinking = () => renderer!.root.findAllByType("NativePressable")[0];
    expect(thinking().props.showToolbarLabel).toBe(true);
    await measureToolbar(280);
    expect(thinking().props.showToolbarLabel).toBe(false);
    nativeMetrics.fontScale = 2;
    await measureToolbar(431);
    expect(thinking().props.showToolbarLabel).toBe(false);
    await measureToolbar(680);
    expect(thinking().props.showToolbarLabel).toBe(true);
    await act(() => controller!.setEnabled(false));
    expect(thinking().props.value).toBe("Max");
    expect(thinking().props.showToolbarLabel).toBe(false);
    await act(() => controller!.setEnabled(true));
    expect(thinking().props.value).toBe("最高");
    await act(() => controller!.dispose());
    expect(thinking().props.value).toBe("Max");
    expect(thinking().props.showToolbarLabel).toBe(false);
  });

  it("keeps 0.16 folded and tight layouts and unrelated plugin items under host control", async () => {
    controller = installNative();
    const unowned = {
      id: "plugin-choice", type: "select", testID: "plugin-choice", title: "High",
      value: "Max", choices: [{ value: "Max", label: "Max" }], onChange: () => {},
    };
    await mount(itemToolbar({ featureItems: [unowned], presentation: {
      ...condensed, foldControls: true,
    } }));
    await measureToolbar(1000);
    expect(renderer!.root.findByType(ItemControls).props.featureItems[0]).toBe(unowned);
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(false);
    await act(() => renderer!.update(itemToolbar({ presentation: {
      ...condensed, showModeLabel: false, foldControls: false,
    } })));
    expect(renderer!.root.findAllByType("NativePressable")[0].props.showToolbarLabel).toBe(false);
  });

  it("translates 0.16 provider option definitions while preserving option storage and callbacks", async () => {
    const onSetOption = vi.fn();
    const values = { service_tier: "priority", plan_mode: true };
    const optionControls = { options: values, onSetOption, controls: [{
      key: "service_tier", type: "select", label: "Speed", tooltip: "Speed: Fast",
      choices: [{ value: "priority", label: "Fast" }, { value: "default", label: "Standard" }],
    }] };
    controller = installNative();
    await mount(itemToolbar({ optionControls }));
    const result = renderer!.root.findByType(ItemControls).props.optionControls;
    expect(result.controls[0]).toMatchObject({ label: "速度", choices: [
      { value: "priority", label: "快速" }, { value: "default", label: "标准" },
    ] });
    expect(result.options).toBe(values);
    expect(result.onSetOption).toBe(onSetOption);
    expect(optionControls.controls[0].label).toBe("Speed");
  });

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

  it("translates Paseo 0.17.1 Antigravity thinking/mode menus, zh-CN search placeholders and preserves search filtering", async () => {
    const agThinking = [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "xhigh", label: "Extra" },
    ];
    const agModes = [
      { id: "default", label: "Default" },
      { id: "accept-edits", label: "Accept edits" },
      { id: "auto", label: "Auto" },
      { id: "plan", label: "Plan" },
      { id: "full-access", label: "Full access" },
    ];
    function ModeControl017(props: Record<string, any>) {
      const anchorRef = useRef(null);
      const [queryText, setQueryText] = useState("");
      const modeOptions = props.modeOptions as { id: string; label: string }[];
      const current = modeOptions.find((option) => option.id === props.selectedModeId) ?? modeOptions[0];
      const filtered = queryText.trim()
        ? modeOptions.filter((option) => option.label.toLowerCase().includes(queryText.trim().toLowerCase()))
        : modeOptions;
      return rawJsx.jsxs("NativeView", { children: [
        rawJsx.jsx(Control, {
          testID: "mode-control", ref: anchorRef, surface: "toolbar",
          label: "Mode", value: current.label,
          accessibilityLabel: `选择 Agent mode（${current.label}）`,
        }),
        rawJsx.jsx(Menu, {
          anchorRef, options: filtered, value: current.id, open: true,
          onOpenChange: () => {}, onSelect: props.onSelectMode,
          header: {
            title: "Mode",
            search: {
              placeholder: props.searchPlaceholder ?? "搜索 modes...",
              testID: "mode-search-input",
              onChange: setQueryText,
            },
          },
        }),
      ] });
    }
    function Antigravity017Toolbar(props: Record<string, any>) {
      const thinkingRef = useRef(null);
      const item = props.thinkingItems[0];
      const selectedChoice = item.choices.find((choice: any) => choice.value === item.value);
      return rawJsx.jsxs("NativeView", { children: [
        rawJsx.jsx("NativeModel", { label: props.selectedModelId }),
        rawJsx.jsx(Control, {
          testID: item.testID, ref: thinkingRef, surface: "toolbar",
          label: item.title, value: selectedChoice.label,
          accessibilityLabel: item.accessibilityLabel,
        }),
        rawJsx.jsx(Menu, {
          anchorRef: thinkingRef,
          options: item.choices.map((choice: any) => ({ id: choice.value, label: choice.label })),
          value: item.value, open: true,
          onOpenChange: () => {}, onSelect: item.onChange,
          header: { title: item.title },
        }),
        rawJsx.jsx(ModeControl017, {
          ...props.modeControl,
          searchPlaceholder: props.searchPlaceholder,
        }),
      ] });
    }
    function renderToolbar(searchPlaceholder = "搜索 modes...") {
      return rawJsx.jsx(Antigravity017Toolbar, {
        provider: "antigravity",
        selectedModelId: "Gemini 4 Neon",
        modelSelectorProviders: [],
        thinkingItems: [{
          id: "thinking", type: "select", testID: "agent-thinking-selector", title: "Thinking",
          value: "high", choices: agThinking, iconOnly: false,
          accessibilityLabel: "选择 thinking 选项（High）",
          onChange: (id: string) => selected.push(id),
        }],
        featureItems: [],
        modeControl: {
          provider: "antigravity",
          modeOptions: agModes,
          selectedModeId: "full-access",
          onSelectMode: (id: string) => selected.push(id),
        },
        glyphs: { icon: { size: 20 }, label: { size: 20 } },
        presentation: { ...condensed, showThinkingLabel: true, foldControls: false },
        searchPlaceholder,
      });
    }

    controller = installNative();
    await mount(renderToolbar("搜索 modes..."));
    expect(renderer!.root.findByType("NativeModel").props.label).toBe("Gemini 4 Neon");
    expect(controls()[0].props).toMatchObject({
      label: "思考强度", value: "高", accessibilityLabel: "选择思考强度（高）",
    });
    expect(controls()[1].props).toMatchObject({
      label: "模式", value: "完全访问", accessibilityLabel: "选择权限模式（完全访问）",
    });
    const menus = () => renderer!.root.findAllByType("NativeMenu");
    expect(menus()[0].props.header.title).toBe("思考强度");
    expect(menus()[1].props.header.title).toBe("模式");
    expect(menus()[1].props.header.search.placeholder).toBe("搜索模式…");
    expect(menus()[1].props.header.search.testID).toBe("mode-search-input");
    expect(options()).toEqual(["轻度", "中", "高", "极高", "默认", "自动接受编辑", "自动", "计划", "完全访问"]);

    // Verify search filtering works against translated Chinese labels and keeps original mode IDs.
    await act(() => menus()[1].props.header.search.onChange("计划"));
    expect(options()).toEqual(["轻度", "中", "高", "极高", "计划"]);
    await act(() => renderer!.root.findAllByType("NativeOption")[4].props.onPress());
    await act(() => renderer!.root.findAllByType("NativeOption")[3].props.onPress());
    expect(selected).toEqual(["plan", "xhigh"]);

    // Verify no-space zh-CN placeholder variant and clean disable restoration.
    await act(() => renderer!.update(renderToolbar("搜索modes...")));
    expect(menus()[1].props.header.search.placeholder).toBe("搜索模式…");
    await act(() => controller!.setEnabled(false));
    expect(controls()[0].props.value).toBe("High");
    expect(controls()[1].props.value).toBe("Full access");
    expect(menus()[1].props.header.search.placeholder).toBe("搜索modes...");
  });

  it("preserves provider scope and option IDs in Combobox when TooltipTrigger clones trigger ref into a callback", async () => {
    const onSelect = vi.fn();
    function TooltipTriggerAsChild({ children }: { children: React.ReactElement<Record<string, unknown>> }) {
      const originalRef = children.props.ref;
      return React.cloneElement(children, {
        ref: (node: unknown) => {
          if (typeof originalRef === "function") originalRef(node);
          else if (originalRef && typeof originalRef === "object") Object.assign(originalRef, { current: node });
        },
      });
    }
    function ClonedRefControl(props: Record<string, unknown>) {
      const thinkingAnchor = useRef(null);
      const speedAnchor = useRef(null);
      return rawJsx.jsxs("NativeView", { children: [
        rawJsx.jsx(TooltipTriggerAsChild, {
          children: rawJsx.jsx(Control, {
            testID: "agent-thinking-selector", ref: thinkingAnchor,
            label: "Thinking", value: "Max",
          }),
        }),
        rawJsx.jsx(Menu, {
          anchorRef: thinkingAnchor,
          options: [{ id: "Low", label: "Low" }, { id: "Max", label: "Max" }],
          value: "Max", open: true, onOpenChange: () => {}, onSelect,
          searchPlaceholder: "Search modes...",
        }),
        rawJsx.jsx(TooltipTriggerAsChild, {
          children: rawJsx.jsx(Control, {
            testID: "agent-feature-service_tier", ref: speedAnchor,
            label: "Speed", value: "Fast",
          }),
        }),
        rawJsx.jsx(Menu, {
          anchorRef: speedAnchor,
          options: [{ id: "Fast", label: "Fast" }, { id: "Flex", label: "Flex" }],
          value: "Fast", open: true, onOpenChange: () => {}, onSelect,
        }),
      ] });
    }
    controller = installNative();
    await mount(rawJsx.jsx(ClonedRefControl, {
      provider: "claude", thinkingOptions: levels, modelSelectorProviders: [],
    }));
    const renderedMenus = renderer!.root.findAllByType(Menu);
    expect(renderedMenus[0].props.options).toEqual([{ id: "Low", label: "低" }, { id: "Max", label: "最高" }]);
    expect(renderedMenus[0].props.value).toBe("Max");
    expect(renderedMenus[0].props.searchPlaceholder).toBe("搜索模式…");
    expect(renderedMenus[1].props.options).toEqual([{ id: "Fast", label: "快速" }, { id: "Flex", label: "弹性" }]);
    expect(renderedMenus[1].props.value).toBe("Fast");
  });

  it("translates native subagent track row facts and agent pane subtitles without touching single-segment hosts", async () => {
    function PaneSubtitle({ text, testID }: { text: string; testID: string }) {
      return rawJsx.jsx("NativeView", {
        children: rawJsx.jsx("NativeText", { testID, children: text }),
      });
    }
    controller = installNative();
    await mount(rawJsx.jsxs("NativeView", { children: [
      rawJsx.jsx(PaneSubtitle, {
        testID: "agent-pane-subtitle",
        text: "Claude Opus 4.5 · Low · Accept edits · 50k / 200k tokens (25%)",
      }),
      rawJsx.jsx("NativeText", {
        testID: "subagents-track-row-facts-ag-1",
        children: "Gemini 4 Neon · High · Full access · 258k / 1m tokens (25%)",
      }),
      rawJsx.jsx("NativeText", {
        testID: "subagents-track-row-facts-codex-1",
        children: "GPT-6.2 Sol · routing group · 极高 · Default permissions · 159k / 950k tokens (17%)",
      }),
      rawJsx.jsx("NativeText", {
        testID: "subagents-track-row-facts-remote-1",
        children: "Default",
      }),
    ] }));

    const textOf = (testID: string) => renderer!.root
      .findAllByType("NativeText")
      .find((node) => node.props.testID === testID)!.props.children;
    expect(textOf("agent-pane-subtitle")).toBe("Claude Opus 4.5 · 低 · 自动接受编辑 · 50k / 200k tokens (25%)");
    expect(textOf("subagents-track-row-facts-ag-1")).toBe("Gemini 4 Neon · 高 · 完全访问 · 258k / 1m tokens (25%)");
    expect(textOf("subagents-track-row-facts-codex-1"))
      .toBe("GPT-6.2 Sol · routing group · 极高 · 默认权限 · 159k / 950k tokens (17%)");
    expect(textOf("subagents-track-row-facts-remote-1")).toBe("Default");

    await act(() => controller!.setEnabled(false));
    expect(textOf("agent-pane-subtitle")).toBe("Claude Opus 4.5 · Low · Accept edits · 50k / 200k tokens (25%)");
    expect(textOf("subagents-track-row-facts-ag-1")).toBe("Gemini 4 Neon · High · Full access · 258k / 1m tokens (25%)");
    expect(textOf("subagents-track-row-facts-codex-1"))
      .toBe("GPT-6.2 Sol · routing group · 极高 · Default permissions · 159k / 950k tokens (17%)");

    await act(() => controller!.setEnabled(true));
    expect(textOf("subagents-track-row-facts-ag-1")).toBe("Gemini 4 Neon · 高 · 完全访问 · 258k / 1m tokens (25%)");

    await act(() => controller!.dispose());
    expect(textOf("agent-pane-subtitle")).toBe("Claude Opus 4.5 · Low · Accept edits · 50k / 200k tokens (25%)");
    expect(textOf("subagents-track-row-facts-ag-1")).toBe("Gemini 4 Neon · High · Full access · 258k / 1m tokens (25%)");
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
