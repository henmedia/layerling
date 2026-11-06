---
title: 螺纹、齿轮和其他零件
summary: 相互配合的螺钉、螺母与螺纹孔，以及齿轮、弹簧、弯管、燕尾、泪滴孔、沉孔和锥形沉孔。
---

除了基本形状，形状库里还有一些自己拼起来会很麻烦的零件。它们之后都可以在设置中修改。

## 螺纹

在形状库中选择 {{ui:shape.thread}}。在 {{ui:inspector.threadRole}} 下决定它的类型：

- **{{ui:thread.rod}}：** 带螺纹的圆柱体，例如没有头的螺钉。
- **{{ui:thread.screw}}：** 带头部。你可以选择 {{ui:inspector.threadHead}}：{{ui:thread.headCylinder}}、{{ui:thread.headCountersunk}} 或 {{ui:thread.headHex}}。另有{{ui:thread.headSquare}}、{{ui:thread.headFlange}}（六角下带一个圆盘）、{{ui:thread.headWing}}和{{ui:thread.headKnob}}：后两种用手拧，初始宽度为螺纹直径的五倍，可平放打印、无需支撑；其{{ui:prop.headDiameter}}（蝶形头为{{ui:prop.headSpan}}）为螺纹直径的三到八倍。
  再往下可以设置{{ui:prop.headDiameter}}(六角头为{{ui:prop.headAcrossFlats}};沉头的直径随高度而定)以及头部端面的{{ui:inspector.threadDrive}}:{{ui:thread.driveHex}}、{{ui:thread.driveTorx}}、{{ui:thread.drivePhillips}}、{{ui:thread.driveSlot}}、{{ui:thread.driveRobertson}},或用手或扳手拧的螺丝选{{ui:thread.driveNone}}。{{ui:prop.driveSize}}是内六角的对边宽度、梅花星形的外径或十字的跨度;{{ui:prop.driveDepth}}是它的深度,最多为头部的十分之九,0 表示不要。只要不改动,这些值就随尺寸变化;六角头默认没有驱动。驱动属于精确实体,因此也会出现在 STEP 导出中。选择{{ui:thread.driveSlot}}时，{{ui:prop.driveSize}}是槽的长度，宽度为长度的五分之一，一字螺丝刀或硬币都能拧；初始长度为头部允许的最大值。 {{ui:thread.driveRobertson}}是加拿大常见的方头驱动：{{ui:prop.driveSize}}是方孔的对边宽度，默认取与规格相配的批头，M4 和 M5 为 2 号（2.84 毫米）。
  {{ui:prop.collarHeight}} 在头部与螺纹之间加一个圆形轴肩，例如作为星形旋钮下的垫块，或让头部离开零件的台阶；0 表示不加。{{ui:prop.collarDiameter}} 起始为螺纹直径的两倍，并始终在头部之内，因此轴肩无需支撑就能打印在头部上；螺纹保持原长。沉头没有轴肩。螺母有相同的两个字段：它的轴肩立在上表面上，比螺母窄，螺纹从中穿过，高度只计算主体。
- **{{ui:thread.nut}}：** 配套的螺母。配套的垫圈是一个{{ui:shape.tube}}：在{{ui:prop.washerSize}}中选择螺钉规格，外径、内径和厚度即按 ISO 7089 设置。在{{ui:inspector.threadNutShape}}中还可选{{ui:thread.nutSquare}}、{{ui:thread.nutFlange}}（六角下带圆盘）、{{ui:thread.nutWing}}或用手拧的{{ui:thread.nutKnob}}；蝶翼平放，所以蝶形螺母无需支撑即可打印。
- **{{ui:thread.bore}}：** 螺纹孔。它属于孔。把它拖进零件，将两者分组，零件就有内螺纹。 要做拧螺栓的孔，请始终使用{{ui:thread.bore}}：{{ui:thread.rod}}或{{ui:thread.screw}}作为孔时是螺栓的完整尺寸，没有间隙，会太紧。如果仍把它设为孔，layerling 会提示你，点击{{ui:inspector.threadMakeTappedHole}}即可改为{{ui:thread.bore}}。

![一个带圆柱头的螺钉。右侧：类型和头部形状，往下是规格、螺距和牙型。](shot:thread-screw)

在 {{ui:prop.threadSize}} 下从列表中选择规格：公制从 M2 到 M24，英制 UNC 和 UNF 从 No. 4 到 1 英寸，以及管螺纹 G1/16 到 G4。如果选择 {{ui:thread.customSize}}，就自行设置 {{ui:prop.diameter}} 和 {{ui:prop.pitch}}。对于英制或 G 规格，该字段要求填写 {{ui:prop.threadsPerInch}}，而不是以毫米计的螺距。

列表按系列对规格分组，字段下方的一行会给出所选规格的系列，并附上日常生活中熟悉的例子：

- **M，公制粗牙：** 符合 ISO 261 的 ISO 公制粗牙螺纹，与标准螺钉和螺母相同。
- **UNC，美制英寸粗牙：** 相机和三脚架螺钉为 1/4"-20 UNC（ISO 1222），较大的三脚架云台使用 3/8"-16 UNC。
- **UNF，美制英寸细牙：** 与 UNC 相同的直径，螺距更细（ASME B1.1）。
- **G，管螺纹：** 淋浴软管用 G1/2 连接，洗衣机进水管用 G3/4。花园水龙头末端为 G3/4，较小的水龙头为 G1/2；快接软管系统的水龙头接头就拧在这里。
- **{{ui:thread.group.NPT}}：** 美制锥管螺纹，符合 ASME B1.20.1，从 1/16" 到 4"，用于管件、阀门、压力表和气动工具。它靠锥度密封，通常配合生料带或密封胶。规格指的是管子：直径是管子的外径，也就是螺纹在大端的直径。选择 NPT 规格会打开{{ui:prop.threadTaper}}，并把牙型设为{{ui:thread.profileCustom}}，牙侧角 60°；之后再选其他规格，螺纹又变回直的。

G 规格是符合 ISO 228-1 的平行惠氏管螺纹，常见于水、燃气、液压和气动接头。规格指的是管子，而不是螺纹：G1 在螺纹处测得 33.249 mm。选择 G 规格会把牙型设为 {{ui:thread.profileWhitworth}}，选择公制或英制规格则设回 {{ui:thread.profileV}}。自己选定的 {{ui:thread.profileTrapezoidal}} 或 {{ui:thread.profileRound}} 牙型会保留。标准只定义螺纹，所以 G 规格的螺钉头和螺母会得到与你自行设置直径时相同的比例。锥形管螺纹 R、Rc 和 Rp 不包括在内。

列表中的最后一个系列 {{ui:thread.group.bottle}} 包含 PCO 1881：大多数水瓶和汽水瓶的 28 mm 瓶口，螺纹外径 27.4 mm，螺距 2.7 mm。它的螺纹牙顶宽而平，所以选择它时牙型会切换为 {{ui:thread.profileCustom}}，{{ui:prop.threadDepth}} 为 1.6 mm，{{ui:prop.threadFlankAngle}} 为 30°；之后选择的其他规格会恢复各自的牙型。瓶口用 {{ui:thread.rod}} 制作，瓶盖用 {{ui:thread.nut}}，或者从圆柱体中减去一个 {{ui:thread.bore}}。尺寸依照 OpenSCAD 库 BOSL2 所载的标准图纸；打印整个瓶盖之前先打印一个试件。油桶和洗洁精瓶没有统一标准：请测量你手上的瓶口，并在 {{ui:thread.customSize}} 中输入数值。

更多设置：

- **{{ui:prop.threadHand}}：** {{ui:thread.right}} 或 {{ui:thread.left}}。
- **{{ui:prop.threadStarts}}：** 多条螺纹并排，如丝杆：T8x8 有 4 头，每头 2 mm，每条每转升高 8 mm。此时螺距字段显示为{{ui:prop.threadDivision}}：相邻两条螺纹之间的距离，决定牙型深度，下方的提示给出导程。列表中的规格和锥螺纹只有一头。
- **{{ui:prop.threadProfile}}：** {{ui:thread.profileV}} 是公制和英制螺纹的标准牙型，{{ui:thread.profileWhitworth}} 是 G 管螺纹的牙型：55°，牙顶和牙底为圆角。{{ui:thread.profileTrapezoidal}} 和 {{ui:thread.profileRound}} 的牙顶和牙底是平的。这种牙型通常打印更可靠，因为不会产生细薄的牙尖。
- **{{ui:prop.threadTaper}}：** 螺纹直径按 1:16 收窄，就像锥管螺纹一样；此时{{ui:prop.diameter}}是大端的直径。{{ui:thread.rod}}或{{ui:thread.screw}}朝顶部的末端变细，{{ui:thread.nut}}或{{ui:thread.bore}}朝顶部的入口变宽，所以把锥形螺杆倒过来就能拧进去。任何牙型都可以做成锥形，锥形螺纹也是精确实体，可用于边缘工具和 STEP 导出。
- **{{ui:thread.profileCustom}}：** 自行塑造的梯形，带有等宽的平牙顶和平牙底。{{ui:prop.threadFlankAngle}} 是一颗牙两个牙侧之间的夹角：60° 是尖锐的 V 形螺纹，30° 是梯形螺纹；在 90° 或更小时，任何牙侧都不会比 45° 更平，因此螺纹无需支撑即可打印。{{ui:prop.threadDepth}} 和 {{ui:prop.threadCoreDiameter}} 是同一个尺寸的两种说法：芯径等于直径减去两倍深度，改动其中一个就会改变另一个。新的自定义牙型从 60° 的 V 形螺纹深度开始。深度有限制，取决于角度和螺距：不得浅于螺距的十分之一，不得深于直径的 40%，也不得深到两个牙侧占据超过十分之九的螺距。如果改变螺距，深度按比例跟随；如果缩放螺纹，深度也同样跟随。间隙和倒角的作用与其他牙型相同。通过 MCP 桥接时，牙型为 `custom`，并带 `threadFlankAngle` 和 `threadDepth`。
- **{{ui:prop.clearance}}：** 对于螺母和螺纹孔，这是确保打印出的一对零件真能转动起来的余量。打印机越粗，这一对需要的间隙越大。它是整个直径上的额外余量，而 V 形螺纹牙侧之间的缝隙大约只有它的一半，所以打印件需要比想象中更大的值：新螺母从 0.4 mm 开始，0.3 偏紧，0.5 偏松。先打印一对测试件。螺纹杆和螺钉在这里有自己的间隙，会让螺栓的直径相应变细。它设为 0。余量加在哪一侧取决于你如何配对：
  - **打印的螺钉配打印的螺母：** 螺钉保持 0，把余量给螺母（它初始的 0.4 mm）。
  - **真实螺钉配打印螺母或螺纹孔：** 打印的一侧承担全部余量，所以螺母保留 0.4 mm。如果螺钉晃动，值得试试更紧的 0.3 mm。
  - **打印的螺钉配真实螺母：** 真实螺母没有间隙，所以螺钉必须更细：这里用 0.3 到 0.4 mm，与打印螺母本来会有的量相当。
