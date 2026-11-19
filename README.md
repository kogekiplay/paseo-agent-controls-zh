# Agent Controls Chinese

[简体中文](README.zh-CN.md)

Simplified Chinese labels for Paseo's agent composer controls: thinking effort, permission modes, speed and plan mode, with their dropdowns, tooltips and accessibility labels.

![Isolated interface preview using the plugin's actual translator](assets/controls-demo.png)

This preview uses sample controls and the actual translation engine, without user chats.

| Agent | Low | Medium | High | Extra high | Max | Ultra |
| --- | --- | --- | --- | --- | --- | --- |
| Codex | 轻度 | 中 | 高 | 极高 | 最大 | Ultra |
| Claude Code | 低 | 中 | 高 | 极高 | 最高 | Ultracode |

Claude Code's effort names follow the effort-menu mappings in [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn/blob/25afa23cd37d32ec4f95a640213c2bb19fa4fa8d/resources/frontend-hardcoded-zh-CN.json). Its “Extra” maps to Paseo's “Extra high”. The reference does not define the final Ultra level; this plugin displays it as Ultracode for Claude Code.

## Install

Requires Paseo 0.15.4 or later in the 0.15.x or 0.16.x series. Desktop, browser, native iOS and native Android clients have adapters.

```sh
paseo plugin add git:kogekiplay/paseo-agent-controls-zh --ref v0.2.8
```

Translation is enabled on installation. Open the Command Center and search for **Agent 控件中文：翻译设置**, or open this plugin's settings. The browser saves the switch locally. On native clients the switch lasts for the current app run and starts enabled after relaunch. Disabling or unloading restores the original labels.

Menus and tooltips retain Chinese through their exit animations. Original option IDs, event handlers and permission behavior stay intact.

## Native phone and tablet apps

Install or update the plugin on the host selected by your phone. After the update, return to the agent list and reopen the conversation once so existing controls are recreated. If the old bundle is cached, close and reopen the phone app. No daemon restart or custom app build is needed.

Both the phone app and host must satisfy the manifest version range. A plugin installed on one host is not automatically installed on another host.

Native toolbars reserve the width of effort and permission labels, letting long model names shrink first. This avoids ellipsized Chinese controls on landscape tablets. Condensed tablet toolbars measure their local available width and budget for the system font scale and current labels, restoring hidden effort text when space permits. Narrow split views, phone controls and selection sheets retain their original layout. Paseo still decides whether to group features such as speed and plan mode into settings. Disabling translation restores the original width and label-visibility rules.

On Paseo 0.16, the folded native model trigger uses the platform's single-line tail ellipsis instead of dropping whole trailing words. Long routed model names can show more characters in the same space. The model string, font and surrounding button remain unchanged; disabling translation restores the host's word-boundary ellipsis.

Codex speed choices include Normal, Fast and Ultrafast. Their translated labels are 普通, 快速 and 超级快速. Tooltip text stays translated while the hover surface exits.

## Data and compatibility

This is a client-only plugin. The browser adapter observes agent IDs and provider metadata through the existing Paseo connection to select a dictionary for each composer. Browser drafts without agent metadata recognize Claude by the displayed model family. The native adapter uses the provider already passed to the host control components. Existing agents prefer their actual provider, so a Codex agent routing to another model still uses Codex labels.

It does not read chat content, contact a translation service, or change prompts, model names or permission settings. Unknown phrases keep their original text. The browser adapter depends on host page structure. The native adapter hooks the shared React element factories exposed to plugins in Paseo 0.15.4 and 0.16, and only wraps recognized Agent control prop shapes, control test IDs and their owned menus. It handles both the 0.15 controls and 0.16's precomputed control items and provider option choices. This is a version-specific integration, not a public host-localization API; unsupported render runtimes leave controls unchanged and report the limitation in settings.

## Development

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
paseo plugin install /absolute/path/to/paseo-agent-controls-zh
paseo plugin reload paseo-agent-controls-zh
```

- `shared/translations.ts`: general phrases and Claude-specific effort labels.
- `client/web.ts`: scoped text replacement, overlay ownership, lifecycle cleanup and browser-only APIs.
- `client/native.tsx`: native React component/option adaptation and runtime cleanup.
- `client/settings.tsx`: React Native settings using the host theme.
- `index.client.tsx`: registrations and provider metadata observation.

Paseo compiles the TypeScript source. There is no preparation step, backend entry or runtime dependency installation.

To regenerate the sample interface image, run `npm run preview:render` with a local Chrome/Chromium installation. Set `CHROME_BIN` when Chrome is outside the usual installation paths. The renderer uses an isolated temporary profile.

Native verification includes real React rendering, Yoga layout regressions, and an opt-in test of the daemon-compiled client bundle using Paseo's Metro host namespace shape for both iOS and Android. Yoga uses fixed text measurements to check width allocation; it does not test device font measurement. Set `PASEO_TEST_BUNDLE` to that bundle file and run `npm test -- tests/native-bundle.test.tsx`. These checks do not substitute for physical phone or tablet validation.

## License

MIT. Translation label reference: [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn).
