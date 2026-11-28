export interface NestedTranslations {
  readonly [key: string]: string | NestedTranslations;
}

/** Simplified Chinese overrides for Paseo's built-in translation namespace. */
export const paseoZhOverrides: NestedTranslations = {
  common: {
    errors: {
      daemonUnavailable: "守护进程不可用",
      daemonClientUnavailable: "守护进程客户端不可用",
      daemonClientDisconnected: "守护进程客户端已断开连接",
    },
  },
  shell: {
    commandCenter: {
      newAgent: "新建智能体",
      addProject: "添加项目",
    },
  },
  composer: {
    placeholders: {
      desktop: "给智能体发消息，使用 @files 引用文件，或使用 /commands 和 /skills",
      terminal: "提示词",
    },
    input: {
      accessibilityLabel: "给智能体发消息…",
      terminalAccessibilityLabel: "终端提示词",
      interruptAgent: "中断智能体",
    },
    cancel: {
      cancelingAgent: "正在取消智能体",
      stopAgent: "停止智能体",
    },
    voice: {
      interruptBeforeVoice: "启动语音模式前请先中断智能体",
    },
    attachments: {
      addFile: "上传文件",
      dropFilesHere: "将文件拖到这里",
      removeFile: "移除文件附件",
      openReview: "打开审查附件",
      removeReview: "移除审查附件",
    },
    errors: {
      failedToCreateAgent: "创建智能体失败",
      noHostSelected: "未选择主机",
      initialPromptRequired: "请输入初始提示词",
      uploadFailed: "文件上传失败",
      fileTooLarge: "{{fileName}} 超出大小限制（最大 {{size}}）",
    },
    clientCommands: {
      archiveAgent: "归档当前智能体",
      freshDraft: "归档此智能体并开始新草稿",
    },
    github: {
      searchPlaceholder: "搜索 Issue 和 PR…",
      searchPlaceholder_mr: "搜索 Issue 和 MR…",
    },
  },
  agentControls: {
    provider: {
      fallback: "提供方",
      select: "选择智能体提供方",
    },
    thinking: {
      title: "思考强度",
      extraHigh: "极高",
      select: "选择思考强度",
      selectWithValue: "选择思考强度（{{value}}）",
    },
    model: {
      unknown: "未知模型",
    },
    features: {
      title: "功能",
      open: "打开智能体功能",
    },
    mode: {
      title: "权限模式",
      searchPlaceholder: "搜索模式…",
      selectWithValue: "选择权限模式（{{value}}）",
    },
    hints: {
      thinking: "思考模式",
      model: "切换模型",
    },
  },
  agentStream: {
    empty: "开始与此智能体对话…",
    permission: {
      plan: "计划",
    },
  },
  agentPanel: {
    states: {
      notFound: "未找到智能体",
      failedToLoad: "加载智能体失败",
      archivingTitle: "正在归档智能体…",
      archivingSubtitle: "正在归档此智能体，请稍候。",
    },
    unavailable: {
      selectedHost: "所选主机",
      unknownHost: "此设备尚未配置 {{serverLabel}}，无法打开此智能体。",
      addHost: "请在设置中添加主机，或打开已配置主机上的智能体。",
      showSoon: "此智能体稍后会显示。",
      showWhenOnline: "主机上线后将显示此智能体。",
      showAgainWhenReachable: "主机恢复连接后将再次显示此智能体。",
    },
    archived: {
      callout: "此智能体已归档",
    },
  },
  agentList: {
    archiveSheet: {
      hostOffline: "主机离线",
      runningAgent: "此智能体仍在运行，归档会停止它。",
    },
  },
  message: {
    actions: {
      forkMissingWorkspace: "此智能体不在工作区中。",
    },
  },
  importSession: {
    chooseHostTitle: "从主机导入",
    scope: {
      workspace: "此工作区",
    },
    status: {
      connectHost: "连接主机以导入会话",
      updateHost: "更新主机后即可导入会话。",
      noProviders: "没有已启用且支持导入的提供方。",
    },
    preview: {
      noPrompt: "暂无提示词预览",
    },
  },
  workspace: {
    route: {
      loading: "正在加载工作区",
      hostStatus: "主机状态：{{status}}",
      needsHostUpgrade: "更新主机以恢复此工作区",
      manageHost: "管理主机",
      recovery: {
        archivedTitle: "工作区已归档",
        restoreDescription: "恢复 {{workspaceName}} 即可返回其中的智能体。工作树将使用分支 {{branch}}。",
        restoringTitle: "正在恢复工作区",
        unavailableTitle: "工作区不可用",
        checkFailedTitle: "无法检查工作区",
      },
    },
    hoverCard: {
      scriptsAccessibility: "工作区脚本",
    },
    fileExplorer: {
      states: {
        unavailable: "工作区不可用",
      },
    },
    setup: {
      descriptor: {
        label: "初始化",
        completed: "初始化已完成",
        failed: "初始化失败",
        workspace: "工作区初始化",
      },
      status: {
        waiting: "正在等待初始化输出",
      },
      waiting: "正在初始化工作区…",
      empty: {
        noCommands: "此工作区尚未运行初始化命令。",
      },
      accessibility: {
        noCommands: "此工作区尚未运行初始化命令",
        log: "工作区初始化日志",
      },
    },
    browser: {
      unavailable: {
        subtitle: "在 Electron 中打开此工作区以使用内置浏览器。",
      },
    },
    terminal: {
      hostDisconnected: "主机未连接",
      unableToSubscribe: "无法订阅终端",
    },
    tabs: {
      loadingAgentTitle: "正在加载智能体标题",
      fallback: {
        newAgent: "新建智能体",
        setup: "初始化",
        workspaceSetup: "工作区初始化",
        terminal: "终端",
        agent: "智能体",
        workspace: "工作区",
      },
      switcher: {
        title: "工作区标签",
      },
      menu: {
        copyAgentId: "复制智能体 ID",
        copyTerminalId: "复制终端 ID",
        copyFilePath: "复制文件路径",
        reloadAgent: "重新加载智能体",
        reloadAgentTooltip: "重新加载智能体以更新技能、MCP 服务器或登录状态。",
        renameTerminal: "重命名终端",
        renameAgent: "重命名智能体",
      },
      actions: {
        newAgent: "新建智能体",
        newTerminal: "新建终端",
        preparingTerminal: "正在准备终端标签",
        preparingTerminalTooltip: "正在准备终端…",
        terminalProfilesMenu: "终端预设",
        editTerminalProfiles: "编辑预设",
      },
      toasts: {
        agentIdCopiedLabel: "智能体 ID",
        terminalIdCopiedLabel: "终端 ID",
        filePathCopiedLabel: "文件路径",
        reloadingAgent: "正在重新加载智能体…",
        reloadedAgent: "已重新加载智能体",
        failedToReloadAgent: "重新加载智能体失败",
        failedToCloseAgent: "关闭智能体失败",
      },
      confirmations: {
        closeTerminalTitle: "关闭终端？",
        closeTerminalMessage: "此终端中运行的进程将立即停止。",
        archiveRunningAgentTitle: "归档正在运行的智能体？",
        archiveRunningAgentMessage: "此智能体仍在运行。归档会停止它并关闭标签。",
        bulk: {
          all: "将归档 {{agents}} 个智能体，关闭 {{terminals}} 个终端，并关闭 {{tabs}} 个标签。被关闭终端中的进程将立即停止。",
          agentsAndTerminals: "将归档 {{agents}} 个智能体并关闭 {{terminals}} 个终端。被关闭终端中的进程将立即停止。",
          terminalsAndTabs: "将关闭 {{terminals}} 个终端和 {{tabs}} 个标签。被关闭终端中的进程将立即停止。",
          agentsAndTabs: "将归档 {{agents}} 个智能体并关闭 {{tabs}} 个标签。",
          terminals: "将关闭 {{terminals}} 个终端，其中的进程将立即停止。",
          agents: "将归档 {{agents}} 个智能体。",
        },
      },
    },
    header: {
      actions: {
        workspaceActions: "工作区操作",
        workspaceActionsUnhealthy: "工作区操作，有服务异常",
        newAgent: "新建智能体",
        newTerminal: "新建终端",
        copyPath: "复制工作区路径",
        showSetup: "查看初始化",
      },
      toasts: {
        workspacePathUnavailable: "工作区路径尚不可用",
        terminalQueued: "正在准备工作区，终端将在就绪后打开…",
        workspacePathCopiedLabel: "工作区路径",
      },
    },
    scripts: {
      title: "脚本",
      accessibility: {
        trigger: "工作区脚本",
        viewTerminal: "查看 {{scriptName}} 的终端",
        runScript: "运行脚本 {{scriptName}}",
        script: "脚本 {{scriptName}}",
      },
      routes: {
        paseo: "易记地址",
      },
      states: {
        exitCode: "退出码 {{code}}",
      },
    },
    git: {
      actions: {
        commit: {
          label: "提交",
          pending: "正在提交…",
          success: "已提交",
        },
        pull: {
          label: "拉取",
          pending: "正在拉取…",
          success: "已拉取",
        },
        push: {
          label: "推送",
          pending: "正在推送…",
          success: "已推送",
        },
        pullAndPush: {
          label: "拉取并推送",
          pending: "正在拉取并推送…",
          success: "已拉取并推送",
        },
        mergeBranch: {
          label: "本地合并",
          pending: "正在合并…",
          success: "已合并",
        },
        mergePr: {
          squash: "压缩合并 PR",
          merge: "合并 PR（保留提交）",
          rebase: "变基合并 PR",
          pending: "正在合并 PR…",
          success: "PR 已合并",
          squash_mr: "压缩合并 MR",
          merge_mr: "合并 MR（保留提交）",
          rebase_mr: "变基合并 MR",
          pending_mr: "正在合并 MR…",
          success_mr: "MR 已合并",
        },
        autoMerge: {
          enableSquash: "自动压缩合并",
          enableMerge: "自动合并（保留提交）",
          enableRebase: "自动变基合并",
          enabled: "已启用自动合并",
          enabling: "正在启用自动合并…",
          disabling: "正在关闭自动合并…",
          disabled: "已关闭自动合并",
        },
        unavailable: {
          pullNoRemote: "此分支尚未关联远程分支，无法拉取",
          pullDirty: "有本地变更，请先提交或贮藏再拉取",
          pullUpToDate: "此分支已是最新，无需拉取",
          pushNoRemote: "此分支尚未关联远程分支，无法推送",
          pushUpstreamGone: "此分支跟踪的远程分支已不存在，无法推送",
          pushBehind: "请先拉取远程变更再推送",
          pushNothing: "没有可推送的新提交",
          pullAndPushNoRemote: "此分支尚未关联远程分支，无法拉取并推送",
          pullAndPushDirty: "有本地变更，请先提交或贮藏再拉取并推送",
          pullAndPushNoIncoming: "没有需要先拉取的远程变更",
          pullAndPushInSync: "此分支已同步，无需拉取并推送",
          pullAndPushNothingToPush: "拉取后没有可推送的新提交",
          createPrNoCommits: "此分支还没有新提交，无法创建 PR",
          mergeNoBase: "无法确定基准分支，无法合并",
          mergeDirty: "有本地变更，请先提交或贮藏再合并",
          mergeNothing: "此分支没有可合并的变更",
          updateNoBase: "无法确定基准分支，无法更新",
          updateDirty: "有本地变更，请先提交或贮藏再更新",
          mergePrNoGithub: "GitHub 未连接，暂时无法合并 PR",
          archiveNotWorktree: "此工作区并非由 Paseo 创建的工作树，无法在此归档",
          mergePrNoForge: "{{brand}} 未连接，暂时无法合并 {{noun}}",
          mergePrMissing: "尚无可合并的 PR",
          mergePrDraft: "PR 仍是草稿，无法合并",
          mergePrMerged: "PR 已合并",
          mergePrClosed: "PR 已关闭，无法合并",
          mergePrConflicts: "PR 存在冲突，无法合并",
          mergePrQueue: "此仓库使用合并队列，无法在此合并 PR",
          mergePrNotReady: "只有在 {{brand}} 确认 {{noun}} 可合并后，才能合并 {{noun}}",
          autoMergeCannotDisable: "已启用自动合并，当前账号无权关闭",
        },
        toasts: {
          failedCommit: "提交失败",
          failedPull: "拉取失败",
          failedPush: "推送失败",
          failedPullAndPush: "拉取并推送失败",
          failedMergePr: "合并 PR 失败",
          failedEnableAutoMerge: "启用自动合并失败",
          failedDisableAutoMerge: "关闭自动合并失败",
          baseRefUnavailable: "基准引用不可用",
          failedMerge: "合并失败",
          failedMergeFromBase: "从基准分支合并失败",
        },
        archiveWarning: {
          uncommittedChanges: "未提交的变更",
          uncommittedChangesWithDiff: "未提交的变更（{{diffStat}}）",
          unpushedCommit: "{{count}} 个未推送的提交",
          unpushedCommits: "{{count}} 个未推送的提交",
        },
      },
      diff: {
        openDiffTab: "打开差异标签页",
        tooLarge: "差异过大，无法显示",
        previewTooLargeTitle: "差异过大，无法预览",
        unified: "统一差异",
        split: "并排差异",
        options: "差异选项",
        inlineDiff: "内联差异",
        seeUncommittedChanges: "查看未提交的变更",
        seeCommittedChanges: "查看已提交的变更",
        checkingRepository: "正在检查仓库…",
        notRepository: "当前目录不是 Git 仓库",
        diffMode: "差异模式",
        uncommitted: "未提交",
        committed: "已提交",
        base: "基准",
      },
      openInEditor: {
        openIn: "在 {{target}} 中打开工作区",
        failedOpen: "打开工作区失败",
      },
      pr: {
        sections: {
          checks: "检查",
          reviews: "审查",
        },
        accessibility: {
          pullRequest: "PR #{{number}}",
        },
        errors: {
          statusLoadFailed: "无法加载 PR 状态",
          activityLoadFailed: "无法加载 PR 动态",
        },
      },
    },
  },
  sidebar: {
    host: {
      noHost: "暂无主机",
      switchTitle: "切换主机",
      searchPlaceholder: "搜索主机…",
    },
    actions: {
      addProject: "添加项目",
      hosts: "主机",
    },
    worktreeSetup: {
      title: "设置工作树脚本",
      description: "添加初始化命令，让新工作树自动安装依赖并完成准备。",
      openProjectSettings: "打开项目设置",
    },
    project: {
      actions: {
        menu: "项目操作",
        openSettings: "打开项目设置",
        openFolder: "在文件管理器中打开",
        openFolderFailed: "无法打开文件夹",
        remove: "移除项目",
      },
      confirmations: {
        removeTitle: "移除项目？",
      },
      toasts: {
        hostDisconnected: "主机未连接",
        removeFailed: "部分工作区移除失败",
        updateHostToRemove: "更新主机后即可移除项目。",
      },
      empty: {
        title: "暂无项目",
        description: "添加项目以开始使用",
      },
    },
    workspace: {
      actions: {
        menu: "工作区操作",
        newWorkspace: "新建工作区",
        createWorkspaceFor: "为 {{projectName}} 新建工作区",
        rename: "重命名工作区",
      },
      confirmations: {
        hideTitle: "隐藏工作区？",
      },
      rename: {
        title: "重命名工作区",
      },
      toasts: {
        workspacePathUnavailable: "工作区路径不可用",
        hostDisconnected: "主机未连接",
        hideFailed: "隐藏工作区失败",
      },
    },
  },
  newWorkspace: {
    title: "新建工作区",
    isolation: {
      worktree: "新建工作树",
      existing: "已有工作树",
    },
    errors: {
      hostDisconnected: "主机未连接",
      createWorktreeFailed: "创建工作树失败",
      composerStateRequired: "缺少输入框状态",
      branchInWorktree: "分支 {{branch}} 已在 {{path}} 中检出。请在「已有工作树」中选择该工作树，或从该分支创建新分支。",
    },
    tooltips: {
      project: "选择项目",
      host: "选择主机",
      isolation: "选择隔离方式",
      worktree: "选择工作树",
      launch: "选择启动内容",
    },
    refPicker: {
      startingRef: "起始引用",
      noMatchingRefs: "没有匹配的引用。",
      pullRequests: "PR",
      pullRequests_mr: "MR",
      pullRequest: "PR",
      pullRequest_mr: "MR",
      inWorktree: "已在工作树中",
    },
    worktreePicker: {
      title: "工作树",
      searchPlaceholder: "搜索工作树",
      empty: "没有匹配的工作树。",
    },
    launch: {
      title: "启动内容",
      chat: "对话",
      terminal: "终端",
      manageProfiles: "管理预设",
      submit: "启动",
      promptPlaceholder: "{{name}} 提示词",
      commandPlaceholder: "输入要运行的命令，或留空打开终端",
    },
  },
  desktop: {
    quitting: {
      detail: "正在停止本地守护进程。",
    },
    daemon: {
      lifecycle: {
        owned: "由当前桌面端会话启动",
        attached: "已连接到现有守护进程",
        ownedMessage: "此守护进程由当前桌面端会话启动。",
        attachedMessage: "当前桌面端会话已连接到原有的守护进程。",
        stopTitle: "停止本地守护进程？",
        stopMessage: "{{ownership}}\n主目录：{{home}}\n监督进程 PID：{{pid}}\n将中断智能体正在执行的任务。",
        stop: "停止守护进程",
        stopping: "正在停止…",
        stopFailed: "无法停止守护进程",
        pauseAttached: "暂停自动管理守护进程？已连接的守护进程会继续运行。",
        pause: "暂停管理",
        workerUpdated: "工作进程已更新至 {{version}}",
        supervisorRefresh: "正在运行的监督进程仍使用原版本。请通过启动它的程序重启监督进程以应用更新。",
      },
      title: "守护进程",
      status: {
        builtInOnly: "这里只显示桌面端内置守护进程",
        running: "运行中",
        notRunning: "未运行",
      },
      management: {
        title: "管理内置守护进程",
        hint: "由 Paseo 启动和停止内置守护进程",
        pauseTitle: "暂停内置守护进程",
        pauseMessage: "这会立即停止内置守护进程，以及通过它运行的智能体和终端。",
        registrationFailed: "内置守护进程已启动，但 Paseo 无法保存 localhost 连接。请重新启用守护进程管理，或手动添加 localhost。",
        pausedStopFailed: "内置守护进程管理已暂停，但 Paseo 无法停止守护进程。",
        updateFailed: "无法更新内置守护进程的管理设置。",
      },
      keepRunning: {
        title: "退出后保持守护进程运行",
        hint: "退出 Paseo 后，守护进程会继续运行",
      },
      logs: {
        modalTitle: "守护进程日志",
      },
      fullStatus: {
        modalTitle: "守护进程状态",
        fetchFailed: "获取守护进程状态失败：{{message}}",
      },
      openAdvancedSettings: "打开守护进程的高级设置",
      versionMismatch: "应用与守护进程版本不一致。建议将两者更新至相同版本。",
      loadFailed: "无法加载桌面端守护进程状态。",
    },
    updates: {
      status: {
        checking: "正在检查应用更新…",
        downloadingProgress: "正在下载应用更新… {{percent}}%",
        installing: "正在安装应用更新…",
        upToDate: "应用已是最新版本。",
        available: "有可用的应用更新。",
        availableWithLastChecked: "有可用的应用更新。上次检查时间：{{time}}。",
        downloadAvailable: "有可用的应用更新。",
        downloadAvailableWithLastChecked: "有可用的应用更新。上次检查时间：{{time}}。",
        installed: "应用更新已安装，请重启。",
        failed: "应用更新失败。",
      },
      installError: "无法安装桌面应用更新。",
      callout: {
        restartWarning: "升级应用会停止运行中的智能体并关闭终端会话。",
      },
    },
    permissions: {
      notifications: {
        webOnly: "桌面通知状态仅在网页环境中可用。",
        requestsWebOnly: "桌面通知权限仅可在网页环境中申请。",
      },
      microphone: {
        webOnly: "桌面麦克风状态仅在网页环境中可用。",
        statusApiUnavailable: "当前环境不支持查询麦克风权限的 API。请通过发起权限请求检查访问权限。",
        requestsWebOnly: "桌面麦克风权限仅可在网页环境中申请。",
      },
      testNotification: {
        notDelivered: "通知未送达。请检查「系统设置」→「通知」。",
      },
    },
  },
  startup: {
    logs: {
      loading: "正在加载守护进程日志…",
      unavailable: "暂无守护进程日志。",
      loadFailed: "无法加载守护进程日志：{{message}}",
    },
  },
  openProject: {
    tiles: {
      addProject: {
        title: "添加项目",
      },
      setupProviders: {
        title: "设置提供方",
      },
      pairDevice: {
        description: "将手机连接到此守护进程",
      },
    },
  },
  projectPicker: {
    opening: "正在打开项目…",
  },
  branchSwitcher: {
    uncommittedTitle: "未提交的变更",
    uncommittedMessage: "你有未提交的变更。要先贮藏变更再切换分支吗？",
    stashAndSwitch: "贮藏并切换",
    failedToStash: "贮藏变更失败",
    restoreStashTitle: "恢复贮藏的变更？",
    restoreStashMessage: "此分支有上次会话贮藏的变更。要恢复吗？",
    stashRestored: "已恢复贮藏的变更",
  },
  agentAutocomplete: {
    searchingWorkspace: "正在搜索工作区…",
    loadingCommands: "正在加载命令…",
    noCommands: "没有找到命令",
    loadingProviderCommands: "正在加载 {{provider}} 的命令…",
    commandsFailed: "无法加载命令",
    providerCommandsFailed: "无法加载 {{provider}} 的命令",
    skillTag: "技能",
  },
  workspaceSetup: {
    title: "创建工作区",
    errors: {
      failedCreateWorktree: "创建工作树失败",
      failedOpenProject: "打开项目失败",
      hostDisconnected: "主机未连接",
      pendingRequired: "没有待处理的工作区初始化任务",
      composerStateRequired: "缺少工作区初始化所需的输入框状态",
    },
  },
  onboarding: {
    setup: {
      steps: {
        phone: {
          tailscale: {
            hint: "需要先完成配置",
          },
        },
      },
    },
  },
  modelSelector: {
    title: "选择提供方",
  },
  providerCatalog: {
    title: "添加提供方",
    search: "搜索提供方",
    noProviders: "未找到提供方",
    errors: {
      unableToInstall: "无法安装提供方",
    },
  },
  providerSelection: {
    readiness: {
      initialPromptRequired: "请输入初始提示词",
      noProviders: "所选主机上没有可用的提供方",
      noModelAvailable: "所选提供方没有可用的模型",
      workspaceDirectoryNotFound: "未找到工作区目录",
      hostDisconnected: "主机未连接",
    },
  },
  pairing: {
    connectionMethods: {
      scanQr: {
        description: "加密中继连接。",
      },
      pasteLink: {
        description: "加密中继连接。",
      },
    },
    direct: {
      helper: "输入 Paseo 服务器的地址。",
      fields: {
        host: "主机",
      },
      errors: {
        hostRequired: "请输入主机地址",
        timedOut: "连接超时。请检查主机、端口和网络。",
        refused: "连接被拒绝。请确认服务器是否在此地址运行。",
        hostNotFound: "未找到主机。请检查主机名后重试。",
        hostUnreachable: "无法访问主机。请检查网络和防火墙。",
        tlsError: "TLS 错误。只有守护进程前部署了 TLS 终止代理时，直连才会使用 SSL。",
        unableToConnect: "无法连接。请检查主机和端口，并确认守护进程可访问。",
      },
    },
    link: {
      helper: "粘贴服务器提供的配对链接。",
      errors: {
        emptyOffer: "配对链接中的配对数据为空",
        unableToPair: "无法配对主机",
      },
    },
    scan: {
      webUnavailableTitle: "网页版不支持扫描",
      webUnavailableBody: "网页版不支持扫描二维码。请改用「粘贴链接」。",
      cameraPermissionBody: "请允许访问相机，以便扫描守护进程提供的配对二维码。",
      unableToPair: "无法配对主机",
    },
    device: {
      loadingOffer: "正在加载配对信息…",
      failedToLoadOffer: "加载配对信息失败。",
      relayDisabled: "中继未启用。请启用中继后再配对设备。",
      updateRequired: "请更新主机，以便从 Paseo 桌面版启用中继。",
      unavailable: "配对信息不可用。",
    },
  },
  realtimeVoice: {
    actions: {
      mute: "将实时语音静音",
      unmute: "取消实时语音静音",
      stop: "停止实时语音并中断当前轮次",
    },
  },
  rewind: {
    errors: {
      failed: "回退智能体失败",
    },
  },
  downloads: {
    requestTokenFailed: "请求下载令牌失败。",
    hostUnavailable: "下载主机不可用。",
  },
  subagents: {
    title: "子智能体",
    pillLabelOne: "1 个子智能体",
    pillLabelMany: "{{count}} 个子智能体",
    detachTooltip: "分离子智能体",
    archiveTooltip: "归档子智能体",
    archiveFinishedAction: "归档已完成的子智能体",
  },
  panels: {
    draft: {
      newAgent: "新建智能体",
      creatingAgent: "正在创建智能体",
    },
    file: {
      directoryMissing: "未找到工作区目录。",
    },
    diff: {
      diffLabel: "差异",
      directoryMissing: "未找到工作区目录。",
    },
  },
  review: {
    comment: {
      add: "添加审查评论",
      edit: "编辑审查评论",
      delete: "删除审查评论",
      label: "审查评论",
      cancelAccessibility: "取消审查评论",
      saveAccessibility: "保存审查评论",
    },
  },
  settings: {
    enableBuiltInDaemon: "启用内置守护进程",
    projectList: {
      hostLoadFailed: "无法从主机 {{hostName}} 加载项目：{{message}}",
    },
    layout: {
      openInSidePane: {
        title: "打开位置",
        destinations: {
          main: "主面板",
          side: "侧边面板",
          explorer: "资源管理器侧栏",
        },
        sources: {
          explorerFiles: {
            label: "点击资源管理器侧栏中的文件",
            description: "在当前内容旁打开从资源管理器侧栏选择的文件",
          },
          diffs: {
            label: "点击资源管理器侧栏或对话中的变更",
            description: "在当前内容旁打开资源管理器或智能体对话中的差异",
          },
          chatFiles: {
            label: "点击智能体对话中的文件",
            description: "在对话旁打开文件链接及工具调用涉及的文件",
          },
          diffFiles: {
            label: "点击差异中的文件",
            description: "在差异旁打开所选的源文件",
          },
          subagents: {
            label: "点击智能体对话中的子智能体",
            description: "在父智能体旁打开子智能体",
          },
          pullRequests: {
            label: "点击资源管理器侧栏中的 PR",
            description: "在变更列表旁打开 PR 详情",
          },
          serviceUrls: {
            label: "点击脚本的服务 URL",
          },
        },
      },
    },
    hostSections: {
      agents: "智能体",
      workspaces: "工作区",
      providers: "提供方",
      terminals: "终端",
    },
    plugins: {
      logs: {
        action: "日志",
        title: "日志：{{name}}",
        loading: "正在加载日志…",
        refresh: "刷新",
        refreshing: "正在刷新…",
        errorTitle: "无法加载插件日志",
        empty: "插件暂无输出",
      },
    },
    general: {
      defaultSend: {
        descriptions: {
          interrupt: "智能体运行时，Enter 会中断，Command/Ctrl+Enter 会将消息加入队列。",
          steer: "智能体运行时，Enter 会引导当前轮次，Command/Ctrl+Enter 会将消息加入队列。",
          queue: "智能体运行时，Enter 会将消息加入队列，Command/Ctrl+Enter 会提交消息。",
        },
        commandEnterDescriptions: {
          interrupt: "智能体运行时，{{modifier}}+Enter 会中断，Enter 会换行。",
          steer: "智能体运行时，{{modifier}}+Enter 会引导当前轮次，Enter 会换行。",
          queue: "智能体运行时，{{modifier}}+Enter 会将消息加入队列，Enter 会换行。",
        },
      },
    },
    diagnostics: {
      app: {
        title: "应用诊断",
        rowTitle: "应用诊断",
        rowHint: "收集连接、守护进程、提供方、桌面端和日志信息",
        run: "运行",
        running: "正在诊断…",
        copyLabel: "诊断信息",
        copyAccessibility: "复制诊断信息",
        copyFailed: "复制诊断信息失败",
        refreshAccessibility: "刷新诊断信息",
        refreshingAccessibility: "正在刷新诊断信息",
        progress: {
          client: "客户端",
          desktop: "桌面端",
        },
      },
    },
    about: {
      connectedHosts: "已连接的主机",
      releaseChannel: {
        description: "切换到测试版可提前获取更新并参与改进",
        stable: "稳定版",
        beta: "测试版",
      },
    },
    appearance: {
      theme: {
        options: {
          light: "浅色",
          dark: "深色",
          zinc: "锌灰",
          midnight: "午夜",
        },
      },
      fonts: {
        codeFontHint: "用于代码、差异和终端输出。留空将使用系统默认字体",
      },
    },
    shortcuts: {
      sections: {
        agentInput: "智能体输入",
      },
      help: {
        newWorkspace: "新建工作区",
        newWorktree: "新建工作树",
        jumpToWorkspace: "跳转到工作区",
        previousWorkspace: "上一个工作区",
        nextWorkspace: "下一个工作区",
        interruptAgent: "中断智能体",
      },
    },
    integrations: {
      commandLine: {
        description: "从终端控制智能体并运行脚本",
      },
    },
    host: {
      appearance: {
        preview: {
          workspaceName: "示例工作区",
        },
      },
      notFound: "未找到主机",
      badges: {
        relay: "中继",
      },
      pairDevices: {
        rowHint: "扫描二维码或复制链接，将手机连接到此主机",
      },
      skills: {
        sectionTitle: "编排技能",
        title: "编排技能",
        docs: "技能",
        openDocs: "打开技能文档",
        unavailable: "连接到此主机以管理编排技能",
        unsupported: "更新此主机以管理编排技能",
        statusFailed: "无法检查编排技能的状态。",
        updateFailed: "无法更新编排技能。",
        uninstallFailed: "无法卸载编排技能。",
        saveSelectionFailed: "无法保存所选的编排技能。",
        updateTitle: "更新 Paseo 技能？",
        uninstallTitle: "卸载 Paseo 技能？",
        uninstallMessage: "将从 ~/.agents、~/.claude、~/.codex、~/.gemini/config 中移除所有 Paseo 编排技能。",
        choose: "选择技能",
        chooseAll: "全部技能",
        chooseAllHint: "保持安装所有内置技能，包括以后新增的技能。",
        chooseList: "内置技能",
        chooseEmpty: "此版本没有内置技能。",
        removeTitle: "移除取消勾选的技能？",
        removeMessage: "将从 ~/.agents、~/.claude、~/.codex、~/.gemini/config 中删除 {{skills}}。你在这些技能文件夹里添加的内容也会一并删除。",
        saveFailed: "无法保存所选技能。",
        operations: {
          add: "添加技能",
          update: "更新技能",
          delete: "删除技能",
        },
      },
      orchestration: {
        unavailable: "连接到此主机以管理编排",
        enableTools: {
          title: "启用 Paseo 工具",
          hint: "智能体将能管理工作树、其他智能体和计划",
          accessibilityLabel: "注入 Paseo 工具",
        },
        systemPrompt: {
          title: "系统提示词",
          hint: "为所有智能体添加系统提示词",
          sheetTitle: "追加系统提示词",
          accessibilityLabel: "追加系统提示词",
        },
      },
      agents: {
        unavailable: "连接到此主机以管理智能体",
        idleRuntimeCleanup: {
          title: "释放空闲智能体",
          info: "停止智能体进程并保留对话。发送消息即可继续。\n\n进行中的工作、待处理的通知和提供方的安全检查会阻止清理。",
        },
      },
      workspaces: {
        unavailable: "连接到此主机以管理工作区",
      },
      terminalProfiles: {
        unavailable: "连接到此主机以管理终端预设",
        sectionTitle: "终端预设",
        editProfile: "编辑预设",
        addProfileTitle: "添加终端预设",
        editProfileTitle: "编辑终端预设",
        nameLabel: "名称",
        commandLabel: "命令",
        argsLabel: "参数",
        nameRequired: "请输入名称",
        commandRequired: "请输入命令",
        argsHint: "传递给命令的参数，用空格分隔",
        saving: "正在保存…",
        remove: "移除",
        removeConfirmTitle: "移除预设？",
        removeConfirmMessage: "移除「{{name}}」？",
        moveUp: "上移",
        moveDown: "下移",
        save: "保存",
        emptyState: "暂无预设。添加预设后，可用指定命令启动终端。",
      },
      agentProfiles: {
        sectionTitle: "智能体预设",
        sectionDescription: "保存智能体预设，供你快速选用，也可供智能体委派任务时使用。",
        unavailable: "连接到此主机以管理智能体预设",
        unsupported: "此主机的守护进程尚不支持智能体预设",
        emptyState: "暂无预设。添加预设后，可使用已保存的提供方和模型启动智能体。",
        addProfileTitle: "添加智能体预设",
        editProfileTitle: "编辑智能体预设",
        providerLabel: "提供方",
        providerPlaceholder: "选择提供方",
        noProviders: "此主机上没有可用的提供方",
        modelLabel: "模型",
        noModels: "此提供方没有可选模型",
        modeLabel: "权限模式",
        noModes: "此提供方没有可选的权限模式",
        thinkingLabel: "思考强度",
        noThinkingOptions: "此模型没有可选的思考强度",
        featuresLabel: "功能",
        featureCount: "{{count}} 项功能",
        featureCountOne: "{{count}} 项功能",
        notesPlaceholder: "用于界面开发，如组件、布局和设计令牌。",
        notesHint: "帮助智能体在启动另一个智能体时选择此预设。",
        systemPromptLabel: "系统提示词",
        systemPromptHint: "仅适用于新建的智能体",
      },
      daemon: {
        rename: {
          title: "重命名主机",
          placeholder: "我的主机",
        },
        restart: {
          title: "重启守护进程",
          hint: "重启守护进程后，应用会自动重新连接",
          confirmMessage: "将重启守护进程。其上的智能体会继续运行，应用会自动重新连接。",
          unavailableTitle: "主机不可用",
          unavailableMessage: "此主机尚未连接。请等它上线后再重启。",
          offlineTitle: "主机离线",
          offlineMessage: "此主机已离线。Paseo 会自动重连，请等主机恢复在线后再重启。",
          requestFailedMessage: "发送重启请求失败。Paseo 会自动重连，请等主机恢复在线后重试。",
        },
        update: {
          desktopManagedHint: "此守护进程由 Paseo 桌面版管理。请在主机上更新 Paseo 桌面版。",
          title: "更新守护进程",
          hint: "将守护进程更新到最新版本并重启",
          confirm: "更新",
          confirmTitle: "更新 {{name}}",
          confirmMessage: "将守护进程更新到最新版本并重启。运行中的智能体会短暂中断。",
          updating: "正在更新…",
          phaseStarting: "正在准备更新…",
          phaseDownloading: "正在下载软件包…",
          phaseInstalling: "正在安装…",
          phaseComplete: "更新完成，正在重启…",
          unableToReconnectTitle: "无法重新连接",
          unableToReconnectMessage: "{{name}} 更新后未上线。请确认守护进程是否已重启。",
          unavailableTitle: "主机不可用",
          unavailableMessage: "此主机尚未连接。请等它上线后再更新。",
          offlineTitle: "主机离线",
          offlineMessage: "此主机已离线。请等它恢复在线后再更新。",
          requestFailedTitle: "更新失败",
          requestFailedMessage: "更新守护进程失败：{{error}}",
          dialogFailedMessage: "无法打开更新确认对话框。",
        },
        remove: {
          title: "移除主机",
          hint: "从此设备移除该主机及其已保存的连接",
          localHint: "从此设备移除 localhost 连接并停止内置守护进程",
          localConfirmTitle: "移除 localhost 连接并停止守护进程？",
          localConfirmMessage: "这会移除 localhost 连接、关闭内置守护进程管理，并停止托管的守护进程。远程主机将保持连接。",
          errorMessage: "无法移除主机",
        },
      },
    },
    providers: {
      title: "提供方",
      addProvider: "添加提供方",
      list: {
        add: "提供方",
      },
      detail: {
        backToProviders: "返回提供方列表",
        notOnHost: "此主机上没有该提供方",
        status: "提供方状态",
        removeHint: "从 config.json 中删除此提供方",
      },
      providerDetails: "提供方 {{name}} 的详情",
      unavailable: "连接到此主机以查看提供方",
      addErrorTitle: "无法添加提供方",
      updateErrorTitle: "无法更新提供方",
      actions: {
        menu: "{{name}} 的操作",
        remove: "移除提供方",
        removing: "正在移除…",
      },
      remove: {
        confirmTitle: "移除 {{name}}？",
        confirmMessage: "这将从 config.json 中删除该提供方条目。此操作无法撤销。",
        confirm: "移除",
        errorTitle: "无法移除提供方",
      },
      models: {
        title: "模型",
        one: "1 个模型",
        many: "{{count}} 个模型",
        addModel: "添加模型",
        addCustomTitle: "添加自定义模型",
        modelId: "模型 ID",
        failedToSave: "保存模型失败",
        searchPlaceholder: "搜索模型",
        loading: "正在加载模型…",
        noSearchMatches: "没有匹配的模型",
        noneDetected: "未检测到模型",
        custom: "自定义模型",
      },
    },
    project: {
      noEditableTarget: "无法在此主机上编辑此项目。",
      backToProjects: "返回项目列表",
      edit: {
        title: "编辑项目",
        nameLabel: "项目名称",
        savedToast: "项目已更新",
      },
      readFailures: {
        missingTitle: "此主机没有该项目",
        missingSingleHost: "所选主机没有此项目的记录。",
        transportFallback: "主机没有响应。",
      },
      worktree: {
        title: "工作树生命周期钩子",
        info: "为此项目创建或清理工作树时运行的命令",
        setup: "初始化",
        setupAccessibility: "工作树初始化命令",
        teardown: "清理",
        teardownAccessibility: "工作树清理命令",
      },
      scripts: {
        title: "脚本",
        info: "项目中的任意智能体均可启动这些长期服务和一次性命令",
        empty: "暂无脚本。",
        untitled: "未命名脚本",
        menuAccessibility: "打开脚本菜单",
        removeTitle: "移除脚本？",
        removeFallbackName: "此脚本",
        nameAccessibility: "脚本名称",
        commandAccessibility: "脚本命令",
        newScript: "新建脚本",
        actions: {
          add: "添加脚本",
        },
      },
      metadata: {
        info: "Paseo 生成元数据时会将这些项目指令加入提示词，例如分支命名、提交格式或 PR 格式",
        commitMessagePlaceholder: "使用带作用域的 Conventional Commits",
        pullRequest: "PR",
      },
      actions: {
        saved: "项目已保存",
      },
    },
  },
};
