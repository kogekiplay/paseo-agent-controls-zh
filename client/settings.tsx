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
          Paseo 整体汉化
        </Text>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
          补全 Paseo 全界面简体中文（子智能体、侧边栏、工作区、设置、审查与 Git 操作），同时翻译输入框下方的思考强度、权限模式、速度、计划模式及对应菜单和提示文字。
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
            覆盖范围与常见翻译
          </Text>
          {["界面补全：子智能体（2 个子智能体）、侧边栏、工作区、设置、审查与 Git 操作",
            "Codex / Antigravity：轻度 / 中 / 高 / 极高 / 最大 / Ultra",
            "Claude Code：低 / 中 / 高 / 极高 / 最高 / Ultracode",
            "Full access → 完全访问 · Speed: Fast → 速度：快速",
            "Toggle plan mode → 切换计划模式"].map((text) => (
            <Text key={text} style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>{text}</Text>
          ))}
        </View>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
          使用本地词典补全 Paseo 的简体中文界面，并翻译智能体控件。聊天正文与模型名称按原文显示。
          {Platform.OS === "web" ? "开关保存在当前客户端。" : "原生端开关在当前运行期间有效，重新启动后默认开启。"}
          关闭开关或卸载插件后自动恢复宿主原文。
        </Text>
        {Platform.OS !== "web" && controller.supported && (
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
            安装或更新后，请返回会话列表，再进入会话一次，让现有控件重新渲染。
            平板工具栏优先保留思考强度和权限文字，长模型名称按可用宽度缩短。
            会根据工具栏实际宽度和系统字号恢复被紧凑布局隐藏的思考强度；分屏过窄时仍保留图标。
          </Text>
        )}
      </ScrollView>
    );
  };
}
