# Agent 控件中文

把 Paseo 输入框下方的思考强度、权限模式、速度、计划模式及对应菜单和提示翻译为简体中文。

![使用真实翻译引擎的隔离界面演示](assets/controls-demo.png)

演示使用示例控件和真实翻译引擎，不包含用户聊天。

| Agent | Low | Medium | High | Extra high | Max | Ultra |
| --- | --- | --- | --- | --- | --- | --- |
| Codex | 轻度 | 中 | 高 | 极高 | 最大 | Ultra |
| Claude Code | 低 | 中 | 高 | 极高 | 最高 | Ultracode |

Claude Code 的译名参考 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn/blob/25afa23cd37d32ec4f95a640213c2bb19fa4fa8d/resources/frontend-hardcoded-zh-CN.json) 的思考强度菜单。上游的 Extra 对应 Paseo 的 Extra high；上游没有最后一档 Ultra 的译名，本插件在 Claude Code 中将它显示为 Ultracode。

## 安装和使用

适配 Paseo 0.15.4，版本范围限定为 0.15.x。支持桌面版和网页版；原生 iOS / Android 暂不支持。

```sh
paseo plugin add git:kogekiplay/paseo-agent-controls-zh --ref v0.1.0
```

安装后默认开启。通过命令中心搜索「Agent 控件中文：翻译设置」，或者在插件设置中打开翻译开关。开关保存在当前客户端。关闭、停用或卸载后恢复原文。

菜单和提示在退出动画结束前保持中文，避免关闭时短暂闪回英文。实际选项值、事件和权限行为保持不变。

## 数据与适配边界

插件仅在客户端运行，通过现有 Paseo 连接观察 Agent 标识和 Provider 元数据，为每个输入框选择词典。草稿尚无 Agent 快照时，根据显示的 Claude / Opus / Sonnet / Haiku 模型系列识别 Claude。已有 Agent 优先使用真实 Provider，因此 Codex 路由到其他模型时仍使用 Codex 译名。

它不读取聊天正文、不调用外部翻译服务，也不修改提示词、模型名称或权限配置。未知文案保持原样。当前依赖宿主控件的页面结构；Paseo 升级后可能需要适配。

## 本地开发

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
paseo plugin install /absolute/path/to/paseo-agent-controls-zh
paseo plugin reload paseo-agent-controls-zh
```

`shared/translations.ts` 保存通用词典和 Claude 专用思考强度词典。`client/web.ts` 是唯一使用浏览器 API 的模块，`client/settings.tsx` 使用 React Native 和宿主主题。无需构建步骤或运行时依赖安装。

MIT 许可证。
