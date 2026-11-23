---
title: 安装为应用、离线使用与自托管
summary: 像普通程序一样启动 layerling，即使没有网络也可以，以及在自家电脑上运行它的方法。
---

## 安装为应用

layerling 可以像普通程序一样安装。安装后它会有自己的图标和窗口，没有地址栏。首次访问之后，即使**没有网络**也能启动。你的设计保存在自己的电脑上。值得安装：应用启动更快，因为不必每次都重新加载；它无需联网即可使用，还能减轻服务器负担。你不会有任何损失，layerling 仍会在有新版本时通知你。 这也能保护你的设计：Mac、iPhone 和 iPad 上的 Safari 会清除七天未访问的网站所存储的数据，但不会清除已安装应用的数据。

如果你的浏览器支持，起始页上会出现带 {{ui:installHint.install}} 的提示。否则：

- **Chrome 和 Edge：** 点击地址栏右侧的安装图标，或在浏览器菜单中选择“安装为应用”。
- **Mac 上的 Safari：** “文件”菜单 →“添加到程序坞”。
- **iPhone 和 iPad 上的 Safari：** 分享图标 →“添加到主屏幕”。
- **Firefox：** 在 Windows 上，从版本 143 起，点击地址栏右侧的“将标签页添加到任务栏”图标；隐私窗口中没有该图标。你的设计保持不变。在其他系统上，layerling 仍可在标签页中离线启动。

起始页上的提示可用 {{ui:installHint.dismiss}} 关闭。在 Chrome 或 Edge 中再次启动已安装的应用时，会把已打开的窗口带到前台，而不是再开一个。

在电脑上，Chrome 或 Edge 中安装的 layerling 还会注册为 `.lyl` 文件的程序：在文件管理器中双击设计，即可在 layerling 中打开，[[Ctrl]]+[[S]] 会保存回该文件。在 Android 上这行不通，那里的浏览器不为已安装的 Web 应用提供文件关联；请在起始页用 {{ui:dashboard.importGeometry}} 打开设计。

## 更新

当有新版本时，layerling 会在起始页显示。通过 {{ui:dashboard.updateBannerLink}} 可以查看变更内容。版本号位于右下角。重新加载页面后便使用新版本。

在 layerling.com 和其他 Web 服务器上，已打开的页面会自行发现更新。它会不时向服务器询问版本，当你回到该标签页时也会询问；如果它需要的某个程序文件消失了，则立即询问。若期间安装了新内容，右下角的卡片会提示并列出新内容。{{ui:newVersion.reload}} 会先把当前打开的设计写入浏览器，然后重新加载页面；设计会按你离开时的样子恢复。{{ui:newVersion.later}} 会让卡片推迟 15 分钟。请尽快重新加载：停留在旧版本的页面可能加载新版本中不匹配的部分。这种情况已经发生时也会出现同一张卡片：CAD 工作进程只在首次需要时加载，它们会说明自己来自哪个构建；如果不是页面自身的构建——更新之后，或使用了旧版本的存储副本——卡片会要求重新加载，以免两者互相误解。

layerling 在多个标签页中打开时，它们会互相照应：如果另一个标签页已在运行较新版本，旧标签页底部会出现提示，请你重新加载它。如果同一个设计在两个标签页中打开，两者都会警告，因为它们会自动保存并相互覆盖。如果已有一个标签页打开，你又在另一个标签页中打开 layerling，新标签页会建议在旧标签页中继续，并主动提出关闭自己。如果你确实想要两个标签页，比如并排查看两个设计，请在那里点击 {{ui:tabs.keepHere}}。本指南也会在单独的标签页中打开：当 layerling 在旁边打开时，其右上角的按钮显示为“返回编辑器”，点击会关闭指南，而不是再开一个编辑器。

## 语言与外观

在右上角从语言列表中选择语言。旁边的配色方案提供 {{ui:theme.short.system}}（跟随操作系统）、{{ui:theme.short.light}}、{{ui:theme.short.dark}} 和 {{ui:theme.short.graphite}}，一种中性的深灰色。

## 自行运行

layerling 是自由软件（AGPL-3.0），可以运行在你自己的电脑或服务器上，例如工坊、俱乐部或学校。有几种方式，见 [GitHub 上的 README](https://github.com/henmedia/layerling/blob/main/README.zh-cn.md#快速上手)：

- **Windows 快速开始：** 在 PowerShell 中输入一行命令即可安装全部内容，并在桌面放置快捷方式。当 layerling 已在运行时，再次双击不会启动第二个服务器，只会打开页面。
- **Docker：** 适用于 NAS 设备和家用服务器，无需安装 Node.js。每个版本都提供现成镜像 `henmedia/layerling`（Docker Hub，也在 `ghcr.io/henmedia/layerling`），支持 amd64 和 arm64；`docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` 可启动它，在 NAS 上可在容器管理器的镜像仓库中搜索。卷 `layerling-thumbnails` 能让起始页的预览图在更新后保留；没有它，每次重新创建容器后预览图都会缺失，直到你打开相应设计。
- **静态导出：** 结果是普通文件，任何 Web 服务器都能提供。它们应位于地址根目录（`https://layerling.example.com/` 或 `http://192.168.0.5:8080/`），不能放在子文件夹中，也不能从磁盘直接打开；具体步骤见 README。如果 `index.html` 旁边有可写文件夹 `store`，并且服务器装有 PHP，它还会成为设计的共享存储。

用于 AI 助手的 MCP 桥接只存在于开发服务器中，见[用 AI 构建](chapter:ai-with-mcp)。

## 帮助与反馈

- 在编辑器中，{{ui:editor.group.help}} 区域包含 {{ui:editor.guide}}，其中有最重要的操作和[键盘快捷键](chapter:shortcuts)总览。快速指南的每一节都有一个问号，点击可跳转到此处对应的章节。

![编辑器中的快速指南。顶部列出他人的视频，每一节都带有问号。](shot:quick-guide)

- 欢迎在[论坛](https://forum.drucktipps3d.de/forum/board/127-layerling/)和 [GitHub](https://github.com/henmedia/layerling/discussions) 上提出问题、愿望和错误报告。
- 哪个版本有哪些变化，见发行说明，位于起始页和编辑器的底部。
