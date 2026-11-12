---
title: 视图与工作平面
summary: 在场景中移动、正对着观察，以及把新形状放到任意你喜欢的表面上。
---

## 移动视图

使用鼠标：

| 操作 | 效果 |
| --- | --- |
| 按住右键拖动 | 旋转视图 |
| 单击右键 | 在实体上打开常用命令菜单：复制、设为孔或实体、分组、隐藏、锁定、删除等；在空白处为“粘贴”和“全选” |
| 按住中键拖动 | 平移视图 |
| 滚轮 | 放大和缩小 |
| 按住 [[Ctrl]] / [[Cmd]] 并用左键拖动 | 也可平移视图（在 MacBook 触控板上：按住 [[Cmd]]，按下并拖动） |
| 双击工作平面上的空白处或平台旁边 | 平移视图，使该处位于中央；之后视图绕该处旋转 |

滚轮缩放的速度在设置的 {{ui:workspace.appearance}} 下用 {{ui:workspace.zoomSpeed}} 设定：滑块范围 1 到 14，初始为 5。它只作用于滚轮和触控板：按钮以及 [[+]] 和 [[−]] 键始终按同样的小步距缩放。鼠标滚轮的一格在任何浏览器里缩放幅度都相同，触控板则按你滑过的距离缩放。其下方的 {{ui:workspace.panSpeed}} 设定平移时视图跟随鼠标的速度：滑块范围 1 到 9，初始为 5，此时你抓住的点会一直停在光标下。

**与切片软件一致的鼠标按键。** 如果你习惯了 Bambu Studio 或 OrcaSlicer，在设置的 {{ui:workspace.appearance}} 下把 {{ui:workspace.mouseScheme}} 设为 {{ui:workspace.mouseSchemeSlicer}}。这样在空白处左键拖动会旋转视图，右键像中键一样平移视图，Shift 加左键拖动会画出选择框。拖动实体仍会移动它，短按右键仍会打开菜单。在草图中右键同样平移视图。

**3D 鼠标。** SpaceMouse 或其他 3D 鼠标可以旋转、平移和缩放 3D 视图：把帽往前推即可放大，滑动它平移视图，倾斜它倾斜视图，扭转它旋转视图。在设置的 {{ui:workspace.appearance}} 下点击 {{ui:workspace.spaceMouseConnect}}，并在浏览器打开的窗口中选择设备；浏览器会记住这个选择，所以只需做一次。这在能访问此类设备的 Chrome 和 Edge 中可用；Firefox 和 Safari 不行。如果某个方向的操作反了，请在按钮下方勾选它：左右平移、上下平移、缩放、倾斜或扭转。

平板或手机上，两根手指缩放（张开和捏合）并平移视图（并拢滑动）。一根手指在空白处会转动视图，在那里轻点会清除选择；落在形状或控制柄上时，则像鼠标左键那样操作设计。要让从形状上开始的手指也能转动视图，请打开视图栏中的 {{ui:camera.touchRotate}}。这个开关只在带触摸屏的设备上显示。

带笔的绘图板用起来像鼠标：笔尖是左键，笔杆上的按键是右键，用于转动视图和打开菜单。绘图板的热键可以在其驱动中设为 layerling 的[键盘快捷键](chapter:shortcuts)。

**在平板上，尽量使用触控笔。** 它的笔尖比指尖细得多，也不会挡住你要对准的地方，因此草图中的小点、细线和控制柄、测量点与边都能精确点中，长时间工作也更省力。layerling 已经让手指比鼠标指针更容易够到点、线、控制柄和边，但触控笔仍然是更精确的方式。这适用于绘图板能识别为笔的笔（S Pen、Apple Pencil 等）。普通橡胶笔尖的触控笔在屏幕上等同于手指，并不会更细。

平板没有鼠标右键：把一根手指在形状或空白处按住半秒，就会打开右键所打开的菜单，空白处还有**全选**。同一菜单里的**多选**在平板上代替 Shift：之后每次点按实体都会把它加入或移出选择，直到你点按空白处或按 [[Esc]]；手指落在空白处仍然会转动视图。选中形状周围的控制柄，手指从旁边一点的位置也能抓住。

### 视图立方体

左上角的立方体显示你正看向哪里。点击它的某一面，就会跳到从上、下、前、后、左或右看的正视图。点击立方体的角，会从那个角斜着看向模型；点击边附近，则从那条边看过去，位于两个面之间；指针停在上面时该处会亮起。数字键 [[1]] 到 [[6]] 也能给出正视图。同时按住 [[Shift]]，视图还会缩放到选中项，就像 [[Shift]]+[[F]] 那样。

拖动立方体可以转动视图，和按住右键拖动一样。没有选中任何东西时，方向键也会转动视图：每按一次 15°，配合 [[Shift]] 为 90°。它们按所指的方向转动模型——[[→]] 把模型的正面转向右，[[↑]] 把它的正面向上仰。按住 [[Ctrl]] 时，方向键改为让视图在屏幕上平移：每按一次移动画面的十分之一，同时按 [[Shift]] 则为一半。模型按所指的方向移动。如果选中了东西，方向键会移动它；先点击空白处再转动视图。在触摸屏上，用一根手指即可，无需打开 {{ui:camera.touchRotate}}。

