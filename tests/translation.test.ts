// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { install, type TranslationController } from "../client/web";
import { translatePhrase } from "../shared/translations";

let controller: TranslationController | undefined;
const settle = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
const query = (selector: string) => document.querySelector(selector)!;
function activate(selector: string) {
  query(selector).dispatchEvent(new Event("pointerdown", { bubbles: true }));
}
function menu(content: string, compact = false) {
  const element = document.createElement("div");
  if (compact) element.setAttribute("role", "dialog");
  else element.setAttribute("data-testid", "combobox-desktop-container");
  element.innerHTML = content;
  document.body.append(element);
  return element;
}
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = `
    <section data-testid="assistant-message"><span>High</span><span>Full access</span></section>
    <section data-testid="message-input-root">
      <textarea>Extra high</textarea>
      <button data-testid="combined-model-selector">Max</button>
      <button data-testid="agent-thinking-selector" aria-label="选择 thinking 选项（Extra high）"><span>Extra high</span></button>
      <button data-testid="mode-control" aria-label="Select agent mode (Full access)"><span>Full access</span></button>
      <button data-testid="agent-feature-speed" aria-label="Speed: Fast"><svg><title>Fast</title></svg></button>
      <button data-testid="agent-feature-plan_mode" aria-label="Toggle plan mode"></button>
      <button id="unrelated">High</button>
    </section>`;
});
afterEach(() => { controller?.dispose(); controller = undefined; });

describe("UI phrase dictionary", () => {
  it("translates screenshot phrases and preserves whitespace and unknown strings", () => {
    expect(translatePhrase("  Extra high\n")).toBe("  极高\n");
    expect(["Low", "Medium", "High", "Extra high", "Max", "Ultra"].map((text) => translatePhrase(text)))
      .toEqual(["轻度", "中", "高", "极高", "最大", "Ultra"]);
    expect(translatePhrase("Speed: Fast")).toBe("速度：快速");
    expect(translatePhrase("Ultrafast")).toBe("超级快速");
    expect(translatePhrase("Speed: Ultrafast")).toBe("速度：超级快速");
    expect(translatePhrase("Toggle plan mode")).toBe("切换计划模式");
    expect(translatePhrase("Auto-review")).toBe("自动审查");
    expect(translatePhrase("Ultra code")).toBe("Ultra");
    expect(translatePhrase("Always ask")).toBe("始终询问");
    expect(translatePhrase("Accept file edits")).toBe("自动接受文件编辑");
    expect(translatePhrase("Auto mode")).toBe("自动模式");
    expect(translatePhrase("Bypass")).toBe("跳过权限确认");
    for (const text of ["GPT-6.1 Sol", "New provider mode", "constructor", "__proto__"]) {
      expect(translatePhrase(text)).toBe(text);
    }
  });

  it("uses the reference's effort labels only for Claude thinking controls", () => {
    const levels = ["Low", "Medium", "High", "Extra high", "Max", "Ultra"];
    expect(levels.map((text) => translatePhrase(text, { provider: "claude", thinking: true })))
      .toEqual(["低", "中", "高", "极高", "最高", "Ultracode"]);
    expect(translatePhrase("Ultra code", { provider: "claude", thinking: true })).toBe("Ultracode");
    expect(levels.map((text) => translatePhrase(text, { provider: "codex", thinking: true })))
      .toEqual(["轻度", "中", "高", "极高", "最大", "Ultra"]);
    expect(translatePhrase("Extra", { provider: "claude", thinking: true })).toBe("极高");
    expect(translatePhrase("Max", { provider: "claude", thinking: false })).toBe("最大");
    expect(translatePhrase("选择 thinking 选项（Max）", { provider: "claude" }))
      .toBe("选择思考强度（最高）");
  });
});

