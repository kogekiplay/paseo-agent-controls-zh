import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Platform } from "react-native";
import { createSettingsScreen } from "./client/settings";
import { install } from "./client/web";

export default function contribute(client: PluginClientContext) {
  const providers = new Map<string, string>();
  const lifetime = new AbortController();
  const controller = install(Platform.OS === "web", (agentId) => providers.get(agentId));
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
    title: "Agent 控件中文",
    icon: "Languages",
    Component: createSettingsScreen(controller),
  });
  const removeCommand = client.addCommandCenterItem({
    id: "settings",
    title: "Agent 控件中文：翻译设置",
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