- **{{ui:prop.axialClearance}}：** 对于螺母和螺纹孔，这是在 {{ui:prop.clearance}} 之外沿轴向的活动量。螺母的每颗牙都会变薄这么多，直径保持不变。原因在于：{{ui:prop.clearance}} 只作用于直径，把 V 形螺纹的牙侧张开到其数值的约 0.58 倍。想要牙侧之间留出空隙的人只能把直径开大，代价是左右晃动。沿轴向的活动量把两者分开。它设为 0，所以已保存的螺纹不会改变；最大可到螺距的五分之一，因为超过这个值螺母的牙就不剩什么了。该字段只对螺母和螺纹孔存在；螺纹杆和螺钉保留自己的间隙。更多内容见下文“3D 打印用的螺纹”。
- **{{ui:prop.threadChamferTop}}、{{ui:prop.threadChamferBottom}}、{{ui:prop.headChamfer}} 和 {{ui:prop.rimChamfer}}：** 两端的倒角，让螺纹起始干净，头部没有锐边。螺纹杆、螺母或螺纹孔的每一端都有自己的倒角，所以顶端可以长、底端可以短或没有。螺钉只在尖端有一个，标为 {{ui:prop.chamfer}}。在螺母或螺纹孔上，倒角是孔口超出外径的扩张量；锥面以 45 度一直延伸到螺纹芯部，因此外径处不会留下台阶。

在 {{ui:thread.rod}} 和 {{ui:thread.bore}} 之间切换螺纹会保留其长度。螺母和螺钉则从各自的标准尺寸开始。
- **{{ui:prop.quality}}：** 螺纹计算的精细程度。越高越精确，但越慢。

打印螺纹是另一个话题。在打印大零件之前，先做一对螺钉和螺母作为测试，并根据你的打印机调整间隙。

## 3D 打印用的螺纹

打印出的螺纹需要在两处留出空隙，它们的作用不同：

- **直径上的间隙（{{ui:prop.clearance}}）：** 让螺母变宽。于是螺钉每侧有该值一半的空隙，0.4 mm 时每侧 0.2 mm。螺纹转动轻松，但螺钉会左右晃动。
- **沿轴向的活动量（{{ui:prop.axialClearance}}）：** 让螺母的牙变薄。螺钉在未拧紧时可以沿轴向前后移动这个量。它不会额外增加侧向的空隙。

两者合起来形成牙侧之间的缝隙：约为直径间隙的 0.58 倍再加上沿轴向的活动量。以 0.3 mm 的缝隙为例：以前需要在直径上留 0.5 mm，也就是每侧 0.25 mm 的空隙。现在直径上 0.2 mm（每侧 0.1 mm）加上轴向 0.2 mm 就够了，缝隙为 0.32 mm。

**需要知道的后果**

- **螺钉沿轴向有活动量。** 没有负载时，它可以前后移动这个量。对于紧固件、盖子和外壳，这无所谓；对于需要精确定位的丝杠就有影响，所以那里要留小或设为 0。
- **螺母的牙会变薄。** 在 1.75 mm 螺距下取 0.3 mm，每颗牙在中间几乎薄了三分之一，强度明显下降。重载零件请改用更粗的螺纹。
- **计算量更大。** 牙形会增加额外的点，所以螺纹的三角形更多，计算稍慢。
- **惠氏牙型在 STEP 导出中没有真正的圆弧。** 带轴向活动量的 {{ui:thread.profileWhitworth}} 螺纹，在边缘工具和 STEP 导出中会变成由直线段拼成的牙形，而不是真正的圆弧。设为 0 时一切保持原样。

**提示**

1. **先做一对测试件。** 一个螺钉和一个螺母，各只有 4 到 6 mm 高，几分钟就能打完。并排打印三对活动量不同的零件，挑出转动轻松且不晃动的那一对。
2. **从常用的数值开始。** 直径间隙 0.2 到 0.3 mm，沿轴向活动量 0.2 mm。如果螺钉左右晃动，减小直径间隙；如果卡住，增大沿轴向活动量。如果不想用沿轴向活动量，就照旧在直径上取 0.4 mm。
3. **沿轴向的活动量应至少为一个层高。** 低于一层的量打印机无法分辨。层高 0.2 mm 时，0.2 mm 是不错的起点；层高 0.1 mm 时，少一些就够。
4. **竖直打印螺钉和螺母。** 轴线朝上，每一圈都落在完整的层里，牙侧才会干净。平放时牙侧会下垂。
5. **细螺距很难。** 螺距低于约 1 mm 时，螺纹圈常常粘在一起。较粗的螺纹，或牙顶平的 {{ui:thread.profileTrapezoidal}} 牙型，比细 V 形螺纹打印更可靠。
6. **避免细薄的牙尖。** V 形螺纹的牙尖很窄，打印机的喷嘴宽度几乎覆盖不到。{{ui:thread.profileTrapezoidal}} 和 {{ui:thread.profileRound}} 牙型的牙更平。
7. **去毛刺并磨合。** 最初的几圈常常发涩，因为牙侧上残留着打印的小凸起。来回转几次就会顺畅。起始处的倒角有助于拧入。
8. **换了打印机或耗材。** 活动量取决于打印机、材料和喷嘴。更换其中任何一个后，请重新打印测试件。

边缘工具会把螺纹当作精确实体。你可以在螺纹已就位的情况下，对承载它的零件倒角或圆角，也可以处理螺钉头的边缘，参见[断开边与抽壳](chapter:edges-and-hollowing)。计算螺纹的边需要一些时间：M6 几秒钟，G1/2 管螺纹约半分钟。给螺钉头断边最快的方法仍然是属性里的头部倒角。

## 齿轮

{{ui:shape.gear}} 有 {{ui:gear.spur}}、{{ui:gear.helical}}、{{ui:gear.herringbone}} 和 {{ui:gear.bevel}}，还有 {{ui:gear.internal}} 和 {{ui:gear.rack}}（见下文）。新齿轮在 {{ui:prop.gearProfile}} 下为 {{ui:gear.profileInvolute}}：带有渐开线牙侧的齿，与齿轮生成器和工程中的用法一致。这样的齿能彼此平顺地滚动。你设置 {{ui:prop.teeth}} 的齿数（6 到 500）和 {{ui:prop.gearModule}}，尺寸随之确定：外径为模数 ×（齿数 + 2），分度圆为模数 × 齿数。新齿轮从模数 2 开始。两个齿轮啮合的条件是模数相同、{{ui:prop.gearPressureAngle}} 相同（通常为 20°），并且中心距为（齿数 + 齿数）× 模数 / 2。同时选中两个齿轮，属性面板会给出该中心距以及当前的中心距。如果齿轮应保持在原位，它还会给出使它们在此处啮合的模数，{{ui:inspector.gearPairFitApply}} 一步即可让两个齿轮都采用该模数；每个齿轮的齿数、高度和中心孔保持不变。如果有两个以上的齿轮，这样做会破坏前一对：中间齿轮的模数又会改变。这时改用 {{ui:inspector.gearPairKeep}}，对两个齿轮各用一次：该齿轮保持原样，另一个齿轮采用它的模数，并沿两个中心的连线移到二者啮合的距离。齿轮链要一对一对地调整，每次都保留已经就位的那个齿轮。如果此时一齿对着另一齿而不是齿槽，就把其中一个齿轮转半个齿，即 180° 除以其齿数。{{ui:prop.gearBacklash}} 会从齿上削去一点，避免打印出的一对零件卡死。该值针对这一对齿轮，每个齿轮承担一半；0.2 mm 是不错的起点，0 则得到精确的齿轮。在基圆以下，牙侧笔直向下延伸到齿根，不像刀具加工那样有根切。这适合打印，但齿数低于约 17 的很小齿轮可能会在齿根处轻微摩擦。

斜齿轮增加了 {{ui:prop.helixAngle}}。使用渐开线齿时，它是分度圆上的真实螺旋角：两个斜齿轮啮合的条件是模数相同、角度相同，一个为正、一个为负。{{ui:gear.herringbone}} 是两半旋向相反的斜齿轮：齿沿一个方向延伸到一半高度，然后反向回来，像箭头一样。这对 3D 打印有两个好处：齿轮会在轴上自行对中，而且没有轴向推力，因为两半的力相互抵消。相比之下，斜齿轮会沿其轴线向侧面推。你像设置斜齿轮那样设置 {{ui:prop.helixAngle}} 和 {{ui:prop.helixQuality}}；角度对每一半都适用。两个人字齿轮啮合的条件是模数相同、角度相同且符号相反，一个为正、一个为负。中间没有铣削人字齿轮那样的退刀槽：两半无台阶地相接。

锥齿轮采用渐开线齿，并让齿向顶部逐渐变小。这是一种近似，不是精确计算出的锥齿轮副。

{{ui:gear.profileRound}} 是由圆弧构成的圆形齿，类似 Tinkercad 的 Useful gear：齿顶与齿槽无棱角地相接。小齿轮这样打印更宽容，转动也更轻松，在旋钮上齿还能带来舒适的握感。圆齿同样由 {{ui:prop.teeth}}、{{ui:prop.gearModule}} 和 {{ui:prop.gearBacklash}} 设定；它们没有压力角。它们比渐开线齿矮，所以外径为模数 ×（齿数 + 1.2）。相同模数的圆齿齿轮可以啮合，中心距与渐开线齿轮相同；与渐开线齿轮则配不上。

{{ui:gear.profileSimple}} 是目前所有齿轮都用的直齿。在那里手动设置 {{ui:prop.toothSize}} 和 {{ui:prop.toothWidth}}。旧设计会一直保留它们，直到你更改齿形。三种齿形都有 {{ui:prop.centerHole}}。

{{ui:gear.internal}} 的齿朝内：一个较小的齿轮在其中运行的外齿圈，就像行星齿轮组的外轮。它像渐开线或圆齿齿轮那样通过 {{ui:prop.teeth}}、{{ui:prop.gearModule}} 和 {{ui:prop.gearBacklash}} 设置，另外还有 {{ui:prop.gearRim}}，即齿外侧的轮缘。其外径为模数 ×（齿数 + 2.5）加上两倍轮缘；圆齿则为模数 ×（齿数 + 1.7）。相同模数的齿轮在其中运行的条件是，其中心距齿圈中心（齿圈齿数 − 其齿数）× 模数 / 2；同时选中两者，属性面板会给出该距离。对于行星齿轮组，齿圈齿数 = 太阳轮齿数 + 2 × 行星轮齿数，例如 30 = 12 + 2 × 9。齿圈没有中心孔，它本身就是环。齿数在 26 到 33 之间时，其齿顶最多短四分之一个模数，因为否则会在基圆处形成极小的棱边；啮合不受影响。

