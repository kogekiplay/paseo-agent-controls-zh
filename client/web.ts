import {
  translateFactsLine,
  translatePhrase,
  ULTRAFAST_LABEL,
  type TranslationContext,
} from "../shared/translations";
import { BOLT_SIZE, BOLT_OFFSET } from "../shared/speed-icon";

// Browser-only types stay here; neither the plugin nor native clients need lib.dom.
declare class Node {
  nodeType: number;
  parentElement: Element | null;
  childNodes: ArrayLike<Node>;
  isConnected: boolean;
  cloneNode(deep: boolean): Node;
  appendChild(child: Node): Node;
}
declare class Text extends Node { data: string }
declare class Element extends Node {
  textContent: string | null;
  matches(selector: string): boolean;
  closest(selector: string): Element | null;
  contains(node: Node): boolean;
  querySelector(selector: string): Element | null;
  querySelectorAll(selector: string): ArrayLike<Element>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  remove(): void;
}
interface BrowserEvent { target: unknown; key?: string }
interface Mutation { target: Node; addedNodes: ArrayLike<Node>; removedNodes: ArrayLike<Node> }
declare class MutationObserver {
  constructor(callback: (records: Mutation[]) => void);
  observe(target: Node, options: {
    subtree: boolean; childList: boolean; characterData: boolean;
    attributes: boolean; attributeFilter: string[];
  }): void;
  disconnect(): void;
}
declare const document: {
  body: Element;
  querySelectorAll(selector: string): ArrayLike<Element>;
  addEventListener(type: string, handler: (event: BrowserEvent) => void, capture: boolean): void;
  removeEventListener(type: string, handler: (event: BrowserEvent) => void, capture: boolean): void;
};
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
declare function queueMicrotask(callback: () => void): void;

export interface TranslationController {
  supported: boolean;
  getEnabled(): boolean;
  subscribe(listener: () => void): () => void;
  setEnabled(value: boolean): void;
  refresh(): void;
  dispose(): void;
}

const CONTROLS = [
  '[data-testid="agent-thinking-selector"]',
  '[data-testid="agent-controls-thinking"]',
  '[data-testid="mode-control"]',
  '[data-testid^="agent-feature-"]',
  '[data-testid="agent-controls-features"]',
  '[data-testid="agent-controls-settings-list"]',
  '[data-testid="agent-features-sheet"]',
].join(",");
// This is text inside the model trigger, not the owner of a thinking menu.
const FOLDED_THINKING = '[data-testid="combined-model-selector-thinking-label"]';
const SUBAGENT_FACTS_PREFIX = "subagents-track-row-facts-";
const FACTS = `[data-testid^="${SUBAGENT_FACTS_PREFIX}"],[data-testid="agent-pane-subtitle"]`;
const MENUS = '[data-testid="combobox-desktop-container"],[role="dialog"],[aria-modal="true"]';
const TOOLTIP = '[role="tooltip"]';
const TOOLTIP_OWNER = "data-paseo-agent-controls-zh-tooltip";
const SPEED_CONTROL = '[data-testid="agent-feature-service_tier"]';
const SINGLE_BOLT_VIEW_BOX = `0 0 ${BOLT_SIZE} ${BOLT_SIZE}`;
const DOUBLE_BOLT_VIEW_BOX = `${-BOLT_OFFSET} 0 ${BOLT_SIZE + BOLT_OFFSET} ${BOLT_SIZE}`;
const SURFACES = `${CONTROLS},${FOLDED_THINKING},${FACTS},${MENUS},${TOOLTIP}`;
const PROVIDER_SIGNALS = '[data-testid^="workspace-tab-agent_"],[data-testid="combined-model-selector"],[data-testid="agent-controls-model"]';
const EXCLUDED = 'input,textarea,[contenteditable="true"],pre,code,script,style,svg';
const ATTRIBUTES = ["aria-label", "title", "placeholder"] as const;
const OWNER = Symbol.for("paseo.agent-controls-zh.cleanup");
const STORAGE = "paseo.agent-controls-zh.enabled";
const THINKING = `[data-testid="agent-thinking-selector"],[data-testid="agent-controls-thinking"],${FOLDED_THINKING}`;
interface Change { original: string; translated: string }
interface TooltipOwnership { id: string; trigger: Element; context: TranslationContext }