### 视图栏

左边缘是一条窄栏。从上往下：

- {{ui:camera.home}} 把整个场景重新装回画面。快捷键是 [[Home]]；没有选中任何东西时，[[F]] 也可以。
- {{ui:camera.focusSelection}} 缩放到选中项（[[F]] 或 [[Shift]]+[[F]]）。
- {{ui:camera.zoomIn}} 和 {{ui:camera.zoomOut}} 按步缩放，[[+]] 和 [[−]] 键也是如此。
- {{ui:camera.orthographic}} 切换到平面视图，平行边保持平行。对于测量和对齐边，这通常比透视视图更舒服。[[O]] 来回切换，再点一次也会返回。
- {{ui:camera.secondView}} 在单独的窗口中打开设计的第二视图，详见下文。再点一次将其关闭。
- {{ui:camera.showScrollbars}} 会在视图底部和右边缘各显示一条滚动条。拖动滚动条可平滑地移动视图，点击两端的箭头可小幅移动（按住会持续移动），点击滑块旁边则移动几乎整个视图。视图不会旋转，而且与方向键不同，选中零件时滚动条照样可用——在近处处理小细节时很方便。再次点击可隐藏它们；设置中的 {{ui:workspace.startWithScrollbars}} 决定设计打开时是否显示它们。此浏览器也会记住这一选择。
- {{ui:camera.hideWorkplane}}（网格上方的眼睛）连同网格一起隐藏平台，让你可以从下方查看设计的底面。改变的只是视图：新形状仍然落在工作平面上。再点一次会重新显示。
- {{ui:camera.placeWorkplane}}、卷尺和直角尺是各自的工具，下文以及[测量与注释](chapter:measuring-and-notes)中会介绍。

{{ui:camera.secondView}} 会打开一个窗口，用它自己的相机显示同一个设计，让你同时从两个方向观察——比如你从上方操作时，从前方看它。你在编辑器里做的每处更改都会立即显示在那里；设计只在主窗口中修改，手柄也只留在主窗口。在第二窗口中，鼠标和视图立方体像这里一样旋转它的视图，按键也一样：[[1]] 到 [[6]]、[[F]]、[[Home]]、[[O]]、[[+]] 和 [[−]]，方向键旋转，[[Ctrl]] 加方向键平移。在那里 [[F]] 会缩放到编辑器中选中的对象。设计的四个已保存视图在那里也可用：[[7]]、[[8]]、[[9]] 和 [[0]] 调出它们，[[Shift]] 加其中一个键会把该窗口的视图保存到这个键下——两个窗口共用。它自己的视图栏有 {{ui:camera.home}}、{{ui:camera.focusSelection}}、{{ui:camera.zoomIn}}、{{ui:camera.zoomOut}}、{{ui:camera.orthographic}} 和 {{ui:camera.hideWorkplane}}，只作用于该窗口。窗口会在你上次离开的位置以相同大小打开，并随编辑器一起关闭。在手机和平板上不显示此按钮。

栏最顶部的小箭头会在它挡路时把它收起。

设计会按你离开时的样子打开：视图的角度、缩放和位置会随设计保存在这个浏览器中，所以你可以从停下的地方继续，即使回过起始页或关闭过页面也一样。保存的文件（.lyl）会带上视图，因此在别处打开时也是这个视角。视图不属于撤销历史。

每个设计中还可以保存四个自己的视图。[[Shift]]+[[7]]、[[Shift]]+[[8]]、[[Shift]]+[[9]] 或 [[Shift]]+[[0]] 把当前视图原样保存到该键下——包括角度、位置、缩放以及平面或透视——只按该键（[[7]]、[[8]]、[[9]] 或 [[0]]）即可恢复。底部会有消息确认保存；在同一键下再次保存会替换该视图。和上面的视图一样，保存的视图会随设计留在这个浏览器中，并随保存的文件（.lyl）一起带走，它们也不属于撤销历史。

## 查看内部：剖视图

{{ui:camera.sectionView}}，栏中最后一个按钮（切割工具），沿一个平面把视图切开，以便检查壁、空腔以及互相嵌套的零件。不会真的切掉任何东西：设计、它的文件和所有导出都保持完整。平面穿过实体的地方，切面会以该实体稍暗的颜色填充，内部的孔则保持空白，这样就能区分实心与空心；平面停止移动片刻后，填充面才会出现。在{{ui:camera.sectionCutFace}}中选择剖切面的样子：{{ui:camera.sectionCutFaceHatch}}（默认）像工程图一样画剖面线，位于另一实体内部的实体剖面线方向相反，两者因此分得清；{{ui:camera.sectionCutFaceFill}}以单色填充；{{ui:camera.sectionCutFaceOpen}}保持开放，你会看到实体外壳的内部。这个选择对所有设计都有效。