{{ui:shape.hirth}} 是一个圆盘，顶面是一圈从中心向外放射的 V 形齿。把它的副本翻过来，就能在一个齿的任意整数倍角度上与它啮合：可用于可调角度的铰链、三脚架云台或会咔哒定位的旋钮。每条齿顶线和齿根线都是穿过轴上同一点的直线，因此齿从中心的零高度增长到边缘的全高，两半会彼此自动对中。你设定 {{ui:prop.teeth}} 的数量（6 到 90）、边缘处的 {{ui:prop.hirthToothHeight}}、{{ui:prop.centerHole}}（0 表示无）和 {{ui:prop.diameter}}；齿顶达到全高。齿高最多可达接头的整个高度：此时齿根在边缘处一直到达底面，适合放在另一个实体上面的齿。新接头的齿为直角，改变齿数或尺寸时会保持齿面之间的夹角，属性面板会显示该角度；只有齿高会改变它。{{ui:prop.hirthProfile}} 可以从 {{ui:hirth.profileSymmetric}} 切换为 {{ui:hirth.profileSaw}}：此时每个齿的一个齿面在边缘处以 {{ui:prop.hirthSteepFlank}} 中设定的角度立于端面（45° 到 90°，90° 即直角台阶），另一个齿面占据齿的其余部分，因此接头朝一个方向可沿平缓齿面转过，朝另一个方向则卡住。{{ui:prop.hirthReverse}} 会交换两者。此时属性面板显示平缓齿面的角度。翻转的副本同样能与锯齿啮合。接头像圆柱一样保持圆形，因为拉伸后齿就无法在整圈上啮合：工作平面上的每个手柄都只改变它唯一的直径。要做配对件，复制接头，绕 X（前后方向）转 180°，放到第一个上面，中心对中心，抬高其高度减去齿高：这样每个齿顶都落在齿根里。绕其他轴旋转可能对不上，因为那样会齿顶对齿顶。Hirth 接头对边工具和 STEP 导出来说是精确实体。

{{ui:shape.pulley}} 是用于节距 2 mm 的 GT2 同步带的带轮，大多数 3D 打印机都用这种皮带；齿槽为由圆弧构成的 GT2 形状。节距固定，因此由 {{ui:prop.teeth}}（10 到 200）决定大小：外径 = 齿数 × 2 mm / π 减 0.51 mm，20 齿为 12.22 mm。自下而上依次为：挡边、宽度为 {{ui:prop.pulleyBeltWidth}} 的齿部（6 mm 皮带约 7 mm）、第二个挡边和轮毂；{{ui:prop.pulleyFlange}}（0 表示没有）、{{ui:prop.pulleyFlangeRise}}、{{ui:prop.pulleyHubHeight}}（0 表示没有）、{{ui:prop.pulleyHubDiameter}} 和 {{ui:prop.centerHole}} 在属性中设置。侧边手柄改变齿数，顶部手柄改变皮带宽度；如需顶丝，用一个孔圆柱穿过轮毂。带轮是精确实体，可用于边工具和 STEP 导出。

{{ui:gear.rack}} 是半径无穷大的齿轮：一根沿一侧带齿的条，使用渐开线齿时牙侧是压力角下的直线。其宽度（沿 X）为齿数 × 齿距，齿距为 π × 模数，所以同一模数的齿条可以首尾相接，每一端都落在齿槽里。其长度（沿 Y）是条的厚度，可自由设置，只要齿和半毫米的条能放得下。齿朝前，即朝向主视图的观察者；根据需要转动齿条。相同模数的齿轮在其上滚动的条件是，其中心位于节线前方齿数 × 模数 / 2 处；节线在齿顶后方一个模数处，圆齿则为 0.6 个模数。齿圈和齿条有渐开线和圆齿两种，没有简单齿；切换齿轮类型会保留模数。

边缘工具和 STEP 导出把每个齿轮当作其精确实体，渐开线牙侧是平滑曲线。椭圆形轮廓上的斜齿轮仍是三角形网格，从约 31 齿起的渐开线斜齿轮也是如此。人字齿轮在这两种情况下同样仍是三角形网格。从约 31 齿起，这只适用于边缘工具：STEP 导出在任何齿数下都按精确实体写出这种齿轮，非常大的齿轮最多需要约一分钟。小齿限制了边能圆角到什么程度：对于简单齿的齿轮，直径 30 mm、12 齿时，两齿之间齿根处的平面只有约 0.65 mm 宽，所以给每条边倒圆最多到约 0.5 mm；锥齿轮顶部更小，最多约 0.4 mm。斜齿轮和人字齿轮的齿是倾斜的，这会在其斜边上收窄那个平面：螺旋角相对于齿轮高度越大，能容纳的圆角越小。两个平端面的边可以倒圆，但只给这些边倒角会在 CAD 内核中失败；请改为倒圆，或以更小的尺寸（例如 0.2 mm）给所有边一起倒角。渐开线齿、螺旋角约 15 度及以上（默认即如此）的人字齿轮不能一次给所有边倒圆或倒角；请分别给两端或两半相接处的边倒圆。

## 弹簧

{{ui:shape.spring}} 有 {{ui:prop.turns}} 和 {{ui:prop.wire}}。它们与高度一起决定弹簧的软硬。{{ui:prop.springHand}} 决定线材的走向：{{ui:spring.right}} 像常见的压簧，或 {{ui:spring.left}}。

边缘工具和 STEP 导出把弹簧当作其精确实体：沿螺旋线的圆线材，两端切平。例如，你可以给这两个线材端头倒圆或倒角。

在{{ui:prop.springForm}}中可把弹簧改为{{ui:spring.flat}}：一条在底板上呈波浪延伸、在自身平面内弹性变形的带子，平放打印。{{ui:prop.springPattern}}可选{{ui:spring.round}}、{{ui:spring.zigzag}}或{{ui:spring.square}}，{{ui:prop.springEnds}}可选带孔的{{ui:spring.eye}}、横跨带子的{{ui:spring.tab}}或{{ui:spring.none}}。{{ui:prop.bends}}和{{ui:prop.band}}决定它有多软；长度是弹簧的长度，宽度是波浪的幅度，高度是打印厚度。扁平弹簧同样是精确实体。

## 弯管

一个 {{ui:shape.bentTube}} 最多由十二段组成：一段直管，接着一个弯。每一段你设置 {{ui:prop.bentTubeSegmentLength}}、{{ui:prop.bentTubeBendAngle}}、{{ui:prop.bentTubeBendRadius}} 和 {{ui:prop.bentTubeRoll}}。正在编辑的段会在管上以橙色高亮，方便你跟上顺序。滚转角为 0° 时在工作平面内弯曲，90° 时管子向上弯。轮廓可以是圆形、方形、六边形或八边形，内部同样如此，也可以完全实心。如果管子撞到自己，layerling 会提醒你。

## 放样

{{ui:shape.loft}} 把底部的一个轮廓与顶部另一个轮廓连接起来，就像 Fusion 里的放样：从一种直径到另一种直径的软管接头、把方形风扇接到圆管上、向上逐渐变圆的支架。每一端你选择 {{ui:prop.loftBottomOutline}} 和 {{ui:prop.loftTopOutline}}：{{ui:loft.round}}、带 {{ui:prop.loftBottomCorner}} 的 {{ui:loft.rectangle}}，或带角数的 {{ui:loft.polygon}}，再加上每一端的宽度、长度和高度。{{ui:prop.loftOffsetX}} 和 {{ui:prop.loftOffsetZ}} 把顶端向侧面移动，形成倾斜过渡；底端保持在原处。

{{ui:prop.loftWall}} 把实体变成上下开口的管。两端开口的横向尺寸都比外形小一个壁厚；壁倾斜处会略薄一些。把框架拖大，两端也随之扩大，而圆角半径和壁厚保持不变。

{{ui:prop.loftSmooth}} 让过渡变得平滑。为 0 时，侧面从底部到顶部笔直延伸，像圆锥一样。为 100 时，两侧从两端笔直出发，在中间沿 S 曲线改变尺寸：软管接头从窄管平滑地扩到宽管，而不是像漏斗那样直斜。中间的数值在两者之间混合。平滑过渡可与 {{ui:prop.loftWall}}、扭转、倾斜和侧向偏移一起使用；带壁的管两端仍保持开口。它和直边放样一样是精确实体，所以其边可以倒角和倒圆，但它由多个截面构成，计算会稍慢。

{{ui:prop.loftSegments}} 设定圆和圆角绘制得有多精细：一个整圆在视图以及 STL、OBJ 和 3MF 中由多少段直线组成。初始值为 96，对大多数零件已足够平滑；对于想看起来没有小平面的大圆端，可调高到 360。段数越多文件越大。多边形保持你设定的 {{ui:prop.loftBottomSides}}。当某端是圆形或带圆角时会显示该字段。

{{ui:prop.loftTwist}} 在上升过程中让截面绕竖直轴均匀旋转，任一方向最多 360°；侧面于是盘旋而上。{{ui:prop.loftTiltX}} 和 {{ui:prop.loftTiltZ}} 让顶端倾斜，最多 45°：正值会抬高其前缘或右侧。中间的截面按各自份额倾斜，所以壁面平滑地过渡到斜面上。最高点保持在设定高度。如果之后高度变得太小，使倾斜端会伸到平台以下，倾斜会退让到刚好放得下。沿路径弯曲（例如管道弯头）不是放样能做的。

{{ui:prop.loftSectionCount}} 在底部和顶部之间最多添加十二个截面，用于不只是从一个轮廓过渡到另一个轮廓的实体：机身、带瓶颈的瓶子、有腰身的花瓶。每个截面都有自己的轮廓、宽度和长度、圆角半径或角数、离底部的高度，以及相对底端中心的侧向偏移；{{ui:prop.loftSection}} 选择下方字段所针对的截面，和弯管的各段一样。新截面放在最大的间隙中，尺寸介于相邻截面之间，并成为接下来显示的那个。{{ui:prop.loftThrough}} 设定实体如何穿过它们：{{ui:loft.throughSmooth}} 让一个曲面穿过每个截面，并且在两个截面之间保持在它们的尺寸之内，不会鼓出去；{{ui:loft.throughStraight}} 在截面之间用平直的壁连接。{{ui:prop.loftWall}} 在这里也适用。扭转、倾斜和 {{ui:prop.loftSmooth}} 只用于只有两端的放样，在中间有截面时隐藏。没有截面的放样保持原样。

放样是精确实体，扭转和倾斜后也是：其边可以倒角和倒圆，STEP 导出会保留它。照常添加带螺钉孔的法兰，然后分组。

## Gridfinity

{{ui:shape.gridfinity}} 形状用来制作 Gridfinity（Zack Freedman 的开放式收纳系统）的零件：42 mm 网格上的收纳盒，放在底板里，并且可以彼此堆叠。尺寸遵循已发布的 Gridfinity 规范，所以 layerling 做的收纳盒能装进其他生成器做的底板，反之亦然。layerling 不属于 Gridfinity 项目，该项目以 MIT 许可证发布。在 {{ui:prop.gridfinityType}} 下选择：

