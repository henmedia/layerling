---
title: 放置与调整形状
summary: 形状库、用数字和手柄设置尺寸、颜色、旋转、锥度与扭曲。
---

layerling 里的每个零件都从一个形状开始。用这些形状，你可以搭建其他一切：形状彼此互补、相互挖空，或合并成一个新形状。

## 添加形状

单击功能区中的 {{ui:editor.addShape}}。形状库随即打开。

![形状库。每一张小图都是由形状的真实几何体渲染出来的。](shot:shape-menu)

每选一个形状，形状库都会关闭。拖动它的标题栏可以移动它，这样你就能把它放到不遮挡目标位置的地方，例如属性面板上方；双击标题栏可让它回到按钮下方，你上次留下的位置会保存在浏览器中。标题栏中的图钉可让形状库保持打开，方便你连续放置多个形状。拖动边缘和角可以调整它的大小，最大可到屏幕允许的宽高；尺寸也会保存在浏览器中，双击边缘可恢复。拉窄后，形状库会隐藏名称，只显示图片；指向某个形状时才出现名称。

选择一个形状。它会跟随鼠标指针，并在你单击的位置落下。把它移到某个实体上方，它会贴到指针下的面上，斜面也一样，就像 Tinkercad 的 Cruise；在空白平台上方，它会落在工作平面上。[[Esc]] 取消放置。等待单击的工具（例如卷尺、直角尺、便签、{{ui:camera.placeWorkplane}}、{{ui:editor.tool.layFlat}} 或边缘工具）在你选择形状时会被关闭，因此单击会放置形状。反过来，开启其中某个工具会把形状放下。如果你更希望形状直接出现在平台中央，可以在设置中关闭单击放置（{{ui:workspace.appearance}} 区域，{{ui:workspace.cruise}} 开关）。

在一个面上,指针靠近面中心时形状会吸附到该面的中心,就像吸附到角或边一样;按住 [[Alt]] 可放在任意位置。如果从形状库把它拖到一个面上,它总是落在面的中心,按住 [[Alt]] 则落在松开的位置。

形状库提供：

- **基本形状：** {{ui:shape.box}}、{{ui:shape.roundedBox}}、{{ui:shape.cylinder}}、{{ui:shape.slot}}、{{ui:shape.ellipse}}、{{ui:shape.polygon}}（三到二十四条边）、{{ui:shape.sphere}}、{{ui:shape.cone}}、{{ui:shape.pyramid}}（三到二十四条边，因此也有三棱锥）、{{ui:shape.wedge}}、{{ui:shape.roundRoof}}、{{ui:shape.halfSphere}} 和 {{ui:shape.torus}}。
- **管：** {{ui:shape.tube}} 和 {{ui:shape.bentTube}}，由最多十二段直管及之间的弯头组成，以及从一种轮廓过渡到另一种的 {{ui:shape.loft}}，比如从方形到圆形。
- **装饰形状：** {{ui:shape.star}}、{{ui:shape.heart}} 和 {{ui:shape.crescent}}。
- **文字：** {{ui:shape.text}}，也可沿圆弧排列。更多见[文字](chapter:text)。
- **机械件：** {{ui:shape.thread}}（螺杆、螺钉、螺母和螺纹孔）、{{ui:shape.spring}}、{{ui:shape.gridfinity}} 收纳盒和底板、{{ui:shape.gear}}，以及用于握持的 {{ui:shape.knurl}}。更多见[螺纹与机械件](chapter:threads-and-mechanics)。
- **用于结构件：** 一体打印的 {{ui:shape.hinge}}、{{ui:shape.dovetail}}、用于水平孔的 {{ui:shape.teardrop}}、用于螺钉头的 {{ui:shape.counterbore}} 和 {{ui:shape.countersink}}，以及 {{ui:shape.ruler}}，它只是测量工具，永远不会出现在导出结果中。

有两种方式可以得到三角形：三边的 {{ui:shape.polygon}} 是等腰三角形，也就是 Tinkercad 的“Roof”；{{ui:shape.wedge}} 是直角三角形。两者都是真正的三棱柱。要挖出三角形孔，复制该形状，把副本缩小，标记为孔，然后用 {{ui:editor.tool.centerOnWorkplane}} 或 {{ui:editor.tool.align}} 对齐。两者都按形状的边界框工作，也就是包围它的最小方框，所以被切掉一半的正方形仍按完整正方形计算。命令搜索（[[Ctrl]]+[[K]]）在“triangle”或“roof”下也能找到这两种形状。

{{ui:shape.slot}} 可以一端比另一端窄，例如用于两个带轮之间的皮带护罩。在 {{ui:inspector.properties}} 下设置 {{ui:prop.slotSmallEnd}}；大端与胶囊一样宽，两侧从一段圆弧直通另一段圆弧。{{ui:prop.slotCentreDistance}} 是两段圆弧圆心之间的距离，也就是两个带轮的间距。改变小端时圆心距保持不变，胶囊会变长或变短。锥形胶囊同样是精确实体，可用于圆角和 STEP。

## 形状的设置

选中形状后，它的设置会立即出现在右侧。顶部是名称，旁边的铅笔（{{ui:outliner.rename}}）可输入新名称。[[Enter]] 保留，[[Esc]] 取消，名称为空则恢复形状的默认名称。再往右，挂锁可锁定形状、防止误移动，眼睛图标可隐藏它。最左侧的箭头可把设置折叠到只剩标题栏。下方的卡片可通过单击标题展开和收起（{{ui:inspector.properties}}、{{ui:inspector.position}}、{{ui:inspector.rotation}}、{{ui:inspector.taper}}、{{ui:inspector.twist}} 以及特殊形状的卡片）；layerling 会记住你保持展开的卡片，供下一个形状和下次访问使用。