- 选择平面横跨的轴：X（宽度）、Y（深度）或 Z（高度），与位置字段中的相同。平面从设计的中间开始。
- {{ui:camera.sectionOrientation}} 设定这些轴跟随什么。{{ui:camera.sectionOrientationWorld}} 采用设计的坐标轴。{{ui:camera.sectionOrientationWorkplane}} 采用工作平面的坐标轴：此时 Z 平行于它切割，X 和 Y 与它垂直，位置从它的原点算起。工作平面位于斜面时，你就平行于该面切割，移动工作平面时切口也会跟着移动。{{ui:camera.sectionOrientationView}} 把平面转向屏幕：它去掉前方遮挡的部分，滑块则沿视线把平面推入设计更深处，例如为了够到被埋住的零件并点击它。转动视图后，再点一次，切口就会跟随新视图。
- {{ui:camera.sectionCoarse}} 让平面横跨整个设计移动，{{ui:camera.sectionFine}} 让它在当前位置两侧小幅移动，以十分之一毫米为单位。也可以直接输入位置。
- 坐标轴旁的按钮显示切口的另一侧，{{ui:camera.sectionReset}} 把平面放回中间，{{ui:camera.sectionShowPlane}} 隐藏蓝色平面。
- 你可以点击并选中切口露出的内容，包括内壁。
- {{ui:camera.sectionWorkplane}} 把工作平面放到切口上。它位于剖面上，朝向保留下来的实体外侧，就像切割留下的面。如果你随后切换到草图，草图会正好从那里开始，淡淡的轮廓显示切口，你可以沿着它绘制并吸附。例如，这就是给用剖视图打开的空腔配一个盖子的画法。坐标轴旁的按钮选择保留哪一侧，也就决定了工作平面朝哪个方向。像平常一样，可以把工作平面放回底板。
- {{ui:camera.sectionSketch}} 直接在切口上开始一个新草图，切口的轮廓已经作为线条放在里面：孔是真正的圆，圆角是圆弧。修改它们，删掉不需要的，继续绘制，然后完成：实体从切口向被切掉的那一侧长出，因此必须与另一个零件配合的零件，例如盖子、嵌件或密封垫，正是从那个零件自己的轮廓开始。坐标轴旁边的按钮选择这一侧。与 SVG 一样，只计入可见实体，孔已经扣除。
- {{ui:camera.sectionMeasure}} 直接在切口上测量：轮廓以蓝色显示，在它上面点击两次即可得到距离，以及沿平面两个轴的分量。两个点都会吸附到轮廓上，优先吸附角点。当第二次点击落在对侧壁上任意位置时，它会与第一个点垂直对齐——因此不用精确瞄准，就能读出壁厚、间隙和公差。第三次点击开始下一次测量，[[Esc]] 结束测量。移动平面会清除测量。在圆形轮廓上，例如穿过圆柱或孔的切口，小十字会标出圆心，圆心也会吸附。点击圆上一点，再靠近它正对面的点：第二次点击会正好落在圆心另一侧，读数显示 Ø，即直径。从圆心到圆上一点则得到 R，即半径。
- {{ui:camera.sectionExportSvg}} 把切割平面上的轮廓按 1:1 保存为 SVG，供激光切割机、绘图仪、模板或垫片使用。X 切口从右侧看，Y 切口从前面看，Z 切口从上方看。与导出时一样，只有可见实体才会写入，孔已经扣除，同色的实体会合并成一个轮廓。每种颜色保持为独立的无填充路径，这样激光软件会把它们当作不同图层分开。

工具窗口附着在它的按钮上。如果它挡住了东西，可以抓住标题栏把它拖到工作平面上的任意位置；下次也会在那里打开。双击标题栏或把它拖回按钮处即可复原。

X 和 [[Esc]] 会关闭窗口；如果正在测量，[[Esc]] 会先结束测量。切口会一直保留，直到你用 {{ui:camera.sectionActive}} 将其关闭，或回到设计总览。开启时，它的按钮保持高亮。放在被切掉那一侧的任何东西，只有关闭切口后才会显示。平板没有 [[Esc]]，所以那里的窗口多两个按钮：{{ui:camera.sectionBack}} 在测量进行时结束测量，否则关闭窗口；{{ui:camera.sectionConfirm}} 一步关闭窗口。电脑上不显示这两个按钮。

## 工作平面

新形状会与工作平面对齐。起初它是带网格的底板。但你可以把它放到任何表面上，以便在侧壁或斜面上放置东西。

1. 按 [[W]] 或点击 {{ui:camera.placeWorkplane}}。
2. 把鼠标移到实体的某个面上。该面会亮起。
3. 点击一下就把工作平面放在那里。此后添加的所有东西都位于该面上。

如果改为点击空白的平台，工作平面会平放在你点击的位置，并吸附到网格上。新形状和完成的草图（包括旋转生成的）会出现在那里，而不是平台中央。工作平面这样平放在平台上时，平台只显示轮廓：同一平面里的两个网格会造成闪烁的花纹。

