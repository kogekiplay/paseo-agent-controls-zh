import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useSyncExternalStore } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { TranslationController } from "./web";

export function createSettingsScreen(controller: TranslationController) {
  return function TranslationSettings({ theme, layout }: PluginSurfaceProps) {
    const enabled = useSyncExternalStore(
      controller.subscribe, controller.getEnabled, controller.getEnabled,
    );
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
        contentContainerStyle={{ padding: layout.compact ? 16 : 24, gap: 20 }}>
        <Text style={{ color: theme.colors.foreground, fontSize: 22, fontWeight: "600" }}>
          Agent 控件中文
        </Text>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
          翻译输入框下方的思考强度、权限模式、速度和计划模式，以及对应的菜单和提示文字。
        </Text>
        <Pressable accessibilityRole="switch" accessibilityLabel="启用中文翻译"
          accessibilityState={{ checked: enabled, disabled: !controller.supported }}
          disabled={!controller.supported} onPress={() => controller.setEnabled(!enabled)}
          style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border,
            flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Text style={{ color: theme.colors.foreground, fontSize: 16, flexShrink: 1 }}>
            启用中文翻译
          </Text>
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
            {enabled ? "已开启" : "已关闭"}
          </Text>
        </Pressable>
        {!controller.supported && (
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
            当前客户端的渲染接口与插件适配版本不一致，未启用翻译。请确认客户端版本处于插件声明的兼容范围。
          </Text>
        )}
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.colors.foreground, fontSize: 16, fontWeight: "600" }}>
            常见翻译
          </Text>
          {["Codex：轻度 / 中 / 高 / 极高 / 最大 / Ultra",
            "Claude Code：低 / 中 / 高 / 极高 / 最高 / Ultracode",
            "Full access → 完全访问", "Speed: Fast → 速度：快速",
            "Toggle plan mode → 切换计划模式"].map((text) => (
            <Text key={text} style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>{text}</Text>
          ))}
        </View>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
          中文显示使用本地词典，适用于 Codex、Claude Code 及使用相同控件的其他 Agent。
          未收录的文案保留原文。
          {Platform.OS === "web" ? "开关保存在当前客户端。" : "原生端开关在当前运行期间有效，重新启动后默认开启。"}
          关闭插件后恢复原文。
        </Text>
        {Platform.OS !== "web" && controller.supported && (
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
            安装或更新后，请返回会话列表，再进入会话一次，让现有控件重新渲染。
            平板工具栏优先保留思考强度和权限文字，长模型名称按可用宽度缩短。
          </Text>
        )}
      </ScrollView>
    );
  };
}