- **{{ui:gridfinity.bin}}：** 每个网格单元下方都有支脚的收纳盒。{{ui:prop.gridfinityUnitsX}} 和 {{ui:prop.gridfinityUnitsZ}} 按 42 mm 的网格单元计数（收纳盒小 0.5 mm，一个单元为 41.5 mm）；{{ui:prop.gridfinityUnitsY}} 按 7 mm 的高度单元计数，最多 20。壁顶的 {{ui:prop.gridfinityLip}} 托住下一个收纳盒的支脚，并使收纳盒增高 4.4 mm：3 单元带卡边的收纳盒高 25.4 mm。启用 {{ui:prop.gridfinityMagnets}} 后，每个支脚的每个角都会得到一个用于 6 × 2 mm 磁铁的孔。
- **{{ui:gridfinity.baseplate}}：** 收纳盒所站的底板，高 5 mm，每个网格单元有一个插槽。它是没有底面、没有磁铁孔的开放框架；开启 {{ui:prop.gridfinitySwallowtail}} 后，它立在底面上（见下文）。
- **{{ui:gridfinity.tray}}：** 任意尺寸的平底托盘，用于桌游收纳和不需要网格的零件。{{ui:prop.length}}、{{ui:prop.width}} 和 {{ui:prop.height}} 可以自由设置（mm）：长宽 10 到 252 mm，高 3 到 140 mm。它没有底脚、堆叠卡边和磁铁孔，因此不能放进底板，也不能堆叠；它的四角与收纳盒一样，按 3.75 mm 半径倒圆。下文关于收纳盒内部的内容同样适用于托盘：底面厚 1.2 mm，可以设置；隔板和标签台一直延伸到顶部；它们和取物口在任何留有空间的高度都可以使用；隔间数量以每个至少 6 mm 宽为限，每边最多 24 个，总共最多 40 个。收纳盒改为托盘时保持尺寸，底板改为托盘时高 20 mm，托盘改回收纳盒或底板时取整到整网格单元；在 {{ui:workspace.title}} 的 {{ui:workspace.shapeDefaults}} 中把类型设为 {{ui:gridfinity.tray}} 时，新托盘起始为宽 80 mm、长 40 mm、高 20 mm。

收纳盒和底板的尺寸始终是整数网格单元（或下文半尺寸网格的 21 mm 单元），最大 6 × 6（252 mm，适合 256 mm 的打印床）；拖动手柄会吸附到最近的单元。打印床更大时，可以打开 {{ui:prop.gridfinityLargePlate}}，底板最多 12 × 12 个单元（504 mm）；在 {{ui:workspace.title}} 中选好打印机后，比打印床大的底板会被标出。关闭后，更大的底板会回到 6 个单元并保留留边；12 × 12 时，计算它的边或导出 STEP 大约需要半分钟。壁厚（0.95 mm）、底面（1.2 mm）和磁铁孔深度（2.4 mm）不在规范中；孔深固定，壁厚可以设置，底面可以抬高（见下文）。规范中的 M3 螺钉孔不会做出。卡边顶部是尖的，与规范画法一致；如果你的打印机打出来有毛边，用边缘工具倒圆或倒角。收纳盒、底板和托盘是精确实体，所以圆角、倒角和 STEP 导出都能用。要给收纳盒分格，把薄长方体作为隔墙分组进去：让它们立在底面上，即高 5.95 mm 处（或抬高的底面上），对于带卡边的收纳盒，顶部至少保持在每个高度单元 7 mm 下方 0.5 mm 处，从收纳盒底面量起（3 单元为 20.5 mm），因为下一个收纳盒的支脚会向下伸入收纳盒 0.35 mm。打印收纳盒和底板时无需支撑，按它们在打印床上的姿态直立打印。

不是矩形的抽屉（切掉一角、后壁是圆的或呈 L 形）可以用贴合其轮廓的底板。把抽屉内部画成草图，或使用任何站在工作平面上的形状，把它和一块底板一起选中，然后在属性中点击 {{ui:inspector.gridfinityOutlineFit}}。底板会填满该形状所在的底面区域，向内缩进 0.25 mm：42 mm 整格排在同一网格上，网格移到能放下最多格的位置（横向和纵向各最多 6 格，打开 {{ui:prop.gridfinityLargePlate}} 时各 12 格），其余全部为实心，因此每个插槽仍能放普通收纳盒。底板会移到那里；形状保持不动。之后底板的尺寸以 mm 计，{{ui:prop.length}} 和 {{ui:prop.width}} 会拉伸它的轮廓；{{ui:prop.width}} 下方的提示会说明它有多少格。关闭 {{ui:prop.gridfinityOutline}} 后，它会变回带留边的整单元底板。轮廓最大可以和一块底板一样大：每边 334 mm，打开 {{ui:prop.gridfinityLargePlate}} 时为 586 mm，只要轮廓需要，它就保持开启；抽屉是斜的话，请在贴合前先把底板随它转过去。轮廓每边至少 10 mm，最多 1000 个点。抽屉的照片也可以提供轮廓：先在两个已量好距离的点上使用 {{ui:sketch.calibrateImage}}，再使用 {{ui:sketch.traceImage}}。斜着拍的照片尺寸并不准确，所以请把描出的轮廓当作起点，并检查它的尺寸。

分几块打印的底板可以用 {{ui:prop.gridfinitySwallowtail}} 连接，它得名于古埃及神庙中把石块固定在一起的燕尾形扣件。开启后，底板立在 2.4 mm 厚的底面上，高度从 5 mm 变为 7.4 mm：插槽止于底面，所以收纳盒会高出 2.4 mm。每条没有留边的侧边下方，在每个格子的中间有半个蝴蝶结形凹槽，深 2 mm，两块底板并排且格子对齐时，就在接缝处合成完整的凹槽。{{ui:inspector.gridfinityKeys}} 会把连接件平放在底板前方，可以直接打印：后侧和右侧的每个凹槽各一个，这样跨越与下一块底板接缝的每个凹槽都有一个。再次点击会重新放置连接件，之前为这块底板放置的连接件会被替换。从下方把一个连接件压入每个跨越接缝的凹槽：它开槽的两端会挤过凹槽底部的凸台，然后在其后方弹开，于是卡入到位，把底板连在一起。凸台只在连接件两端开槽的位置，所以连接件中间可以自由跨过接缝。{{ui:prop.gridfinitySwallowtailClearance}} 设置每个连接件比它的凹槽小多少，不更改时每侧 0.05 mm：如果连接件在你的打印机上卡住或折断，就调大它；如果装得松，就调小它，然后再次点击 {{ui:inspector.gridfinityKeys}}；底板保持不变。有留边的侧边朝向抽屉的一面内壁，没有凹槽；贴合轮廓的底板对其抽屉来说是一整块，没有 {{ui:prop.gridfinitySwallowtail}} 开关。Swallowtail 同样不属于规范。

收纳盒也可以做在半尺寸网格上：开启 {{ui:prop.gridfinityHalfGrid}}，此时 {{ui:prop.gridfinityUnitsX}} 和 {{ui:prop.gridfinityUnitsZ}} 按 21 mm 的单元计数，最多 12（与 6 单元相同的 251.5 mm）。每个单元都有自己的支脚，顶部宽 20.5 mm，带有规范中的台阶，四个这样的支脚站在普通底板的一个插槽里，所以 1½ 或 2½ 单元的收纳盒能与整数单元的并排使用。开启 {{ui:prop.gridfinityHalfGrid}} 时收纳盒保持其轮廓（2 单元变成 4 个单元）；关闭时，奇数个单元会向上取整为整数单元。卡边照旧跟随收纳盒的轮廓。启用 {{ui:prop.gridfinityMagnets}} 后，每个支脚得到一个孔，从其中点向位于 42 mm 网格上的那个单元角偏移两个方向各 2.5 mm，从收纳盒左后角算起：当该角位于网格的一个角上时，这些孔会与其他生成器做的带磁铁底板的孔对齐；奇数单元的收纳盒还可以转 180°，让这个角位于右前方的网格角上。底板仍保持 42 mm 网格。半尺寸网格不属于规范。

高度为 3 个单元或以上的收纳盒可以沿内壁设置标签台：以任意组合开启 {{ui:prop.gridfinityLabelBack}}、{{ui:prop.gridfinityLabelFront}}、{{ui:prop.gridfinityLabelLeft}} 或 {{ui:prop.gridfinityLabelRight}}。每个开启的标签台都有自己的 {{ui:prop.gridfinityLabelWidth}}、{{ui:prop.gridfinityLabelLength}}，较短的标签台还有 {{ui:prop.gridfinityLabelOffset}}；它们下方的拐角设置适用于所有标签台。标签台顶部平整，可贴标签，前部有 1.2 mm 的下垂条，底面以 36 度上升。其顶部位于每个高度单元 7 mm 下方 0.85 mm 处，从收纳盒底面量起（3 单元为 20.15 mm），所以堆叠在卡边上的收纳盒支脚与其保持 0.5 mm 的间隙。低于 3 单元的收纳盒不显示标签台；回到 3 单元时它们会恢复。标签台不属于规范。

{{ui:prop.gridfinityLabelWidth}} 是标签台伸入收纳盒的深度：14 mm，3 单元的收纳盒中最多 17.2 mm（抬高底面时更少），在 1 单元深、2 mm 拐角的收纳盒中两个相对的标签台为 16.8 mm。{{ui:prop.gridfinityLabelLength}} 为 0 时，标签台从一面墙延伸到另一面墙。较短的标签台（至少 10 mm）会显示 {{ui:prop.gridfinityLabelOffset}}，把它从所在墙的中间移开：在主视图所示的后墙和前墙上向右移，在侧墙上向前移。如果一端距墙在 1 mm 以内（带堆叠卡边时为 1.8 mm，因为卡边的支撑在那里向内倾斜），或者停在该墙的标签台上，就会继续延伸进去，两个在拐角相遇的标签台会合为一个。当标签台与墙或另一个标签台相接且有余地时，拐角会倒圆或倒角：在 {{ui:prop.gridfinityLabelCorner}} 下选择 {{ui:gridfinity.labelRound}} 或 {{ui:gridfinity.labelChamfer}}，并用 {{ui:prop.gridfinityLabelCornerSize}} 设置尺寸（2 mm；0 保持尖锐）。选择 {{ui:gridfinity.labelRound}} 时，较短标签台自由端的前角也会倒圆，尺寸相同，但最多为标签台宽度的一半。

收纳盒还可以沿任意内壁设置取物口，让细小零件能沿曲面被推出，而不必在底面与墙相接处抠出来：以任意组合开启 {{ui:prop.gridfinityScoopBack}}、{{ui:prop.gridfinityScoopFront}}、{{ui:prop.gridfinityScoopLeft}} 或 {{ui:prop.gridfinityScoopRight}}。底面沿四分之一圆升入墙内，从一面墙延伸到另一面墙，相邻墙上的两个取物口在拐角处相接。带取物口的收纳盒，其每条底面边也会按 2.8 mm（内角半径）倒圆，取物口就是所在墙上这处圆角的放大。一旦开启取物口，开关下方会出现 {{ui:prop.gridfinityScoopRadius}}，并作用于所有取物口：在你设置之前，它是从底面到卡边支撑离开墙面处这段高度的一半，即每个高度单元 7 mm 下方 1.65 mm 处，从收纳盒底面量起（带卡边的 3 单元收纳盒为 6.7 mm，抬高底面时更少）；没有卡边的收纳盒则一直到顶部。它至少为 3.5 mm，并至少比该高度小 0.5 mm，在收纳盒横向至少留下 2 mm 的底面，无论是两个相对的取物口之间，还是取物口与其对面的墙之间。1 单元高的收纳盒没有空间做取物口，也不显示相关开关；到 2 单元时会恢复。取物口同样不属于规范。

