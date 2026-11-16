import React, {
  createContext,
  useContext,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import JsxRuntime from "react/jsx-runtime";
import { translatePhrase, type TranslationContext } from "../shared/translations";
import type { TranslationController } from "./web";

type Props = Record<string, unknown>;
type Factory = (...args: unknown[]) => unknown;
type Scope = TranslationContext & { kind: "controls" | "thinking" | "mode" | "feature" | "none" };
type Module = Record<PropertyKey, unknown>;
const ScopeContext = createContext<Scope>({ kind: "none" });
const OWNER = Symbol.for("paseo.agent-controls-zh.native.cleanup");
const THINKING = new Set(["agent-thinking-selector", "agent-controls-thinking"]);
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
function groupKind(props: Props): Scope["kind"] | null {
  if (!providerOf(props)) return null;
  if (Array.isArray(props.modeOptions) && typeof props.onSelectMode === "function") return "mode";
  if (Array.isArray(props.modelSelectorProviders)
    && ("thinkingOptions" in props || "comboboxThinkingOptions" in props)) return "controls";
  if (Array.isArray(props.providers) && "thinkingLabel" in props
    && typeof props.onSelect === "function") return "controls";
  return null;
}
function controlKind(props: Props): Scope["kind"] | null {
  if (typeof props.testID !== "string") return null;
  if (THINKING.has(props.testID)) return "thinking";
  if (props.testID === "mode-control") return "mode";
  if (props.testID.startsWith("agent-feature-")) return "feature";
  return null;
}
function isMenu(props: Props): boolean {
  return Array.isArray(props.options) && record(props.anchorRef)
    && typeof props.onSelect === "function" && typeof props.onOpenChange === "function";
}
function isMenuItem(props: Props): boolean {
  return typeof props.label === "string" && typeof props.selected === "boolean"
    && typeof props.active === "boolean" && typeof props.onPress === "function";
}
function scoped(kind: Scope["kind"], provider?: string): Scope {
  return { kind, provider, thinking: kind === "thinking" };
}
function text(value: unknown, scope: TranslationContext): unknown {
  return typeof value === "string" ? translatePhrase(value, scope) : value;
}
function options(value: unknown, scope: TranslationContext): unknown {
  if (!Array.isArray(value)) return value;
  let changed = false;
  const result = value.map((option: unknown) => {
    if (!record(option) || typeof option.id !== "string" || typeof option.label !== "string") {
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
  if ("modeOptions" in props) result.modeOptions = options(props.modeOptions, scope);
  if ("modeControl" in props) result.modeControl = mode(props.modeControl, scope.provider);
  return result;
}
function displayProps(props: Props, scope: Scope): Props {
  const result = { ...props };
  for (const key of CONTROL_TEXT) {
    if (key in props) result[key] = text(props[key], scope);
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
 * Paseo 0.15.4 exposes host React modules to client plugins, including their
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

  function component(originalType: unknown): ComponentType<Props> {
    const cached = wrappers.get(originalType);
    if (cached) return cached;
    function TranslatedAgentControl(props: Props): ReactNode {
      const active = useSyncExternalStore(subscribe, getEnabled, getEnabled);
      const inherited = useContext(ScopeContext);
      const group = groupKind(props);
      const control = controlKind(props);
      let scope = group ? scoped(group, providerOf(props)) : inherited;
      let translated = props;
      if (group) {
        if (active) translated = groupProps(props, scope);
      } else if (control) {
        scope = scoped(control, inherited.provider);
        if (record(props.ref)) anchors.set(props.ref, scope);
        if (active) translated = displayProps(props, scope);
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
        }
      } else if (active && isMenuItem(props) && !["none", "controls"].includes(scope.kind)) {
        translated = displayProps(props, scope);
      }
      const element = create(originalType, translated);
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
        if (record(props) && (groupKind(props) || controlKind(props)
          || isMenu(props) || isMenuItem(props))) args[0] = component(type);
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
