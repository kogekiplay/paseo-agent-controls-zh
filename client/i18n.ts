import React from "react";
import type { NestedTranslations } from "../shared/paseo-i18n-zh";
import type { TranslationController } from "./web";

declare function queueMicrotask(callback: () => void): void;

type Module = Record<PropertyKey, unknown>;
type MutableTree = Record<string, unknown>;
type UseContextFn = (...args: unknown[]) => unknown;

interface I18nInstance {
  language?: string;
  resolvedLanguage?: string;
  getResourceBundle(lng: string, ns: string): unknown;
  addResourceBundle(
    lng: string,
    ns: string,
    resources: Record<string, unknown>,
    deep?: boolean,
    overwrite?: boolean,
  ): unknown;
  emit(event: string, ...args: unknown[]): unknown;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener: (...args: unknown[]) => void): unknown;
}

const OWNER = Symbol.for("paseo.agent-controls-zh.i18n.cleanup");
const TARGET_LANG = "zh-CN";
const TARGET_NS = "translation";

function record(value: unknown): value is Record<string, unknown> {
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

function isI18nInstance(value: unknown): value is I18nInstance {
  if (!record(value)) return false;
  return typeof value.addResourceBundle === "function"
    && typeof value.getResourceBundle === "function"
    && typeof value.emit === "function"
    && typeof value.on === "function"
    && typeof value.off === "function";
}

function extractI18n(value: unknown): I18nInstance | null {
  if (!record(value)) return null;
  return isI18nInstance(value.i18n) ? value.i18n : null;
}

function isTargetLanguage(i18n: I18nInstance): boolean {
  return i18n.language === TARGET_LANG || i18n.resolvedLanguage === TARGET_LANG;
}

function scheduleMicrotask(callback: () => void) {
  if (typeof queueMicrotask === "function") queueMicrotask(callback);
  else void Promise.resolve().then(callback);
}

function buildPatch(
  overrideNode: NestedTranslations,
  bundleNode: Record<string, unknown>,
  originalNode: MutableTree,
): MutableTree | null {
  let patch: MutableTree | null = null;
  for (const [key, overrideValue] of Object.entries(overrideNode)) {
    if (!Object.prototype.hasOwnProperty.call(bundleNode, key)) continue;
    const currentValue = bundleNode[key];
    if (typeof overrideValue === "string") {
      if (typeof currentValue !== "string" || currentValue === overrideValue) continue;
      if (!Object.prototype.hasOwnProperty.call(originalNode, key)) {
        originalNode[key] = currentValue;
      }
      patch ??= {};
      patch[key] = overrideValue;
    } else if (record(overrideValue) && record(currentValue)) {
      const existingOriginal = record(originalNode[key]) ? (originalNode[key] as MutableTree) : {};
      const childPatch = buildPatch(overrideValue, currentValue, existingOriginal);
      if (Object.keys(existingOriginal).length > 0
        && !Object.prototype.hasOwnProperty.call(originalNode, key)) {
        originalNode[key] = existingOriginal;
      }
      if (childPatch) {
        patch ??= {};
        patch[key] = childPatch;
      }
    }
  }
  return patch;
}

function unsupportedController(): TranslationController {
  return {
    supported: false,
    getEnabled: () => false,
    subscribe: () => () => {},
    setEnabled: () => {},
    refresh: () => {},
    dispose: () => {},
  };
}

/**
 * Captures Paseo's shared react-i18next instance via a one-shot React.useContext
 * hook, restores React.useContext immediately upon capture, and applies reversible
 * zh-CN resource overrides for Paseo's built-in UI copy.
 */
export function installI18n(
  overrides: NestedTranslations,
  initialEnabled = true,
): TranslationController {
  const resolvedReact = moduleWith(React, "useContext");
  if (!resolvedReact) return unsupportedController();
  const reactModule: Module = resolvedReact;
  const previous: unknown = Reflect.get(reactModule, OWNER);
  if (typeof previous === "function") previous();

  const originalUseContext = reactModule.useContext as UseContextFn;
  let enabled = initialEnabled;
  let disposed = false;
  let instance: I18nInstance | null = null;
  let originals: MutableTree = {};
  let applied = false;
  let emitting = false;
  let scheduled = false;
  const listeners = new Set<() => void>();

  const getEnabled = () => enabled && !disposed;
  const notify = () => { for (const listener of Array.from(listeners)) listener(); };
  const subscribe = (listener: () => void) => {
    if (disposed) return () => {};
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  function emitRefresh(i18n: I18nInstance) {
    if (!isTargetLanguage(i18n) || emitting) return;
    emitting = true;
    try {
      i18n.emit("languageChanged", i18n.language ?? TARGET_LANG);
    } finally {
      emitting = false;
    }
  }

  function applyOverrides(i18n: I18nInstance) {
    const bundle = i18n.getResourceBundle(TARGET_LANG, TARGET_NS);
    if (!record(bundle) || Object.keys(bundle).length === 0) return;
    const patch = buildPatch(overrides, bundle, originals);
    if (!patch) return;
    i18n.addResourceBundle(TARGET_LANG, TARGET_NS, patch, true, true);
    applied = true;
    emitRefresh(i18n);
  }

  function restoreOverrides(i18n: I18nInstance) {
    if (!applied || Object.keys(originals).length === 0) return;
    const bundle = i18n.getResourceBundle(TARGET_LANG, TARGET_NS);
    if (!record(bundle)) return;
    i18n.addResourceBundle(TARGET_LANG, TARGET_NS, originals, true, true);
    applied = false;
    emitRefresh(i18n);
  }

  function scheduleApply() {
    if (disposed || !enabled || !instance || scheduled) return;
    scheduled = true;
    scheduleMicrotask(() => {
      scheduled = false;
      if (!disposed && enabled && instance) applyOverrides(instance);
    });
  }

  function onI18nEvent() {
    if (disposed || emitting || !enabled || !instance) return;
    scheduleApply();
  }

  function restoreUseContext() {
    if (reactModule.useContext === hook) {
      Reflect.set(reactModule, "useContext", originalUseContext);
    }
  }

  function attach(captured: I18nInstance) {
    if (disposed || instance) return;
    instance = captured;
    restoreUseContext();
    captured.on("loaded", onI18nEvent);
    captured.on("languageChanged", onI18nEvent);
    scheduleApply();
  }

  const hook: UseContextFn = function useContextCapture(this: unknown, ...args: unknown[]) {
    const value = Reflect.apply(originalUseContext, this, args);
    if (!disposed && !instance) {
      const captured = extractI18n(value);
      if (captured) attach(captured);
    }
    return value;
  };

  if (!Reflect.set(reactModule, "useContext", hook)) return unsupportedController();

  function dispose() {
    if (disposed) return;
    enabled = false;
    disposed = true;
    restoreUseContext();
    if (instance) {
      const current = instance;
      current.off("loaded", onI18nEvent);
      current.off("languageChanged", onI18nEvent);
      restoreOverrides(current);
      instance = null;
    }
    originals = {};
    applied = false;
    notify();
    listeners.clear();
    if (Reflect.get(reactModule, OWNER) === dispose) Reflect.deleteProperty(reactModule, OWNER);
  }

  Reflect.set(reactModule, OWNER, dispose);

  return {
    supported: true,
    getEnabled,
    subscribe,
    setEnabled(value) {
      if (disposed || enabled === value) return;
      enabled = value;
      if (instance) {
        if (value) applyOverrides(instance);
        else restoreOverrides(instance);
      }
      notify();
    },
    refresh() {
      if (!disposed && enabled && instance) applyOverrides(instance);
    },
    dispose,
  };
}