在面上时，工作平面的原点否则会吸附到网格。点击靠近面角的位置，它就正好落在那个角上。靠近边时它落在边上，网格也与边对齐；这就是有意选择网格角度的方法。没有角或边时，平放的面上的网格与实体平行，所以在一个转过的长方体上，网格也会跟着转。

点击平台旁边或按 [[Esc]] 会把工作平面送回底板。更快的是 {{ui:camera.resetWorkplane}}：工作平面位于面上时，带向下箭头的按钮会出现在视图栏里眼睛的下方。[[Shift]]+[[W]] 直接把它放到当前选中的面上。[[Alt]]+[[W]] 随时把它放回底板，无论是否选中了东西。如果点击时按住 [[Shift]]，平面会朝向另一边。

工作平面位于面上时，{{ui:camera.placeWorkplane}} 旁边会出现一只眼睛。它会隐藏工作平面而不取消它，方便清楚地查看设计：新形状仍然落在那个面上，旋转也仍然绕它进行。点击眼睛会重新显示，设定新的工作平面也会。

要正对工作平面查看，按 [[P]] 或点击视图栏中 {{ui:camera.placeWorkplane}} 旁边的 {{ui:camera.lookOntoWorkplane}}。视图会转到正对平面的方向，从新形状生长的那一侧看过去，平面原点位于中间。在底板上，这就是俯视图。

## 打印板

当一个设计的内容超出一个打印板所能打印的范围时，例如一个盒子连同盖子和内衬，它可以有多个打印板。点击 {{ui:editor.group.arrange}} 组中的 {{ui:editor.tool.buildPlates}}，或在物体的右键菜单中选择 {{ui:plates.moveTo}}。视图底部会出现一个栏，每个打印板一个按钮；按钮上的数字表示该打印板上有多少个物体。

- 每个打印板与工作平面一样大，打印板并排排列在第一个打印板的右侧，相距 20 毫米。物体属于其底面中心所在的打印板，因此把它拖到另一边就会放到另一个打印板上。一个设计最多有 12 个打印板。
- 在栏中点击一个打印板会显示它，之后新形状和导入的文件会放在它上面。{{ui:plates.showAll}} 显示全部。双击打印板或使用 {{ui:plates.rename}} 可以给它起一个名字，例如“盖子”，名字会写在打印板上。
- 在打印板上新建的草图也从当前打印板开始：草图区域显示该打印板及其上的实体，完成的实体也放在那里。
- {{ui:plates.moveLeft}} 和 {{ui:plates.moveRight}} 改变顺序，物体随其打印板一起移动。{{ui:plates.remove}} 删除当前打印板；其上的物体会移到第一个打印板的相同位置。
- {{ui:plates.arrange}} 将所选物体（或全部物体）逐行排列到打印板上，先放最大的，间距 5 毫米，并在需要时添加打印板。比打印板大的物体会留在原处。
- 选择打印机后，每个物体都按自己的打印板检查，打印高度从该打印板上最低的物体算起。有物体放不下的打印板，其数字显示为红色。
- 在属性中，X 从物体所在打印板的中心算起。

导出窗口随后提供 {{ui:export.plates}}：所有打印板在一个文件中，像设计中一样并排；每个打印板一个文件，打包成 ZIP（STL、3MF 和 OBJ）；或单个打印板，放到第一个打印板的位置。切片软件会把每个文件作为一个打印板打开，所以要依次打印各个打印板，请使用按打印板分开的文件。在打印板之间移动物体和分布物体可以撤销；添加、命名、排序和删除打印板会随设计保存，但不能撤销。

## 网格与吸附

网格显示平台的大小。右下角是**吸附步距**：移动和缩放按这个步距吸附，例如 1 mm。精细作业时调小，粗略摆放时调大。功能区中的 {{ui:editor.tool.snapToGrid}} 会在之后把选中的形状移到最近的网格交叉点。移动时，形状还会吸附到其他形状，见[选择与排列](chapter:select-and-arrange)。
不移动鼠标、用鼠标中键短按一下，会在指针处直接打开吸附步长菜单，在草图中也一样；按住中键拖动仍然平移视图。

> **提示：** 精确拼合零件时，不要一边转着视图。用数字键转到俯视或正视，再按 [[O]] 切换到平面显示。这样一眼就能看出两条边是否真的齐平。

### 设置窗口

标题行中的齿轮（{{ui:editor.workspaceSettings}}）打开设置。左侧有五个区域：{{ui:workspace.appearance}}、{{ui:workspace.measurement}}、{{ui:workspace.workplane}}、{{ui:workspace.shapeDefaults}} 和 {{ui:workspace.history}}。改动立即生效。底部的 {{ui:workspace.makeDefault}} 把当前设置保存为默认值，让新设计从这些设置开始。打开的文件会带着它自己的设置；旁边的 {{ui:workspace.useMyDefault}} 会把你保存的颜色、网格等应用到打开的设计上，同时保留它的单位。如果你的默认设置里有打印机，这台打印机连同它的平台尺寸也会一起带过来；没有的话，设计保留原有的平台和打印机。右上角的 {{ui:workspace.close}} 关闭窗口。本节逐项介绍这些设置。

