import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Platform } from "react-native";
import { installI18n } from "./client/i18n";
import { createSettingsScreen } from "./client/settings";
import { install, type TranslationController } from "./client/web";
import { installNative } from "./client/native";
import { paseoZhOverrides } from "./shared/paseo-i18n-zh";

function combineControllers(
  controls: TranslationController,
  i18n: TranslationController,
): TranslationController {
  const supported = controls.supported || i18n.supported;
  return {
    supported,
    getEnabled: () => (controls.supported ? controls.getEnabled()
      : i18n.supported ? i18n.getEnabled() : false),
    subscribe(listener) {
      const unsubControls = controls.subscribe(listener);
      const unsubI18n = i18n.subscribe(listener);
      return () => {
        unsubControls();
        unsubI18n();
      };
    },
    setEnabled(value) {
      controls.setEnabled(value);
      i18n.setEnabled(value);
    },
    refresh() {
      controls.refresh();
      i18n.refresh();
    },
    dispose() {
      i18n.dispose();
      controls.dispose();
    },
  };
}

export default function contribute(client: PluginClientContext) {
  const providers = new Map<string, string>();
  const lifetime = new AbortController();
  const controls = Platform.OS === "web"
    ? install(true, (agentId) => providers.get(agentId))
    : installNative();
  const initialEnabled = Platform.OS === "web" && controls.supported ? controls.getEnabled() : true;
  const i18n = installI18n(paseoZhOverrides, initialEnabled);
  const controller = combineControllers(controls, i18n);
  if (Platform.OS === "web") {
    void client.paseo.agents.list({ subscribe: {}, signal: lifetime.signal })
      .then(({ subscription }) => {
        if (lifetime.signal.aborted) return;
        subscription.subscribe({
          snapshot: ({ entries }) => {
            providers.clear();
            for (const { agent } of entries) providers.set(agent.id, agent.provider);
            controller.refresh();
          },
          update: (message) => {
            if (message.type !== "agent_update") return;
            const update = message.payload;
            if (update.kind === "upsert") providers.set(update.agent.id, update.agent.provider);
            else providers.delete(update.agentId);
            controller.refresh();
          },
        });
      })
      .catch((error: unknown) => {
        if (!lifetime.signal.aborted) console.warn("[agent-controls-zh] Provider observation unavailable", error);
      });
  }
  const removeSettings = client.addSettingsScreen({
    id: "translation",
    title: "Paseo 整体汉化",
    icon: "Languages",
    Component: createSettingsScreen(controller),
  });
  const removeCommand = client.addCommandCenterItem({
    id: "settings",
    title: "Paseo 整体汉化：翻译设置",
    icon: "Languages",
    context: "global",
    onSelect: ({ openSettings }) => openSettings("translation"),
  });
  return () => {
    lifetime.abort();
    providers.clear();
    removeCommand();
    removeSettings();
    controller.dispose();
  };
}
