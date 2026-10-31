<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="layerling 标志">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">面向 3D 打印的简易 3D CAD</h3>
        <p align="right">
          放一个形状、挖一个孔、倒个圆角，打印出来。在浏览器里完成，无需账号，也不需要 CAD 基础。
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="GNU AGPLv3 许可证" src="https://img.shields.io/badge/license-AGPLv3-663399"></a>
    <img alt="无需账号" src="https://img.shields.io/badge/no%20account-nothing%20to%20sign%20up%20for-dd7906">
    <img alt="专为 3D 打印打造" src="https://img.shields.io/badge/made%20for-3D%20printing-ff9e2c">
    <a href="#layerling-mcp-skill"><img alt="可由 AI 驱动" src="https://img.shields.io/badge/AI--drivable-MCP%20server-16c0d4"></a>
  </p>

  <p><strong>简体中文</strong> · <a href="README.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.ar.md">العربية</a> · <a href="README.zh-tw.md">繁體中文</a></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="浏览器中的 layerling">
</p>

<p align="center"><em>浏览器中的 layerling</em></p>

<p align="center"><a href="https://layerling.com/zh-cn/index.html"><strong>用户指南</strong></a>，一步步说明并配有图片</p>

## 适合谁用

你有一台 3D 打印机。你想要的是一个能装上去的零件，而不是一份 CAD 职业。

layerling 按你原本的思路工作：把一个形状放到平台上，拖动到合适尺寸，把第二个形状变成孔，将两者分组，导出，打印。上手前没有要学的东西，也**没有要注册的账号**——打开页面就能开始建模。你的设计留在自己的浏览器里：没有账号、没有云端，任何内容都不会上传。

### 从 Tinkercad 过来？

layerling 站在 Tinkercad 之上、朝 Fusion 360 更近一步：操作方式相同，所以你会认出所有东西——平台、形状、实体与孔、分组与取消分组、捆绑、按住 Alt 拖动复制——但它不会停在 Tinkercad 止步的地方。你一直缺少的功能就在这里：

- **倒角与圆角。** 选中一条边，把它切平或倒圆——一旦打印件需要手感精致或要嵌入某个东西，这是人们最常要求的功能。处理过的边仍然可以修改：随时移除处理，或按“编辑”在同一批边上改数值。
- **抽壳、分割、草图、螺纹。** 把实体抽成均匀壁厚，用平面把它分开，绘制带精确长度和角度的草图并拉伸或旋转，还能添加螺钉、螺母和螺纹孔。
- **阵列与包裹。** 让形状按一排、圆周或螺旋重复，或者把图案或文字包裹到圆柱上。
- **孔阵列。** 点击一个平面，把圆形、方形、矩形、六边形或长圆孔铺满它，可排成网格或交错排列，并设置间距、边距和深度——通风口、扬声器网罩和篮筐一步到位。
- **按百分比缩放。** 把一个或多个零件按百分比放大或缩小——可整体缩放，让布局随之变大，也可各自原地缩放。
- **匹配尺寸。** 在对齐点上按住 Alt，零件会拉伸而不是移动：拉到另一个零件的侧面，或拉到它的宽度、长度或高度——例如把盒子换成同样大小的圆柱。
- **测量与查看内部。** 卷尺、标尺、能把模型切开的剖视图，以及可回看早期状态的历史记录滑块。
- **底层是真正的几何体。** layerling 保存精确的 CAD 形状，而不只是一堆网格，所以圆角始终是真正的圆角——一直保留到供完整 CAD 程序使用的 STEP 文件中。