export function install(
  isWeb: boolean,
  providerForAgent: (agentId: string) => string | undefined = () => undefined,
): TranslationController {
  if (!isWeb || typeof document === "undefined" || !document.body) {
    return {
      supported: false, getEnabled: () => false, subscribe: () => () => {},
      setEnabled: () => {}, refresh: () => {}, dispose: () => {},
    };
  }
  const previous: unknown = Reflect.get(document, OWNER);
  if (typeof previous === "function") previous();
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE) !== "false"; } catch { /* Restricted storage. */ }
  let disposed = false;
  let scheduled = false;
  let menuOwner: Element | null = null;
  let tooltipOwner: Element | null = null;
  let nextTooltipId = 0;
  let activatedAt = 0;
  let previousMenus = new Set<Element>();
  const ownedMenus = new Map<Element, Element>();
  const ownedTooltips = new Map<Element, TooltipOwnership>();
  const textChanges = new Map<Text, Change>();
  const attributeChanges = new Map<Element, Map<string, Change>>();
  const speedIcons = new Map<Element, {
    original: Element; front: Element; width: Change; height: string;
  }>();
  const listeners = new Set<() => void>();

  function elementOf(node: unknown): Element | null {
    return node instanceof Element ? node : node instanceof Node ? node.parentElement : null;
  }
  function controlsOf(node: unknown) {
    return elementOf(node)?.closest(CONTROLS) ?? null;
  }
  function contextOf(control: Element): TranslationContext {
    const pane = control.closest('[data-testid^="workspace-pane-"]');
    const tab = pane?.querySelector('[data-testid^="workspace-tab-agent_"][aria-selected="true"]');
    const agentId = tab?.getAttribute("data-testid")?.slice("workspace-tab-agent_".length);
    const knownProvider = agentId ? providerForAgent(agentId) : undefined;
    const composer = control.closest('[data-testid="message-input-root"]')
      ?? pane ?? control.closest('[data-testid="agent-controls-model-sheet"]');
    const model = composer?.querySelector('[data-testid="combined-model-selector"],[data-testid="agent-controls-model"]');
    // Drafts have no agent snapshot yet. Use the displayed provider/model family.
    const label = `${model?.getAttribute("aria-label") ?? ""} ${model?.textContent ?? ""}`;
    const provider = knownProvider ?? (
      /\b(?:claude|opus|sonnet|haiku)\b/i.test(label) ? "claude" : undefined
    );
    return { provider, thinking: control.matches(THINKING) || !!control.closest(THINKING) };
  }
  function schedule() {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!disposed) refresh();
    });
  }
  function relevant(node: Node): boolean {
    const element = elementOf(node);
    return !!element && (!!element.closest(`${SURFACES},${PROVIDER_SIGNALS}`)
      || !!element.querySelector(SURFACES));
  }
  const observer = new MutationObserver((records) => {
    if (records.some((record) => relevant(record.target)
      || Array.from(record.addedNodes).some(relevant)
      || Array.from(record.removedNodes).some(relevant))) schedule();
  });
  function observe() {
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: [...ATTRIBUTES, "data-testid", "aria-selected", "width", "height", "viewBox", "stroke"],
    });
  }
  function restoreText(node: Text, change: Change) {
    if (node.data === change.translated) node.data = change.original;
  }
  function restoreAttributes(element: Element, changes: Map<string, Change>) {
    for (const [attribute, change] of changes) {
      if (element.getAttribute(attribute) === change.translated) {
        element.setAttribute(attribute, change.original);
      }
    }
  }
  function restoreAll() {
    for (const [node, change] of textChanges) restoreText(node, change);
    for (const [element, changes] of attributeChanges) restoreAttributes(element, changes);
    textChanges.clear();
    attributeChanges.clear();
    for (const svg of speedIcons.keys()) restoreSpeedIcon(svg);
  }
  function restoreSpeedIcon(svg: Element) {
    const change = speedIcons.get(svg)!;
    change.front.remove();
    if (svg.getAttribute("viewBox") === DOUBLE_BOLT_VIEW_BOX) {
      svg.setAttribute("viewBox", SINGLE_BOLT_VIEW_BOX);
    }
    if (svg.getAttribute("width") === change.width.translated) {
      svg.setAttribute("width", change.width.original);
    }
    speedIcons.delete(svg);
  }
  function fillFrontBolt(front: Element, original: Element, svg: Element) {
    const color = original.getAttribute("stroke") ?? svg.getAttribute("stroke") ?? "currentColor";
    if (front.getAttribute("fill") !== color) front.setAttribute("fill", color);
    if (front.getAttribute("stroke") !== color) front.setAttribute("stroke", color);
  }
  function updateSpeedIcons() {
    const active = new Set<Element>();
    for (const control of Array.from(document.querySelectorAll(SPEED_CONTROL))) {
      const label = translatePhrase(control.getAttribute("aria-label") ?? "").trim();
      if (label !== `速度：${ULTRAFAST_LABEL}`) continue;
      const svg = control.querySelector("svg");
      if (!svg) continue;
      const height = svg.getAttribute("height");
      const existing = speedIcons.get(svg);
      if (existing && svg.contains(existing.original) && svg.contains(existing.front)
        && height === existing.height && svg.getAttribute("width") === existing.width.translated
        && svg.getAttribute("viewBox") === DOUBLE_BOLT_VIEW_BOX) {
        fillFrontBolt(existing.front, existing.original, svg);
        active.add(svg);
        continue;
      }
      if (existing) restoreSpeedIcon(svg);
      if (svg.getAttribute("viewBox") !== SINGLE_BOLT_VIEW_BOX) continue;
      const width = svg.getAttribute("width");
      const size = Number(height);
      if (!width || !height || !Number.isFinite(size) || size <= 0 || Number(width) !== size) continue;
      const original = Array.from(svg.childNodes).find(
        (node): node is Element => node instanceof Element && node.matches("path,polygon"),
      );
      if (!original) continue;
      // Scale the viewport with the viewBox so each copy keeps the host glyph's size.
      const wideWidth = String(size * (BOLT_SIZE + BOLT_OFFSET) / BOLT_SIZE);
      const front = original.cloneNode(true) as Element;
      front.setAttribute("transform", `translate(${-BOLT_OFFSET} 0)`);
      fillFrontBolt(front, original, svg);
      svg.appendChild(front);
      svg.setAttribute("viewBox", DOUBLE_BOLT_VIEW_BOX);
      svg.setAttribute("width", wideWidth);
      speedIcons.set(svg, { original, front, width: { original: width, translated: wideWidth }, height });
      active.add(svg);
    }
    for (const svg of speedIcons.keys()) {
      if (!active.has(svg)) restoreSpeedIcon(svg);
    }
  }
  function translateText(node: Text, context: TranslationContext) {
    const current = node.data;
    const previous = textChanges.get(node);
    const original = previous?.translated === current ? previous.original : current;
    const translated = translatePhrase(original, context);
    if (translated === original) {
      if (current !== original) node.data = original;
      textChanges.delete(node);
      return;
    }
    textChanges.set(node, { original, translated });
    if (current !== translated) node.data = translated;
  }
  function factsProviderOf(element: Element): string | undefined {
    const testId = element.getAttribute("data-testid") ?? "";
    if (testId.startsWith(SUBAGENT_FACTS_PREFIX)) {
      const agentId = testId.slice(SUBAGENT_FACTS_PREFIX.length);
      return agentId ? providerForAgent(agentId) : undefined;
    }
    const pane = element.closest('[data-testid^="workspace-pane-"]');
    const tab = pane?.querySelector('[data-testid^="workspace-tab-agent_"][aria-selected="true"]');
    const agentId = tab?.getAttribute("data-testid")?.slice("workspace-tab-agent_".length);
    return agentId ? providerForAgent(agentId) : undefined;
  }
  function translateFactsText(node: Text, provider?: string) {
    const current = node.data;
    const previous = textChanges.get(node);
    const original = previous?.translated === current ? previous.original : current;
    const translated = translateFactsLine(original, provider);
    if (translated === original) {
      if (current !== original) node.data = original;
      textChanges.delete(node);
      return;
    }
    textChanges.set(node, { original, translated });
    if (current !== translated) node.data = translated;
  }
  function walkFacts(node: Node, provider?: string) {
    if (node instanceof Text) {
      if (!node.parentElement?.closest(EXCLUDED)) translateFactsText(node, provider);
      return;
    }
    if (node instanceof Element && node.matches(EXCLUDED)) return;
    for (const child of Array.from(node.childNodes)) walkFacts(child, provider);
  }
  function translateAttributes(element: Element, context: TranslationContext) {
    for (const attribute of ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      const changes = attributeChanges.get(element);
      const previous = changes?.get(attribute);
      const original = previous?.translated === current ? previous.original : current;
      const translated = original === null ? null : translatePhrase(original, context);
      if (translated === null || translated === original) {
        if (original !== null && current !== original) element.setAttribute(attribute, original);
        changes?.delete(attribute);
      } else {
        const updated = changes ?? new Map<string, Change>();
        updated.set(attribute, { original: original!, translated });
        attributeChanges.set(element, updated);
        if (current !== translated) element.setAttribute(attribute, translated);
      }
      if (attributeChanges.get(element)?.size === 0) attributeChanges.delete(element);
    }
  }
  function walk(node: Node, context: TranslationContext) {
    if (node instanceof Text) {
      if (!node.parentElement?.closest(EXCLUDED)) translateText(node, context);
      return;
    }
    if (node instanceof Element) {
      if (node.matches(EXCLUDED)) {
        // Translate the search placeholder, while keeping the user's typed value.
        if (node.getAttribute("data-testid") === "mode-search-input") translateAttributes(node, context);
        return;
      }
      const control = controlsOf(node);
      if (control) context = contextOf(control);
      translateAttributes(node, context);
    }
    for (const child of Array.from(node.childNodes)) walk(child, context);
  }
  function updateTooltips() {
    const live = new Set(Array.from(document.querySelectorAll(TOOLTIP)));
    const byId = new Map(Array.from(ownedTooltips.values(), (owner) => [owner.id, owner]));
    for (const tooltip of live) {
      const id = tooltip.getAttribute(TOOLTIP_OWNER);
      // Reanimated shallow-clones the tooltip and moves its children during
      // fade-out. The cloned attribute identifies the original tooltip even
      // after the pointer leaves and its trigger or text nodes are replaced.
      let owner = id === null ? undefined : byId.get(id);
      if (!owner && tooltipOwner) {
        owner = { id: String(++nextTooltipId), trigger: tooltipOwner, context: contextOf(tooltipOwner) };
        tooltip.setAttribute(TOOLTIP_OWNER, owner.id);
      }
      if (owner) {
        if (owner.trigger.isConnected) owner.context = contextOf(owner.trigger);
        ownedTooltips.set(tooltip, owner);
      }
    }
    for (const tooltip of ownedTooltips.keys()) {
      if (!live.has(tooltip)) {
        tooltip.removeAttribute(TOOLTIP_OWNER);
        ownedTooltips.delete(tooltip);
      }
    }
  }
  function clearTooltips() {
    for (const tooltip of [
      ...ownedTooltips.keys(), ...Array.from(document.querySelectorAll(`[${TOOLTIP_OWNER}]`)),
    ]) tooltip.removeAttribute(TOOLTIP_OWNER);
    ownedTooltips.clear();
  }
  function refresh() {
    // Preserve React-owned nodes and handlers, and avoid observing our own edits.
    observer.disconnect();
    try {
      if (!enabled) { restoreAll(); return; }
      if (menuOwner && !menuOwner.isConnected) menuOwner = null;
      if (tooltipOwner && !tooltipOwner.isConnected) tooltipOwner = null;
      for (const [menu, owner] of ownedMenus) {
        if (!menu.isConnected || !owner.isConnected) ownedMenus.delete(menu);
      }
      if (menuOwner && Date.now() - activatedAt < 1500) {
        for (const menu of Array.from(document.querySelectorAll(MENUS))) {
          if (!previousMenus.has(menu)) ownedMenus.set(menu, menuOwner);
        }
      }
      updateTooltips();
      const factsRoots = Array.from(document.querySelectorAll(FACTS));
      const factsSet = new Set(factsRoots);
      const roots = [
        ...Array.from(document.querySelectorAll(`${CONTROLS},${FOLDED_THINKING}`)),
        ...factsRoots,
        ...ownedMenus.keys(),
        ...ownedTooltips.keys(),
      ];
      const covered = (node: Node) => node.isConnected && roots.some((root) => root.contains(node));
      for (const [node, change] of textChanges) {
        if (!covered(node)) { restoreText(node, change); textChanges.delete(node); }
      }
      for (const [element, changes] of attributeChanges) {
        if (!covered(element)) {
          restoreAttributes(element, changes);
          attributeChanges.delete(element);
        }
      }
      for (const root of roots) {
        if (factsSet.has(root)) {
          walkFacts(root, factsProviderOf(root));
          continue;
        }
        const tooltipOwnership = ownedTooltips.get(root);
        const context = tooltipOwnership?.context
          ?? contextOf(ownedMenus.get(root) ?? root);
        walk(root, context);
      }
      updateSpeedIcons();
    } finally {
      if (!disposed) observe();
    }
  }
  function activate(event: BrowserEvent) {
    if (!enabled) return;
    const element = elementOf(event.target);
    const control = controlsOf(element);
    if (control) {
      menuOwner = control;
      activatedAt = Date.now();
      previousMenus = new Set(Array.from(document.querySelectorAll(MENUS)));
      tooltipOwner = control;
    } else if (element && Array.from(ownedMenus.keys()).some((menu) => menu.contains(element))) {
      activatedAt = Date.now();
      previousMenus = new Set(Array.from(document.querySelectorAll(MENUS)));
    } else {
      menuOwner = null;
      // A backdrop receives pointerdown before click dismisses the menu.
      // Keep translated text through its exit animation, until it is detached.
    }
    schedule();
  }
  function onKey(event: BrowserEvent) {
    if (event.key === "Escape") {
      menuOwner = null;
      schedule();
    } else if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key ?? "")
      && controlsOf(event.target)) activate(event);
  }
  function onHover(event: BrowserEvent) {
    const owner = controlsOf(event.target);
    if (owner !== tooltipOwner) { tooltipOwner = owner; schedule(); }
  }
  const events: readonly [string, (event: BrowserEvent) => void][] = [
    ["pointerdown", activate], ["keydown", onKey],
    ["pointerover", onHover], ["focusin", onHover],
  ];
  for (const [name, handler] of events) document.addEventListener(name, handler, true);
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const [name, handler] of events) document.removeEventListener(name, handler, true);
    restoreAll();
    listeners.clear();
    ownedMenus.clear();
    clearTooltips();
    if (Reflect.get(document, OWNER) === dispose) Reflect.deleteProperty(document, OWNER);
  }
  Reflect.set(document, OWNER, dispose);
  refresh();
  return {
    supported: true,
    refresh: schedule,
    getEnabled: () => enabled,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setEnabled(value) {
      if (disposed || enabled === value) return;
      enabled = value;
      try { localStorage.setItem(STORAGE, String(value)); } catch { /* Session-only setting. */ }
      menuOwner = null;
      tooltipOwner = null;
      ownedMenus.clear();
      clearTooltips();
      refresh();
      for (const listener of listeners) listener();
    },
    dispose,
  };
}
