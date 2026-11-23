# Paseo 整体汉化

补全 Paseo 界面的简体中文翻译，覆盖子智能体、侧边栏、工作区、设置、审查和 Git 操作。插件也翻译智能体输入框控件，以及子智能体列表和智能体窗格副标题中的思考强度和权限模式。

![使用真实翻译引擎的隔离界面演示](assets/controls-demo.png)

演示使用示例控件和数据。

| Agent | Low | Medium | High | Extra high | Max | Ultra |
| --- | --- | --- | --- | --- | --- | --- |
| Codex | 轻度 | 中 | 高 | 极高 | 最大 | Ultra |
| Claude Code | 低 | 中 | 高 | 极高 | 最高 | Ultracode |

Claude Code 的译名参考 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn/blob/25afa23cd37d32ec4f95a640213c2bb19fa4fa8d/resources/frontend-hardcoded-zh-CN.json) 的思考强度菜单。上游的 Extra 对应 Paseo 的 Extra high；上游没有最后一档 Ultra 的译名，本插件在 Claude Code 中将它显示为 Ultracode。

## 安装和使用

适配 Paseo 0.15.4 至 0.17.x 的桌面版、网页版、原生 iOS 和 Android 客户端。0.17.x 可通过内置 `zh-CN` 词表补全界面中文，关闭后可恢复宿主文案。受支持的 0.15 和 0.16 版本也可使用智能体控件汉化。

```sh
paseo plugin add git:kogekiplay/paseo-agent-controls-zh --ref v0.3.1
```

安装后默认开启。将 Paseo 的界面语言设为简体中文，即可看到补译的文案。通过命令中心搜索「Paseo 整体汉化：翻译设置」，或在插件设置中调整翻译开关。网页端开关保存在当前浏览器。原生端开关在本次运行期间有效，重新打开应用后默认开启。关闭翻译、停用或卸载插件可恢复宿主文案。

菜单和提示在退出动画结束前保持中文，避免关闭时短暂闪回英文。实际选项值、事件和权限行为保持不变。

## 原生手机和平板 App

在手机当前选中的主机上安装或更新插件。更新后请返回会话列表，再进入会话一次，让现有控件重新创建。如果手机仍缓存旧包，关闭并重新打开应用即可。

手机端应用和主机均需满足插件声明的版本范围。插件按主机安装。

原生工具栏为思考强度和权限文字保留所需宽度，长模型名优先缩短，避免平板横屏时中文标签被挤成省略号。平板的紧凑工具栏会测量当前行的可用宽度，结合系统字号和当前译名估算文字预算；空间足够时恢复被隐藏的思考强度。窄分屏、手机和选择面板保留原有布局，速度和计划等功能仍由宿主决定是否收进设置。关闭翻译后恢复原有宽度和文字显示规则。

在 Paseo 0.16 中，原生折叠模型按钮使用系统的单行末尾省略，避免整词舍弃造成过早截断，让长路由模型名在相同空间内显示更多字符。模型原文、字体和外围按钮保持不变；关闭翻译后恢复宿主的整词省略。

Codex 速度选项包括 Normal、Fast 和 Ultrafast，对应翻译为「普通」「快速」和「超级快速」。在 Paseo 0.16 的输入框工具栏中，选中「超级快速」时速度按钮显示双闪电。悬停提示在退出动画期间保持中文。

## 数据与适配边界

插件仅在客户端运行。网页适配器通过现有 Paseo 连接读取智能体标识和提供方元数据。尚无智能体快照时，根据界面显示的模型系列识别 Claude。原生适配器读取宿主控件已携带的提供方。已有智能体优先使用真实提供方，因此 Codex 路由到其他模型时仍使用 Codex 译名。

翻译仅使用本地词典处理已识别的界面文案和控件标签。聊天正文、输入草稿、代码差异、终端输出和模型名称均按宿主原始数据呈现。网页端依赖宿主页面结构。原生端通过 Paseo 的共享 React 元素创建函数处理已识别的控件和菜单，适配 0.15 控件以及 0.16 和 0.17 预先生成的控件项目和提供方选项。

## 本地开发

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
paseo plugin install /absolute/path/to/paseo-agent-controls-zh
paseo plugin reload paseo-agent-controls-zh
```

`shared/paseo-i18n-zh.ts` 保存 Paseo 的 `zh-CN` 界面补译，`client/i18n.ts` 负责应用和恢复这些文案。`shared/translations.ts` 保存控件词典，`client/web.ts` 和 `client/native.tsx` 分别适配网页和原生控件。Paseo 直接编译插件源码。

原生验证包括真实 React 渲染、Yoga 布局回归，以及通过 Paseo 的 Metro 模块边界加载 daemon 实际编译包的 iOS / Android 分支测试。Yoga 用固定的文本测量值检查宽度分配，不等同于设备上的字体测量或物理手机、平板验收。可设置 `PASEO_TEST_BUNDLE` 指向已编译的客户端包，再运行 `npm test -- tests/native-bundle.test.tsx`。

MIT 许可证。