收纳盒还可以有抬高的底面，作为可切出形状的实心坯料：{{ui:prop.gridfinityFloorHeight}} 设置底面的高度，从收纳盒底面量起（在你设置之前为 5.95 mm，即支脚上的 1.2 mm 底面），收纳盒到该高度为止都是实心。带卡边时，只要底面不高于卡边支撑离开墙面处，即每个高度单元 7 mm 下方 1.65 mm（3 单元为 19.35 mm），收纳盒上仍可堆叠，这样卡边保持完整，堆叠其上的收纳盒支脚保持 1.3 mm 的间隙。高于该高度时卡边也被填满，收纳盒成为一个实心块，顶面平齐于卡边顶部，即每个高度单元 7 mm 上方 4.4 mm（3 单元为 25.4 mm）：与旁边带卡边的收纳盒一样高，没有供上方收纳盒堆叠的卡边，也没有可倒角的边缘，所以 {{ui:prop.gridfinityLipChamfer}} 会消失；由于没有内部空间，{{ui:prop.gridfinityWallThickness}} 也会消失。在两者之间，该字段不接受任何高度：向上时，无论输入、步进还是拖动，都会继续到卡边顶部；从已填满的收纳盒向下时，会停在仍可堆叠的最高底面。从早期版本的收纳盒中保留下来，或由更薄的壁厚留下的两者之间的高度，同样按这个最高底面构建。没有卡边时，它可升到顶部，收纳盒成为一个实心块。把工具形状的孔分组进去，深度随你需要。取物口从抬高的底面开始，标签台伸入收纳盒的深度会减小，使其底面仍止于底面之上；一旦底面让它们没有空间，相关开关就会消失（带卡边的 3 单元收纳盒中，取物口在高于 15.35 mm 时消失，标签台在高于 15.54 mm 时消失），降低底面后又会恢复。带卡边、壁厚不超过 1.6 mm 的 1 单元高收纳盒没有空间容纳仍可堆叠的底面：其中抬高的任何底面都会把它填到卡边顶部，即 11.4 mm。抬高底面同样不属于规范。

对于收纳盒，{{ui:prop.gridfinityCornerRadius}} 会让外角的圆角小于规范的 3.75 mm，最小到 0 即直角，这样在抽屉里并排的收纳盒在四个相交处只留下 0.5 mm 的缝隙。只有外壁采用它，从脚上方 0.5 mm 开始：脚、内部以及叠放时收纳盒所靠的唇边斜面都保持原来的圆角，因此收纳盒仍能放进底板并像以前一样叠放，单格收纳盒也仍能落在其插座的斜面上。在直角处，壁以平面结束，与唇边顶部齐平（没有唇边时与收纳盒顶部齐平），或与其倒角的底部齐平。开放侧上的角本来就是直角。

收纳盒还可以分成隔间，而无需把隔墙分组进去：在 {{ui:inspector.gridfinityCompartments}} 下，就在 {{ui:inspector.properties}} 下方，{{ui:prop.gridfinityCompartmentsX}} 和 {{ui:prop.gridfinityCompartmentsZ}} 设置数量，每个方向每个网格单元最多 4 个（半尺寸网格的每个单元 2 个），总共最多 40 个。隔板贯穿整个高度，从底面（或抬高的底面）一直到每个高度单元 7 mm 下方 0.85 mm 处，标签台也止于那里，所以堆叠在卡边上的收纳盒照常安放。隔板要求收纳盒至少有 2 个高度单元，且底面至少低于其顶部 3 mm；空间不足时收纳盒会在没有隔板的情况下构建，等又有空间时它们会恢复。{{ui:prop.gridfinityDividerThickness}} 在设置前为 1.2 mm，范围为 0.8 到 3 mm。隔板初始均匀分布。要移动某一块，在 {{ui:prop.gridfinityDividerAcross}} 或 {{ui:prop.gridfinityDividerDeep}} 下选择它（从左或从后计数），并设置其 {{ui:prop.gridfinityDividerPosition}}，从左墙或后墙内侧量到隔板中间；每个隔间至少保持 6 mm 宽。一旦移动过隔板，调整收纳盒尺寸时，该方向的隔板会以毫米为单位保持位置；重新设置隔间数量会让该方向的隔板再次均匀分布。每个隔间都有收纳盒的内角，按 2.8 mm 倒圆，其底面边也按 2.8 mm 倒圆，无论有没有取物口。取物口会在每个隔间重复：后墙上有取物口时，每个隔间的后侧都有一个，靠着墙或隔板。在狭窄的隔间里，半径会减小，以保留 2 mm 的平整底面；如果隔间窄到连 3.5 mm 都放不下，该方向的取物口就会消失；{{ui:prop.gridfinityScoopRadius}} 下方的提示会说明。隔板同样不属于规范。

带隔板的收纳盒可以在每个隔间里设置标签台，而不是沿墙的标签台：沿墙的标签台是给没有隔间的收纳盒用的，当收纳盒重新变成一个隔间时，它们的开关会恢复。在高度为 3 个单元或以上的收纳盒中，用 {{ui:prop.gridfinityCompartmentRow}} 和 {{ui:prop.gridfinityCompartmentColumn}} 选择一个隔间（各自在多于一个时显示），并在 {{ui:prop.gridfinityCompartmentLabel}} 下选择其标签台所靠的一侧，即收纳盒的墙或某块隔板；只有当该侧的标签台仍能让隔间保持开口时，才会提供这一侧。{{ui:prop.gridfinityCompartmentLabelLength}} 的范围是 10 到 100；如果标签台会短于 4 mm，就不做，并在其下方提示说明。较短的标签台会显示 {{ui:prop.gridfinityLabelOffset}}：在后侧或前侧时为 {{ui:gridfinity.alignLeft}}、{{ui:gridfinity.alignMiddle}} 或 {{ui:gridfinity.alignRight}}，在左侧或右侧时为 {{ui:gridfinity.alignBack}}、{{ui:gridfinity.alignMiddle}} 或 {{ui:gridfinity.alignFront}}。{{ui:prop.gridfinityLabelWidth}} 在设置前为 14 mm，在狭窄隔间中更小，而且标签台绝不会伸到把隔间封死：其前方至少保持 6 mm 开口。这些标签台的剖面与沿墙的标签台相同，{{ui:inspector.properties}} 下的 {{ui:prop.gridfinityLabelCorner}} 和 {{ui:prop.gridfinityLabelCornerSize}} 也适用于它们。

每个标签台，无论沿墙还是在隔间里，都可以带一行文字，作为收纳盒的一部分凸出其顶面 0.4 mm：在标签台各项设置下方的 {{ui:prop.text}} 中输入，一行最多 24 个字符。只要有一个标签台带文字，拐角设置下方的 {{ui:prop.font}} 就为所有标签台选择一种字体，内置字体或自己的字体均可，与文字相同：{{ui:font.title}} 窗口里的 {{ui:font.use}} 也能把字体应用到选中的收纳盒上，设计会保存收纳盒所用字母的轮廓，因此在另一台电脑上打开时字母保持不变。文字按字距调整排列，并在标签台顶面允许的范围内尽量放大。{{ui:prop.font}} 下方的 {{ui:nameTag.letterSize}} 设定大写字母的高度，每个标签台都相同，使长短不同的标签彼此一致；对它来说太小的标签台会把字母放大到它允许的程度，设为 0 时每个标签台都把字母尽量放大。带堆叠卡边且壁厚 0.95 mm 时，文字离墙 1.5 mm，因为卡边的支撑在此探到标签台上方；没有卡边或靠着隔板时离墙 0.3 mm；离前缘 0.4 mm，离自由端 0.4 mm，若其角为圆角则离开圆角的大小（未设置时为 2 mm）；并避开内角的圆角和在拐角处相接的另一个标签台。后侧和前侧标签台上的文字从收纳盒前方阅读，侧面标签台上的文字沿其墙从收纳盒内部看去阅读；镜像的收纳盒文字方向仍然正确。文字顶部比叠放在卡边上的收纳盒底脚低 0.1 mm。如果大写字母会低于 3 mm，这段文字将被略过，下方会有提示说明；缩短文字，或加宽、加长标签台即可腾出空间。托盘没有文字，因为它的标签台一直到顶部。文字是精确实体的一部分，因此 STEP 导出中也有它们。在镜像的组里，文字会反着显示，文本也是如此；取消组合后，收纳盒会把它们恢复正确。边缘工具一次最多精确处理 700 段轮廓，所选全部收纳盒的文字合并计算：Multilanguage 约 35 个字母，Serif 或 Script 约 15 个；超过时，部分收纳盒会以网格交给边缘工具。若要用另一种颜色打印文字，在切片软件中于标签台顶面高度加入换色，3 个单元的收纳盒为 20.15 mm；它也会让上方的一切换色：墙的最上方 0.85 mm 和卡边，共 5.25 mm。

{{ui:prop.gridfinityLabelColor}}位于{{ui:prop.font}}下方，为收纳盒所有标签台上的文字设定单独的颜色。在你选择之前，文字使用收纳盒的颜色，该行下方的提示会说明这一点；旁边的箭头会让文字恢复收纳盒的颜色，选择收纳盒的颜色也一样。收纳盒仍是一个实体：视图中文字的顶面和侧面显示为它们的颜色，3MF 会在收纳盒唯一的对象中给这些面赋予该颜色，并像在切片软件中涂色那样，用各自颜色对应的耗材为它们以及文件中的其他所有面涂色，因此 Bambu Studio、PrusaSlicer 2.9、OrcaSlicer 以及基于它的切片软件（如 Snapmaker Orca 和 ElegooSlicer）会用单独的耗材打印文字，无需换色。切片软件会以自己耗材的颜色显示它们：文件中的第一种颜色（通常是收纳盒的颜色）是耗材 1，文字的颜色是下一个，文件中的每个实体都一样，因此请把这些耗材设为你想要的颜色。已在 Snapmaker Orca 中试过；尚未在 Bambu Studio、ElegooSlicer 或 PrusaSlicer 2.9 中试过：欢迎反馈。Cura 既不读取颜色也不读取涂色；对它来说，上文所述的换色方法依然适用。OBJ 只在点上带颜色，因此两种颜色之间的边界并不清晰。STL 和 STEP 导出只有一种颜色；经过边缘工具、{{ui:editor.tool.hollow}}、{{ui:editor.tool.split}}或{{ui:editor.tool.simplify}}之后的收纳盒也是如此，这些操作留下的是不带收纳盒设置的实体，即使之后用{{ui:editor.tool.makeExact}}转为精确实体也一样。如果收纳盒与另一个同色实体重叠，导出时可能会把两者合并为一个实体，这时文字会使用收纳盒的颜色。在组或捆绑中，只要{{ui:inspector.multicolor}}开启，文字就保留自己的颜色，正如各部件保留各自的颜色，组被放入另一个组时也是如此。新建的实体组，以及有孔切到收纳盒的组，开始时该选项为关闭，只有一种颜色。