设置停靠在右侧边缘。如果它挡住了你想看的内容，拖动标题栏即可让它浮动到你放下的位置；下一个形状也会保持在那里。把它拖回右上角，或双击标题栏，它就会重新停靠。浮动或折叠时，吸附步距会从设置底部移到工作平面右下角。

![圆柱体的设置：实体或孔、直径和高度，可用数字和滑块设置。](shot:editor-overview)

- **{{ui:inspector.solid}} 或 {{ui:inspector.hole}}：** 实体保留材料，孔则去除材料。单击 {{ui:inspector.solid}} 会打开颜色；你在那里调出的自定义颜色之后会留在 {{ui:inspector.recentColors}} 下，最多最近八个。更多见[实体与孔](chapter:solids-and-holes)。{{ui:inspector.keptColors}} 一行中的图钉可永久保留你选的颜色：它独占一行，更新的颜色永远不会把它挤掉，再次单击同一图钉即可取消保留；此浏览器最多保留 21 种颜色。
- **{{ui:inspector.transparent}}：** 让实体变得透明，例如看清它后面的形状。
- **{{ui:inspector.multicolor}}：** 仅用于分组；[[Shift]]+[[M]] 可切换。开启后，分组中的每个部件都显示自己的颜色，被孔挖成单一实体的分组也一样（孔留下的壁采用被挖实体的颜色）。为分组选择颜色会关闭它，并给整个分组上色。捆绑始终保持各部件的颜色。导出 3MF 时，每个部件都保留自己的颜色，切片软件可据此把部件映射到耗材；OBJ 把颜色记录在顶点上，所以两种颜色的交界在那里会略显粗糙。
- **{{ui:inspector.properties}}：** 尺寸以及属于这个形状的一切。圆柱体有直径、高度和边数。圆管或圆环有 {{ui:prop.outerDiameter}}、{{ui:prop.innerDiameter}}（用于已知轴径的衬套）和壁厚：任意两个值可得出第三个，输入顺序不限。设置外径时内孔保持不变，壁厚随之改变；设置内径时外径保持不变，壁厚随之改变；内孔比管更宽时，外径会按壁厚增大。管的长度就是它的高度。被拉过一条边的非圆管，会用“长度”和“宽度”两个值代替原来的外径；在那里改变宽度时壁厚保持不变。齿轮有齿数，弹簧有圈数。离开默认值的数值名称旁会出现一个小箭头：单击只恢复这个数值，无论你之后还做了什么，这一点与撤销不同。双击滑块也一样，这里以及工作区设置中的滑块都是如此。用鼠标拖动时，长度滑块会吸附到吸附步距，因此高度会得到整毫米值（网格关闭时以及短滑块上不会）；输入的值和滑块上的方向键仍保持精确。底部的 {{ui:inspector.saveDefaults}} 会把当前值设为这类形状的起始值（与设置中的 {{ui:workspace.shapeDefaults}} 相同），{{ui:inspector.resetDefaults}} 则恢复应用的默认值。 开启{{ui:prop.tubeBoreHole}}后，管子编组时其孔算作空洞：它也会切开与管子编组在一起的物体的壁，于是T形相接的两根管子彼此贯通。
- **{{ui:inspector.makeEllipse}}：** 仅用于圆柱体。圆柱体始终是圆的：它只有一个直径，每个手柄都会同时改变两侧。要得到椭圆，单击此项，它就会变成 {{ui:shape.ellipse}}——同一个实体，之后你可以分别设置它的长度和宽度。带有倒角、圆角或壁的圆柱体，以及旋转过或分组过的圆柱体，不能这样转换；这些情况请从一开始就使用 {{ui:shape.ellipse}}。
- **{{ui:inspector.taper}}：** 顶部和底部尺寸不同，例如用于斜面或漏斗。
- **{{ui:inspector.twist}}：** 让顶部相对底部扭转或横向偏移。这样可以做出扭转的柱子和倾斜的塔。
- **{{ui:inspector.slope}}：** 让顶部朝一端倾斜下降。{{ui:prop.slopeSide}} 选择哪一端，{{ui:prop.slopeEnd}} 或 {{ui:prop.slopeAngle}} 决定降多低，{{ui:prop.slopeCurve}} 决定顶部是直的（0）、向上鼓起（大于 0）还是下凹（小于 0）。另一端保持物体的高度；低端顶部的橙色圆点可拖动调整其高度。适合沿长度方向降低的屋顶、坡道或斜切的管端。可用于：{{ui:shape.box}}、{{ui:shape.roundedBox}}、{{ui:shape.cylinder}}、{{ui:shape.ellipse}}、{{ui:shape.polygon}}、{{ui:shape.tube}}、环、{{ui:shape.wedge}}、{{ui:shape.roundRoof}}。物体仍是精确实体，可倒角、圆角并导出 STEP。
- **{{ui:inspector.narrow}}：** 从上方看，让两条长边均匀地朝一端收拢。{{ui:prop.narrowSide}} 选择哪一端，{{ui:prop.narrowEnd}} 设定该端宽度（0 为尖端），{{ui:prop.narrowStart}} 设定收窄从哪里开始（宽端为 0 %，中间为 50 %），{{ui:prop.slopeCurve}} 决定两侧是直的（0）、像船头一样向外鼓（大于 0）还是向内收（小于 0）。窄端侧面的橙色圆点可拖动调整其宽度。可用于除管和环以外的相同形状。保持精确的有：{{ui:shape.box}}、{{ui:shape.wedge}}、{{ui:shape.roundRoof}}；其余以网格显示。