{{ui:workspace.exportSettings}} 把窗口的设置保存为文件（layerling-settings-<日期>.json）：颜色、网格、阴影、相机和形状默认值，以及主题、工具栏大小、视图立方体的角落、形状颜色和每台打印机的间隙。在另一台电脑上或浏览器数据丢失后，{{ui:workspace.importSettings}} 会再次读取该文件：它成为新设计的默认值，并像 {{ui:workspace.useMyDefault}} 一样应用到已打开的设计。你在键盘快捷键中设定的自定义按键也会一起保存。

### 外观：主题、工具栏与视图立方体

{{ui:workspace.theme}} 设定整个程序的配色：{{ui:workspace.themeSystem}} 跟随电脑，其余为 {{ui:workspace.themeLight}}、{{ui:workspace.themeDark}} 和 {{ui:workspace.themeGraphite}}。也可以在编辑器右上角更改。

{{ui:workspace.toolbarSize}} 让顶部功能区的按钮、其形状菜单、左侧视图栏和右侧属性面板变小或变大：{{ui:workspace.toolbarSizeSmall}}、{{ui:workspace.toolbarSizeMedium}}（一直以来的样子）或 {{ui:workspace.toolbarSizeLarge}}。小尺寸在笔记本电脑上给工作平面留出更多空间；大尺寸在大屏幕上或用手点击时更容易命中。使用大按钮时，如果窗口太窄，功能区的各组会排到第二行。尺寸在设置的“{{ui:workspace.ribbon}}”标签页中，保存在这个浏览器中，对所有设计生效。

{{ui:workspace.shapeColors}} 会把新形状的初始颜色（其类型的颜色，或你用 {{ui:inspector.saveDefaults}} 保存的颜色）显示在形状库的图片上。如果你更喜欢灰色图片，就把它关掉；浏览器会记住你的选择。

{{ui:workspace.viewCubePosition}} 把视图立方体放到工作平面的另一个角：{{ui:workspace.viewCubePositionTopLeft}}（一直以来的位置）、{{ui:workspace.viewCubePositionTopRight}}、{{ui:workspace.viewCubePositionBottomLeft}} 或 {{ui:workspace.viewCubePositionBottomRight}}。除了左上角，视图栏都会上移到立方体让出的位置。在右下角时，立方体正好位于 {{ui:inspector.snapGrid}} 控件上方。右侧打开形状属性时，右侧的立方体会让到属性面板左边。这个角保存在浏览器中，对所有设计生效。窗口很窄时（例如手机上），该设置会隐藏，立方体留在左上角。

### 外观：功能区中的按钮

{{ui:workspace.ribbonButtons}} 把你从不使用的组和按钮从功能区中移除。点击一个组打开它的列表：{{ui:workspace.ribbonGroupShown}} 移除整个组，按钮旁的勾选框只移除这一个按钮。{{ui:workspace.ribbonShowAll}} 把一切恢复。没有按钮的组会消失，其他组随之前移，一行就能放下更多功能区。

移除的内容只是不在功能区中：命令搜索（[[Ctrl]]+[[K]]）仍能找到它，它的快捷键仍能运行它。组旁边的箭头把它在列表中上移或下移，也就是在功能区中移动；{{ui:workspace.ribbonResetOrder}}会恢复原来的顺序。按钮旁边的箭头以同样方式在其组内移动它。“帮助”始终保留。“形状”组可以像其他组一样移动和移除；移除后，它的面板仍可从命令搜索打开。这个浏览器会记住你的选择，它也会写入 {{ui:workspace.exportSettings}} 的文件。它适用于 3D 编辑器；草图有自己的工具栏。

组列表中 {{ui:workspace.ribbonGroupShown}} 下方的 {{ui:workspace.ribbonFold}} 决定窗口放不下所有组时这个组怎么做。{{ui:workspace.ribbonFoldAuto}} 是默认设置：最少用到的组先折叠。{{ui:workspace.ribbonFoldAlways}} 让这个组即使在宽窗口中也折叠成一个按钮，占地很少，又随手可用。{{ui:workspace.ribbonFoldKeep}} 让它在其他所有组之后才折叠。{{ui:workspace.ribbonResetOrder}} 也会恢复这项选择。{{ui:editor.section.mirrorPattern}}、{{ui:editor.section.splitShape}}、{{ui:editor.section.edgesWalls}} 和 {{ui:editor.section.surface}} 是四个独立的组：每个都可以单独移动、折叠和移除。

### 外观：快速模式

{{ui:workspace.fastMode}} 用于较慢的电脑。它会关闭阴影、所有实体的边线和相机的惯性，并且只按屏幕分辨率绘制视图。你自己的设置会保留下来供以后使用，开启期间被覆盖的开关会显示 {{ui:workspace.offInFastMode}}。更多关于慢电脑的提速方法见下文“layerling 卡顿的时候”。

### 外观：工作区与草图的颜色