收纳盒还可以在任意一侧开放，这样并排放置的收纳盒能连成一长条：打开 {{ui:prop.gridfinityOpenBack}}、{{ui:prop.gridfinityOpenFront}}、{{ui:prop.gridfinityOpenLeft}} 或 {{ui:prop.gridfinityOpenRight}}，可任意组合；四个全开时只剩脚上的底板。开放侧在底板以上没有壁，也没有叠放唇边。旁边的壁和它们的唇边笔直延伸到收纳盒的外形并以直角结束，因此两个相邻的开放收纳盒和任意两个收纳盒一样相距 0.5 mm，底板也平直延伸到边缘并在那里以直角结束。开放侧上的标签台或指槽不会生成，其开关也会消失，该侧靠隔板的指槽也一样；该设置会保留，等你再次关闭该侧时使用。旁边壁上的标签台和指槽，以及与之相接的隔板，都会延伸到边缘；隔间在开放侧不提供标签台，已经在那里选择的会被略去，{{ui:prop.gridfinityCompartmentLabel}} 下的提示会说明。脚和磁铁孔保持不变。叠放在开放收纳盒上的收纳盒只靠封闭侧的唇边支撑。底板抬到顶部（有唇边时抬到唇边顶部）的收纳盒是实心块，不显示开放侧的开关。开放侧同样不属于规范。

打开的一侧也可以只部分开放，做成伸手进去的槽口或前面较低的壁。在开关下方，每个开放侧都有自己的几行，这里以前侧为例：{{ui:prop.gridfinityOpeningDepthFront}} 是开口的深度，从唇边顶部向下量（没有唇边时从收纳盒顶部），至少 2 mm；{{ui:prop.gridfinityOpeningWidthFront}} 是它沿该侧的宽度，至少 5 mm；{{ui:prop.gridfinityOpeningPositionFront}} 是它的位置：{{ui:gridfinity.alignLeft}}、{{ui:gridfinity.alignMiddle}} 或 {{ui:gridfinity.alignRight}}；位于一端时，{{ui:prop.gridfinityOpeningDistanceFront}} 是它离该端的距离。起初开口就是向下到底板的整个侧面，即上面描述的开放侧。深度距底板不到 0.5 mm 时会直通到底板，宽度与整个侧面相差不到 0.5 mm 时就是整个侧面。小于这些的开口会保留该侧的壁、圆角和唇边，并从中切出一个平底直角端的缺口：直通到底板就是槽口，横贯整个侧面就是较低的壁。开口留在两个角之间的直壁部分，或在完全开放的相邻侧旁延伸到边缘（那里的壁没有圆角）；直段短于 5 mm 的侧面会完全开放。缺口两侧的底板、隔板和唇边都保留，因此叠放在上面的收纳盒仍坐在唇边上，而该侧的标签台、指槽和隔间标签台和任何开放侧一样保持关闭。对于因壁而成为实心的收纳盒，打开的一侧会完全开放。部分开放的一侧仍有壁，因此即使四侧都打开，{{ui:prop.gridfinityWallThickness}} 也会保留。一旦某侧部分开放，开放侧各行下方会出现 {{ui:prop.gridfinityOpeningCorner}}（{{ui:gridfinity.labelRound}} 或 {{ui:gridfinity.labelChamfer}}）和 {{ui:prop.gridfinityOpeningCornerSize}}（在你设定之前为 0 即直角；最大 10 mm，该行提供的最大值以最大的角所能容纳的为准），它们对从壁外看到的缺口角——上面两个和下面两个——进行倒圆或倒角，所有部分开放的侧面都一样。上面的角先取用尺寸，下面的角得到深度剩下的部分，因此尺寸超过深度一半时下面的角会更小，一旦上面的角用完全部尺寸，下面的角就保持直角。每个角取用的尺寸以缺口及其旁边的壁所能容纳的为限，因此对于放在一端的开口，那一端的上角不会大于开口到该端的距离；如果某个角会恰好结束在壁边缘旁，它会缩小最多 0.5 mm 以避开边缘，小于 0.5 mm 时保持直角。横贯整个侧面的开口没有上角，在完全开放的相邻侧旁延伸到边缘的开口在那一端也没有。有唇边时，上角只在外壁上完整地倒圆或倒角，在倒角唇边下稍小一些；再往里，唇边向下倾斜的地方会更小。

底板可以加衬边，用于宽度不是整数个网格单元的抽屉：{{ui:prop.gridfinityPaddingBack}}、{{ui:prop.gridfinityPaddingFront}}、{{ui:prop.gridfinityPaddingLeft}} 和 {{ui:prop.gridfinityPaddingRight}} 在网格外加上与底板 5 mm 高度（使用 {{ui:prop.gridfinitySwallowtail}} 时为 7.4 mm）相同的实心边框，每侧 0 到 41 mm。网格仍是整数个 42 mm 的单元，并远离加了衬边的一侧移动，外角保持圆角，除非 {{ui:prop.gridfinityCornerRadius}} 改变它。底板尺寸是包括衬边的整块底板；改变衬边会保持单元数，拖动一侧会改变单元数并保持衬边。要填满一个抽屉，在 {{ui:prop.gridfinityDrawerWidth}} 和 {{ui:prop.gridfinityDrawerDepth}} 中输入它的内部尺寸：每个方向上底板取能放下的单元数，最多 6 个（使用 {{ui:prop.gridfinityLargePlate}} 时为 12 个），并把剩余部分减去 0.5 mm（让底板能放进去）后平均分给该方向两侧的衬边；这两行显示底板所填满的抽屉。宽 230 mm 的抽屉得到 5 个单元即 210 mm，加上 19.5 mm 的衬边，总共 229.5 mm；请确认底板放得进你的打印床。一块底板在你的打印床上填不满的抽屉，就用几块底板并排，每块只在朝向抽屉壁的那几侧加衬边；用衬边那几行设定它们的衬边。收纳盒会保留衬边设置，但生成时不使用；变回底板时它们会恢复。

## 铰链

{{ui:shape.hinge}} 一次打印成型，之后可以活动（打印即组装）：两片叶片平摊在平台上，中间沿一根轴交替排列铰链节。销属于后片，并带间隙穿过前片的铰链节。你设置 {{ui:prop.hingeLength}}、{{ui:prop.hingeOpenWidth}} 和 {{ui:prop.hingeKnuckleDiameter}}，还有 {{ui:prop.hingeKnuckles}} 的数量（奇数，这样销两端都被固定）、{{ui:prop.hingePinDiameter}} 和 {{ui:prop.hingeLeafThickness}}。

{{ui:prop.hingeClearance}} 是活动部件之间的间隙：销周围、铰链节之间以及叶片前方。0.4 mm 时，调校良好的打印机通常轻轻一扭就能松开；如果部件粘在一起，就加大；如果晃得太厉害，就减小。按平台上的姿态平放打印铰链，不要支撑（下文的抬高叶片则需要在下方加支撑）。如果你更想用自己的销，例如一段耗材或铁丝，在小铰链上它比打印的销更光滑，就开启 {{ui:prop.hingePinless}}：打印的销被略去，孔径等于销直径加间隙，贯穿每个铰链节，包括两端。用 {{ui:prop.hingeAngle}} 你让第二片绕销折起，把铰链摆成设计中的姿态：0° 平躺如打印时，180° 为闭合，低于 0° 时则越过平躺继续向下折，最多到 -180°。角度不会在两片相碰处停下；用 {{ui:editor.tool.clearance}} 并开启 {{ui:clearance.splitParts}} 可以看出它们是否接触。铰链节保持原位，铰链仍是一体；在就地打印前记得设回 0°。你可以给叶片加孔，或把它们分组进更大的零件，例如盖子。

铰链也可以做成{{ui:hinge.styleCone}}（在{{ui:prop.hingeStyle}}下）：每隔一个关节的两端是圆锥，嵌入相邻关节的锥形凹坑。没有销，也没有可能下垂的长悬空桥，所以可以平放打印；圆锥为 45°。和其他样式一样，它是精确实体，因此倒角和圆角对它有效，STEP 导出包含它真正的圆锥；关节对圆锥来说太短时，会做得更少。除了关节数量，也可以指定{{ui:prop.hingeKnuckleWidth}}：关节不会比它更宽，数量由长度决定；输入关节数量会取消宽度。

{{ui:hinge.styleLiftOff}} 做出像许多门上那样的可拆式铰链：两个铰节，下方的带着销子一直到端部，上方的是可以从销子上拔出的套筒，所以盖子或门可以取下再挂回去。它总是两个铰节。它和其他样式一样平放整体打印；要竖着打印、销子朝上，就用 {{ui:inspector.separateParts}} 把它拆开，把带销的那件立在它的铰节上，另一件立在它的套筒上：这样两件都不需要支撑。另一侧用镜像。在 {{ui:prop.hingeScrewHead}} 下，所有样式都可选 {{ui:hinge.screwNut}}：在每个孔上方开一个六角螺母槽，位于合上时朝向另一片的那一面，这样从下方拧入的螺栓能固定；{{ui:hinge.screwCountersunkNut}} 把后片（带销的那片）做成沉头，前片开螺母槽。{{ui:prop.hingeNutWidth}} 是螺母的对边宽度；为 0 时按孔取值（M3 5.8 mm，M4 7.3 mm，含间隙）。槽深等于螺母高度，但下面留 0.6 mm 的叶片，所以叶片越厚，螺母嵌得越深。

{{ui:prop.hingeStyle}}有三个选项：{{ui:hinge.stylePin}}、{{ui:prop.hingePinless}}（为自备销留的孔）和{{ui:hinge.styleCone}}。选圆锥时，{{ui:prop.hingeConeSize}}决定圆锥从关节长出处的大小；圆锥越大越牢固，默认取能放下的最大值。带圆锥的铰链没有销也没有孔，所以它的翼板可以和整个关节一样厚：把{{ui:prop.hingeLeafThickness}}设为关节直径，翼板就与关节齐平；这样的铰链最多打开约 90°，因为厚翼板会相碰。