它不是完整的 CAD 套件：没有参数化时间线，也没有装配体。不过你可以**自己运行它**：把它安装成应用（之后没有网络也能启动），或者在 Windows、NAS 或家用服务器上托管自己的副本——见[快速上手](#快速上手)。

> **AI 可以和你一起建模。** layerling 自带 MCP 服务器。Gemini、Claude 或 Codex 之类的 AI 客户端能看到打开的
> 编辑器标签页并在其中操作：添加形状、修改尺寸、分组、切割、倒圆角、读回场景、截取视口图片。你描述零件，
> AI 来搭建，你看着它完成，随时可以介入。这一切在本地运行，什么都不会离开浏览器——设置方法见
> [layerling MCP Skill](#layerling-mcp-skill)。

## 它能做什么

### 搭建

- **真正的打印平台**——网格、吸附、用于移动、缩放和旋转的控制柄，以及需要时显示精确数字的面板。
- **直接输入位置**——位置卡片能把实体放到精确的 X、Y、Z 坐标上，零件也可以停在平台旁边，就像 Tinkercad 那样。
- **坐标轴箭头**——平台左前方的红、绿、蓝箭头按数值的计数方向显示 X、Y、Z，与 Bambu Studio 和 OrcaSlicer 一致；可在设置中关闭。
- **会跟随的轴心**——为一个实体设置轴心后，它会一直跟着该实体：随实体移动、旋转和缩放，会被保存，可用 X、Y、Z 数值输入，也可用鼠标拖动，并吸附到角和边中点——适合铰链和关节。
- **按喜好调整光与影**——明暗对比、阴影强度和柔化程度，以及光线的方向和高度（最高可像 Tinkercad 那样正上方照射），都在设置里。“Tinkercad 外观”按钮能一次把颜色、网格和光线设成那边的样子，较深的网格线还可以每厘米一条、使用单独的颜色。
- **快速模式**——为较慢的电脑准备：设置里的一个开关会关闭阴影、边线和相机惯性，并以屏幕分辨率绘制视图；相机惯性也可以单独关闭，这样你一松手视图就会停下。
- **对齐面并查看角度**——“对齐面”工具能让一个零件的面贴上另一个零件的面，可接触或齐平，也可留出间隙；旋转过的实体会在选中项下方显示绕 X、Y、Z 的角度，其设置里的旋转卡片可以直接输入这些数值。
- **吸附到其他形状**——移动时，形状会把自身的边或中心锁定到周围形状的边和中心上，并显示参考线，因此不用输入数字就能让零件齐平。拖动时按 Alt 可暂停吸附；Shift 让移动保持在一个轴上；一开始就按住 Alt 则会拖出一个副本，与 Tinkercad 相同。
- **放到面上**——类似 Tinkercad 的 Cruise（巡航）功能：新形状会平放在指针下方的面上，斜面也可以；按 C 可拿起选中的对象，并以同样方式放到另一个面上。
- **参考点**——右键点击实体，用点标记它的中心、角或边中点；这些点不会被打印，拖动的形状会吸附到它们上面。可以拖动点或输入其坐标，标记会随设计一起保存。卷尺还能标记测量结果的中点——比如圆孔的中心。
- **交互式帮助**——按 Shift+F1 或点击“帮助”组里的问号，然后点击任意按钮、输入框或窗口：一个小窗口会显示用户指南中对应的部分，并可按需打开。
- **命令搜索**——按 Ctrl+K，输入工具、形状或命令（“fillet”“mirror”“cylinder”），就能直接跳转过去；它认识英文和德文词，并在每个条目旁显示快捷键。
- **历史记录视图**——用滑块回看项目的任意早期状态，不会改动任何东西；可以导出该状态，或从它开始一个新项目。由 @rmpel 提供。
- **毫米或英寸**——使用英制单位时，所有测量值都以英寸显示，可像 Tinkercad 那样用分数（1 5/8），也可用小数；吸附网格步距从 1/64 到 1 英寸，平台网格也以英寸绘制。
- **你打印机的平台**——从 220 多种常见打印机中选一台，平台就会采用它的尺寸。打印机名称和成型体积显示在工作平面角落（设置里的开关可隐藏这些信息以及设计名称），实体超出边缘时会出现警告。
- **悬垂与耗材**——“显示悬垂”会用剖面线标出所有比 45°（或你打印机的角度）更陡、需要支撑的面，导出窗口会在切片前显示体积、重量和耗材米数。
- **形状库**——长方体、圆柱体、胶囊体（需要时一端可以更小，比如做皮带罩）、球体、圆锥、棱锥、楔形、文字、屋顶、半球、圆环、管、从一个轮廓放样到另一个轮廓（比如方形到圆形，实心或带壁，直的或平滑外扩的，扭转的或顶部倾斜的）、三到二十四边的多边形棱柱、螺旋弹簧和扁平弹簧（圆波、锯齿或方形，两端带吊环或凸片）、可打印即装配的铰链、Gridfinity 收纳盒和底板、滚花把手（直纹、交叉纹或圆纹）等等。
- **花瓶、花盆与灯罩** – 专门的花瓶形状：瓶身形状、截面（也可手绘）并可过渡到第二种截面、旋转、图案、排水孔、底脚、托盘和盖子，可做实心（用于切片软件的花瓶模式）或空心。由 @marcus040473 贡献。
- **能配合的螺纹**——螺杆、带内六角、沉头或六角头的螺钉、六角螺母和螺纹孔。从 M2 到 M12、从 #4 到一英寸的 UNC/UNF，以及 G1/16 到 G4 的惠氏管螺纹（ISO 228-1），选一下就有；也可以自己设直径和螺距，还支持左旋；英制或 G 规格会用每英寸牙数代替毫米。端部可以倒角，而螺纹孔是一个切割体：把它放进零件里分组，出来的孔就带螺纹。
- **能啮合的齿轮**——直齿、斜齿、人字齿和锥齿轮，以及内齿轮和齿条，采用渐开线齿形，像齿轮生成器一样按模数和齿数设置，并可设置压力角和打印用侧隙——也可以使用圆齿，在小尺寸打印齿轮上更宽容，在旋钮上握感顺滑。选中两个齿轮，面板会给出它们啮合的中心距。
- **Hirth 端齿联轴** – 一个带有从中心向外延伸的 V 形齿的圆盘：翻转的副本可以按任意整数个齿的角度与之啮合并自动定心，适用于可调铰链、三脚架云台和分度旋钮。可设置齿数、齿高和内孔；它是精确实体，可用于边缘工具和 STEP。
- **实体与孔**——把形状变成切割体，再分组形成最终几何体。编辑分组（**E**）会把分组的零件摊开放置以便修改，完成后用“完成”重新构建——分组里套分组也可以，无论设计嵌套多深。
- **多色分组**——分组可以让每个零件显示自己的颜色，即使已经挖过孔也一样；导出 3MF 或 OBJ 会保留这些颜色，切片软件就能把各零件对应到耗材。
- **捆绑**——Ctrl+B 像 Tinkercad 的捆绑一样把零件连在一起：它们作为一个整体移动、旋转和缩放，但保留各自颜色，导出时仍是独立实体——很适合多色打印。
- **相交**——只保留两个或更多选中实体的公共部分，或实体与孔重叠的部分。
- **凸包** – 用所选形状的凸包把它们包起来，即包住全部形状且没有凹陷的最小实体：圆柱上的半球变成圆顶，四根柱子变成圆角盒子。所选内容中的孔随后会被切除。
- **饼干模具** – 在一个小窗口中，沿草图或 SVG 的轮廓（或某个形状所立的底面）生成一圈壁和平边；e 或 a 的内部有自己的壁，由边缘处的桥或覆盖整个轮廓的板固定，并带小圆角，让细小部分不易折断；降低高度后，它只把文字压进面团而不是切下来。轮廓会镜像，让文字和标志从面团中出来时方向正确，壁的顶端收成薄刃。壁厚、刃口、高度和边缘都是草图的填充模式，之后可以分别修改。
- **柔性关节** – 把你自己画的平面实体（鱼、蛇或龙）切成一节节，并在每个切口处原位打印一个关节：一个直立的关节头带 45° 锥面，卡在下一节的凹座中，打印出来就能活动，无需支撑或组装。关节数量、间隙、摆动角度和关节大小均可设置。
- **放样草图** – 两个草图或导入的 SVG 生成一个精确实体：下面那个的轮廓在底部，上面那个的轮廓在顶部，中间是直壁：漏斗、方转圆过渡，或由两个圆环得到锥形框。“编辑组”可以重新打开这两个草图。
- **分割**——用平面把实体或孔切成两半；抽壳实体仍保留其内腔。转动平面可做斜切，拖动它的箭头，或用“拾取面”把它贴到任意面上。

### 精修

- **倒角与圆角**——切平或倒圆实体的任意一条边，之后还可以移除或修改该处理。
- **草图**——用直线、曲线和现成形状绘制轮廓，绘制时按长度和角度设定直线（“50<30”，Shift 以 15° 步距吸附），输入长度、角度和尺寸（像“60+12.5”这样的算式在每个数字输入框中都可用），给角倒圆或倒角，吸附到其他实体的轮廓，绘制可吸附的构造线，然后拉伸或旋转成精确实体。带螺距的旋转会把轮廓卷成一条连续的螺旋线，而不是一圈圈圆环，就像线轴上的耗材。草图也可以做成描边：闭合轮廓变成边框，位于线内侧、外侧或以线为中心；开放线条变成条纹，端部可选平头、方头或圆头。放在草图下的图纸或照片可一键描摹为草图线条，可选暗部或亮部，阈值可调。
- **抽壳**——把实体变成统一壁厚的壁，你选择的面可以开口（顶、底、前、后、左、右，可任意组合），也可以全部封闭——适合盒子、杯子和外壳。
- **斜坡与渐窄** – 让盒子、圆柱、多边形、管、楔形或圆顶的顶面向一端倾斜，或让除管以外的形状侧面向一端收窄，直线或曲线，用数值或拖动端点：沿长度倾斜的屋顶、坡道、斜切的管端、船头。斜坡对倒角、圆角和 STEP 保持精确，收窄的盒子、楔形和圆顶也一样。由 @plazmabokor 贡献。
- **盖子** – 为顶部开口的盒子、罐子或托盘按其轮廓生成盖子，圆形或方形均可：插入开口、罩在外面或平放其上，配合可选紧、正常或松（每边 0.1、0.2 或 0.3 mm）或自定义间隙，还可设置盖厚以及止口的深度和壁厚。盖子出现在实体旁边，板面朝下，无需支撑即可打印。
- **偏移与挖出** – 让精确实体沿所有面增大或缩小 0.01 到 10 mm，或只在侧向偏移以保持高度，用于压配或卡扣的间隙；或一步把一个零件从另一个零件中挖出并四周留隙，零件本身保持原位。
- **表面纹理** – 在任何实体上加浮雕，用于防滑或美观：凹槽、滚花、蜂窝、凸点、Voronoi 单元、砖块、针织、绳纹、篮编、碳纤维、树皮、木纹、裂纹、作为高度图的图片或文字，可绕圆形实体一周或沿某一轴平铺。
- **删除面**——点击圆角、孔或凸台的面并删除：周围的面会延伸过来补上缺口，实体仍保持精确，可以继续倒圆角并用于 STEP 导出。
- **自定义形状**——把反复用到的实体保存在形状库顶部，点击或拖动即可插入任何设计；可以存在浏览器里，也可以放在服务器的共享存储中供所有设备使用。“全部备份”会把它们一起带上。
- **孔阵列**——在实体的平面上打一排排孔：选择面，挑选圆形、方形、矩形、六边形或长圆孔，设置尺寸、间距、网格或交错排列、到边缘的边距和深度（贯穿整个零件或指定深度），创建前可预览孔的样子。它们仍是与实体分组的普通孔，取消分组后又能自由处理。
- **面**——把实体的平面向外推出，或在其中挖一个凹槽：选择面，选择“向外”或“向内”，设置距边缘的内缩、圆角半径和深度，并预览结果。它对导入的 STL 也有效，新增的部分仍是与实体分组的普通草图实体。
- **包裹到圆柱**——把 SVG 图案、标志或文字贴到杯子或管子的壁上，可凸起或雕刻，并让它居中于圆柱。

### 文件

- **自己的字体**——文字可以使用任何 TrueType、OpenType 或 WOFF 字体；在 Chrome 和 Edge 中还能使用电脑上安装的字体。设计只保留所用字母的轮廓，所以在哪里都能打开。阿拉伯文和希伯来文从右向左排列，阿拉伯文字母会连写。
- **带上自己的模型**——导入 STL、OBJ、3MF、STEP、SVG 或 DXF，并在其基础上建模。激光切割服务商或供应商发来的 DXF 零件轮廓会导入为一个实体，其中的孔各自成为独立的孔，圆弧和圆保持为真正的圆弧和圆。SVG 会作为草图实体导入：可选区域、线条外侧或内侧的描边、去掉孔的剪影，或四周加宽的图形——一个文件就能做出饼干模具，或多色标志的分层。文字形状也有相同的填充模式，形状库还提供名牌：用彩色分层制作适合多色打印的文字，可选钥匙圈孔，字母边缘可倒圆或倒角；以及图标牌：用同样的彩色分层制作 SVG 图标，可设置数量，还能“放满一板”。彩色 OBJ——来自 layerling，或以带 `.mtl` 的 ZIP 形式来自 Tinkercad——以及彩色 3MF（包括切片软件项目），都会按每种颜色导入为一个实体；包含多个对象的 3MF 则按每个对象导入为一个实体。
- **导出切片软件需要的格式**——STL、带名称和颜色的 3MF，或带颜色的 OBJ，可导出选中项或整个场景（隐藏部分不会包含），另有 STEP，方便设计继续进入完整 CAD 程序；俯视图还可导出为 SVG，或导出为带真正圆弧和圆的 DXF，供激光切割使用。PNG 可保存一张干净的视图图片，分辨率是两倍，还可以选择透明背景。
- **图纸导出**——选择一个零件，或清除选择以导出整个可见设计，然后选择 **导出 → 图纸 → PDF 或 SVG**。它会生成第一角投影布局的主视图、俯视图和右视图，放在带边框的工程图纸上，带分区编号和右下角标题栏，并标注总体尺寸、隐藏边，以及轴向对齐圆孔的直径/位置表格。视图按毫米 1:1 输出；图纸采用能容纳内容的最小 ISO 横向尺寸（也可以自定义更大尺寸）。打印时选择 **100% / 实际大小**。位置从每个视图左下角的总轮廓角点量起。孔表使用名义网格几何，不会自动标注斜孔/非圆孔、螺纹、深度或公差。投影引擎改编自 [Cadverix-3D](https://github.com/WC3D/Cadverix-3D) 的制图工作。
- **更新提示**——在已发布的程序上，打开着的页面会自行发现新版本，并提示保存后重新加载，同时列出更新内容。
- **一次删除多个设计** – 起始页上的 **选择** 通过单击卡片（或全选）选中设计，一次确认即可删除全部所选；在服务器文件夹中同样可用。
- **为设计建立文件夹**——把起始页上的设计拖进文件夹（文件夹还能放进文件夹），或使用“移动到……”，从而整理它们；搜索会查遍所有文件夹，“全部备份”会把它们一并保存。
- **把项目存成文件**——把整个项目（包括历史记录、草图和分组）保存为 `.lyl` 文件，带到别处继续。在 Chrome 和 Edge 中，你可以自己选择文件夹，Ctrl+S 会再次保存到同一个文件；其他浏览器则会下载它。旧版本留下的 `.skf` 文件仍可打开；保存时会在旁边写入一个 `.lyl`。
- **错误报告**——页脚里的一个链接会保存一个 ZIP，其中包含作为 `.lyl` 的设计，以及记录版本、浏览器和最近消息的文本文件，可直接附到论坛或 GitHub 上，因为它们不接受单独的 `.lyl`。
- **一眼认出的设计**——所有内容都在你自己的浏览器里，每个设计都有缩略图。
- **附件** – 把笔记、打印成品的照片或数据表放进设计里：`.md` 和 `.txt` 文件、`.png`、`.jpg` 和 `.webp` 图片以及 PDF 文件会随 `.lyl` 文件一起保存。眼睛图标在窗口中打开文字或图片；PDF 则会下载。不接受 SVG，因为它可能包含脚本。

### 查看

- **透视或正交**——用缩放控件旁的立方体按钮，或按 **O**，在普通视图和平坦的正交视图之间切换。你的观察方向和取景范围会保持不变。
- **在立方体上转动视图**——拖动视图立方体能像按住鼠标右键一样转动视图，在平板上用一根手指即可；单击仍会跳到对应的那一侧，点击角或边则从那个方向观察。按键 **1**–**6** 也能跳转，**Shift+1**–**6** 还会缩放到选中项。
- **每个设计四个保存的视图**——**Shift+7**、**8**、**9** 或 **0** 会按当前样子保存视图（角度、平移、缩放），单独按对应键即可恢复。每个设计各有自己的视图，保存的 `.lyl` 文件也会带上它们。
- **视图立方体可放在任意角落**——设置 > 外观 > **视图立方体位置** 可把立方体放到左上、右上、左下或右下；只要不是左上角，相机控件就会上移填补它的位置。
- **使用你的语言** – 程序和用户手册提供英语、德语以及另外 17 种语言；语言列表在右上角最顶端。
- **从下方观察**——相机栏中网格上方的眼睛图标会隐藏平台，这样就能看到设计的底面，而不会被平台挡住。
- **独立窗口中的第二视图** – 相机栏中的按钮打开第二个窗口，用自己的相机、视图立方体和相机栏显示同一个设计，并跟随每一次更改。它会在你上次放置的位置打开。
- **把面板放到想要的位置**——对象列表、设置、剖视图、卷尺，以及边、抽壳和阵列的工具面板都可以拖动标题栏移动，并在那里再次打开；双击即可停靠。
- **右键菜单**——在实体上短按右键会弹出最常用的命令：复制、孔或实体、分组、对单个实体倒角、倒圆角和抽壳、镜像和按百分比缩放、隐藏、锁定、放到工作平面、删除。按住右键拖动仍然会转动视图。
- **剖视图**——沿 X、Y 或 Z 方向的平面把视图剖开，查看壁、内腔和互相配合的零件，并配有粗调和细调滑块。只有视图被剖开：设计和所有导出内容都保持完整。“剖切为 SVG”会把剖切结果按 1:1 保存下来，可用于激光切割或做模板；“测量”能直接在剖切面上读取壁厚和间隙，并自动与壁面对正。
- **在任意面上设置工作平面**——按 W 并点击一个面，就能在该面上建模；点在角附近会正好落在角上，点在边附近会落在边上且网格沿边延伸，点空白平台则落在点击处。眼睛图标可以隐藏平面以便看清视图，同时它仍然生效。AI 也能把工作平面设到某个面上。
- **与切片软件一致的鼠标按键，以及 3D 鼠标** – 在设置中，鼠标按键可以像 Bambu Studio 和 OrcaSlicer 那样工作：在空白处左键拖动旋转视图，右键平移，Shift 加左键拖动画出选择框。SpaceMouse 或其他 3D 鼠标在 Chrome 和 Edge 中连接后即可旋转、平移和缩放视图。
- **在平板上**——一根手指就能操作设计，效果与鼠标左键完全相同：点按选择，拖动移动，在空白处拖动会拉出选择框。**两根手指归视图使用**：张开或捏合可缩放，一起移动可平移工作平面。放下第二根手指会取消第一根手指已经开始的操作，所以捏合永远不会碰动零件。转动视图没有专属手势；相机栏上有一个开关，仅在触摸屏上显示，开启后一根手指就改为环绕视图而不是选择。数字输入框在你点按时会交出完整数值，方便直接覆盖——数字小键盘没有方向键可以移动光标。手指在绘制草图点、直线、控制柄、测量点和边时比鼠标伸得更远，不过**在平板上触控笔是更好的工具**：更精细，也不会挡住你要瞄准的位置。

### 视频

由他人制作，不是本项目出品：

<!-- videos:start -->
- [Layerling Tutorials](https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk) – HL ModTech（英语）。一位 Tinkercad 用户的播放列表，目前包含约 23 分钟的 layerling 概览（在浏览器中免费使用、对 Tinkercad 加以扩展的 CAD）、对其功能的深入介绍，以及关于打印螺纹的简短更新。
- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers（英语）。一个关于 layerling 的系列，目前包含“Tinkercad alternative / upgrade? Introducing Layerling!”——面向从 Tinkercad 转来的用户的概览，以及讲解草图工具的“Layerling Sketch Tools!”。
- [Layerling](https://www.youtube.com/playlist?list=PLYqVFeqYBrPE) – TECHNOBENTO（英语）。一个关于 layerling 的播放列表，目前包含“A new way to sketch in Layerling”。
- [Layerling CAD Videos](https://www.youtube.com/playlist?list=PLc09BHr_6nn8) – Printology（英语）。一个关于 layerling 的播放列表，目前包含“I'm 100% In on Layerling - The Next Big Free CAD”和“Layerling Features That Blow Tinkercad Out Of The Water”。
- [I Tried Layerling After Tinkercad… Is It REALLY Better?](https://youtu.be/5DpOxdoNwqs) – Maker Mates Studio 3D Printing（英语）。一位 Tinkercad 用户试用 layerling，并对两者进行比较。
- [Print by Layer](https://www.youtube.com/playlist?list=PLejZBz4L7CGQ) – Print N Repeat（英语）。一个关于 layerling 的播放列表，目前包含“The EASIEST Way to Design Hinges in Layerling”和“The EASIEST Way to 3D Model Threads!”。
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design（英语）。在完全没有手册的情况下首次试用 layerling：圆角与倒角、抽壳、螺纹、草图、旋转实体、阵列、导入和打印机配置。
- [Layerling en español: el CAD gratis que reemplaza a Tinkercad (2026)](https://youtu.be/iroftGBX-0Y) – Random Maker（西班牙语）。一位多年使用 Tinkercad 的用户的初次体验：界面感受如何、有哪些不同、layerling 能做哪些在 Tinkercad 中很难或做不到的事，以及适合哪些人。
- [Proyectos en Layerling](https://www.youtube.com/playlist?list=PLTEdmvVC2bxs) – Fulcro 1900（西班牙语）。一个 layerling 项目播放列表，目前包括把 layerling 介绍为比 Tinkercad 更完整的免费工具、桌面配件（三个模型）、手机壳，以及螺杆、螺母和螺钉。
- [Layerling](https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ) – Werkplaats Marc（荷兰语）。一个关于 layerling 的播放列表，目前包含面向 Tinkercad 用户的初探（“Layerling - De Gratis Tussenstap van Tinkercad naar Fusion 360”）和草图教程：描摹照片、旋转和沿路径扫掠（“Schetsen Uitgelegd”）。
<!-- videos:end -->

## 快速上手

最省事的方式是使用托管版本。无需安装，无需注册——打开就能建模：

**https://layerling.com/**

本节其余内容讲的是运行你自己的副本：在自己的电脑上，或在工作室里一台大家用浏览器访问的机器上。无论应用从哪里提供，设计都不会离开创建它的浏览器，导出文件会直接下载到使用者自己的电脑。

### Windows 快速上手

从没用过终端？在一台还没安装任何东西的 Windows 11（或当前版本的 Windows 10）电脑上，打开
**PowerShell**（在开始菜单里搜索即可，不需要管理员权限），粘贴下面这一行：

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

如果缺少 Git 和 Node.js，它会安装；然后把 layerling 下载到 `%USERPROFILE%\layerling`，并在浏览器中打开
`http://127.0.0.1:3000/`。使用 layerling 时请让 PowerShell 窗口保持打开；在该窗口按 `Ctrl+C` 即可停止。

想**更新** layerling 时，再运行同一行命令——它会发现已有文件夹，改为拉取最新版本，而不是重新下载一遍。脚本本身位于
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1)，运行前你可以先读清楚它到底做什么，也可以把它下载下来
在本地运行，而不是通过管道交给 PowerShell。

#### 之后再次打开

上面的一行命令还会在桌面留下一个名为 **“Start layerling”** 的快捷方式。以后想再次打开 layerling，双击它即可——
不用 PowerShell、不用重新安装、不用重新下载，服务器会启动，浏览器会自动打开。它还会**先更新 layerling**
（当文件夹里没有你自己的改动时），并且只在服务器真正就绪后才打开浏览器。如果 layerling 已经在运行，它不会启动
第二个服务器，也不会在运行中的副本背后更新——只是打开页面。想把 layerling 放在别处，比如另一个硬盘？把想要的文件夹
传给脚本：

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

如果你的快捷方式是由旧版脚本创建的，再运行一次一行命令；它会用新的快捷方式替换旧的。

更想手动操作？打开 PowerShell 并运行：

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

然后自己打开 `http://127.0.0.1:3000/`。无论哪种方式，在该窗口按 `Ctrl+C` 都能停止。

### Docker

想在电脑、NAS（Synology、Unraid 等）或家用服务器上运行 layerling 又不想安装 Node.js，可以使用 Docker Hub 上现成的镜像
**`henmedia/layerling`**（**`ghcr.io/henmedia/layerling`** 也是同一个镜像）。每个版本都会以版本号和 `latest` 发布
amd64 与 arm64（树莓派、ARM NAS）镜像。应用监听 **3000** 端口。

最快的方式是一条命令：

```bash
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`-v` 选项会把起始页的预览图片保存在名为 `layerling-thumbnails` 的 Docker 卷里，让它们在更新后仍然存在；不加这个选项，
图片就在容器内部，每次重新创建容器都会丢失（设计本身保存在浏览器里，不受影响）。在有容器管理器的 NAS 上
（Synology Container Manager、Unraid、Portainer），在其注册表（Docker Hub）中搜索 `henmedia/layerling`，
或输入 `henmedia/layerling:latest`，映射 3000 端口，并为 `/app/.codex/project-thumbnails` 添加一个卷。要更新，
重新拉取镜像并重新创建容器（或让 Watchtower 代劳）。

镜像标签是纯版本号，**不带 “v”**：`ghcr.io/henmedia/layerling:1.42.0`，而 GitHub 发布版本叫 `v1.42.0`。
拉取只会获取新镜像；已经存在的容器仍会运行旧镜像，直到它被删除并重新创建：

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` 会显示容器实际运行的版本。如果你为服务器存储挂载了文件夹，请再加上同样的 `-v` 选项。

想自己构建镜像，可以使用仓库里的 [`Dockerfile`](docker/Dockerfile) 和 [`compose.yml`](docker/compose.yml)：

1. **安装 Docker。** 在 Windows 或 macOS 上，安装并启动 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。在 Linux 或 NAS 上，你需要带 Compose 的 Docker（`docker compose` 或独立的 `docker-compose`）。
2. **获取文件。** 可以下载仓库 ZIP（[Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)）并解压，或者克隆它：
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **启动它。** 在项目文件夹中打开终端（例如 Windows 上的 PowerShell）并运行：
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   使用较旧的独立程序时，把 `docker compose` 写成 `docker-compose`。Docker 会构建镜像并在后台运行容器（`-d`）；首次构建大约需要 2–3 分钟。不加 `--build` 时，同一条命令会改为拉取现成的镜像。
4. **打开它。** 在同一台电脑上访问 **`http://localhost:3000/`**；从网络中的其他设备访问 **`http://<YOUR-SERVER-IP>:3000/`**。

日常命令：

- **停止：** `docker compose -f docker/compose.yml down`
- **重启：** `docker compose -f docker/compose.yml up -d`
- **更新**（拉取新代码或解压新 ZIP 之后）：`docker compose -f docker/compose.yml up -d --build`；使用现成镜像时，先 `docker compose -f docker/compose.yml pull`，再 `up -d`

**安装为应用和离线使用需要 https，并且需要静态导出。** 浏览器只会在 `https://` 或 `localhost` 上安装应用并保留供离线使用；
在普通的 `http://192.168.x.x:3000` 地址上两者都不提供（layerling 会在那里隐藏安装提示）。即使有 https，离线文件
（`sw.js`）也只写入静态导出（见[静态托管](#静态托管web-服务器上的纯文件)），不会写入这个运行服务器版本的镜像。
要在网络上安装并离线使用，请通过 https 提供静态导出；要给容器前置一个 https 地址，可使用 Caddy 或带证书
（例如来自 mkcert）的 nginx 之类反向代理。

该镜像在生产模式下运行 `next start`，所以除非你打开它，MCP 桥接在那里是关闭的（见[让 AI 客户端访问 NAS 或服务器上的副本](#让-ai-客户端访问-nas-或服务器上的副本)）。要提供共享项目文件夹，请绑定一个可写目录，
并在 `compose.yml` 中把 `LAYERLING_SHARED_PROJECTS_DIR` 设为它在容器内的挂载路径，例如 `./shared-projects:/shared-projects`
搭配 `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"`（见[网络上的共享设计](#网络上的共享设计)）。容器以编号 999
的用户运行，所以必须允许该用户写入这个文件夹：`sudo chown 999:999 ./shared-projects`，或者给服务加上
`user: "1000:1000"`（换成你自己的用户和组编号，`id -u` 和 `id -g` 可查看），让容器以你的身份运行。不加的话，
文件夹会显示在起始页上，但什么都存不进去。修改后运行 `docker compose up -d`：`docker compose restart` 会保留旧设置。
`docker exec <container> printenv LAYERLING_SHARED_PROJECTS_DIR` 会显示正在使用的值。

要选择人们首次访问时看到的配色主题，把 `LAYERLING_DEFAULT_THEME` 设为 `system`、`light`、`dark` 或 `graphite`
（同样在 `compose.yml` 中或 `npm run start` 的环境变量里设置）。之前打开过 layerling 的人会保留浏览器已有的主题，
任何人都仍可用主题开关更改。不设置时主题跟随系统。以纯文件方式提供的副本没有可读取该设置的服务器，所以在那里不生效。

面向有儿童的班级或工作坊，`LAYERLING_SIMPLE_MODE` 会让 layerling 以简易模式启动：功能区只保留工作坊会用到的工具，
形状库只显示简短列表，按钮更大，起始页只显示设计，没有新闻、没有欢迎文字，也没有离开 layerling 的链接。`true`
是未作选择者的初始值（设置里有开关，在该模式下退出需要按住两秒），`always` 对所有人固定生效并移除开关。以
`?mode=simple` 结尾的链接会为打开它的设备开启该模式，`?mode=full` 则关闭。它的设置方式与其他变量相同，
以纯文件方式提供的副本没有可读取它的服务器（链接和设置在那仍然有效）。

开启共享文件夹后，`LAYERLING_NEW_DESIGNS_ON_SERVER` 会让新建设计默认放在服务器上：`true` 是未作选择者的初始值
（他们可以在起始页取消勾选 **在服务器上新建设计**），`always` 对所有人固定生效并锁定该勾选项。设置方式相同，
以纯文件方式提供的副本没有可读取它的服务器。

在带域名的反向代理后面，代理必须传递原始的 `Host` 和 `X-Forwarded-Proto`（nginx：`proxy_set_header Host $host;`
和 `proxy_set_header X-Forwarded-Proto $scheme;`），否则保存到服务器会被拒绝，并提示
“Shared projects only accept requests from this site.”。如果代理改写了主机名且你无法更改，请把人们使用的地址列入
`LAYERLING_ALLOWED_ORIGINS`（逗号分隔，例如 `https://layerling.example.com`）。

### 静态托管：Web 服务器上的纯文件

任何 Web 服务器都能以纯文件方式提供 layerling；服务器上不运行 Node.js。在一台装有 Node.js 的电脑上构建一次文件
（见[你需要什么](#你需要什么)）：

```bash
npm install
npm run export
```

完成的站点位于 **`apps/web/.next-export/`**。把该文件夹的**内容**（不是文件夹本身）复制到 Web 服务器的文档根目录，
让 `index.html` 直接位于其中。

有四件事需要知道：

- **layerling 需要自己的地址。** 文件之间用从根路径开始的路径互相引用（`/_next/...`），所以 layerling 必须从某个地址的根路径提供，例如 `https://layerling.example.com/` 或 `http://192.168.0.5:8080/`。它不能放在子文件夹里（`https://example.com/layerling/`），也不能从磁盘打开（`file://`）。如果你只看到一大段没有任何样式的纯文本，说明脚本和样式文件没有加载：打开浏览器的开发者工具（F12），在“网络”标签中查看红色的 `/_next/...` 条目，并比较它们的地址与你放置文件的位置。
- **以下划线开头的文件夹也必须能访问。** 有些服务器会隐藏它们（例如 GitHub Pages 在没有 `.nojekyll` 文件时会这样），而 `_next` 里装着整个程序。
- **在自己的电脑上快速测试：** `npx serve apps/web/.next-export`，然后打开它打印出的地址。
- **安装为应用和离线使用需要 https。** 导出中包含离线文件（`sw.js`），但浏览器只会在 `https://` 地址或 `localhost` 上使用它们，不会在你网络中的普通 `http://` 地址上使用。

### 网络上的共享设计

layerling 本身只是文件，所以共享文件夹需要服务器上有能写入的东西。有两种方式，只需要其中一种：**Node 或 Docker**
（本节，配合 `LAYERLING_SHARED_PROJECTS_DIR`），或者**带 PHP 的普通 Web 服务器**（`store` 文件夹，见下文）。
如果一个 Web 服务器这两种方式都没有，只提供这些文件——`npx serve`、nginx 或没有 PHP 的 Apache——layerling 能正常显示，
但没有服务器文件夹。

如果你在一台别人会用浏览器访问的机器上用 `npm run dev` 或 `npm run start` 运行 layerling，它可以为 `.lyl` 设计提供一个
共享文件夹。`npm run start` 提供的是 `npm run build` 生成的内容，所以先运行一次构建。把 `LAYERLING_SHARED_PROJECTS_DIR`
指向启动 layerling 的用户可写的目录（`/srv` 下的文件夹通常属于 root，可以自己建一个或更改属主）并启动：

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

起始页随后会在浏览器设计旁显示一个名为 **在服务器上** 的文件夹。打开它就进入了该文件夹：**新建设计** 会直接在那里新建一个，
**新建文件夹** 会创建子文件夹，标题下方的一串路径会显示你当前的位置。一个 `..` 磁贴可以退回上一层，按钮左侧的
**返回此浏览器中的设计** 会回到此浏览器的设计。拖动设计到文件夹、该磁贴或路径中的某一级，或使用其菜单里的
**移动到……**，就能移动设计。从浏览器把设计放到服务器也是同样方式：把它的卡片拖到服务器文件夹上。

起始页上的两个按钮省去了逐个移动设计的麻烦：**全部放到服务器** 会一次把此浏览器的所有设计移入服务器文件夹，
而 **在服务器上新建设计** 勾选项会让每个新设计都从服务器文件夹开始，因此从第一次修改起就保存在那里。
名称在服务器上已被占用的设计会留在浏览器里。

顶部的搜索框会搜索整个服务器文件夹，而不只是你当前所在的文件夹。每个结果都会说明它在哪个文件夹里，
而那个文件夹本身就是一个按钮：点一下就能过去，搜索会被清空。文件夹也能按名称找到。搜索期间，
起始页上的服务器磁贴会显示那边有多少个匹配项。

设计菜单里的 **复制** 会创建它的副本。在服务器上，文件本身会被复制到原文件旁边，使用一个未占用的名称，连图片一起复制——
不会重新打包，所以副本与原件的几何完全一致。在浏览器里，副本会成为独立的设计，拥有相同的形状、相同的历史记录和
自己的预览图片，并且在服务器上不属于任何人。

保存在服务器上的设计会自行存回服务器，在最后一次修改后五秒以及你离开编辑器时。缩略图会放在文件旁边的
`.thumbnails` 中。只存在于浏览器里的设计会留在那里，不受影响。

保存到服务器的自定义形状会放进存储顶部的 `Custom shapes` 文件夹，每个形状一个 `.lyl` 及对应图片。layerling 会在第一个
这样的形状出现时创建它；它是个普通文件夹，所以会显示在起始页上，里面的形状也能像任何设计一样打开和保存。
无论走 Node 方式还是 `store.php`，都不需要额外配置。

从服务器打开设计会得到一份私有的本地工作副本。存回时会先检查服务器上的修订版本；如果期间有人改过该文件，
layerling 会拒绝覆盖，并让你重新加载或以其他名称保存。这是共享文件存储，不是同时协作编辑。

#### 不用 Node：`store` 文件夹

以静态导出方式提供（Web 服务器上的纯文件）的安装无法自行写入任何东西。针对这种情况，导出中附带了 `store.php`。
在 `index.html` 旁创建一个名为 `store` 且 Web 服务器可写的文件夹，layerling 就会提供与上面相同的共享存储，
包括文件夹等全部功能。没有这个文件夹时该功能不会出现，编辑器里的简短指南会说明如何开启。Web 服务器需要 PHP。

该文件夹**没有登录保护**：任何能访问该页面的人都能读取、写入和删除其中的内容。在家庭网络或工作坊里这正是想要的；
在公网可访问的站点上，请保护它或干脆不要使用。

该文件夹也可以放在 Web 根目录之外，那里没有任何地址能访问到它，无论有没有 `.htaccess`：把
`LAYERLING_SHARED_PROJECTS_DIR`（Node 服务器读取的同一个设置）设为它的路径——Apache 中用
`SetEnv LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects`，nginx 中用
`fastcgi_param LAYERLING_SHARED_PROJECTS_DIR /var/layerling-projects;`，Docker 中作为容器的环境变量。
这个文件夹随后取代 `store`；它同样必须存在，并且 Web 服务器可以写入。

部署时有一件事要记住：如果用会删除多余内容的选项来镜像导出——`rsync --delete`、`robocopy /MIR`、WinSCP `-delete`——
请明确排除 `store`，否则每次更新都会清空项目。

## 开发 layerling

想修改代码，就走这条路。

### 你需要什么

- Node.js 22.18 或更新版本（指南和字体脚本会直接加载 TypeScript 文件，旧版本做不到）；24 也可以，Docker 镜像用的就是它
- npm，随 Node.js 一起提供

用 `node -v` 和 `npm -v` 检查版本。如果这些命令不起作用，请从 Node.js 官网安装 Node.js，然后重新打开终端。

### 安装与运行

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

没有 Git？在 GitHub 页面上点击绿色的 **Code** 按钮，选择 **Download ZIP**，解压后在解压出的文件夹里打开终端，
从 `npm install` 开始。

然后打开 `http://127.0.0.1:3000/`。使用应用时让终端保持打开；`Ctrl+C` 会停止开发服务器。

想从另一台电脑通过名称访问开发服务器，例如 `http://myhost.local:3000/`，请在启动前把该名称列入环境变量
`LAYERLING_ALLOWED_DEV_ORIGINS`（多个名称用逗号分隔，`*.local` 表示所有以 `.local` 结尾的名称）。不设置时，
开发服务器只响应 `localhost` 和 `127.0.0.1`。静态导出和 `npm run start` 不需要它。

在 Linux 和 macOS 上，`scripts/start-layerling.sh` 会替你完成每天的启动：先更新代码检出（如果你改过里面的文件就跳过），
启动服务器，等它响应后打开浏览器。可以从任何位置运行，例如 `~/layerling/scripts/start-layerling.sh`。它需要 Git 和
Node.js，如上所述。如果 layerling 已经在该端口运行，它只会打开浏览器，不会再启动一个服务器。3000 端口被别的程序占了？
用 `PORT=3100 scripts/start-layerling.sh` 启动。它已在 Debian Linux（没有桌面，所以浏览器这一步只打印地址）和
Windows shell 中测试过；macOS 尚未测试——如果在你的系统上表现异常，请在讨论区告诉我们。

### 在容器中开发

不想安装 Node.js？那就改用容器开发。你需要带 Compose 的容器引擎——`docker compose` 或 `podman compose`
（SELinux 上的无根 Podman 也可以；compose 文件里的 `:z` 标志会处理文件标签）：

```bash
docker compose -f docker/compose.dev.yml up
```

打开 `http://127.0.0.1:3000/`。首次启动会安装依赖；之后的启动会直接进入带热重载的开发服务器。按 `Ctrl+C` 停止。
如果更新了依赖后发现有些东西还是旧的，删除项目文件夹里的 `node_modules/` 再重新启动。

同时还在运行 `docker/compose.yml` 里的生产容器？它也使用 3000 端口——把其中一个的宿主机端口改掉
（例如 `"3100:3000"`）。

### 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run typecheck` | TypeScript 检查 |
| `npm run test` | 单元测试 |
| `npm run test:e2e` | 端到端测试 |
| `npm run build` | 生产构建（`npm run start` 用来提供它） |
| `npm run export` | 用于纯 Web 托管的静态导出 |
| `npm run guide` | 从 `docs/guide` 构建用户指南页面（导出和 `npm run dev` 也会这样做） |
| `npm run guide:images` | 从运行中的程序重新拍摄指南图片（需要 `npm run dev -- -p 3010`；见 `docs/guide/README.md`） |
| `npm run printers:update` | 从 OrcaSlicer 的配置刷新打印机预设 |
| `npm run mcp:layerling` | 为 AI 客户端启动 MCP 服务器（见下文） |

## layerling MCP Skill

layerling 包含一个本地 MCP 服务器，供支持 MCP 工具的 AI 客户端使用。它让智能体能够检查和操作一个正在运行的
编辑器标签页：列出打开的编辑器、读取场景、创建、更新和选择对象、分组、切割和分离零件、列出 CAD 边 ID、
应用倒角或圆角、抽壳实体、检查错误并截取视口图片。

它针对本地开发服务器工作。在生产构建和静态托管中，MCP 路由是禁用的，除非服务器用访问令牌开启它
（[见下文](#让-ai-客户端访问-nas-或服务器上的副本)）；在 layerling.com 上它始终关闭。

1. 在项目文件夹中用 `npm run dev` 启动 layerling（见[安装与运行](#安装与运行)）。
2. 打开一个编辑器标签页，例如 `http://127.0.0.1:3000/?editor=1`——也可以不打开：当没有编辑器打开时，第一个需要它的工具会用编辑器启动你的浏览器（NAS 或服务器上的副本不适用；`LAYERLING_MCP_OPEN_EDITOR=0` 可关闭此行为）。
3. 按下面的说明连接你的 AI 客户端。它会自行用
   `node scripts/layerling-mcp-server.mjs` 启动 MCP 服务器。

主要工具名包括 `layerling_list_editors`、`layerling_read_scene`、`layerling_list_objects`、
`layerling_create_shape`、`layerling_update_object`、`layerling_list_edges`、`layerling_apply_edge_treatment`、
`layerling_hollow_object`、`layerling_make_lid`、`layerling_offset_object`、`layerling_cut_out`、`layerling_array_objects`、`layerling_set_section_view` 和 `layerling_capture_image`。

### Claude Code

无需安装：仓库已经包含 `.mcp.json`，它会为本项目注册 MCP 服务器；还包含一份位于 `.claude/skills/layerling-mcp-skill`
的技能副本，这正是 Claude Code 查找技能的位置。在 Claude Code 中打开 layerling 文件夹并提问：

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop 不会读取项目的 `.mcp.json` 或技能文件，但可以通过自己的配置使用同一个 MCP 服务器。在那里添加服务器，
以 [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json) 为模板，并把脚本路径替换为
你机器上的绝对路径。重启 Claude Desktop 后，提问：

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

把 `docs/skills/layerling-mcp-skill` 中的技能复制到你的 Codex 技能文件夹。

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.codex\skills\layerling-mcp-skill"
```

macOS 或 Linux：

```bash
mkdir -p ~/.codex/skills
cp -R docs/skills/layerling-mcp-skill ~/.codex/skills/
```

然后向你的 Codex 配置添加一个 MCP 服务器条目，以 [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml)
为模板，并把脚本路径替换为你机器上的绝对路径。重启 Codex 并提问：

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Gemini 与 Antigravity

对于 Antigravity，仓库在 `.agents/skills/layerling-mcp-skill` 附带了一份技能副本，Antigravity 会自动发现它。
对于 Gemini CLI，把 `docs/skills/layerling-mcp-skill` 中的技能复制到你的全局技能文件夹。

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.gemini\skills" | Out-Null
Copy-Item -Recurse -Force "docs\skills\layerling-mcp-skill" "$env:USERPROFILE\.gemini\skills\layerling-mcp-skill"
```

macOS 或 Linux：

```bash
mkdir -p ~/.gemini/skills
cp -R docs/skills/layerling-mcp-skill ~/.gemini/skills/
```

然后把这台服务器添加到 Gemini CLI 的 `settings.json` 或 Antigravity 的 `mcp_config.json`，以
[`docs/mcp/gemini-config.example.json`](docs/mcp/gemini-config.example.json) 为模板，并把脚本路径替换为你机器上的绝对路径。
重启客户端并提问：

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### 让 AI 客户端访问 NAS 或服务器上的副本

你自己托管的副本（NAS 上的 Docker 镜像、家用服务器）可以让 AI 客户端通过网络操作其打开的编辑器。它**默认关闭**，
因为任何能操作这个桥接的人都能读取和修改打开的设计。用服务器上的两个设置开启它，启动时读取——现成镜像无需重新构建：

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "a-long-random-secret-of-at-least-16-characters"
```

没有至少 16 个字符的令牌，桥接就会保持关闭。然后：

1. 在浏览器中打开该副本的一个编辑器标签页，例如 `http://nas:3000/?editor=1`，并保持打开。
2. 把地址和同一个令牌交给 MCP 客户端：在它的配置中设置 `LAYERLING_URL=http://nas:3000` 和
   `LAYERLING_MCP_TOKEN=<the token>`（参见 `docs/mcp` 中的示例）。

令牌保护这些命令：只有发送它的客户端才能列出或操作编辑器。编辑器页面不需要令牌，但只有当它们是该副本的页面，
并且是通过只有你自己网络中的人才能使用的地址或名称（IP 地址、不带点的名称，或以 `.local` 或 `.lan` 结尾的名称）打开时，
才会计入。这样可以防止互联网上的网页通过你的浏览器访问你的 NAS。如果你通过真实域名打开副本，例如在反向代理后面，
请把它列入 `LAYERLING_MCP_ALLOWED_HOSTS`（逗号分隔）。在你信任的网络上使用它，超出该范围的任何情况都使用 HTTPS：
令牌是在请求头中传输的。

## 参与贡献

欢迎贡献，你不需要是 3D 打印从业者也能帮忙——把这份 README 里的一句话写得更清楚也算。适合入手的地方：

- 编辑器缺陷修复
- 几何与布尔测试用例
- 导入和导出的边界情况（STL、OBJ、3MF、STEP、SVG、DXF）
- 界面打磨
- 文档截图和视频
- 无障碍和性能改进

提交拉取请求前请阅读 [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)。每个版本的变更见
[更新日志](docs/CHANGELOG.md)。

## 安全

请不要为安全敏感的问题提交公开 issue。报告流程见 [.github/SECURITY.md](.github/SECURITY.md)。

## 来源

layerling 是 Formsmith746 和 SketchForge 贡献者所开发 [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D)
的分支。该分支于 2026 年 9 月 16 日从 SketchForge 1.0.9 开始。SketchForge 仍是一个出色的项目，
也是本项目存在的原因。

## 商标

Tinkercad 是 Autodesk, Inc. 的商标。layerling 是一个独立项目，与 Autodesk 没有关联，也未获其认可或赞助。

## 许可证

版权所有 (C) 2026 layerling 贡献者。
版权所有 (C) 2026 SketchForge 贡献者。

layerling 是 SketchForge-3D 的修改版本，按 **GNU Affero 通用公共许可证第 3.0 版（仅此版本）**
（`AGPL-3.0-only`）授权——与原项目相同。见 [LICENSE](LICENSE)。

如果你修改了 layerling 并让其他人通过网络使用修改后的版本，许可证第 13 条要求你向他们提供相应的源代码。
起始页正好为此提供了一个 **源代码** 链接：在构建时把 `NEXT_PUBLIC_SOURCE_CODE_URL` 设为你的构建所用源代码的公开 URL。
