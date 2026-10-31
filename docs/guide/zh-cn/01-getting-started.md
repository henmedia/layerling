---
title: 快速上手
summary: 五分钟从一张空白页面做出第一个 3D 打印零件，无需账号，无需安装。
---

layerling 是一款直接在浏览器里运行的 3D 打印设计程序。你用简单的形状搭出零件，在它上面挖孔，把边缘变圆，然后交给切片软件。无需安装，也无需注册。你做的设计只保存在你自己的电脑上。

![layerling 的起始页：顶部是“新建 3D 设计”，下面是你的设计，以及快速指南。](shot:start-page)

## 创建设计

打开 [layerling.com](https://layerling.com/)。在起始页点击 {{ui:dashboard.createDesign}}。编辑器会带着一个空的工作平面打开，所有东西都在这个网格上成形。

如果你已经有文件想接着做，用 {{ui:dashboard.importGeometry}}。它支持 layerling 设计（`.lyl`），也支持 STL、OBJ、3MF、STEP 或 SVG 文件。

你所有的设计随后都会出现在起始页上，并带有预览图。它们保存在浏览器的存储空间里，每次更改后自动保存，所以没有保存按钮。**layerling 不对保存在浏览器里的设计承担责任。** 浏览器可能出故障，浏览器更新也可能带来问题，所以要不时用起始页上的 {{ui:dashboard.backupAll}} 备份你的设计，或者把它们保存为文件。备份可以通过 {{ui:dashboard.restoreBackup}} 恢复。如何把设计打包成文件并转交他人，见[文件与保存](chapter:files-and-saving)。 如果想要一个提醒，请在设置（功能区中的齿轮）里打开{{ui:workspace.confirmTabClose}}：之后在关闭或刷新带有已打开设计的标签页之前，浏览器会先询问。

## 编辑器一览

![编辑器的工作平面上有两个形状。上方是功能区，左侧是相机控制，右侧是所选形状的设置。](shot:editor-overview)

- **上方**是功能区。它按任务分类：{{ui:editor.group.clipboard}}、{{ui:editor.group.history}}、{{ui:editor.group.shapes}}、{{ui:editor.group.visibility}}、{{ui:editor.group.combine}}、{{ui:editor.group.modify}}、{{ui:editor.group.arrange}}、{{ui:editor.group.file}} 和 {{ui:editor.group.help}}。把鼠标停在图标上就能看到名称。凡是看到小问号的地方，比如形状的设置里、形状库中或工具面板里，它都会直接带你到本指南对应的章节。
- **中间**是工作平面。你在这里放置形状、把它们拉成想要的形状，并看到结果。
- **右侧**显示所选形状的设置：颜色、尺寸、位置以及组成该形状的其他内容。输入数字比拖动更精确。
- **左侧**是相机控制，上方是视图立方体。它们带你在这个场景中移动，详见[视图与工作平面](chapter:view-and-workplane)。
- **最上方**可以在 {{ui:editor.modeGeometry}} 与 {{ui:editor.modeSketch}} 之间切换、重命名设计，以及选择语言和配色方案。

## 工作区周围的按钮

把鼠标停在按钮上就能看到名称。如果不确定某个按钮的作用，点击 {{ui:interactiveHelp.title}}（位于 {{ui:editor.group.help}} 区域，快捷键 [[Shift]]+[[F1]]），再点那个按钮。下面是被问得最多的几个。

### 粘贴

{{ui:editor.tool.paste}}（[[Ctrl]]+[[V]]）会把用 {{ui:editor.tool.copy}} 复制的内容加入设计。{{ui:common.duplicate}} 则一步完成复制和粘贴。

### 删除

{{ui:common.delete}}（[[Delete]]）移除所选形状。{{ui:editor.tool.undo}} 可以把它们找回来。

### 取消分组

{{ui:editor.tool.ungroup}}（[[Ctrl]]+[[Shift]]+[[G]]）把所选分组重新拆成组成它的那些形状。

### 工作区设置

{{ui:editor.workspaceSettings}} 打开工作区的设置：单位、平台大小、打印机、网格、颜色、光照等。详见[视图与工作平面](chapter:view-and-workplane)。

### 主题

最上方的 {{ui:common.theme}} 决定 layerling 的外观：跟随系统、浅色、深色或石墨色。

### 重命名设计

{{ui:editor.renameProject}}：最上方名称旁边的铅笔图标。输入新名称并按 [[Enter]]。

### 设计名称

设计的名称（{{ui:confirm.projectName}}）位于最上方。点击它，输入，按 [[Enter]] 即保留该名称。

### 显示选项

{{ui:editor.visibilityOptions}}，即眼睛图标旁的箭头，里面是你可显示或隐藏的内容：对象列表、你隐藏的所有东西、注释以及打印的悬垂。详见[选择与排列](chapter:select-and-arrange)。

### 隐藏所选

{{ui:editor.tool.hideSelected}}（[[Ctrl]]+[[H]]）隐藏所选形状。它们仍留在设计和对象列表中；{{ui:editor.visibilityOptions}} 可以让它们重新显示。

### 搜索命令

{{ui:palette.open}}：输入你要找的东西——一个工具、一个形状或一项设置——然后点击结果。

### 隐藏相机控制

{{ui:camera.hide}} 收起左侧的相机控制，给工作区腾出更多空间；{{ui:camera.show}} 会把它们调回来。

### 吸附网格

属性面板底部的 {{ui:inspector.snapGrid}} 是移动和调整尺寸时吸附的步距。它旁边的小开关 **mm | in** 用来切换单位。详见[视图与工作平面](chapter:view-and-workplane)。

### 单位：毫米或英寸

{{ui:inspector.snapGrid}} 旁的开关 **mm | in** 会为本设计更改单位、平台网格和吸附步距。

### 页脚

在窗口底部：{{ui:dashboard.sponsor}} 通往可以支持本项目的页面；{{ui:dashboard.userGuide}} 打开本指南；{{ui:dashboard.forum}} 通往提问、提想法和报告错误的地方（GitHub 上的讨论区，德语用户则为 drucktipps3d 论坛）；{{ui:editor.bugReport}} 生成一个用于错误报告的 ZIP 文件；{{ui:dashboard.projectOnGitHub}} 通往 GitHub 上的项目，版本号则打开发行说明。法律声明和隐私政策的链接属于你所使用的那份 layerling 的运营者。

## 你的第一个零件

举个例子，我们做一个带孔的立方体。

1. 点击功能区中的 {{ui:editor.addShape}}，选择 {{ui:shape.box}}。这个形状现在挂在鼠标指针上。在工作平面上点一下即可放下。
2. 在右侧设置尺寸，比如长 40 mm、宽 40 mm、高 20 mm。
3. 用同样的方式在中间放一个 {{ui:shape.cylinder}}，直径 14 mm、高 30 mm。它应该比立方体高，这样才能贯穿整个立方体。
4. 选中圆柱体，点击右侧的 {{ui:inspector.hole}}。它会变为半透明：这个实体变成了一个从材料中去除东西的工具。
5. 同时选中两个形状，点击 {{ui:editor.tool.group}}。立方体现在有了一个孔。

![圆柱体是孔，并从立方体顶部伸出来。](shot:hole-before)

![分组之后，立方体上有了一个孔。](shot:hole-after)

孔、槽和凹坑就是这样做的。[实体与孔](chapter:solids-and-holes)一章有详细说明。

## 上次访问之后的新内容

更新之后再次打开 layerling 时，起始页上的一张卡片会列出你上次离开之后新增的内容：从那时起的每个版本，最新的在最上面。隔了很久没来，就在卡片里向下滚动。在它们下面，{{ui:whatsNew.earlier}} 会把上次访问之前的版本也加进来。用 {{ui:whatsNew.dismiss}} 关掉它，它就会一直消失到下一次更新。起始页页脚的 {{ui:whatsNew.footerLink}} 随时可以再次显示最新的新增内容。浏览器会记住你上次看到的版本，关于你的任何信息都不会离开它。

在你自己电脑或服务器上的 layerling 副本中，有可用更新时会出现一个按钮 {{ui:update.previewShow}}，可以在安装前列出这次更新带来的内容。只有你按下按钮时，列表才会从 GitHub 获取。

## 从设计到打印

零件做好后，点击 {{ui:editor.export}}，选择 STL 或 3MF 并下载文件。在你的切片软件中打开它，例如 Bambu Studio、PrusaSlicer、OrcaSlicer 或 Cura。如果在设置中选好了打印机，你在建模时就能看出零件是否能放进打印床。详见[打印](chapter:printing)。

> **提示：** 如果你来自 Tinkercad，会很快上手：平台、形状、实体与孔、分组、对齐和镜像的用法几乎一样。新东西主要是倒角与圆角、抽壳、螺纹和草图。 你自己的 Tinkercad 设计也可以带过来，见 [文件、保存与分享](chapter:files-and-saving)。