要用螺钉固定铰链，设置 {{ui:prop.hingeScrewHoles}}：沿轴最多六个孔，孔径为你选择的 {{ui:prop.hingeScrewDiameter}}。在 {{ui:prop.hingeScrewHead}} 下，它们默认为 {{ui:hinge.screwCountersunk}}，90° 用于沉头螺钉，位于铰链合上时朝向另一片的那一面，因此螺钉头齐平；{{ui:hinge.screwStraight}} 则保持直孔。不设其他数值时，孔平均分配长度并位于每片的中间；{{ui:prop.hingeScrewSpacing}} 和 {{ui:prop.hingeScrewAcross}} 按中心距设定它们，例如为了对上你要替换的购买铰链。每个孔到边缘、铰节和下一个孔之间都至少保留半毫米的片；放不下那么多时就少放，字段会说明。{{ui:prop.hingeCornerRadius}} 会把两片的四个外角倒圆。无论有无销轴，孔和圆角在 STEP 导出和边工具中都保持精确。

在 {{ui:prop.hingeLeafStyle}} 下，{{ui:hinge.leafFingers}} 让每个铰节有自己的指片，宽度与铰节相同，而不是每侧一片整板；两侧的指片像两把梳子一样交错。由于没有指片位于另一侧铰节的下方，铰链可以完全翻转，使用 {{ui:hinge.styleCone}} 样式且指片与铰节一样厚（{{ui:prop.hingeLeafThickness}} 达到 {{ui:prop.hingeKnuckleDiameter}}）时，它能平平地合上，一侧的指片夹在另一侧的指片之间。没有板把一侧的指片连起来：用打印销轴时它们挂在销轴上，用锥体或在装上你自己的销轴之前，它们是松散的零件。把每一侧连接到你的模型上，例如一把梳子连到盒子，另一把连到盒盖，或与模型分组。这时 {{ui:prop.hingeCornerRadius}} 会把指尖倒圆；指片不带螺钉孔。

{{ui:hinge.leafRaised}} 把前片抬高，使铰链合上时它平贴在后片上，中间留出 {{ui:prop.hingeClearance}}：它抬高的量为 {{ui:prop.hingeKnuckleDiameter}} 减去两倍 {{ui:prop.hingeLeafThickness}} 再减去间隙，并且起点离轴稍远一些，以保持与其他铰节之间的间隙。这样的铰链在两片相碰之前能打开到远远越过平躺的位置：铰节 6 mm、叶片 1.1 mm 时，低于 0° 约 125°，也就是从闭合算起约 305°，而普通铰链在 84° 左右就会停住。抬高的叶片是悬空打印的，所以要从平台开始给它加支撑。螺钉孔、沉头和螺母槽随它一起移动，合上时仍朝向另一片。使用 {{ui:hinge.styleCone}} 样式时，两片叶片及其间的间隙必须容纳在铰节直径之内，因此较厚的叶片会被调薄。

## 弹性关节（Flexi）

{{ui:editor.tool.flexi}} 把一个扁平的实体变成可以活动的小玩偶，例如鱼、蛇或龙，一次打印成型（print-in-place）。实体由你自己画或搭建，例如用草图或拉伸的 SVG。工具沿实体长度横向把它切成若干节，并在每个切口处加一个关节：一节带着一根竖直的轴，中间比上下两端粗，下一节带间隙地把它包住。这样关节既能卡住又不会粘连，所有斜面都是 45°，无需支撑即可打印。各节之间留出一道楔形缺口，宽度对应各节向两侧摆动的角度。

选中实体（多个部件会合并，其中的孔会被减去），点击 {{ui:editor.tool.flexi}}。在窗口中设置沿哪一边切分（{{ui:flexi.axis.auto}} 取较长的一边）、{{ui:flexi.joints}} 的数量、{{ui:flexi.clearance}}（一般 0.4 mm 即可）以及 {{ui:flexi.swing}} 的角度。关节大小会按实体自动确定；取消 {{ui:flexi.autoSize}} 后可自己填写 {{ui:flexi.size}}。取消 {{ui:flexi.evenLinks}} 后可以设定第一个关节离起点、最后一个离终点的距离，比如让头部保持为一整块。关节所在处，实体至少应约 6 mm 高、12 mm 宽；放不下时，窗口会告诉你是哪一个。

把 {{ui:flexi.bend}} 设为 {{ui:flexi.bend.fold}} 后，各节改为上下翻折，就像柔性钥匙扣、彩蛋或手环上的条带。每个切口会变成一个平躺着横穿物体、位于一半高度的铰链：三个或五个并排的铰节，轮流属于两侧的两节，其中一节的每个铰节上都有一个 45° 的锥体，伸进另一节相邻的铰节里。铰节旁边的切口从侧面看是一个 V 形，张开的角度由 {{ui:flexi.fold}} 决定。铰链的尺寸取自物体的高度，因此这里不需要设置关节大小；放铰链的位置物体至少应高 3.5 毫米（5 毫米以上更牢固）、宽约 15–20 毫米。

结果是一组关节节段（网格）的捆绑，按摆放的样子直接打印。如果不满意切分，撤销后换别的数值再试。先用两三个关节试打一次，就能看出间隙是否适合你的打印机。

## 滚花

{{ui:shape.knurl}} 是布满四周沟槽的圆形握持面，用于旋钮、拨轮和工具手柄。在 {{ui:prop.knurlPattern}} 下选择 {{ui:knurl.straight}}（沿轴线的沟槽，像控制旋钮）、{{ui:knurl.diamond}}（两排斜向沟槽交叉成小菱形），或 {{ui:knurl.round}}（沿轴线的沟槽和凸脊形成柔和的圆弧波纹，握感舒适而没有锐利的棱）。圆形沟槽保持浅于半个齿距，否则凸脊会在根部鼓起；深度过大会自动退让。你设置 {{ui:prop.diameter}} 和 {{ui:prop.height}}、{{ui:prop.knurlCount}} 的数量和 {{ui:prop.knurlDepth}}；交叉滚花还要设置相对轴线的 {{ui:prop.knurlAngle}}。{{ui:prop.knurlChamfer}} 以 45 度断开两端，像车削的旋钮；0 则保持尖锐。

直纹和圆形滚花是精确实体，所以其边可以断开和倒圆。交叉滚花仍是网格，因为作为精确实体，30 条沟槽要计算将近一分钟。要给轴上的旋钮用，把滚花与一个孔分组，例如设为螺纹孔的 {{ui:shape.thread}}。浅于 0.4 mm 的沟槽几乎没有打印机能够干净地打出，而且 layerling 不会让它们沿握持面间隔小于 0.8 mm：细的握持面得到的沟槽更少。

## 燕尾

{{ui:shape.dovetail}} 是一种两个零件相互锁住、只能从侧面滑入的接头。你设置宽端的宽度、{{ui:prop.dovetailNeckWidth}} 以及燕尾的长度。为另一侧复制燕尾，并把副本设为孔：{{ui:prop.dovetailClearance}} 随后提供一点间隙，使接头打印后不会卡死。

> **提示：** 分组时，螺纹孔会切入与其重叠的零件。所以把它稍微放入材料中，而不是只接触表面。

## 泪滴孔

侧放的孔打印时顶部会形成一段桥，桥会下垂。因此 {{ui:shape.teardrop}} 顶部有一个尖角：每一层都落在下一层上，孔无需支撑就能打得足够圆。把 {{ui:prop.teardropDiameter}} 设为孔的尺寸，M3 螺钉约为 3.4 mm，并让 {{ui:prop.teardropLength}} 足够长，以穿透零件。{{ui:prop.teardropTipAngle}} 为 90°，所以牙侧在 45° 相接。大多数打印机都能干净地处理；更平的尖端需要更多高度，更陡的尖端则更省高度。

把泪滴孔设为孔，并与零件分组。其长度沿深度方向，尖端朝上。要在另一个方向开孔，就让它绕竖直轴旋转 90°。

侧放的**螺纹孔**同样会在顶部下垂。给它配一个自己的泪滴孔：添加一个 {{ui:shape.teardrop}} 孔，其 {{ui:prop.teardropDiameter}} 为螺纹芯部，即齿让出的直径（M10 约为 8.4 mm），长度与螺纹孔相同，然后同时选中两者。点击 {{ui:editor.tool.align}}，让它们在中间对齐——泪滴孔的中心是其圆部的中心，而不是带尖端的外框中心，所以两个圆彼此重合——再把两者与零件分组。螺纹照常切出，尖端打开孔的顶部，因此无需支撑即可打印。

## 接口开孔

电子产品外壳需要给线缆留开孔。{{ui:shape.port}} 就是这种开孔：一个横放的、带圆角的挖空体。在 {{ui:prop.portPreset}} 中选择接口（{{ui:port.usbC}}、{{ui:port.microUsb}} 或 {{ui:port.usbA}}），它就会得到该接口的尺寸，并在每边多留约 0.25 mm 间隙。{{ui:port.usbCPlug}} 用于装在壁后面的接口，插头外壳需要伸进来。宽度、高度和 {{ui:prop.portCorner}} 都可以手动修改，此时列表显示 {{ui:port.custom}}。{{ui:port.hdmi}}、{{ui:port.miniHdmi}}、{{ui:port.microHdmi}}、{{ui:port.displayPort}} 和 {{ui:port.miniDisplayPort}} 像接口本身一样把下方的角斜切掉，DisplayPort 只切左下角；{{ui:port.rj45}} 适用于网络接口。这些尺寸来自厂商推荐的面板开孔和 VESA 图纸。 {{ui:prop.portClearance}} 会在此基础上在每一侧再加间隙，列表仍显示该接口：打印的盒子用 0.2 到 0.5 mm，让电路板能滑进去。

对于航模电池和电机，列表里有{{ui:port.xt30}}、{{ui:port.xt60}}、{{ui:port.mt60}}和{{ui:port.mpx}}，横放，四周比插头大约宽 0.25 mm，让插头能穿过——尺寸取自 Amass 和 Multiplex 的图纸。{{ui:port.dsub9}}是串口（RS-232 或 RS-485）插头的面板开孔，两侧像插头一样倾斜。它的两个螺丝孔（3.18 mm）一并带上，相距 24.99 mm，位于开口的中间高度：开口和孔是一个组，会一起移动和旋转，与墙壁成组后三者一起被切开。

对于 Anderson Powerpole（PP15、PP30 和 PP45），列表里有{{ui:port.powerpole1}}到{{ui:port.powerpole4}}：外壳并排拼插，每极 7.9 mm，留出燕尾榫凸舌的位置，四周约有 0.25 mm 余量——尺寸来自 Anderson 的图纸。

{{ui:shape.sbcBoard}} 是按实际尺寸做的单板计算机，用来围绕它设计外壳：带四个安装孔的电路板，以及各自着色的元件：轮廓各异的插座——两端圆形的 USB-C、下角切掉的 HDMI 插座——带开口的 USB 和网口外壳、带圆形套环的音频插孔、每针一个圆点的排针、作为方块的较大芯片。在 {{ui:sbcBoard.board}} 下选择：Raspberry Pi 5、4 Model B、3 Model B+ 或 Zero 2 W、BIGTREETECH Pi V1.2，或小型 ESP32 板之一：Seeed Studio XIAO ESP32-C6、ESP32-C3 Super Mini 或 ESP32-C6 Super Mini——这些没有安装孔，USB-C 在右端，邮票孔引脚显示为圆点。两块 Super Mini 没有厂商图纸；它们的尺寸来自社区发布的模型，全部是估计值。带 USB-C 和 HDMI 的前边缘朝向你。轮廓和孔来自厂商的图纸和模型；没有图纸给出的高度是估计的。

