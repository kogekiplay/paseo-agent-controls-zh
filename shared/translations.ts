export const ULTRAFAST_LABEL = "超级快速";

/** Exact UI phrases only. New providers can reuse these without changing their IDs. */
export const phrases: Readonly<Record<string, string>> = {
  "Low": "轻度",
  "Medium": "中",
  "High": "高",
  "Extra": "极高",
  "Extra high": "极高",
  "Extra High": "极高",
  "Very high": "极高",
  "Unknown": "未知",
  "Max": "最大",
  "Maximum": "最大",
  "Ultra": "Ultra",
  "Ultra code": "Ultra",
  "Ultra Code": "Ultra",
  "Minimal": "最低",
  "None": "无",
  "Off": "关闭",
  "On": "开启",
  "Auto": "自动",
  "Automatic": "自动",
  "Adaptive": "自适应",
  "Default": "默认",
  "Thinking": "思考强度",
  "Thinking mode": "思考模式",
  "Reasoning": "推理强度",
  "Reasoning effort": "推理强度",
  "Effort": "思考强度",
  "Select thinking option": "选择思考强度",
  "选择 thinking 选项": "选择思考强度",
  "Full access": "完全访问",
  "Full Access": "完全访问",
  "Read only": "只读",
  "Read-only": "只读",
  "Default permissions": "默认权限",
  "Default Permissions": "默认权限",
  "Auto-review": "自动审查",
  "Auto review": "自动审查",
  "Auto Review": "自动审查",
  "Ask": "询问",
  "Always ask": "始终询问",
  "Always Ask": "始终询问",
  "Ask before edits": "编辑前询问",
  "Auto edit": "自动编辑",
  "Auto-edit": "自动编辑",
  "Auto approve": "自动批准",
  "Auto-approve": "自动批准",
  "Accept edits": "自动接受编辑",
  "Accept Edits": "自动接受编辑",
  "Accept file edits": "自动接受文件编辑",
  "Accept File Edits": "自动接受文件编辑",
  "Allow all": "全部允许",
  "Allow All": "全部允许",
  "Write approval": "写入审批",
  "Write Approval": "写入审批",
  "Auto mode": "自动模式",
  "Bypass": "跳过权限确认",
  "Auto accept edits": "自动接受编辑",
  "Bypass permissions": "跳过权限确认",
  "Bypass Permissions": "跳过权限确认",
  "Don't ask": "不再询问",
  "Plan": "计划",
  "Plan mode": "计划模式",
  "Plan Mode": "计划模式",
  "Build": "构建",
  "Code": "编码",
  "Chat": "对话",
  "Agent": "智能体",
  "Mode": "模式",
  "Change mode": "切换模式",
  "更改模式": "切换模式",
  "Search modes...": "搜索模式…",
  "搜索 modes...": "搜索模式…",
  "搜索modes...": "搜索模式…",
  "Select agent mode": "选择权限模式",
  "选择 Agent mode": "选择权限模式",
  "Toggle plan mode": "切换计划模式",
  "Enable plan mode": "启用计划模式",
  "Disable plan mode": "关闭计划模式",
  "Enter plan mode": "进入计划模式",
  "Exit plan mode": "退出计划模式",
  "Speed": "速度",
  "Select speed": "选择速度",
  "Fast": "快速",
  "Ultrafast": ULTRAFAST_LABEL,
  "Flex": "弹性",
  "Standard": "标准",
  "Normal": "普通",
  "Fast mode": "快速模式",
  "Fast Mode": "快速模式",
  "Toggle fast mode": "切换快速模式",
  "Enable fast mode": "启用快速模式",
  "Disable fast mode": "关闭快速模式",
  "Features": "功能",
  "Open agent features": "打开智能体功能",
  "打开 Agent features": "打开智能体功能",
  "Auto accept": "自动接受",
  "Auto-accept": "自动接受",
  "Auto Accept": "自动接受",
  "Toggle auto accept": "切换自动接受",
};

export interface TranslationContext {
  provider?: string;
  thinking?: boolean;
}

// javaht/claude-desktop-zh-cn, resources/frontend-hardcoded-zh-CN.json
// Reference revision: 25afa23cd37d32ec4f95a640213c2bb19fa4fa8d.
// Claude calls the fourth level "Extra"; Paseo exposes it as "Extra high".
// The reference does not define Ultra; "Ultracode" is this plugin's display choice.
export const claudeThinking: Readonly<Record<string, string>> = {
  "Low": "低",
  "Medium": "中",
  "High": "高",
  "Extra": "极高",
  "Extra high": "极高",
  "Extra High": "极高",
  "Max": "最高",
  "Maximum": "最高",
  "Ultra": "Ultracode",
  "Ultra code": "Ultracode",
  "Ultra Code": "Ultracode",
  "Ultracode": "Ultracode",
};

const patterns: readonly [RegExp, (match: RegExpMatchArray, context: TranslationContext) => string][] = [
  [/^Speed:\s*(.+)$/, (m, context) => `速度：${translatePhrase(m[1], context)}`],
  [/^Fast mode:\s*(.+)$/, (m, context) => `快速模式：${translatePhrase(m[1], context)}`],
  [/^Plan mode:\s*(.+)$/, (m, context) => `计划模式：${translatePhrase(m[1], context)}`],
  [/^Ultracode:\s*(.+)$/i, (m, context) => `Ultracode：${translatePhrase(m[1], context)}`],
  [/^(?:Select thinking option|选择 thinking 选项)\s*[（(](.+)[）)]$/,
    (m, context) => `选择思考强度（${translatePhrase(m[1], { ...context, thinking: true })}）`],
  [/^(?:Select agent mode|选择 Agent mode)\s*[（(](.+)[）)]$/,
    (m, context) => `选择权限模式（${translatePhrase(m[1], context)}）`],
];

export function translatePhrase(text: string, context: TranslationContext = {}): string {
  const trimmed = text.trim();
  const isClaude = /^(?:claude|claude-code)(?:\/|$)/i.test(context.provider ?? "");
  let translated = isClaude && context.thinking && Object.hasOwn(claudeThinking, trimmed)
    ? claudeThinking[trimmed]
    : Object.hasOwn(phrases, trimmed) ? phrases[trimmed] : undefined;
  if (!translated) {
    for (const [pattern, format] of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        translated = format(match, context);
        break;
      }
    }
  }
  if (!translated || translated === trimmed) return text;
  return text.slice(0, text.length - text.trimStart().length)
    + translated + text.slice(text.trimEnd().length);
}
