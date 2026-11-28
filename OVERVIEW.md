Paseo Chinese Localization fills gaps in the Simplified Chinese interface, including subagents, the sidebar, workspaces, settings, reviews and Git commands. It also translates the thinking effort, permissions, speed and plan controls beneath the composer, including their menus, tooltips and accessibility labels.

Codex uses 轻度, 中, 高, 极高, 最大 and Ultra. Claude Code uses 低, 中, 高, 极高 and 最高, following the effort menu in javaht/claude-desktop-zh-cn; the final level displays as Ultracode. Other agents reuse the general dictionary where their controls and phrases match. Unknown phrases retain their original text.

Supports Paseo 0.15.4 through 0.18.x on desktop, browser, native iOS and native Android clients. Interface translations supplement the built-in `zh-CN` resources on Paseo 0.17.x and 0.18.x. Choose Simplified Chinese in Paseo to see them. Composer translations also work on the supported 0.15 and 0.16 versions. On phones, use the host where the plugin is installed. After an update, return to the agent list and reopen the conversation. Translation starts enabled.

On native toolbars, effort and permission labels keep their width while long model names shorten to fit. Condensed tablet toolbars restore hidden effort text when the local row width and system font scale permit. Narrow split views and phone controls keep Paseo's icon layout, and selection sheets keep their original sizing.

On Paseo 0.16, folded native model labels use the platform's single-line tail ellipsis, allowing more of a long routed name to fit before the ellipsis. The model string and font are preserved. Disabling translation restores the host's word-boundary truncation.

Codex speed choices Normal, Fast and Ultrafast display as 普通, 快速 and 超级快速. Tooltip text remains translated during its exit animation.

Translation runs on the client using local dictionaries for interface strings and composer labels. Chat messages, input drafts, code diffs, terminal output and model names render from their original data. Disabling translation or unloading the plugin restores the original interface and composer labels.

The browser adapter uses host page structure. The native adapter wraps recognized controls through the shared React render runtime in Paseo 0.15.4 through 0.18.x. An incompatible native runtime leaves the original controls unchanged and reports the limitation in settings.