工作区的颜色在 {{ui:workspace.appearance}} 下设置：浅色主题的 {{ui:workspace.backgroundColor}} 和 {{ui:workspace.surfaceColor}}（深色主题保留自己的颜色），网格颜色则在 {{ui:workspace.workplane}} 下。每种颜色都是一个显示该颜色的按钮。点击后会打开一个小窗口，其中有色域、一行预设颜色、十六进制值输入框，以及一个把颜色恢复为 layerling 初始值的箭头。按 [[Enter]] 应用输入的十六进制值，点击窗口外也会应用。

草图视图有自己的颜色：{{ui:workspace.sketchBackground}} 用于纸张周围的窗口，{{ui:workspace.sketchPlateColor}} 用于网格下方的纸张，{{ui:workspace.sketchGridColor}} 用于网格，均针对浅色主题。{{ui:workspace.sketchMatch}} 一键采用工作区的三种颜色。

{{ui:workspace.classicLook}} 把工作区布置成 Tinkercad 的样子：白色地面、淡蓝色的毫米网格（每厘米一条较深的线）、黑色边线、来自上方的光以及柔和阴影。之后每个值仍可单独更改。这些初始值都是 layerling 一直以来的样子，哪种合适取决于你的显示器。

![外观下的设置：浅色主题的背景色和工作平面颜色，以及所有实体边线的开关。](shot:settings-appearance)

![深色配色方案下的编辑器。在右上角设置配色方案：跟随系统、浅色、深色或石墨。](shot:editor-dark)

### 外观：坐标轴箭头与边线

{{ui:workspace.showAxes}}（默认开启）在平台后左角画出三个箭头：**X** 为红色指向右，**Y** 为绿色指向后，**Z** 为蓝色指向上，与位置字段的计数方式一致。这就是 Tinkercad、CAD 程序和切片软件也采用的右手定则。工作平面位于面上时，它们会跟随该面。如果它们挡路，可以在这里关闭。

{{ui:workspace.edgeLines}} 为每个实体绘制轮廓，颜色由 {{ui:workspace.edgeColor}} 决定（初始为黑色，与 Tinkercad 相同）：当深色彼此混在一起时会很有帮助。默认关闭，非常大的导入网格会被略过。

![三个开启了边线的深色实体：轮廓把它们区分开来。](shot:edge-lines)

{{ui:workspace.strongHoles}} 把孔画成更深的灰色、更不透明，并在周围加一条深色线。当孔在透明实体中难以找到时很有帮助。与边线不同，它在快速模式下仍然开启。

下方的{{ui:workspace.holeOpacity}}设置孔绘制得有多实，范围为 10% 到 90%。数值越低，越容易看出孔与实体相接的位置。默认为自动：52%，开启{{ui:workspace.strongHoles}}时为 72%；双击滑块即可恢复。

### 外观：光照与阴影

{{ui:workspace.showShadows}} 打开或关闭投射阴影。两个滑块设定实体的受光方式。{{ui:workspace.shadowStrength}} 决定投射阴影的深浅，{{ui:workspace.shadeContrast}} 把光从均匀的环境光转向主光：偏向“强烈”时，背光面更暗、阴影更明显；偏向“柔和”时，整体更平。对比度拉到最高会非常强，背光面和阴影会变得很暗。{{ui:workspace.shadowSoftness}} 让阴影边缘变柔和而不是锐利。{{ui:workspace.lightAzimuth}} 让主光绕平台旋转（0° 从前方，90° 从右方），{{ui:workspace.lightElevation}} 把它抬高；90° 时它像 Tinkercad 那样位于平台正上方，阴影正好落在实体下方。{{ui:workspace.softLighting}} 让大部分光线来自你观察的方向，并随视图转动：没有哪个面会留在暗处，朝上的深色面也不再被照得发白。主光仍保留一点用于阴影，对比度滑块依然有效。如果光线放低后仍能看到明亮的反光，把 {{ui:workspace.lightElevation}} 抬到 90°：这时看起来就像 Tinkercad。{{ui:workspace.lightReset}} 恢复全部设置。

### 外观：工作平面上的测量

{{ui:workspace.showMoveDimensions}} 显示拖动时移动了多少，{{ui:workspace.showOriginDimensions}} 显示选中项到平台原点的距离，选中多个实体时也会显示。开启 {{ui:workspace.dimensionsAlwaysVisible}} 后，这些测量会一直可见，而不只在拖动时显示。选中转过的实体时，其角度会显示在工作平面上它的下方；{{ui:workspace.showRotationAngles}} 可关闭这一显示。更多内容见[测量与注释](chapter:measuring-and-notes)。

### 外观：选择与移动

{{ui:workspace.selectBeforeMoving}}：实体必须先被选中，下一次拖动才会移动它。当小孩或匆忙的手会碰到实体时，以及在触摸屏上，这很有用。

{{ui:workspace.frameByDirection}}：向右拖出的选框只选中完全位于其中的对象，向左拖出的选框则选中它碰到的所有对象（以虚线绘制），与 SketchUp 相同。

