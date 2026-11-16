Agent Controls Chinese translates the thinking effort, permission mode, speed and plan controls beneath Paseo's composer, including their menus, tooltips and accessibility labels, into Simplified Chinese.

Codex uses 轻度, 中, 高, 极高, 最大 and Ultra. Claude Code uses 低, 中, 高, 极高 and 最高, following the effort menu in javaht/claude-desktop-zh-cn; the final level displays as Ultracode. Other agents reuse the general dictionary where their controls and phrases match. Unknown phrases retain their original text.

Requires Paseo 0.15.4 and supports the desktop, browser, native iOS and native Android clients. Phone clients need the plugin on their selected host. After an update, return to the agent list and reopen the conversation once. Translation starts enabled. Browsers save the enable switch locally; native clients keep it for the current app run.

On native toolbars, effort and permission labels keep their width while long model names shorten to fit. Condensed tablet toolbars restore hidden effort text when the local row width and system font scale permit. Narrow split views and phone controls keep Paseo's icon layout, and selection sheets keep their original sizing.

The browser adapter reads text and accessibility labels in the specified controls and their associated overlays, and observes agent IDs/provider metadata through the existing Paseo connection. The native adapter reads the provider and display props already passed to the host controls. Neither adapter reads or translates chat content, changes drafts, model names, option IDs or permission behavior, or calls an external translation service. Disabling or unloading restores original labels.

The browser adapter uses host page structure. Native adaptation wraps recognized controls through the shared React render runtime exposed to plugins in Paseo 0.15.4. This is a version-specific integration rather than a public host-localization API. An incompatible native runtime leaves the original controls unchanged and reports the limitation in settings. Compatibility is limited to Paseo 0.15.x.