![一个由橙色方块、蓝色销钉和孔组成的分组，被挖成单一实体。开启多色后，销钉保持蓝色，方块保持橙色，孔壁则采用方块的颜色。](shot:group-multicolor)

锥度和扭曲几乎适用于所有形状。只有齿轮、螺纹、弹簧、Gridfinity、铰链、棱锥、弯管、泪滴孔、用于螺钉头的沉孔与锥形沉孔以及标尺不支持：它们有自己固定的尺寸，或者像棱锥那样已经有自己的顶部。

![一个改变了顶部半径和高度的圆锥：每个数值旁的小箭头可恢复该值，底部的两个按钮可保存或重置该形状的默认值。](shot:property-reset)

{{ui:inspector.saveDefaults}} 会把你在该形状上的改动保存为同类型每个新形状的起点：尺寸、形状的设置和颜色。把一个圆柱体涂成绿色，按下按钮，之后添加的每个圆柱体都是绿色；其他类型保持各自的颜色。{{ui:inspector.resetDefaults}} 把该类型恢复为应用的初始状态。有各自默认值的类型会在设置的 {{ui:workspace.shapeDefaults}} 下标出。从起始页新建的设计也会以这些默认值开始；数值保存在此浏览器中。

锥形或倾斜的长方体、圆柱体、椭圆、多边形、管或圆环保持精确形状；胶囊、星形、心形、月牙、燕尾、顶部和底部边缘未倒圆的圆角长方体，以及直的或圆的滚花（其倒角端也随之收窄）同样如此：倒角和圆角可以像在普通形状上一样作用于它，STEP 导出也会写出它。扭曲的形状同样如此：它的截面随高度精确旋转，侧面从底部到顶部均匀盘旋。

输入比拖动更精确。所有数字字段都接受毫米，也接受百分比：在 40 mm 的宽度中输入“50 %”，得到 20 mm。它们也会计算：“15*3”“120-2*4”或“(40+2)/2”分别得到 45、112 和 21；可以用 x 代替 *。字段会记住算式，属性面板和选中实体周围尺寸框中的字段都是如此：之后再次单击它，只要数值仍然吻合，那里显示的就是算式而不是数字，你可以就地修改，把“(140+2)/2”改成“(40+6)/2”。用手柄拖动实体或缩放它之后，算式不再吻合，字段就只显示数字。 在点击过的数字框中，鼠标滚轮和 [[↑]]、[[↓]] 键会按一步改变数值，按住 [[Shift]] 步长更大，按住 [[Alt]] 步长更细。在尺寸或位置字段中，[[Shift]] 改为按网格步长变化；网格关闭时按十个步长。

### 选择颜色

单击实体属性中的 {{ui:inspector.solid}} 会打开颜色卡片，标题为 {{ui:inspector.shapeColor}}。顶部显示实体当前颜色的十六进制值。下面是调色板中的现成颜色；单击一种即可给实体上色并关闭卡片。

{{ui:inspector.custom}} 会打开浏览器的颜色选择器，用于自定义颜色。它提供什么取决于浏览器：在 Chrome 和 Edge 中，它有颜色字段、色相滑块、可从屏幕任意位置取色的吸管，以及以 HEX、RGB 或 HSL 表示的值，可用旁边的箭头切换。关闭选择器或单击其外部时，颜色才会生效。

你在那里调出的自定义颜色之后会留在 {{ui:inspector.recentColors}} 下，最多最近八个。{{ui:inspector.keptColors}} 一行中的图钉可永久保留你选的颜色：它独占一行，更新的颜色永远不会把它挤掉，再次单击同一图钉即可取消保留；此浏览器最多保留 21 种颜色。图钉用于自定义颜色，调色板中的颜色始终都在。选中多种颜色时，或选中孔时，没有单一颜色可保留。

设置中工作区颜色有自己更简单的选择器，包含颜色字段、一排现成颜色和十六进制值字段；见[设置](chapter:view-and-workplane)。

## 圆有多圆？边数

圆柱体、圆锥、管、椭圆或内孔等圆形形状，其属性中有 {{ui:prop.sidesFollowSize}} 开关和 {{ui:prop.sides}} 滑块。{{ui:shape.torus}} 有两个滑块：沿环的 {{ui:prop.torusSides}} 和沿管身的 {{ui:prop.torusSteps}}。它们在那里也会跟随尺寸，直到你手动固定，因此大型圆环不会显出棱面。原因在于：对于视图以及 STL、3MF 和 OBJ，layerling 把圆画成由许多小边组成的多边形。边越多越平滑，占用的三角形也越多。

{{ui:prop.torusTube}}设定从上方看时管有多粗。高度只会压扁或拉伸管，所以扁平的圆环会保留中间的孔；当管粗达到外径的一半时孔会闭合。拖动手柄时，管会随形状一起缩放。只有管粗等于圆环高度的圆环，才会在倒角、圆角和 STEP 中保持为精确实体。

**边数在哪些地方重要**

- **导出给切片软件时**（STL、3MF、OBJ）。边数少的圆柱体到了那里就是多边形。
- **合并实体和孔时。** 由边数少的孔挖出的内孔，在成品中会带有棱角。螺钉孔也包括在内。
- **在视图中。** 许多非常精细的形状会拖慢编辑器。

**边数在哪些地方不重要**