{{ui:workspace.doubleClickOpensSketch}} 决定双击拉伸出的草图是否会重新打开草图，与 Tinkercad 相同；{{ui:workspace.doubleClickOpensGroup}} 决定双击分组或捆绑是否会打开它进行编辑。{{ui:workspace.doubleClickCentersView}} 决定双击工作平面上的空白处是否会把视图移到该处。

{{ui:workspace.objectSnap}} 让形状的边和中心在拖动时吸附到其他形状；右下角的网格菜单有同样的开关。{{ui:workspace.cruise}} 让新形状挂在鼠标指针上，并落在其下方的面上，类似 Tinkercad 的 Cruise；关闭时，新形状出现在平台中央。更多内容见[选择与排列](chapter:select-and-arrange)。

{{ui:workspace.startView}} 设定新设计打开时的角度，也是 {{ui:camera.home}} 返回的角度。把视图转动、缩放到你喜欢的样子，然后点击 {{ui:workspace.startViewUseCurrent}}；{{ui:workspace.startViewStandard}} 恢复通常的右前方视图。它对此浏览器中的所有设计都有效。再次打开的设计仍按你离开时的样子打开。

### 外观：视图

{{ui:workspace.startInPerspective}}：编辑器随即以透视视图打开，而不是平面视图。

{{ui:workspace.startWithScrollbars}}：设计打开时即显示视图的滚动条。此设置随设计一起保存，也会随 {{ui:workspace.makeDefault}} 保存。

{{ui:workspace.viewBarOpensOnHover}}：折叠的视图栏在鼠标停在其箭头上时展开，鼠标离开后不久再次折叠，除非正在使用它的某个工具。以这种方式展开时点击箭头，可使其保持展开。仅适用于鼠标；在触摸屏上，仍像以前一样轻点即可打开视图栏。

{{ui:workspace.zoomSpeed}} 是一个从慢到快的滑块：滚轮和触控板缩放的速度；缩放按钮和按键仍保持自己的小步距。{{ui:workspace.panSpeed}} 同样是一个从慢到快的滑块：平移时视图跟随鼠标的速度；居中时你抓住的点会一直停在光标下。{{ui:workspace.cameraInertia}}：松开鼠标后，视图会继续转动或平移一小会儿并平缓减速。关闭后它会立刻停住，与 Tinkercad 和 Fusion 360 相同。

{{ui:workspace.overhangAngle}} 是在可见性菜单中打开“显示悬垂”时，一个面被视为悬垂的起始角度：这些面会以红白斜线标示。30° 偏保守，70° 依赖良好的打印冷却；45° 是常用的起点。显示时，视图下方的一行会写出最陡的悬垂，以及有多少 cm² 需要支撑。

{{ui:workspace.booleanTriangleLimit}} 限制导入网格在切割、合并或相交时允许的三角形数量，因为这些计算在你的浏览器中完成。超过上限的网格不会被处理；请先简化网格，或者如果电脑承受得住，就提高上限。上限过高可能让编辑器卡住几秒。

### 测量：单位、比例与吸附步距

在 {{ui:workspace.measurement}} 下，你可以设置 {{ui:workspace.units}}，即测量显示所用的单位（{{ui:workspace.scale}}：公制为毫米、厘米或米，英制为英寸或英尺）、数字显示的小数位数（{{ui:workspace.accuracy}}）、移动和调整尺寸时吸附的 {{ui:workspace.snapGrid}}，以及 {{ui:workspace.customSnapGrids}} 下自己的吸附步距。

在设置的 {{ui:workspace.measurement}} 下设置 {{ui:workspace.units}}。使用 {{ui:units.imperial}} 时，layerling 会把所有测量显示为英寸——形状上、属性面板中、卷尺和标尺上都是如此。吸附网格随后提供从 1/64 到 1 英寸的步距，平台的网格也按英寸绘制（1/8 到 1 英寸，默认 1/4 英寸），每个整英寸处有一条更粗的线。在 {{ui:workspace.inchFormat}} 下，你可以选择英寸显示为像 Tinkercad 那样的分数（1 5/8，四舍五入到 1/64 英寸），还是显示为小数（1.625），小数位数由 {{ui:workspace.accuracy}} 设定。两种写法都能输入，包括“1 5/8”。在毫米和英寸之间快速切换的方法是属性窗口底部 {{ui:inspector.snapGrid}} 旁的小开关 **mm | in**：它会像设置一样改变单位、平台的网格和吸附步距，且只作用于当前设计。

在同一处的 {{ui:workspace.customSnapGrids}} 下，可以添加自己的吸附步距：一个名称和一个以毫米为单位的大小，例如用“Pin pitch 2.54 mm”表示 DIP 芯片、排针和洞洞板孔的间距，或用 19.05 mm 的“MX Key Unit”表示键盘按键的间距。吸附步距菜单随后会提供该尺寸的整份、一半和四分之一（1 ×、½ × 和 ¼ ×），因此形状可以按一个间距、半个间距或四分之一个间距移动。如果你只想要该尺寸本身，取消勾选旁边的 {{ui:workspace.customSnapGridParts}}；菜单就只剩这一个步距。自定义步距随设计保存，也会随 {{ui:workspace.makeDefault}} 一起保存。

