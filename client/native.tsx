import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import JsxRuntime from "react/jsx-runtime";
import { Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { translatePhrase, type TranslationContext } from "../shared/translations";
import type { TranslationController } from "./web";

type Props = Record<string, unknown>;
type Factory = (...args: unknown[]) => unknown;
type Scope = TranslationContext & {
  kind: "controls" | "thinking" | "mode" | "speed" | "feature" | "none";
  surface?: "toolbar" | "sheet";
  foldedModel?: boolean;
};
type Module = Record<PropertyKey, unknown>;
const ScopeContext = createContext<Scope>({ kind: "none" });
const OWNER = Symbol.for("paseo.agent-controls-zh.native.cleanup");
const THINKING = new Set(["agent-thinking-selector", "agent-controls-thinking"]);
const SPEED_MENU_MIN_WIDTH = 160;
const CONTROL_TEXT = ["label", "value", "accessibilityLabel", "title", "placeholder"] as const;
const NONE: Scope = { kind: "none" };

function record(value: unknown): value is Props {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function moduleWith(value: unknown, key: string): Module | null {
  const seen = new Set<unknown>();
  while (record(value) && !seen.has(value)) {
    seen.add(value);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.writable && typeof descriptor.value === "function") return value;
    value = value.default;
  }
  return null;
}
function providerOf(props: Props): string | undefined {
  return typeof props.provider === "string" ? props.provider
    : typeof props.selectedProvider === "string" ? props.selectedProvider : undefined;
}
function isFoldedModel(props: Props): boolean {
  return Array.isArray(props.providers) && "thinkingLabel" in props
    && typeof props.onSelect === "function";
}
function isFoldedModelLabel(props: Props): boolean {
  return props.testID === "combined-model-selector-model-label" && typeof props.text === "string";
}
function groupKind(props: Props): Scope["kind"] | null {
  if (!providerOf(props)) return null;
  if (Array.isArray(props.modeOptions) && typeof props.onSelectMode === "function") return "mode";
  if (Array.isArray(props.modelSelectorProviders)
    && ("thinkingOptions" in props || "comboboxThinkingOptions" in props
      || Array.isArray(props.thinkingItems))) return "controls";
  if (isFoldedModel(props)) return "controls";
  return null;
}
function isDesktopToolbar(props: Props): boolean {
  if (!record(props.presentation)) return false;
  // 0.16 builds ComposerControlItem arrays before rendering the toolbar.
  if (Array.isArray(props.thinkingItems) && Array.isArray(props.featureItems)
    && record(props.glyphs)) return true;
  return Array.isArray(props.comboboxThinkingOptions)
    && record(props.thinkingAnchorRef) && typeof props.canSelectThinking === "boolean"
    && typeof props.glyphSize === "number";
}
function tabletPresentation(props: Props, width: number, fontScale: number): unknown {
  const presentation = props.presentation;
  const items = Array.isArray(props.thinkingItems) ? props.thinkingItems.filter(record) : null;
  const thinking = items?.find((item) => item.testID === "agent-thinking-selector"
    && item.type === "select");
  const canSelectThinking = items ? Boolean(thinking) : props.canSelectThinking;
  if (!record(presentation) || presentation.showThinkingLabel || !presentation.showModeLabel
    || presentation.foldControls || !presentation.aggregateFeatures
    || !canSelectThinking || width <= 0) return presentation;
  const scale = Number.isFinite(fontScale) ? Math.max(1, fontScale) : 1;
  // Conservative text budget at the host's base font size. Use local toolbar
  // width rather than device width: a tablet can have a sidebar or split pane.
  const labelWidth = (label: unknown) => Array.from(typeof label === "string" ? label : "")
    .reduce((sum, char) => sum + (char.codePointAt(0)! > 0xff ? 17 : 9), 0) * scale;
  const widths: number[] = [];
  if (props.canSelectProvider) widths.push(44 + labelWidth(props.displayProvider));
  if (props.canSelectModel !== false) widths.push(44 + (items ? 56 : 28) * scale);
  const choices = thinking && Array.isArray(thinking.choices) ? thinking.choices.filter(record) : [];
  const selectedThinking = choices.find((choice) => choice.value === thinking?.value);
  widths.push(44 + labelWidth(items
    ? selectedThinking?.label ?? thinking?.valueLabel ?? thinking?.title : props.displayThinking));
  if (record(props.modeControl)) {
    const control = props.modeControl;
    const modes = Array.isArray(control.modeOptions) ? control.modeOptions.filter(record) : [];
    const selected = modes.find((option) => option.id === control.selectedModeId) ?? modes[0];
    widths.push(44 + labelWidth(selected?.label ?? "权限模式"));
  }
  if (items ? (Array.isArray(props.featureItems) && props.featureItems.length > 0) || props.hasPluginItems
    : Array.isArray(props.features) && props.features.length > 0) widths.push(items ? 36 : 28);
  const required = widths.reduce((sum, value) => sum + value, 0) + (widths.length - 1) * 4 + 12;
  return width >= required ? { ...presentation, showThinkingLabel: true } : presentation;
}
function controlKind(props: Props): Scope["kind"] | null {
  if (typeof props.testID !== "string") return null;
  if (THINKING.has(props.testID)) return "thinking";
  if (props.testID === "mode-control") return "mode";
  if (props.testID === "agent-feature-service_tier") return "speed";
  if (props.testID.startsWith("agent-feature-")) return "feature";
  return null;
}
function isMenu(props: Props): boolean {
  return Array.isArray(props.options) && record(props.anchorRef)
    && typeof props.onSelect === "function" && typeof props.onOpenChange === "function";
}
function scoped(kind: Scope["kind"], provider?: string): Scope {
  return { kind, provider, thinking: kind === "thinking" };
}
function text(value: unknown, scope: TranslationContext): unknown {
  return typeof value === "string" ? translatePhrase(value, scope) : value;
}
function options(value: unknown, scope: TranslationContext, idKey = "id"): unknown {
  if (!Array.isArray(value)) return value;
  let changed = false;
  const result = value.map((option: unknown) => {
    if (!record(option) || typeof option[idKey] !== "string" || typeof option.label !== "string") {
      return option;
    }
    const label = translatePhrase(option.label, scope);
    if (label === option.label) return option;
    changed = true;
    return { ...option, label };
  });
  return changed ? result : value;
}
function feature(value: unknown, scope: TranslationContext): unknown {
  if (!record(value) || typeof value.id !== "string" || typeof value.type !== "string") return value;
  const label = text(value.label, scope);
  const tooltip = text(value.tooltip, scope);
  const translatedOptions = options(value.options, scope);
  return label === value.label && tooltip === value.tooltip && translatedOptions === value.options
    ? value : { ...value, label, tooltip, ...(value.options ? { options: translatedOptions } : {}) };
}
function mode(value: unknown, provider?: string): unknown {
  if (!record(value) || !Array.isArray(value.modeOptions)) return value;
  return { ...value, modeOptions: options(value.modeOptions, { provider }) };
}
function composerItem(value: unknown, provider?: string): unknown {
  if (!record(value) || !["select", "toggle", "action"].includes(String(value.type))) return value;
  const kind = controlKind(value);
  if (!kind) return value;
  const scope = scoped(kind, provider);
  return {
    ...displayProps(value, scope),
    tooltip: text(value.tooltip, scope),
    ...(value.type === "select" ? {
      // `value` is an option ID in 0.16, never display text.
      value: value.value,
      valueLabel: text(value.valueLabel, scope),
      choices: options(value.choices, scope, "value"),
    } : {}),
  };
}
function optionControls(value: unknown, scope: TranslationContext): unknown {
  if (!record(value) || !Array.isArray(value.controls)) return value;
  return { ...value, controls: value.controls.map((control: unknown) => {
    if (!record(control) || typeof control.key !== "string") return control;
    return {
      ...control, label: text(control.label, scope), tooltip: text(control.tooltip, scope),
      ...(control.type === "select" ? { choices: options(control.choices, scope, "value") } : {}),
    };
  }) };
}
function groupProps(props: Props, scope: Scope): Props {
  const thinking = { provider: scope.provider, thinking: true };
  const result: Props = { ...props };
  for (const key of ["thinkingOptions", "comboboxThinkingOptions"]) {
    if (key in props) result[key] = options(props[key], thinking);
  }
  for (const key of ["displayThinking", "thinkingLabel"]) {
    if (key in props) result[key] = text(props[key], thinking);
  }
  if (Array.isArray(props.features)) {
    result.features = props.features.map((item: unknown) => feature(item, scope));
  }
  for (const key of ["thinkingItems", "featureItems"]) {
    if (Array.isArray(props[key])) result[key] = props[key].map((item) => composerItem(item, scope.provider));
  }
  if ("optionControls" in props) result.optionControls = optionControls(props.optionControls, scope);
  if ("modeOptions" in props) result.modeOptions = options(props.modeOptions, scope);
  if ("modeControl" in props) result.modeControl = mode(props.modeControl, scope.provider);
  return result;
}
function displayProps(props: Props, scope: Scope, control = false): Props {
  const result = { ...props };
  for (const key of CONTROL_TEXT) {
    if (key in props) result[key] = text(props[key], scope);
  }
  // AgentControlTrigger passes its style down to ComboboxTrigger/Pressable.
  // Keep the short effort and permission labels readable beside a long routed
  // model name. Paseo's model container remains shrinkable, and its density
  // logic still owns icon-only controls on narrow screens. Sheet rows keep the
  // host's width rules. Preserve callback styles and all interaction states.
  if (control && scope.surface === "toolbar" && (scope.kind === "thinking" || scope.kind === "mode")
    && "style" in props) {
    const original = props.style;
    const reserve = { flexShrink: 0 };
    result.style = typeof original === "function"
      ? (...args: unknown[]) => [Reflect.apply(original, undefined, args), reserve]
      : [original, reserve];
  }
  return result;
}
function header(value: unknown, scope: Scope): unknown {
  if (!record(value)) return text(value, scope);
  return {
    ...value,
    title: text(value.title, scope),
    ...(record(value.search) ? { search: {
      ...value.search, placeholder: text(value.search.placeholder, scope),
    } } : {}),
  };
}

/**
 * Paseo 0.15.4 and 0.16 expose host React modules to client plugins, including their
 * underlying CommonJS module in `default`. Intercept element construction only;
 * never modify React internals, original props, option IDs or callbacks.
 */
export function installNative(): TranslationController {
  const resolvedJsx = moduleWith(JsxRuntime, "jsx");
  const resolvedReact = moduleWith(React, "createElement");
  if (!resolvedJsx || !resolvedReact || !moduleWith(resolvedJsx, "jsxs")) {
    return {
      supported: false, getEnabled: () => false, subscribe: () => () => {},
      setEnabled: () => {}, refresh: () => {}, dispose: () => {},
    };
  }
  const jsxModule: Module = resolvedJsx;
  const reactModule: Module = resolvedReact;
  const previous: unknown = Reflect.get(jsxModule, OWNER);
  if (typeof previous === "function") previous();
  let enabled = true;
  let disposed = false;
  const listeners = new Set<() => void>();
  const anchors = new WeakMap<object, Scope>();
  const wrappers = new Map<unknown, ComponentType<Props>>();
  const originals = new Map<string, Factory>([
    ["jsx", jsxModule.jsx as Factory],
    ["jsxs", jsxModule.jsxs as Factory],
    ["createElement", reactModule.createElement as Factory],
  ]);
  const create = originals.get("createElement")!;
  const subscribe = (listener: () => void) => {
    if (disposed) return () => {};
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  const getEnabled = () => enabled && !disposed;
  const notify = () => { for (const listener of Array.from(listeners)) listener(); };

  function NativeToolbar({ originalType, elementProps, active }: {
    originalType: unknown; elementProps: Props; active: boolean;
  }): ReactNode {
    const [width, setWidth] = useState(0);
    const { fontScale } = useWindowDimensions();
    const onLayout = useCallback((event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.width;
      if (Number.isFinite(next) && next > 0) {
        setWidth((previous) => Math.abs(previous - next) >= 1 ? next : previous);
      }
    }, []);
    const presentation = active ? tabletPresentation(elementProps, width, fontScale) : elementProps.presentation;
    const revealThinking = presentation !== elementProps.presentation
      && record(presentation) && presentation.showThinkingLabel;
    const measured = active ? {
      ...elementProps, presentation,
      ...(revealThinking && Array.isArray(elementProps.thinkingItems) ? {
        thinkingItems: elementProps.thinkingItems.map((item) => record(item)
          && item.testID === "agent-thinking-selector" && item.type === "select"
          ? { ...item, iconOnly: false } : item),
      } : {}),
    } : elementProps;
    // A zero-height absolute probe measures the existing flex container without
    // introducing another row around its controls or consuming toolbar width.
    const probe = create(View, {
      testID: "agent-controls-zh-toolbar-measure", pointerEvents: "none", accessible: false,
      importantForAccessibility: "no-hide-descendants",
      style: { position: "absolute", left: 0, right: 0, top: 0, height: 0 }, onLayout,
    });
    return create(React.Fragment, null, probe, create(originalType, measured)) as ReactNode;
  }

  function component(originalType: unknown): ComponentType<Props> {
    const cached = wrappers.get(originalType);
    if (cached) return cached;
    function TranslatedAgentControl(props: Props): ReactNode {
      const active = useSyncExternalStore(subscribe, getEnabled, getEnabled);
      const inherited = useContext(ScopeContext);
      const group = groupKind(props);
      const control = controlKind(props);
      let scope = group ? scoped(group, providerOf(props)) : inherited;
      if (group && isFoldedModel(props)) scope.foldedModel = true;
      let translated = props;
      if (group) {
        if (active) translated = groupProps(props, scope);
      } else if (control) {
        scope = scoped(control, inherited.provider);
        scope.surface = props.surface === "toolbar" || props.surface === "sheet"
          ? props.surface : inherited.surface;
        if (record(props.ref)) anchors.set(props.ref, scope);
        if (active) translated = displayProps(props, scope, true);
      } else if (isMenu(props)) {
        const owner = anchors.get(props.anchorRef as object);
        // Model browsers also use Combobox. Only registered Agent controls own a
        // translated menu; the remaining menu tree gets an explicit empty scope.
        scope = owner ?? NONE;
        if (active && owner) {
          translated = {
            ...displayProps(props, scope),
            options: options(props.options, scope),
            header: header(props.header, scope),
          };
          if (owner.kind === "speed") {
            const hostMinWidth = typeof props.desktopMinWidth === "number" ? props.desktopMinWidth : 0;
            translated.desktopMinWidth = Math.max(SPEED_MENU_MIN_WIDTH, hostMinWidth);
          }
        }
      }
      // 0.16's TailEllipsisText drops an entire trailing word when it cannot
      // fit, wasting a large part of a phone's model slot for routed names.
      // The native Text uses the same row/font budget and clips at the last
      // fitting glyph. Keep the exact model string and the surrounding trigger.
      const { text: modelText, ...labelProps } = props;
      const element = active && inherited.foldedModel && isFoldedModelLabel(props)
        ? create(Text, { ...labelProps, numberOfLines: 1, ellipsizeMode: "tail" }, modelText)
        : group === "controls" && isDesktopToolbar(props)
        ? create(NativeToolbar, { originalType, elementProps: translated, active })
        : create(originalType, translated);
      return create(ScopeContext.Provider, { value: scope }, element) as ReactNode;
    }
    TranslatedAgentControl.displayName = "AgentControlsChinese";
    wrappers.set(originalType, TranslatedAgentControl);
    return TranslatedAgentControl;
  }

  function intercept(original: Factory): Factory {
    return function (...args: unknown[]) {
      if (!disposed) {
        const [type, props] = args;
        if (record(props)) {
          const control = controlKind(props);
          // Register ownership while the parent constructs its sibling elements.
          // The control wrapper supplies the provider before the menu renders.
          if (control && record(props.ref) && !anchors.has(props.ref)) {
            anchors.set(props.ref, scoped(control));
          }
          if (groupKind(props) || control || isFoldedModelLabel(props)
            || (isMenu(props) && anchors.has(props.anchorRef as object))) args[0] = component(type);
        }
      }
      return Reflect.apply(original, undefined, args);
    };
  }
  const hooks = new Map<string, Factory>();
  for (const [name, original] of originals) {
    const target = name === "createElement" ? reactModule : jsxModule;
    const hook = intercept(original);
    if (!Reflect.set(target, name, hook)) {
      for (const [installed, fn] of hooks) {
        const module = installed === "createElement" ? reactModule : jsxModule;
        if (module[installed] === fn) Reflect.set(module, installed, originals.get(installed));
      }
      return {
        supported: false, getEnabled: () => false, subscribe: () => () => {},
        setEnabled: () => {}, refresh: () => {}, dispose: () => {},
      };
    }
    hooks.set(name, hook);
  }
  function dispose() {
    if (disposed) return;
    enabled = false;
    disposed = true;
    notify();
    listeners.clear();
    for (const [name, hook] of hooks) {
      const module = name === "createElement" ? reactModule : jsxModule;
      if (module[name] === hook) Reflect.set(module, name, originals.get(name));
    }
    wrappers.clear();
    if (Reflect.get(jsxModule, OWNER) === dispose) Reflect.deleteProperty(jsxModule, OWNER);
  }
  Reflect.set(jsxModule, OWNER, dispose);
  return {
    supported: true, getEnabled, subscribe,
    setEnabled(value) {
      if (disposed || enabled === value) return;
      enabled = value;
      notify();
    },
    refresh: notify,
    dispose,
  };
}