- **导出 STEP 时。** 它写出的是圆形形状，而不是多边形。
- **使用倒角和圆角时**（{{ui:editor.tool.chamfer}}、{{ui:editor.tool.fillet}}），只要形状保持圆形。未设置边数、边数不少于该形状的默认值，或者多边形与圆的偏差最多 {{value:EXACT_ROUND_TOLERANCE}} mm 时，就是这种情况。默认值是：圆柱体、椭圆、管和圆锥为 {{value:ROUND_FROM_SIDES}} 条边，{{ui:shape.roundRoof}} 为 {{value:ROUND_FROM_ROOF_SIDES}}，{{ui:shape.sphere}} 为 {{value:ROUND_FROM_SPHERE_STEPS}} 段，{{ui:shape.halfSphere}} 和 {{ui:shape.paraboloid}} 为 {{value:ROUND_FROM_HALF_SPHERE_STEPS}} 段，{{ui:shape.torus}} 为 {{value:ROUND_FROM_TORUS_SIDES}} 条边和 {{value:ROUND_FROM_TORUS_STEPS}} 段，圆形 {{ui:shape.bentTube}} 的 {{ui:prop.quality}} 为 {{value:ROUND_FROM_BENT_TUBE_QUALITY}}。
- **螺纹、弹簧或斜齿轮。** 边缘工具和 STEP 导出使用它的精确实体；它的 {{ui:prop.quality}} 只决定绘制得有多精细。

**边数再次重要的情况**

- **在边数少的形状上使用倒角和圆角时。** 如果把边数设得低于默认值，边缘工具会按形状绘制出来的样子处理：6 条边的圆柱体仍是六棱柱，圆角会沿它的六条边延伸。这样你就可以做出例如带圆角的螺母槽。对于圆形形状，请保持 {{ui:prop.sidesFollowSize}} 开启。

**如何使用**

- **保持 {{ui:prop.sidesFollowSize}} 开启。** 然后 layerling 会根据直径选择边数，使多边形与真实圆的偏差最多 {{value:ROUND_DEVIATION_TOLERANCE}} mm，远低于打印机能够分辨的程度。小形状至少有 {{value:MIN_AUTOMATIC_SIDES}} 条边，大形状则更多。
- **减少边数**：只有在你有意要多边形时才这样做（不过那种情况有 {{ui:shape.polygon}}），或者当编辑器因大量圆形形状而变慢时。
- **增加边数**：几乎不需要。只有在非常大的圆形零件上、在 STL 中能看到棱边时才需要。
- **对于只用边缘工具处理或以 STEP 交付的零件，** 边数无关紧要。

## 使用手柄

除了设置之外，形状本身也有手柄：

- **角和边**用于放大或缩小形状。把其中一个拖过对侧，形状会在该边的另一侧继续增大。顶部的箭头在底面下方做同样的事。拖动角时按住 [[Shift]] 可同时缩放宽度、深度和高度并保持比例；按住 [[Alt]] 则从中心缩放，而不是从对角缩放。没有键盘，或者不想按键时，可开启属性顶部的 {{ui:inspector.keepProportions}}：此后角始终保持比例，输入宽度、深度或高度之一，另外两个会按相同比例缩放。该设置会被记住。
- 形状**上方的黑色箭头**抬高或降低形状；从一开始按住 [[Alt]]，会在松开处生成一个副本，方便叠放。**顶面上的白色手柄**改变高度。
- **弧形箭头**旋转它。
- **形状旁的数值**显示尺寸。单击其中一个会打开字段，可输入想要的数字。按 [[Enter]] 时，形状从该数字对面的边开始增大，与拖动时相同；按 [[Alt]]+[[Enter]] 时，它围绕自己的中心增大，因此与另一个形状对齐过的形状仍保持对齐。这适用于宽度和长度；高度始终从底面向上增大。右侧属性中的字段不用按键就保持中心。[[Tab]] 保留数字并打开下一个（宽度、深度、高度）；[[Shift]]+[[Tab]] 返回上一个。在已单击过的属性字段中，鼠标滚轮也会改变数值：一格一个单位，按住 [[Shift]] 为十倍，[[Ctrl]] 为十分之一，[[Alt]] 为百分之一。未单击过的字段把滚轮留给面板，由面板滚动。
- **单击一个角**（不拖动）会同时打开宽度和深度。输入第一个，按 [[Tab]] 切到第二个，按 [[Enter]] 应用两者。[[Esc]] 取消。

形状一旦按直角转过，例如用 {{ui:editor.tool.layFlat}} 侧放，属性中的字段就会按每项尺寸当前的方向命名：{{ui:prop.height}} 是向上的尺寸，{{ui:prop.width}} 沿 X 方向，{{ui:prop.length}} 沿 Y 方向。因此输入躺倒形状的高度会改变垂标尺寸，它的底面仍留在平台上。以其他角度倾斜的形状会在字段中显示自己的尺寸，下方会有说明。

不用鼠标时，可以用键盘：方向键按一个吸附步距移动选中项（网格关闭时为 0.01 mm），按住 [[Shift]] 为五步，或者在设置的 {{ui:workspace.appearance}} 下把 {{ui:workspace.gridMajorEvery}} 设为 {{ui:workspace.gridMajorSteps|10}} 时，为十步：直到下一条更深的线，与 Tinkercad 中一样。它们跟随视图：[[→]] 移向屏幕右侧，[[↑]] 远离你，即使转动过平台也是如此。把形状推出画面时，视图会跟着移动。[[Ctrl]]+[[↑]] 和 [[Ctrl]]+[[↓]] 升高和降低它。连续按方向键在历史记录中算作一步：只要下一次按键在 1.5 秒内跟上，撤销就会收回整串操作，而不是一次一次地收回。[[R]] 旋转 45°，[[Shift]]+[[R]] 旋转 22.5°。[[D]] 把选中项放到工作平面上。