{{ui:workspace.startWithCornerRuler}}：此浏览器中的每个新设计都会在原点自带一把直角尺，见 [测量与备注](chapter:measuring-and-notes)。已有的设计保持不变；你从某个设计中移除的直角尺也不会再出现。

### 工作平面：平台与打印机

{{ui:workspace.printer}} 把工作平面调整为打印机的打印床大小，并标出超出边界的实体，见[打印](chapter:printing)。{{ui:workspace.showPlateLabels}} 在平台上写设计的名称，选择打印机后还会写上打印机名称和成型体积。

{{ui:workspace.printerPlay}}是在你的打印机上，打印出的销钉要能在打印出的孔中转动所需的每侧余量。{{ui:workspace.fitTestMake}}会把用来测量它的配合测试件放到平台上；之后新的盖子、燕尾、卡扣、螺母和间隙检查都以它为起点，见[打印](chapter:printing)。它保存在这个浏览器中，而不是设计里。

{{ui:workspace.size}} 给平台设定自定义尺寸，用 {{ui:workspace.width}} 和 {{ui:workspace.length}}，单位为毫米或你选择的单位。网格始终穿过原点，所以无论平台多大，较粗的线都位于坐标轴上。

### 工作平面：网格

{{ui:workspace.showGrid}} 显示或隐藏平台上的网格。{{ui:workspace.gridBlockSize}} 设定网格线的间距，{{ui:workspace.gridMajorEvery}} 设定较深的线每隔 5 个还是 10 个网格步距出现；{{ui:workspace.gridMajorColor}} 给这条线单独的颜色，中心十字和平台边框也会采用；{{ui:workspace.gridColor}} 是普通网格线的颜色。

放大时网格的每条线都会变宽，与 Tinkercad 相同，缩小时也保持可见。如果觉得太粗，关闭 {{ui:workspace.gridLinesGrow}}，线条在任何缩放下都保持一个像素宽，与草图中一样。

如果网格消失了，比如因为颜色被设成了与平台相同，{{ui:workspace.workplane}} 区域末尾的 {{ui:workspace.resetGrid}} 会把它的可见性、颜色、间距和线宽恢复为标准值，这里的设置以及用 {{ui:workspace.makeDefault}} 保存的默认值都会恢复。

### 形状默认值

在 {{ui:workspace.shapeDefaults}} 下，用 {{ui:workspace.shape}} 选择一种形状，并设定添加它时的初始状态：宽度、长度和高度。{{ui:workspace.useAppDefaults}} 把该形状恢复为程序的初始值。有各自设置的形状会在 {{ui:workspace.shapeDetails}} 下显示这些设置。这些值只作用于新形状，不作用于已经在平台上的形状。{{ui:workspace.customLimit}} 为控制柄和属性可以把该形状做到多大设定你自己的上限；留空则保留通常的限制。

### 保存的历史记录

在 {{ui:workspace.history}} 下，滑块 {{ui:workspace.savedHistory}} 设定保存或重新打开设计后，有多少已完成的操作仍可用于撤销。每个设计默认保留 100 个操作。降低上限会永久丢弃该设计较早的撤销步骤。

## layerling 卡顿的时候

layerling 在你的浏览器中计算并绘制一切。因此在较旧的电脑上、显卡较弱时，或在多块大屏幕上，视图可能会显得迟缓。以下方法有帮助：

- **{{ui:workspace.fastMode}}**：{{ui:workspace.appearance}} 下的快速模式会立即关闭所有让视图开销很大的效果：阴影、所有实体的边线和相机的惯性。它还只按屏幕自身分辨率绘制视图，在高分辨率屏幕上像素最多减少到四分之一。你自己的设置会保留，一关闭快速模式就重新生效。
- **相机会继续转：** 转动后松开鼠标时，视图会继续转一小会儿并平缓减速。这是有意为之，不是卡顿。如果你习惯了 Tinkercad 或 Fusion 360，可在 {{ui:workspace.appearance}} 下关闭 {{ui:workspace.cameraInertia}}，视图会立刻停住。
- **单独关闭各项：** 不用快速模式，也可以只关闭 {{ui:workspace.showShadows}} 或 {{ui:workspace.edgeLines}}。
- **使用显卡：** 在 Chrome 中打开 `chrome://gpu`（Edge 中为 `edge://gpu`）。在“WebGL”旁边应显示“Hardware accelerated”。如果显示“Software only”，说明浏览器设置中的硬件加速已关闭。在 Windows 上，还可以在“设置”→“系统”→“显示”→“图形”中为浏览器选择“高性能”，让它使用真正的显卡，而不是处理器中较弱的显卡。
- **简化大型导入网格：** 包含几十万个三角形的模型会拖慢任何视图。精简方法见文件一章中的“简化导入的网格”。
- **关闭其他标签页：** 每个打开的 layerling 标签页和其他 3D 页面都共用同一块显卡。