describe("scoped host controls", () => {
  it("shows two bolts only for the active Ultrafast speed trigger and restores its original SVG", async () => {
    const speed = query('[data-testid="agent-feature-speed"]');
    speed.setAttribute("data-testid", "agent-feature-service_tier");
    speed.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12l12-9-4 9h8L8 21l4-9z"/></svg>';
    const svg = speed.querySelector("svg")!;
    const original = svg.firstElementChild;
    const setSpeed = (label: string) => speed.setAttribute("aria-label", `Speed: ${label}`);
    controller = install(true);
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    setSpeed("Ultrafast");
    await settle();
    expect(svg.querySelectorAll("path")).toHaveLength(2);
    expect(svg.getAttribute("width")).toBe("28");
    expect(svg.getAttribute("height")).toBe("16");
    expect(svg.firstElementChild).toBe(original);
    expect(speed.getAttribute("aria-label")).toBe("速度：超级快速");
    await settle();
    expect(svg.querySelectorAll("path")).toHaveLength(2);
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    await settle();
    expect(svg.getAttribute("width")).toBe("35");
    expect(svg.querySelectorAll("path")).toHaveLength(2);
    setSpeed("Fast");
    await settle();
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("width")).toBe("20");
    setSpeed("Ultrafast");
    await settle();
    controller.setEnabled(false);
    expect(svg.firstElementChild).toBe(original);
    expect(svg.querySelectorAll("path")).toHaveLength(1);
    expect(svg.getAttribute("width")).toBe("20");
    expect(speed.getAttribute("aria-label")).toBe("Speed: Ultrafast");
  });

  it("translates 0.16's folded thinking label separately from the model name", async () => {
    query('[data-testid="combined-model-selector"]').innerHTML = `
      <span data-testid="combined-model-selector-model-label">Opus Max</span>
      <span data-testid="combined-model-selector-thinking-label">Max</span>`;
    controller = install(true);
    expect(query('[data-testid="combined-model-selector-thinking-label"]').textContent).toBe("最高");
    expect(query('[data-testid="combined-model-selector-model-label"]').textContent).toBe("Opus Max");
    activate('[data-testid="combined-model-selector-thinking-label"]');
    const modelMenu = menu('<span>Max</span><span>High</span>', true);
    await settle();
    expect(modelMenu.textContent).toBe("MaxHigh");
    controller.setEnabled(false);
    expect(query('[data-testid="combined-model-selector-thinking-label"]').textContent).toBe("Max");
    controller.setEnabled(true);
    expect(query('[data-testid="combined-model-selector-thinking-label"]').textContent).toBe("最高");
    controller.dispose();
    expect(query('[data-testid="combined-model-selector-thinking-label"]').textContent).toBe("Max");
  });

  it("keeps Codex and Claude isolated across panes and portal menus, even with misleading model names", async () => {
    document.body.innerHTML = ["codex", "claude"].map((provider) => `
      <section data-testid="workspace-pane-${provider}">
        <button data-testid="workspace-tab-agent_${provider}" aria-selected="true"></button>
        <section data-testid="message-input-root">
          <button data-testid="combined-model-selector">${provider === "codex" ? "Opus 5.5" : "GPT-6.1"}</button>
          <button id="${provider}-thinking" data-testid="agent-thinking-selector" aria-label="Select thinking option (Max)"><span>Max</span></button>
        </section>
      </section>`).join("");
    controller = install(true, (id) => id);
    expect(query("#codex-thinking").textContent).toBe("最大");
    expect(query("#claude-thinking").textContent).toBe("最高");
    expect(query("#claude-thinking").getAttribute("aria-label")).toBe("选择思考强度（最高）");
    activate("#claude-thinking");
    const claudeMenu = menu("<span>Low</span><span>Max</span>");
    await settle();
    expect(claudeMenu.textContent).toBe("低最高");
    claudeMenu.remove();
    activate("#codex-thinking");
    const codexMenu = menu("<span>Low</span><span>Max</span>");
    await settle();
    expect(codexMenu.textContent).toBe("轻度最大");
    controller.setEnabled(false);
    expect(query("#claude-thinking").textContent).toBe("Max");
    expect(query("#codex-thinking").textContent).toBe("Max");
  });

  it("uses Claude model labels in a draft, then follows the authoritative provider snapshot", async () => {
    query('[data-testid="combined-model-selector"]').textContent = "Opus 5.5";
    const control = query('[data-testid="agent-thinking-selector"]');
    control.firstElementChild!.textContent = "Max";
    control.setAttribute("aria-label", "Select thinking option (Max)");
    controller = install(true);
    expect(control.textContent).toBe("最高");
    query('[data-testid="combined-model-selector"]').textContent = "GPT-6.1";
    await settle();
    expect(control.textContent).toBe("最大");
    controller.setEnabled(false);
    expect(control.textContent).toBe("Max");
    expect(control.getAttribute("aria-label")).toBe("Select thinking option (Max)");
  });

  it("retranslates an existing menu from original text when provider metadata arrives", async () => {
    document.body.innerHTML = `<section data-testid="workspace-pane-test">
      <button data-testid="workspace-tab-agent_a" aria-selected="true"></button>${document.body.innerHTML}</section>`;
    let provider: string | undefined;
    controller = install(true, () => provider);
    activate('[data-testid="agent-thinking-selector"]');
    const portal = menu("<span>Low</span><span>Max</span>");
    await settle();
    expect(portal.textContent).toBe("轻度最大");
    provider = "claude";
    controller.refresh();
    await settle();
    expect(portal.textContent).toBe("低最高");
    provider = "codex";
    controller.refresh();
    await settle();
    expect(portal.textContent).toBe("轻度最大");
  });

  it("translates labels and accessibility text without touching chat, drafts, models or SVGs", () => {
    controller = install(true);
    expect(query('[data-testid="agent-thinking-selector"]').textContent).toBe("极高");
    expect(query('[data-testid="agent-thinking-selector"]').getAttribute("aria-label")).toBe("选择思考强度（极高）");
    expect(query('[data-testid="mode-control"]').getAttribute("aria-label")).toBe("选择权限模式（完全访问）");
    expect(query('[data-testid="agent-feature-speed"]').getAttribute("aria-label")).toBe("速度：快速");
    expect(query('[data-testid="agent-feature-plan_mode"]').getAttribute("aria-label")).toBe("切换计划模式");
    expect(query('[data-testid="assistant-message"]').textContent).toBe("HighFull access");
    expect(query("textarea").value).toBe("Extra high");
    expect(query('[data-testid="combined-model-selector"]').textContent).toBe("Max");
    expect(query("svg title").textContent).toBe("Fast");
    expect(query("#unrelated").textContent).toBe("High");
  });

  it("translates a portal menu opened by a control and retains original selection values and handlers", async () => {
    controller = install(true);
    activate('[data-testid="agent-thinking-selector"]');
    const portal = menu('<button data-value="xhigh">Extra high</button><button data-value="high">High</button>');
    let selected = "";
    portal.firstElementChild!.addEventListener("click", () => { selected = portal.firstElementChild!.getAttribute("data-value")!; });
    await settle();
    expect(portal.textContent).toBe("极高高");
    (portal.firstElementChild as HTMLElement).click();
    expect(selected).toBe("xhigh");
    expect(portal.firstElementChild!.getAttribute("data-value")).toBe("xhigh");
  });

  it("leaves unrelated menus untouched, including after closing a translated menu", async () => {
    controller = install(true);
    const existing = menu("<span>High</span>");
    await settle();
    expect(existing.textContent).toBe("High");
    activate('[data-testid="mode-control"]');
    const own = menu("<span>Full access</span>");
    await settle();
    expect(own.textContent).toBe("完全访问");
    expect(existing.textContent).toBe("High");
    activate("#unrelated");
    own.remove();
    const unrelated = menu("<span>High</span><span>Default</span>");
    await settle();
    expect(unrelated.textContent).toBe("HighDefault");
  });

  it("supports keyboard-opened and compact dialog menus", async () => {
    controller = install(true);
    query('[data-testid="mode-control"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const portal = menu('<span>Accept edits</span><span>Bypass permissions</span><span>New provider mode</span><input data-testid="mode-search-input" placeholder="Search modes..." value="High">', true);
    await settle();
    expect(portal.textContent).toBe("自动接受编辑跳过权限确认New provider mode");
    expect(portal.querySelector("input")!.value).toBe("High");
    expect(portal.querySelector("input")!.placeholder).toBe("搜索模式…");
  });

  it("keeps menus translated through backdrop clicks, Escape and exit animations", async () => {
    controller = install(true);
    activate('[data-testid="agent-thinking-selector"]');
    const portal = menu("<span>Extra high</span><span>Ultra</span>");
    await settle();
    expect(portal.textContent).toBe("极高Ultra");
    activate("#unrelated"); // The backdrop intercepts a second click on the trigger.
    await settle();
    expect(portal.textContent).toBe("极高Ultra");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle();
    expect(portal.textContent).toBe("极高Ultra");
    portal.remove();
    const unrelated = menu("<span>Extra high</span>");
    await settle();
    expect(unrelated.textContent).toBe("Extra high");
  });

  it("keeps tooltips translated through exit animations without claiming unrelated tooltips", async () => {
    controller = install(true);
    query('[data-testid="agent-feature-speed"]').dispatchEvent(new Event("pointerover", { bubbles: true }));
    const tooltip = document.createElement("div");
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = "Speed: Fast";
    document.body.append(tooltip);
    await settle();
    expect(tooltip.textContent).toBe("速度：快速");
    query("#unrelated").dispatchEvent(new Event("pointerover", { bubbles: true }));
    await settle();
    expect(tooltip.textContent).toBe("速度：快速");
    tooltip.remove();
    const unrelated = document.createElement("div");
    unrelated.setAttribute("role", "tooltip");
    unrelated.textContent = "Fast";
    document.body.append(unrelated);
    await settle();
    expect(unrelated.textContent).toBe("Fast");
  });

  it("keeps a tooltip translated when its trigger unmounts during the exit animation", async () => {
    controller = install(true);
    const control = query('[data-testid="agent-feature-speed"]');
    control.dispatchEvent(new Event("pointerover", { bubbles: true }));
    const tooltip = document.createElement("div");
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = "Speed: Fast";
    document.body.append(tooltip);
    await settle();
    expect(tooltip.textContent).toBe("速度：快速");

    control.remove();
    controller.refresh();
    await settle();
    expect(tooltip.textContent).toBe("速度：快速");

    tooltip.firstChild!.nodeValue = "Speed: Fast";
    await settle();
    expect(tooltip.textContent).toBe("速度：快速");
  });

  it("retranslates React updates and restores the newest English value when disabled", async () => {
    controller = install(true);
    const control = query('[data-testid="agent-thinking-selector"]');
    control.firstElementChild!.firstChild!.nodeValue = "High";
    control.setAttribute("aria-label", "Select thinking option (High)");
    await settle();
    expect(control.textContent).toBe("高");
    expect(control.getAttribute("aria-label")).toBe("选择思考强度（高）");
    controller.setEnabled(false);
    expect(control.textContent).toBe("High");
    expect(control.getAttribute("aria-label")).toBe("Select thinking option (High)");
    expect(localStorage.getItem("paseo.agent-controls-zh.enabled")).toBe("false");
    controller.setEnabled(true);
    expect(control.textContent).toBe("高");
  });

  it("does not overwrite a host update made just before disposal", () => {
    controller = install(true);
    query('[data-testid="mode-control"]').firstElementChild!.firstChild!.nodeValue = "Custom permission";
    controller.dispose();
    expect(query('[data-testid="mode-control"]').textContent).toBe("Custom permission");
  });

  it("cleans up all nodes and observers on reload or disposal", async () => {
    controller = install(true);
    const replacement = install(true);
    controller.dispose();
    controller = replacement;
    expect(query('[data-testid="mode-control"]').textContent).toBe("完全访问");
    controller.dispose();
    expect(query('[data-testid="mode-control"]').textContent).toBe("Full access");
    const later = document.createElement("button");
    later.setAttribute("data-testid", "agent-thinking-selector");
    later.textContent = "Low";
    document.body.append(later);
    await settle();
    expect(later.textContent).toBe("Low");
  });

  it("remembers the client switch across plugin reloads", () => {
    controller = install(true);
    controller.setEnabled(false);
    controller.dispose();
    controller = install(true);
    expect(controller.getEnabled()).toBe(false);
    expect(query('[data-testid="mode-control"]').textContent).toBe("Full access");
  });

  it("has a safe native fallback", () => {
    controller = install(false);
    expect(controller.supported).toBe(false);
    expect(query('[data-testid="mode-control"]').textContent).toBe("Full access");
    controller.setEnabled(true);
    expect(controller.getEnabled()).toBe(false);
  });
});