手柄可把形状拉到和你的平台一样大，宽和深至少 220 mm。在属性中输入数字可以超过这个范围，而这样放大的形状再次抓取时不会缩回。在设置的 {{ui:workspace.shapeDefaults}} 下，可用 {{ui:workspace.customLimit}} 为每种形状设置自己的上限。

吸附步距位于编辑器右下角，随时可以更改。

## 复制与重复

{{ui:editor.tool.copy}}、{{ui:editor.tool.paste}} 和 {{ui:editor.tool.duplicate}} 位于功能区（{{ui:editor.group.clipboard}}）。[[Ctrl]]+[[D]] 复制选中项。layerling 会记住你上次如何移动或旋转副本，并在下次复制时再次应用。这样几下按键就能做出一排孔或一排台阶。规则排列还可以使用阵列，见[选择与排列](chapter:select-and-arrange)。

> **提示：** 如果某个形状不肯接受你想要的尺寸，通常是新形状的限制所致。在设置的 {{ui:workspace.shapeDefaults}} 下，你可以决定每种形状如何开始，以及最大能有多大。

## 自定义形状

需要反复使用的支架、手柄或底板，可以放进 {{ui:myShapes.title}}。它们位于形状库顶部、{{ui:myShapes.basicShapes}} 上方，可用箭头收起。

1. 选择一个或多个实体、孔、分组，也可以包含导入的模型。
2. 打开形状库并单击 {{ui:myShapes.saveSelection}}。输入名称，用 {{ui:common.save}} 确认。
3. 在任何设计中，单击图块即可插入该形状，与其他形状一样。你也可以把图块拖到工作平面上；它会在你松手的位置落下。随后形状会跟随指针，和其他形状一样：它跟着指针移动，经过其他实体的表面时也是如此，单击即可放下；[[Esc]] 把它收走。

多个实体会一起回来，保持它们彼此的相对位置，并且仍可逐个选择。固定到已保存实体上的[便签](chapter:measuring-and-notes)会随之保存，并在插入时以收起状态回来，仍固定到插入的实体上；自由便签和参考点留在设计中。图块上的铅笔可重命名，垃圾桶会在询问后删除。已插入设计中的形状保持原样。

{{ui:myShapes.title}} 保存在此浏览器中，与设计分开，下次启动时仍在。起始页的 {{ui:dashboard.backupAll}} 会把它们和设计一起备份，打开备份即可恢复两者。如果只想把形状带到另一个浏览器，{{ui:myShapes.backup}}（向下的箭头）会把它们保存为 ZIP 文件，{{ui:myShapes.load}}（向上的箭头）会把它们带回来。{{ui:myShapes.load}} 也接受单个 `.lyl` 设计；每个都会变成一个形状。已有的形状不会重复添加。

### 文件夹

许多自定义形状更适合分类到文件夹中。{{ui:myShapes.newFolder}}（带加号的文件夹，位于 {{ui:myShapes.saveSelection}} 旁）会要求输入名称，并在顶部创建文件夹；文件夹上的加号 {{ui:myShapes.newSubfolder}} 会在其中创建子文件夹。文件夹最多三层：第三层的文件夹可以放形状，但不能再放文件夹。文件夹按名称顺序排列在不属于任何文件夹的形状上方，可用箭头展开和收起；文件夹上的数字统计其中及内部文件夹中的形状数量。保存时，在名称旁的列表中选择文件夹；{{ui:myShapes.noFolder}} 会把形状留在顶部。

图块上带箭头的文件夹可把该形状移到另一个文件夹，或用 {{ui:myShapes.noFolder}} 移回外面。文件夹上的铅笔可重命名，垃圾桶会在询问后删除它以及其中的文件夹和形状。文件夹本身不能移动：请在合适的位置新建一个，再把形状移过去。备份会保留文件夹，载入后形状会回到原来的位置。

### 服务器上的自定义形状

开启[共享服务器存储](chapter:files-and-saving)后，该区域会显示两组：{{ui:myShapes.onServer}} 和 {{ui:myShapes.inBrowser}}。保存时你可以选择形状的去处；默认选择服务器。在那里，它存放在 `Custom shapes` 文件夹中，是一个独立的 `.lyl` 文件，带有图片，任何能访问服务器的设备上都可以使用；它的文件夹就是 `Custom shapes` 内的文件夹。两侧各有自己的文件夹，形状只会在所属一侧的文件夹之间移动。浏览器图块上的云图标会把这个形状放到服务器上；此后它就不再保存两份。

`Custom shapes` 文件夹也会显示在起始页上。在那里像设计一样打开形状，修改后它会像服务器上的任何设计一样自动保存；下次插入时使用的就是新版本。由于服务器存储没有登录功能，所有能访问服务器的人看到的都是相同的形状。

## 包裹到圆柱

想让图案、标志或文字贴到杯子、罐子或管子上？先把平铺在平台上，例如作为导入的 SVG 或文字，并按从上方看应有的样子摆好。然后在形状设置的 {{ui:inspector.wrapCylinder}} 下把它包裹到圆柱：

1. 打开 {{ui:inspector.wrapCylinder}}，输入圆柱壁的 {{ui:inspector.wrapDiameter}}，例如杯子的外径。也可以精确到十分之一毫米，比如 63.5。
2. 单击 {{ui:inspector.wrapApply}}。原本从左到右延伸的内容现在绕着圆柱延伸，后边缘变成顶部，厚度从壁面向外突出。
3. 选中包裹后的形状和圆柱，让两者在左右和前后方向都居中。包裹后形状的中间就是圆柱的轴线，因此它会正好贴在壁上。

如果要雕刻，请开启 {{ui:inspector.wrapInward}}：厚度此时会陷入壁内。把形状设为孔，居中，然后与圆柱分组。

