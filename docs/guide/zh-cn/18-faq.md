---
title: 常见问题
summary: 对大家问得最多的问题给出简短回答，涉及保存、大型模型、圆角、AI 和打印，每个回答都指向详细说明。
contents: questions
---

每个回答都很简短，末尾指出本指南中详细说明它的位置。顶部的搜索框可以用问题中的任意词找到它。

## 保存与备份

### 我的设计保存在哪里？有云端吗？

保存在你自己电脑的浏览器里。没有账户，也没有云端，不会上传任何内容；每次更改都会自动保存。在自己的服务器上运行 layerling 的人，还可以把设计保存在服务器上的共享文件夹里。

更多：[设计保存在哪里](chapter:files-and-saving#where-your-designs-live)

### 我的设计不见了。怎么回事？

设计只存在于一台电脑上的一个浏览器里。如果浏览器中该页面的数据被清除，设计就没有了；在另一个浏览器或另一台电脑上也看不到它们。Mac、iPhone 和 iPad 上的 Safari 会在七天未访问页面后删除其数据，除非 layerling 已安装为应用。如果你有备份，起始页上的 {{ui:dashboard.restoreBackup}} 可以把设计连同文件夹和图片一起找回来。

更多：[你的设计，你的备份](chapter:files-and-saving#your-designs-your-backup)

### 怎样备份所有内容，还能自动备份到文件夹？

起始页上的 {{ui:dashboard.backupAll}} 会把所有设计打包成一个 ZIP 文件。此外，layerling 会自动保留每个设计的早期版本；在 Chrome 和 Edge 中，它还能把每个版本作为 .lyl 文件写入你选择的文件夹。保留在浏览器里的版本会随浏览器数据一起消失，所以它们不能代替 ZIP 或文件夹。

更多：[早期版本](chapter:files-and-saving#earlier-versions)

### 怎样把设计带到另一台电脑或另一个浏览器？

在导出窗口中把它保存为 .lyl 文件，然后在另一台电脑的起始页打开该文件。要一次带走所有设计，在这边使用 {{ui:dashboard.backupAll}}，在那边使用 {{ui:dashboard.restoreBackup}}；已经存在的设计不会重复添加。

更多：[备份与转交](chapter:files-and-saving#backing-up-and-passing-on)

### 清除浏览器数据会怎样？

保存在该浏览器里的设计会被删除，layerling 保存在那里的早期版本也一样。用 {{ui:dashboard.backupAll}} 生成的 ZIP、你的 .lyl 文件以及硬盘上的备份文件夹不受影响。请先备份，再清除。

更多：[你的设计，你的备份](chapter:files-and-saving#your-designs-your-backup)

### 怎样回到之前的状态？

撤销会一步一步地后退。历史记录视图用滑块显示每一步，不会改动设计，还能从任意一步生成一个新设计。如果想要今天早些时候或上周的状态，可以在早期版本列表中把旧版本作为新设计打开，当前设计保持原样。

更多：[回看：历史记录视图](chapter:select-and-arrange#looking-back-the-history-view)和[早期版本](chapter:files-and-saving#earlier-versions)

### STL 和 3MF 能直接存进我的项目文件夹吗？又怎样改回下载？

在 Chrome 和 Edge 中，一个设计第一次导出时会询问保存位置，之后的导出会直接写入同一个文件，不再询问。Firefox 和 Safari 总是下载。如果你希望每次都下载，请在设置中打开 {{ui:workspace.stlAsDownload}}。

更多：[导出](chapter:files-and-saving#exporting)

### 保存对话框关掉了，却没有文件。为什么？

对于无法使用的对话框，浏览器报告的结果和你取消对话框时一样；被杀毒软件拦截的文件同样无法写入。这时顶部的提示会提供 {{ui:status.saveAsDownload}}，它把文件放进你的下载内容。要彻底跳过对话框，请在设置中打开 {{ui:workspace.lylAsDownload}} 和 {{ui:workspace.stlAsDownload}}。

更多：[备份与转交](chapter:files-and-saving#backing-up-and-passing-on)

## 安装与更新

### 有可以下载的应用吗？

layerling 从浏览器中安装：安装后它有自己的图标和窗口，没有网络也能启动。没有需要下载的安装程序，正版只在 layerling.com。**不要从任何其他网站下载或运行“layerling”安装程序：** 它并非来自 layerling，可能含有恶意软件。如果要运行自己的副本，有 Windows 快速开始方式和 Docker 映像。

更多：[安装为应用](chapter:offline-and-install#installing-as-an-app)和[自行运行](chapter:offline-and-install#running-it-yourself)

### layerling 没有网络能用吗？

能。首次访问之后，没有网络也能启动，最好安装为应用。只有一样东西要到第一次需要时才加载：首次导出 STEP 时用到的 CAD 内核，约 22 MB。

更多：[安装为应用](chapter:offline-and-install#installing-as-an-app)

### 怎样获得更新？

更新会自动到来。打开着的页面会发现新版本，并显示一张列出新内容的卡片；{{ui:newVersion.reload}} 会先保存当前打开的设计，然后加载新版本。起始页也会显示有更新的版本。

更多：[更新](chapter:offline-and-install#updates)

### 支持哪些浏览器和平板电脑？

电脑、平板电脑或手机上的 Chrome、Edge、Firefox 和 Safari；3D 视图需要 WebGL。有几件事只有 Chrome 和 Edge 能做：写入你自己的文件和文件夹、备份文件夹，以及双击打开 .lyl 文件。在平板电脑上，手指的作用相当于鼠标左键。

更多：[手指与触控笔](chapter:tablet-and-touch#fingers-and-a-stylus)

## AI

### 设置 AI 最简单的方法是什么？

把地址 `https://github.com/henmedia/layerling` 交给一个能在你电脑上工作的 AI，请它帮你设置 layerling 及其 MCP 服务器。它需要这样的程序：Claude 应用的 Code 标签页、Claude Code、Codex、Antigravity 或 Gemini CLI。针对 Windows 和 Mac，指南里还有逐步说明。

更多：[新手分步指南](chapter:ai-with-mcp#step-by-step-for-beginners)

### 为什么 AI 连不上 layerling.com？

AI 与编辑器之间的桥接只存在于运行在你自己电脑上的 layerling 副本中。在 layerling.com 上它始终是关闭的，而浏览器里的聊天无法安装任何东西。所以 AI 需要一个在本地启动的 layerling，以及一个支持 MCP 的程序。

更多：[设置](chapter:ai-with-mcp#setting-up)

### 安装好的应用算是本地副本吗？

如果是从 layerling.com 安装的，就不算：它仍然是在独立窗口里运行的 layerling.com，即使没有网络也能启动。本地副本会在你的电脑上运行一个小型服务器，AI 通过它用 MCP 与编辑器通信；网页应用没有这样的服务器。快速安装完成后，你自己的副本运行在 `http://127.0.0.1:3000/`。

更多：[设置](chapter:ai-with-mcp#setting-up)

### 哪种 AI 可以用？要花多少钱？

任何支持 MCP 的程序都可以；指南介绍了 Claude、Codex、Gemini 和 Antigravity。layerling 本身不收费。AI 收多少钱由它的提供商决定：例如，Claude 应用的 Code 标签页属于 Claude 的付费套餐。

更多：[设置](chapter:ai-with-mcp#setting-up)

### 哪些数据会发给 AI 提供商？

AI 读取的内容：当前打开的设计中的物体，以及它拍摄的视图图片。这些会像你在 AI 程序里输入的其他内容一样发给该程序的提供商。桥接本身运行在你的电脑上，不使用 AI 时，没有任何内容离开你的电脑。

更多：[AI 能做什么](chapter:ai-with-mcp#what-the-ai-can-do)

## 内存、速度与历史记录

### 为什么 layerling 处理我的 STL 时变慢？

STL 是由三角形组成的网格，非常大的网格会让编辑器变慢、占用大量内存，保存也会变慢。导入后，如果单个网格达到 400,000 个三角形，或整个设计达到 100 万个，layerling 会提示你。请先简化网格，只导入需要的部件，或者用 layerling 自带的形状来搭建部件。

更多：[大型网格](chapter:files-and-saving#large-meshes)

### 为什么我的历史记录里少了一些步骤？

有两件事会缩短它。设置 {{ui:workspace.savedHistory}} 在你不更改时为每个设计保留 100 步，更早的步骤会被丢弃。另外，当设计太大、无法连同全部历史记录一起保存时，layerling 会只带一半步骤保存，再不行就再减一半，并告诉你。设计本身总是完整保存。

更多：[保存的历史记录](chapter:view-and-workplane#saved-history)

### 浏览器的存储空间满了怎么办？

不要关闭或重新加载标签页：最新的更改只存在于那里。先通过导出为 .lyl 保留一份副本。然后腾出空间：在历史记录视图中删除步骤，移除不再需要的设计，或者先备份再删除它们。

更多：[你的设计，你的备份](chapter:files-and-saving#your-designs-your-backup)

### 我的设计太大，无法保存。怎么办？

它的历史记录和网格加起来占用的空间太大。在这样提示之前，layerling 已经尝试过用更少的历史步骤保存。请在历史记录视图中删除历史记录，简化占用最大的导入网格，或者保存一个只含当前状态的 .lyl。

更多：[备份与转交](chapter:files-and-saving#backing-up-and-passing-on)和[简化导入的网格](chapter:files-and-saving#simplifying-an-imported-mesh)

### 浏览器内存不足。有什么办法？

这种情况出现在含数百万个三角形的网格上，其中某一步需要的内存超过了一个浏览器标签页所能分到的量。用 {{ui:editor.tool.simplify}} 减少导入网格的三角形，关闭其他标签页，然后再试一次。如果问题发生在保存时，缩短历史记录也有帮助。

更多：[大型网格](chapter:files-and-saving#large-meshes)

### 某个设计打开得很慢或根本打不开。我能做什么？

多半是它的撤销步骤历史记录变得非常大了。起始页上该设计菜单中的 {{ui:dashboard.openWithoutHistory}} 只读取当前状态；它会永久删除较早的步骤，所以如果你想保留它们，请先备份该设计。备份中的早期版本会作为新设计打开。

更多：[备份与转交](chapter:files-and-saving#backing-up-and-passing-on)

### layerling 卡顿。哪些设置有帮助？

设置中的 {{ui:workspace.fastMode}} 会关闭阴影、所有实体上的边线和相机惯性，并且只按屏幕分辨率绘制视图。检查浏览器是否使用了显卡：`chrome://gpu` 或 `edge://gpu` 页面上，WebGL 旁边应显示“Hardware accelerated”。大型导入网格是另一个常见原因。

更多：[layerling 卡顿的时候](chapter:view-and-workplane#when-layerling-feels-slow)

### 编辑器停住不动或计算很久。是等待还是重新加载？

先等一等。切割、分组和边缘处理在后台计算，运行期间会显示 {{ui:status.computing}}；抽壳之类的耗时任务会自行停止并给出提示，不做任何更改。如果 CAD 内核不得不重新启动，提示会说明这一点，无需重新加载。重新加载是安全的，因为每次更改都会自动保存，只有一个例外：当红色提示 {{ui:notice.designNotSavedTitle}} 显示时，请先导出一个 .lyl。

更多：[layerling 卡顿的时候](chapter:view-and-workplane#when-layerling-feels-slow)

### 3D 视图一直空白，或提示它无法启动。怎么办？

浏览器无法启动负责绘制 3D 视图的 WebGL。原因在浏览器或显卡驱动，而不在你的设计，你保存的设计也不会被删除。关闭其他含有 3D 内容的标签页并重启浏览器，开启硬件加速；如果某项隐私设置或扩展阻止了 WebGL，请允许它；并更新浏览器和显卡驱动。换一个浏览器试试是一种快速的检验方法。

更多：[layerling 卡顿的时候](chapter:view-and-workplane#when-layerling-feels-slow)

## 导入的模型

### “简化网格”还是“转为精确实体”：该选哪个？

{{ui:editor.tool.simplify}} 保留一部分三角形，让沉重的模型变轻；它仍然是网格。{{ui:editor.tool.makeExact}} 把由平面、圆柱、圆锥和球面组成的模型重建为真正的 CAD 实体，这样圆角和倒角能沿着干净的边走，导出的 STEP 也带有真正的面。它最多处理 400,000 个三角形；人偶或扫描件仍然是网格。对于大型技术零件：先打开 {{ui:simplify.keepEdges}} 进行简化，再转为精确实体。

更多：[简化导入的网格](chapter:files-and-saving#simplifying-an-imported-mesh)和[将导入的网格转为精确实体](chapter:files-and-saving#making-an-imported-mesh-exact)

### 为什么切割会失败？为什么提示我的网格“不是封闭的”？

只有表面封闭的实体才能被切割。如果导入的网格有缝隙，layerling 会指出是哪个部件以及开放边的数量，并将它排除在外。小孔它会自行补上；较大的孔必须在制作该模型的程序或网格修复工具中修复。打印检查会显示哪个实体是开放的。

更多：[检查打印](chapter:printing#checking-the-print)

### 怎样正确导入 SVG？

SVG 导入后是一个高 4 mm 的草图实体，它的点可以在草图模式中修改。导入前请在导入窗口中输入以毫米为单位的宽度；不填数字则保持它自身的尺寸。自相交的轮廓无法成为实体，会被略过并计数：请在绘图程序中合并重叠的部分并闭合轮廓，然后重新导入。

更多：[导入](chapter:files-and-saving#importing)

## 圆角与倒角

### 为什么圆角加不上去？

多半是对那个位置来说圆角太大了：它会延伸到相邻的面上，或者边的弯曲比圆角半径还急。通常少一两毫米就够了；在尖角处，圆角需要的空间比半径看上去的要多。如果这些边无法一起倒圆角，请一次少选几条；碍事的那条边会画成红色。{{ui:edge.findLargest}} 会替你找出合适的尺寸。

更多：[为边做倒角与圆角](chapter:edges-and-hollowing#chamfering-and-filleting-edges)

### 为什么修改草图后我的圆角不见了？

执行 {{ui:inspector.editSketch}} 之后，实体会重新生成，边也是新的。只要实体的边数和之前一样，layerling 就会把圆角和倒角重新加到位置与原来的边相同的边上。如果多了或少了一个角，它们就会被略去，提示信息会说明略去了多少。撤销可以恢复一切。

更多：[用它生成实体](chapter:sketches#making-a-body-from-it)

### 为什么导入模型的某些边无法选中？

STL、OBJ 和 3MF 只带来三角形，而边缘工具只能处理最多 4,000 个三角形的网格。{{ui:editor.tool.makeExact}} 会把技术零件变成真正的 CAD 实体，其上的钻孔有一条圆圆的完整边缘，圆角可以沿着它走。STEP 文件从一开始就带有精确几何。

更多：[将导入的网格转为精确实体](chapter:files-and-saving#making-an-imported-mesh-exact)

## 分组、孔与尺寸

### 为什么拉伸分组时孔会变成椭圆？

调整分组大小时，里面的所有内容都会被拉伸，就像画在橡皮上一样。在分组设置的 {{ui:inspector.groupResize}} 下选择 {{ui:inspector.groupResizeKeepParts}}：横跨整个分组的部件会被拉伸，孔和小零件则保持原来的大小，以及它们到较近一侧的距离。

更多：[调整分组大小：保持孔和小零件](chapter:solids-and-holes#resizing-a-group-keeping-holes-and-small-parts)

### 为什么分组失败？为什么结果有缝隙？

要么某个部件不是封闭的，提示信息会指出它；要么两个部件几乎相接，却没有真正接触。请取消分组，把部件精确对齐，或稍微改动一下尺寸或位置，然后重新分组。超过导入网格切割上限的非常密集的网格根本不会被合并。

更多：[分组](chapter:solids-and-holes#grouping)

### 怎样修改分组里的某一个部件？

选中分组并按 [[E]]，或者双击它。这时各部件会分开放置，可以修改；完成编辑时分组会重新生成。加在整个分组上的圆角和倒角在重新生成时会丢失。

更多：[编辑分组](chapter:solids-and-holes#editing-a-group)

### 怎样从之前的状态中取回某一个部件？

打开历史记录视图，把滑块移到仍含有该部件的状态，点击该部件并选择 {{ui:historyView.bringBack}}。一个副本会放进当前设计，样子和位置与当时相同，名称中带有时间。

更多：[回看：历史记录视图](chapter:select-and-arrange#looking-back-the-history-view)

## 打印与导出

### STL、3MF、OBJ 还是 STEP：该选哪个？

给打印机用 3MF 或 STL。3MF 把每个实体保留为一个带名称和颜色的部件；STL 是单一颜色的一个网格。OBJ 也能携带颜色。STEP 用于其他 CAD 程序：它包含带圆角和倒角的精确几何。

更多：[导出](chapter:files-and-saving#exporting)

### 怎样把我的颜色带进切片软件？

导出 3MF。每个实体都保留自己的颜色，涂了多种颜色的实体，其面上带有上色信息。Bambu Studio 和 OrcaSlicer 在打开时会询问这些颜色如何对应到你的耗材。

更多：[多色上色](chapter:shapes#painting-in-several-colours)

### 我的零件装不到一起。需要多大间隙？

通常是 0.2 到 0.4 mm，取决于打印机。配合测试可以测出它：打印带七个孔的小板，找出销子还能在其中转动的最紧的孔，把这个值填为你的打印机间隙。之后新建的盖子、燕尾榫和螺纹都会以它为起点。

更多：[打印机间隙：配合测试](chapter:printing#your-printer-s-play-the-fit-test)

### 为什么 layerling 说某个部件放不进打印机？

该部件超出了打印板边缘，或者高度超过了你所选打印机能打印的高度。这只是一条提示，可以关闭。请在设置中选择你的打印机，或用 {{ui:editor.tool.split}} 切开过大的部件。

更多：[部件放不下时](chapter:printing#when-something-does-not-fit)

## 关于 layerling

### layerling 免费吗？我可以出售用它设计的东西吗？

layerling 是采用 AGPL-3.0 许可证的自由软件，无需账户。该许可证针对的是程序本身：任何人修改 layerling 并通过网络提供给他人使用，也必须提供源代码。它对你制作的模型不设任何条件。你导入的字体和模型保留它们各自的许可证。

如果你想支持这个项目，一笔[小额捐款](support:)可以帮助分担服务器和开发费用。捐款完全自愿，layerling 中的任何功能都不取决于它。

更多：[自行运行](chapter:offline-and-install#running-it-yourself)

### 怎样报告错误或提出需求？

页脚中的 {{ui:editor.bugReport}} 会保存一个 ZIP，里面有该设计和一段关于版本与浏览器的简短文字；其中不含任何个人信息。请把它附在论坛或 GitHub 的讨论区里。两处都欢迎提问和提出愿望。

更多：[报告问题](chapter:files-and-saving#reporting-a-bug)和[帮助与反馈](chapter:offline-and-install#help-and-feedback)
