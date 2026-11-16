Agent Controls Chinese translates the thinking effort, permission mode, speed and plan controls beneath Paseo's composer, including their menus, tooltips and accessibility labels, into Simplified Chinese.

Codex uses 轻度, 中, 高, 极高, 最大 and Ultra. Claude Code uses 低, 中, 高, 极高 and 最高, following the effort menu in javaht/claude-desktop-zh-cn; the final Ultra level displays as Ultracode. Other agents reuse the general dictionary where their controls and phrases match. Unknown phrases retain their original text.

Supports Paseo 0.15.4 desktop and browser clients, including compact browser layouts. Native iOS and Android clients do not support these replacements. Translation starts enabled. Its switch is available in plugin settings and is stored separately on each client.

The client reads text and accessibility labels in the specified controls and their associated overlays. It observes agent IDs and provider metadata through the existing Paseo connection to choose the appropriate dictionary. Drafts without an agent snapshot identify Claude by its displayed model family. It does not read or translate chat content, change drafts, model names, option values or permission behavior, or call an external translation service. Disabling or unloading restores the original text.

Control replacement currently depends on Paseo's desktop/browser page structure. Host updates may require adapter changes, so compatibility is limited to Paseo 0.15.x.