已经包裹过的形状是包裹后物体的网格，不能再次包裹：撤销包裹，或者用另一个直径再次包裹原来的平面形状。

结果像导入的模型一样是网格。撤销会把形状重新摊平；要换直径，先撤销再重新包裹。包裹范围不能超过圆柱一圈；超过时 layerling 会给出能够容纳的最小直径。

## 表面纹理

在实体上加凹槽、滚花、蜂窝或凸点，让它更好握或更好看：在形状设置中打开 {{ui:inspector.surfaceTexture}}。顶部 {{ui:editor.group.modify}} 组里的 {{ui:inspector.surfaceTexture}} 按钮作用相同：它为选中的实体打开或关闭这张卡片，卡片打开时按钮保持高亮。

1. 选择 {{ui:inspector.surfacePattern}}、它的 {{ui:inspector.surfaceSpacing}} 和 {{ui:inspector.surfaceDepth}}。{{ui:inspector.surfaceDirection}} 决定纹理是压进实体还是凸出实体。对于 {{ui:surfaceTexture.bumps}}，{{ui:inspector.surfaceBumpShape}} 可在 {{ui:surfaceTexture.bumpDome}}、{{ui:surfaceTexture.bumpCone}}、{{ui:surfaceTexture.bumpSoft}} 和 {{ui:surfaceTexture.bumpFlat}} 之间选择。在 {{ui:inspector.surfaceBumpGrid}} 下，它们可以 {{ui:surfaceTexture.bumpGridStaggered}}（每隔一行错开半个间距），或排成 {{ui:surfaceTexture.bumpGridStraight}}。
2. 在 {{ui:inspector.surfaceProjection}} 下，杯子、旋钮或把手等圆形实体选 {{ui:surfaceTexture.cylinder}}。图案绕 {{ui:inspector.surfaceAxis}} 一圈，间距会略作取整，使一圈正好是整数个凹槽或单元：图案闭合，没有接缝。{{ui:surfaceTexture.allRound}} 适合不是圆形的实体，{{ui:surfaceTexture.flatProjection}} 适合从上方看的盖子或平板。保持 {{ui:surfaceTexture.auto}}，Layerling 会替你选择：圆形实体以及像盒子这样直立的棱角实体用 {{ui:surfaceTexture.cylinder}}（图案随外轮廓走，无接缝地绕过棱边，凸起的图案会顺着棱边弯过去），其他棱角实体用 {{ui:surfaceTexture.allRound}}。
3. 单击 {{ui:inspector.surfaceApply}}。大的实体需要几秒钟，期间可以继续工作。

如果只想给部分面加图案，比如只给盒子的顶面，单击 {{ui:inspector.surfaceFacesPick}}，再在视图中单击这些面：顶面、底面或某个侧面。一个面一直延伸到实体的锐利棱边；圆柱的侧面是一个面，顶面和底面各是一个面。选中的面会高亮，再单击一次可以取消，{{ui:inspector.surfaceFacesClear}} 让图案重新覆盖整个实体。只有选中的面得到图案，其他面保持原样，三角形也很少。在顶面或底面上图案是平铺的；在圆形顶面上，凹槽、绳纹和针织纹绕中心排成一圈圈，像树的年轮。{{ui:inspector.surfaceFaceTurn}} 转动顶面和底面上的图案：0° 时各行沿前边缘，90° 时沿侧边缘。{{ui:inspector.surfaceCapStyle}} 让那里的凹槽、绳纹和针织纹在行与环之间切换；在棱角实体上，环会沿外轮廓走。{{ui:inspector.surfaceCapEdge}} 决定侧面与带图案的顶面或底面之间的棱边怎样处理：{{ui:surfaceTexture.edgeSharp}} 让两者都止于棱边。选 {{ui:surfaceTexture.edgeOver}} 时，侧面的图案绕过棱边铺满整个顶面：绳纹、针织纹和水平凹槽的各行以环的形式延续，竖直和斜向的凹槽则作为射线几乎延伸到中心。{{ui:surfaceTexture.edgeFold}} 效果相同，但只作为一圈边；里面是顶面自己的图案，按 {{ui:inspector.surfaceCapStyle}} 的设置。{{ui:surfaceTexture.edgeBead}} 为任何图案在棱边加一圈饰边：一根绳、一条收针链或一道圆珠边。较窄的圆角也会结束一个面：杯沿带圆角的杯子，其外侧、圆角、杯沿、内侧和杯底各自是独立的面，所以单击外侧只选中外侧。较宽的圆角（约占实体四分之一或更多）属于该面，就像球是一个面。选了面时，{{ui:inspector.surfaceOutside}} 和 {{ui:inspector.surfaceInside}} 不起作用。

在 {{ui:inspector.more}} 下选择图案铺在哪里：外壁和内壁，底部和顶部各留多少光滑（光滑的底部让实体平稳地放在热床上），高度上的一条带，以及锐利棱边是否保持光滑。在所有保持光滑的地方旁边，图案会柔和地过渡出现；{{ui:inspector.surfaceFade}} 设定过渡的毫米数。数值越小，图案越靠近棱边；凸起的图案会一直延伸到棱边。在立方体这类棱角实体的平面上，图案则在这个距离处以一条直边结束：凹槽和菱形以一小段壁收尾，只保留完整的凸点。{{ui:inspector.surfaceProfile}} 决定凹槽或接缝的截面：尖形和平形是精确的，圆形则按 {{ui:inspector.surfaceDetail}} 给出的级数分段。