电路板显示其螺丝柱应放在哪里，以及外壳需要多高。对于开口，在 {{ui:sbcBoard.clearance}} 下给接口留出余量——打印外壳用 0.2 到 0.5 mm——把电路板的副本设为孔，放到电路板在外壳中的位置并与外壳分组：边缘的每个接口都会在壁上切出它的开口。真实接口只伸出电路板 1 到 3 mm，比许多壁都薄：{{ui:sbcBoard.reach}} 让边缘的每个接口在其一侧再向外伸出这么多，从而完全切穿——比壁厚稍多一点。换一块板或改变设置会在原位重新生成它。每块板都以同样的方式使用这两个设置。

microSD 卡槽也是左边缘的接口，位于电路板下方（Zero 2 W 上在上方），因此延伸量会切出卡穿过壁的通道；这时电路板立在卡槽上，比其底面低 1.4 mm。排线也可以引出：{{ui:sbcBoard.ribbonUp}} 让摄像头、显示屏和 PCIe 接口向上穿过盖子开口，{{ui:sbcBoard.ribbonSide}} 让每个接口的开口沿其长边——排线离开的方向——延伸到较近的边缘，再加上延伸量；在 Raspberry Pi 5 上，摄像头和显示屏排线从 PCIe 一端引出，三个开口上下叠放，在 Pi 4 和 3 B+ 上摄像头的开口在显示屏的上方。{{ui:sbcBoard.gpioUp}} 让排针向上穿过盖子，用于 HAT 或杜邦线。向上的部分会伸出其顶部 {{ui:sbcBoard.upReach}}，至少 20 mm，并在周围留出余量。

它默认是挖空体，朝向前方。把 {{ui:prop.portDepth}} 设得比壁厚稍大，移到电路板上接口所在的位置，再与外壳组合。用于侧壁时，绕竖直轴旋转 90°。

## 沉孔与锥形沉孔

螺钉头常常不应该凸出。{{ui:shape.counterbore}} 为内六角螺钉（DIN 912）切出圆形的沉孔，{{ui:shape.countersink}} 为沉头螺钉（DIN 7991）切出锥形沉孔。两者都以头部一端朝上：{{ui:prop.screwHoleHead}} 是沉孔或锥面的直径，{{ui:prop.screwHoleShaft}} 是其下方的孔，{{ui:prop.screwHoleLength}} 是总长度。沉孔上你设置 {{ui:prop.screwHoleHeadDepth}}，锥形沉孔上设置 {{ui:prop.screwHoleAngle}}（90° 适合沉头螺钉）。默认值适合 M3 螺钉。

{{ui:shape.doubleCountersink}} 是两面都倒角的孔，用于正面和背面都要整洁的板件。它在形状库里没有单独的条目：取用 {{ui:shape.countersink}}，并在其属性中开启 {{ui:prop.screwHoleBothSides}}（本身就是双面锥形沉孔的实体已显示该开关开启）：两端各有一个锥面张开到 {{ui:prop.screwHoleHead}}，中间是 {{ui:prop.screwHoleShaft}}。你照旧设置 {{ui:prop.screwHoleAngle}} 和 {{ui:prop.screwHoleLength}}。如果孔太短，容不下两个完整的锥面，它们会以该角度在中间相接，杆部会比你设置的更宽：10 mm 的头部、6 mm 的杆部、90° 和 2 mm 的长度会形成两个从 10 mm 收窄到 8 mm 的锥面。作为孔，它像其他孔一样被推穿零件。

把形状设为孔，并与零件分组。让它的顶端略高于头部应贴合的表面，使沉孔开口干净。要给六角螺母做沉孔，就用六边的 {{ui:shape.polygon}} 作为孔。 在{{ui:prop.screwHoleSize}}中可选 M2 到 M30（锥形沉孔到 M20），轴径（ISO 273 中等通孔）、头部直径以及深度或角度即按标准设置（DIN 974-1、ISO 15065），长度不变。对于六棱柱，{{ui:prop.nutPocketSize}}按 ISO 4032 设置螺母的对边宽度和高度，并留 0.4 mm 打印余量。

{{ui:shape.finishingWasher}}（一种装饰垫圈，Discussion #1131）是放在沉头或半沉头螺钉下面的拱形垫圈，用于在木头或盖板上显得整洁。它是实心件，底面平；从较低的边缘起，拱顶升到座面，座面是承托螺钉头的锥面，下面是孔。在 {{ui:prop.screwHoleSize}} 下选择 M2 到 M20：孔是该规格的过孔，座面是该规格的沉头孔，{{ui:prop.diameter}} 和 {{ui:prop.height}} 由此得出（M3：10.3 × 2.95 mm，M6：16.6 × 4.5 mm）。你也可以自己设定 {{ui:prop.diameter}}、{{ui:prop.height}}、{{ui:prop.centerHole}}、座面顶部的 {{ui:prop.screwHoleHead}} 及其 {{ui:prop.screwHoleAngle}}。它保持圆形，并且是精确实体，因此边工具和 STEP 都能处理它。

## 螺丝柱

{{ui:shape.screwBoss}} 是外壳里用来拧紧盖子或电路板的柱子：圆形，从顶部开孔。在 {{ui:prop.screwBossFastener}} 中选择装入什么。{{ui:screwBoss.insert}} 是用烙铁压入的黄铜螺母：{{ui:prop.screwBossSize}} 提供 M2 到 M5 以及 #2-56 到 1/4-20，孔按常见热熔螺母的要求（M3：长 5.7 mm 的螺母用 4.0 mm 孔），比螺母深一毫米，让被挤开的塑料有地方去，柱子约为孔的两倍粗。{{ui:screwBoss.selfTapping}} 自己攻出螺纹：ST2.2 到 ST4.2（DIN 7981）、2.5 到 5 mm (K25–K50) 的塑料螺丝或 #2 到 #10，底孔约为螺丝的 0.8 倍，柱子 2.5 倍，孔深约 2.5 个螺丝直径。{{ui:screwBoss.custom}} 使用你输入的孔径和孔深。

{{ui:prop.screwBossHole}}、{{ui:prop.screwBossHoleDepth}} 和 {{ui:prop.screwBossDiameter}} 都可以手动修改；直径下方会显示孔周壁厚，如果比紧固方式要求的薄会给出提示。孔与柱子一样深时为通孔。孔口有一个小倒角，便于螺母或螺丝进入。{{ui:prop.screwBossGussets}} 从柱子到底面添加两到六条细筋；{{ui:prop.screwBossReach}}、{{ui:prop.screwBossGussetHeight}} 和 {{ui:prop.screwBossGussetThickness}} 设置它们伸出多远、多高、多厚。

把螺丝柱立在已抽壳盒子的底面上并与盒子组合；在盖子上，其上方作为孔的 {{ui:shape.counterbore}} 用来容纳螺丝头。设为孔并与实心零件组合时，它只切出自己的孔——放嵌件或螺钉的孔腔及其倒角——这样你自己的块或立柱就得到一个用于嵌件的盲孔；孔从它的顶面开始。打印出来的孔会比图纸略小：先打印一个柱子试一试，再把 {{ui:prop.screwBossHole}} 调整零点一两毫米。

## 卡扣

能扣合的盖子不需要螺丝。{{ui:shape.snapFit}} 是带底座的卡钩及其配对件卡座。{{ui:prop.snapFitPart}} 设为 {{ui:snapFit.both}} 时，两者都位于扣合后的位置，可以一起放到盖子和盒子上；{{ui:snapFit.hook}} 或 {{ui:snapFit.catch}} 只生成其中一个。卡齿下方是让它滑入的斜面，即 {{ui:prop.snapFitLeadAngle}}（30° 容易插入），上方是保持面：{{ui:prop.snapFitRetainAngle}} 为 90° 时永久卡住，45° 时还能拆开。{{ui:prop.snapFitUndercut}} 是卡齿伸到卡座下方的深度，{{ui:prop.snapFitClearance}} 是两者之间的间隙。

扣合时悬臂会弯曲一个倒扣深度。{{ui:prop.snapFitThickness}} 下方显示根部的拉伸量：PLA 约 2 % 以上会断，PETG 和 ABS 可承受约 4 %。悬臂更长或更薄，或倒扣更小，拉伸就更小。这一对的摆放就像在直立打印的盒子里，盖子在上：卡钩挂在底座下面，卡座顶面倾斜 45°，只有与倒扣深度一样宽的保持面平伸出来，所以在壁上打印无需支撑。

把这一对放在盖子与盒壁相接的地方：卡钩底座在盖子下面，卡座背面贴在盒壁内侧。然后用 {{ui:inspector.separateParts}} 把它们分成两个实体；卡钩与盖子组合，卡座与盒子组合。尽量让盖子打印时悬臂平躺：竖立的悬臂会垂直于层弯曲，更容易断。

## 加强筋

{{ui:shape.rib}} 用来加强底面或侧壁。作为 {{ui:rib.straight}}，长度、高度和厚度都按你的设置，{{ui:prop.ribTop}} 可以是平的、圆的或倒角的。作为 {{ui:rib.gusset}}，它是把侧壁撑在底面上的三角形：{{ui:prop.ribGussetFoot}} 沿底面，{{ui:prop.ribGussetLeg}} 沿壁面向上，两端都切短一点，便于干净地打印。

打开 {{ui:prop.ribFoot}} 后，加强筋沿整条长度立在一块薄板上，位于板的中间，板比筋宽（{{ui:rib.gusset}} 的底脚在沿底面的那条边下面）；薄板让筋牢牢附着在打印平台或底面上，更薄的筋也能立住。底脚起初是筋的三倍宽、0.8 mm 厚；{{ui:prop.ribFootWidth}} 按整个宽度计算，所以形状和底脚一样宽，{{ui:prop.ribFootThickness}} 从底部往上算。

{{ui:prop.ribFootShape}} 可选 {{ui:rib.footSquare}} 或 {{ui:rib.footOval}}。椭圆形底脚从上面看是一个椭圆，没有转角，塑料冷却收缩时不会从打印平台上翘起。它和底脚一样宽，长度恰好让它在筋的两端仍有筋的两倍宽，这样两端也立在底脚上（三角加强板下面则是半个椭圆，从壁面一直伸到尖端之外）。底脚比筋的约 2.7 倍还窄时，椭圆会很长：它最长到筋长的 1.5 倍，但绝不会短到让两端悬空。形状会因伸出两端的部分而变长，筋本身的长度不变。

厚度与壁厚相当或略薄、为线宽整数倍（0.4 mm 喷嘴用 0.8 或 1.6 mm）、高度为厚度几倍的加强筋，既能加强又不会让壁面变形。多条排成一行用 {{ui:editor.tool.array}}；把它们与盒子组合。