除了 {{ui:surfaceTexture.grooves}}、{{ui:surfaceTexture.knurl}}、{{ui:surfaceTexture.honeycomb}} 和 {{ui:surfaceTexture.bumps}}，还有更多图案。{{ui:surfaceTexture.cells}} 是像铺路石或干裂泥土那样的不规则单元；接缝像蜂窝一样切得干净，换一个 {{ui:inspector.surfaceSeed}} 就重新排布。{{ui:surfaceTexture.knit}}、{{ui:surfaceTexture.rope}} 和 {{ui:surfaceTexture.weave}} 模仿针织线圈、缠绕的绳子以及由立条和编条编成的篮子；它们默认凸起、圆润，大小与原物相当。{{ui:surfaceTexture.grain}} 让表面变得细微粗糙，像喷砂过一样；颗粒分布在空间中，没有接缝，也不会拉伸。{{ui:surfaceTexture.image}} 把一张灰度图当作高度图：可用现成的木纹、地形或水磨石，也可用 {{ui:inspector.surfaceImageLoad}} 载入自己的图。亮处成为完整深度；{{ui:inspector.surfaceSpacingImage}} 设定一块拼贴的宽度，在 {{ui:inspector.surfaceImageTiling}} 下，拼贴可以重复、镜像或错位。

{{ui:surfaceTexture.carbon}} 在实体上铺斜纹编织的碳纤维：竖向带和横向带互相上下穿插，每条带错开一条带的位置，于是出现熟悉的斜纹。{{ui:inspector.surfaceCarbonWeave}} 可选 {{ui:surfaceTexture.carbonTwill22}}（大多数碳纤维件的均匀编织），或 {{ui:surfaceTexture.carbonTwill21}} 和 {{ui:surfaceTexture.carbonTwill31}}，后两者竖向带显得长、横向带显得短。{{ui:inspector.surfaceSpacingCarbon}} 设定竖向带的宽度；{{ui:inspector.surfaceCarbonCross}} 让横向带更宽或更窄，得到不均匀的编织（0：一样宽）。绕实体一圈时，带宽会略作取整，使编织无接缝地闭合。单根纤维对打印来说太细了：看得见的是带和它们的交叉。

{{ui:surfaceTexture.bricks}} 在实体上铺一面砖墙，接缝像砂浆一样凹下。{{ui:inspector.surfaceBrickBond}} 选择砖的砌法：大多数墙用的 {{ui:surfaceTexture.bondRunning}}、{{ui:surfaceTexture.bondStack}}，或在长砖之间夹短砖（{{ui:surfaceTexture.bondEnglish}}、{{ui:surfaceTexture.bondEnglishCross}}、{{ui:surfaceTexture.bondFlemish}}）。{{ui:inspector.surfaceSpacingBricks}} 和 {{ui:inspector.surfaceBrickHeight}} 从接缝量到接缝，并略作取整，使整块砖正好排下：绕杯子一圈、盒子侧面从棱到棱、从底到顶；{{ui:inspector.surfaceBrickJoint}} 设定接缝宽度。在 {{ui:inspector.more}} 下，{{ui:inspector.surfaceBrickVary}} 让每块砖凹得深浅略有不同，像旧墙一样。

{{ui:surfaceTexture.cracks}} 图案让裂纹像金缮那样在表面蔓延，带有转折、分叉，宽度向末端逐渐变细。{{ui:inspector.surfaceCrackStart}} 决定裂纹从哪里开始：花瓶或杯子的上沿、底部、从盘子边缘向中心，或任意位置；在 {{ui:inspector.surfaceCrackStyle}} 下它们会变成闪电。选 {{ui:inspector.surfaceCrackGold}} 时，凹痕由一个单独的金色零件填满，可用第二种耗材打印；更改或移除纹理时它会一起变化。在 {{ui:inspector.more}} 下设置分叉、锯齿和崩边，换一个 {{ui:inspector.surfaceCrackSeed}} 就重新生成裂纹。

{{ui:surfaceTexture.bark}} 在原木上包一层树皮：{{ui:surfaceTexture.barkOak}}、{{ui:surfaceTexture.barkPine}}、{{ui:surfaceTexture.barkSpruce}}、{{ui:surfaceTexture.barkBirch}} 或 {{ui:surfaceTexture.barkBeech}}，各有自己的大小和深度。{{ui:surfaceTexture.wood}} 把实体变成一块木头：在 {{ui:inspector.surfaceWoodType}} 下选橡木、白蜡木、山毛榉、松木或胡桃木，在 {{ui:inspector.surfaceWoodCut}} 下选去皮原木或木板，弦切带拱形花纹，径切则是直纹。{{ui:inspector.surfaceRingWidth}} 让木纹细或粗。选 {{ui:inspector.surfaceEndRings}} 时，原木两端显示年轮，并与侧面的木纹对得上：年轮像真木头一样贯穿整个实体。在 {{ui:inspector.more}} 下添加 {{ui:inspector.surfaceWoodKnots}}，年轮会绕着它们弯曲。

用 {{ui:surfaceTexture.text}} 图案可以像压贴标签一样把文字贴到实体上：表面在该位置周围展开，所以字母在花瓶的鼓肚上、在斜壁上或跨过盒子的棱边时都保持大小。“环绕”（0° 是正面，90° 是右侧）和沿轴的“高度”（%）决定位置；轴设在 X 或 Y 时，0° 是顶部，这样文字就落在平板上。{{ui:inspector.surfaceDirection}} 让文字刻入或凸起。遇到真正的尖角时，它会像贴纸一样撕开；状态栏会提示。{{ui:prop.textVertical}} 在这里同样让字母从上到下排列。

要让实体的一部分保持光滑，或只给一部分加纹理，请用辅助实体：把盒子、圆柱或球放到相应位置，选中它，在 {{ui:inspector.surfaceMask}} 下选 {{ui:surfaceTexture.maskExclude}} 或 {{ui:surfaceTexture.maskOnly}}。它会变成透明，在另一个实体生成纹理时起作用，隐藏时也一样。打印前请隐藏或删除它。

结果是一个网格，就像导入的模型一样，并保留生成它时所用的实体。之后再选中它（保存后也可以），卡片会显示生成时的设置：修改后单击 {{ui:inspector.surfaceChange}}，纹理会在该实体上重新生成，位置和大小与纹理实体现在的一致。{{ui:inspector.surfaceRemove}} 恢复光滑的实体。更改纹理时遮罩实体会再次起作用：如果以后可能还要改，请隐藏而不是删除它们。撤销同样可以撤回其中每一步。

## 花瓶

{{ui:shape.vase}} 是专为花瓶、花盆和灯罩准备的实体。它的尺寸在 {{ui:inspector.properties}} 中，形状和图案在 {{ui:inspector.vaseForm}} 卡片上；所有设置随时都能更改，保存后也可以：

- {{ui:prop.vaseProfile}}：瓶形、鼓肚、带颈的碗、桶形、圆柱或漏斗。高度和最大直径是该形状自己的尺寸：拖动手柄，或输入 {{ui:prop.vaseDiameter}} 和 {{ui:prop.height}}。
- {{ui:prop.vaseSection}}：圆、圆角多边形或波浪（柔和、尖形、拱形或鳍形）。{{ui:prop.vaseTwist}} 让截面沿高度旋转，{{ui:prop.vaseSway}} 让它来回摆动。
- {{ui:prop.vaseBody}}：{{ui:vase.bodySolid}} 用于切片软件的花瓶模式（也叫螺旋化）：切片软件以螺旋方式只打印一层壁，省去顶部和填充，因此实体画成实心。{{ui:vase.bodyHollow}} 为普通打印生成真正的壁和底。
- {{ui:prop.vaseEffect}}：新花瓶是光面的。可选外侧的凹槽、条纹、Voronoi 单元或切面（低多边形），也可只放在高度上的一条带里；它们属于花瓶，随花瓶一起保持可编辑。

{{ui:prop.vaseSection2}} 让截面沿高度过渡到第二种截面，例如从底部的圆过渡到顶部的六边形。

花瓶设置上方的 {{ui:inspector.vaseDraw}} 会在工作区上方打开一个独立的大窗口：在里面按真实毫米亲手绘制花瓶。拖动标题栏可移动窗口，拖动角可放大；视图中的花瓶会跟随每一次更改。{{ui:vaseDraw.tabProfile}} 从侧面显示花瓶：拖动各点，最上面的点决定高度，最宽的点决定直径；{{ui:vaseDraw.handle}} 给点一个角度，{{ui:vaseDraw.corner}} 让它成为折角。{{ui:vaseDraw.tabSection}} 从上方显示截面，{{ui:prop.vaseDrawSymmetry}} 会镜像或重复你画的内容。{{ui:vaseDraw.tabTwist}} 把旋转画成一条沿高度的曲线。绘图软件的 SVG 文件可以成为截面或瓶身形状，样品花瓶的网格（STL、3MF、OBJ）可以成为瓶身形状。可以把花瓶照片放在绘图后面描摹，或用 {{ui:vaseDraw.takeOutline}} 提取它的轮廓。鼠标拖动一次就是一步撤销；拖动时，视图会粗略显示花瓶。

{{ui:inspector.vaseFloor}} 卡片收纳实体在形状之外还需要的东西。空心花瓶上：带朝向排水孔坡度的排水孔、空心底脚、镂空的壁（{{ui:prop.vaseCutout}}：Voronoi、蜂窝、菱形或圆形，适合灯笼和篮子），以及 {{ui:prop.vaseLamp}}：吊挂、装在灯座上或罩在 LED 灯片上。实心花瓶上，{{ui:prop.vaseReinforce}} 会切出细缝，切片软件在花瓶模式下借此一次打印出内部加强筋或双层壁。橡胶脚垫的凹槽两种都可用。{{ui:prop.vaseWatertight}} 把空心花瓶的壁和底加厚到至少 1.6 mm。

在 {{ui:inspector.vaseParts}} 卡片上为花瓶添加配件。{{ui:prop.vaseLegs}} 可以一体成型（成为花瓶的一部分），也可以做成插接式，在底部留插座；支架从下面托住花瓶。{{ui:prop.vaseSaucer}} 接住水，或藏在底脚里。空心花瓶可以放 {{ui:prop.vaseInsert}}：植物内胆、带储水层的自动浇水内胆、花茎或试管架。{{ui:prop.vaseLid}} 可以盖在瓶口上、卡进凹槽，或拧在壁内的螺纹上。{{ui:inspector.vasePartsMake}} 把这些零件作为独立对象摆在花瓶旁边，可直接打印，倒过来打印更好的会倒放。花瓶上已经有插座、凹槽或螺纹。更改设置后请重新摆放：之前的零件会被替换。如果某个零件不适合这个花瓶，编辑器会提示，例如内胆穿不过窄瓶颈时。

{{ui:inspector.vasePrint}} 卡片告诉你打印这个花瓶需要什么：以所选 {{ui:prop.vaseMaterial}} 计的重量和耗材长度；实心花瓶按切片软件的花瓶模式计算，即沿壁的一条线。下方是打印提示：超过 45° 的悬垂及其位置、太薄的壁、盖子、灯具或支脚需要什么，以及加强筋和双层壁的切片设置。

{{ui:prop.vaseQuality}} 决定花瓶划分三角形的精细程度：越细看起来越平滑，但大花瓶会让编辑器变慢。
