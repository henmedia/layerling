---
title: 用 AI 搭建（MCP）
summary: Gemini、Claude 或 Codex 等 AI 助手如何在已打开的编辑器中创建和修改形状、对它们分组，并为视图拍照。
---

layerling 自带一个 MCP 服务器。MCP 是一项标准，AI 助手可通过它使用其他程序中的工具。借助它，Gemini、Claude 或 Codex 等 AI 客户端能看到一个已打开的编辑器标签页并在其中工作：创建形状、修改尺寸、分组、切割、给边做圆角、读取场景并为视图拍照。你描述零件，AI 负责搭建，你在旁边观看，随时可以接手。

AI 客户端与编辑器之间的桥梁**在你的电脑上本地运行**。但要注意：AI 读取的内容，也就是场景和视图图片，会像其他任何输入一样发送给你的 AI 服务商。

> **重要：** MCP 桥梁只存在于你在自己电脑上启动的开发服务器中。在 layerling.com 以及使用静态托管的安装中，它是关闭的。你自己托管的副本（例如 NAS 上的 Docker 镜像）可以用访问令牌开启它；参见下文“NAS 或服务器上的副本”。

## 设置

1. 从 [GitHub](https://github.com/henmedia/layerling) 获取 layerling，并在项目文件夹中用 `npm run dev` 启动。必须安装 Node.js。在 Windows 上，README 里的快速开始命令会帮你装好。
2. 打开一个编辑器标签页，例如 `http://127.0.0.1:3000/?editor=1`。也可以交给 AI：没有编辑器打开时，第一个需要编辑器的工具会启动你的浏览器并打开编辑器，然后等待它连接。这适用于你自己电脑上的 layerling；NAS 或服务器上的副本需要你手动打开编辑器。把 `LAYERLING_MCP_OPEN_EDITOR=0` 设给 MCP 服务器即可关闭这一行为。
3. 把你的 AI 客户端连接到 MCP 服务器。客户端会用 `node scripts/layerling-mcp-server.mjs` 自行启动它。

### Claude Code

无需安装：项目自带一个 `.mcp.json` 来注册服务器，以及 `.claude/skills/layerling-mcp-skill` 下的技能。在 Claude Code 中打开 layerling 文件夹，然后这样提问，例如：“用 layerling MCP 工具列出我打开的编辑器并检查场景。”

### Claude Desktop

Claude Desktop 不读取项目文件。要在它自己的配置中输入服务器。可以使用项目中的 `docs/mcp/claude-desktop-config.example.json` 作为模板，把脚本路径换成你电脑上的绝对路径。然后重启 Claude Desktop。

### Codex

把 `docs/skills/layerling-mcp-skill` 中的技能复制到 Codex 的技能文件夹，参照 `docs/mcp/codex-config.example.toml` 在 Codex 配置中输入服务器，然后重启 Codex。

### Gemini & Antigravity

Antigravity 会自动发现 `.agents/skills/layerling-mcp-skill` 中的工作区技能。对于 Gemini CLI，把 `docs/skills/layerling-mcp-skill` 中的技能复制到全局技能文件夹（`~/.gemini/skills/`），参照 `docs/mcp/gemini-config.example.json` 把服务器加入设置，然后重启客户端。

各客户端的详细说明见 [GitHub 上的 README](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill)。

## NAS 或服务器上的副本

你自己托管的副本可以让 AI 客户端通过网络驱动其已打开的编辑器。它默认关闭，因为任何能驱动桥梁的人都能读取并修改已打开的设计。在服务器上，把 `LAYERLING_MCP_REMOTE` 设为 `true`，把 `LAYERLING_MCP_TOKEN` 设为至少 16 个字符的密钥（Docker 镜像写在 compose 文件的 `environment:` 下；无需重新构建）。打开该副本的一个编辑器标签页并保持打开，然后把地址和同一个令牌交给 MCP 客户端：`LAYERLING_URL=http://nas:3000` 和 `LAYERLING_MCP_TOKEN=<the token>`。

只有持有令牌的客户端才能列出或驱动编辑器。编辑器页面不需要令牌，但只有在仅限你所在网络使用的地址或名称下才计入（IP 地址、不含点的名称，或以 `.local` 或 `.lan` 结尾的名称）；反向代理后面的真实域名要写入 `LAYERLING_MCP_ALLOWED_HOSTS`。请仅在可信网络中使用，跨网络时使用 HTTPS。详情见 README。

## AI 能做什么

AI 使用与你相同的功能，走的是与你在编辑器中的操作相同的路径。layerling 的新功能会立即拥有对应的 MCP 动作。工具如下：

| 工具 | 作用 |
| --- | --- |
| `layerling_list_editors` | 列出已打开的编辑器标签页 |
| `layerling_open_editor` | 在你的默认浏览器中打开新的编辑器标签页，并等待它连接（仅限你自己的电脑） |
| `layerling_read_scene` | 读取场景、选择、单位以及所有对象的精确尺寸 |
| `layerling_list_objects` | 列出所有对象及其尺寸、位置、旋转和 id |
| `layerling_select_objects` | 选择对象 |
| `layerling_delete_objects` | 删除对象 |
| `layerling_create_shape` | 创建形状：长方体、圆柱体、文字（也支持弯曲）、螺纹、齿轮、草图实体以及其他所有形状 |
| `layerling_import_file` | 像导入窗口一样导入文件：彩色 OBJ 或 3MF 按颜色各成一个实体，含多个对象的 3MF 按对象各成一个实体 |
| `layerling_add_font` | 为文字添加自己的字体，支持 TrueType、OpenType 或 WOFF 文件；字体保存在浏览器中，设计只保留用到的字母 |
| `layerling_list_fonts` | 列出内置字体和自己的字体，含 id 和名称 |
| `layerling_import_mesh` | 把三角网格带入设计 |
| `layerling_update_object` | 修改尺寸、位置、颜色、名称、实体或孔，以及构成形状的其他一切，包括文字的字母边缘 |
| `layerling_align_objects` | 让对象彼此对齐 |
| `layerling_scale_objects` | 按百分比缩放对象，可整体缩放或各自在原位缩放 |
| `layerling_lay_flat` | 让对象的一个面贴在平台上 |
| `layerling_place_on_face` | 把对象放到另一个对象的某个面上，斜面也可以，如同 C 键 |
| `layerling_perforate_face` | 在平面上切出孔阵列；孔仍作为孔与实体分组在一起 |
| `layerling_sweep_sketch` | 沿一条由点构成的路径拉出矩形或圆形截面，成为一个精确实体；闭合路径会形成圆环 |
| `layerling_push_face` | 把平面推出，或在其中挖出凹槽，可设置距边缘的内缩和圆角半径；新部分是一个与实体分组的草图实体 |
| `layerling_mate_faces` | 把一个对象的面贴到另一个对象的面，可面对面或齐平 |
| `layerling_open_group` | 打开分组，以便逐个修改其部件，打开的分组内也可再打开分组 |
| `layerling_close_group` | 再次关闭分组（“完成”）或取消 |
| `layerling_group_objects` | 对对象分组 |
| `layerling_ungroup_objects` | 解散分组 |
| `layerling_boolean_cut` | 用孔切割实体 |
| `layerling_intersect_objects` | 只保留对象共有的部分（交集） |
| `layerling_hull_objects` | 把对象包成一个凸体，就像用收缩膜包住一样（凸包） |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_make_lid` | makes a lid for a body open at the top: pushed in, over the top or flat, with the fit you choose (Lid) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | 把形状分离成松散的部件，把草图实体按轮廓分离为每个轮廓一个实体 |
| `layerling_split_objects` | 用一个平面把实体或孔切成两半 |
| `layerling_list_edges` | 列出一个对象真实的 CAD 边 |
| `layerling_apply_edge_treatment` | 对选定的边做倒角或圆角 |
| `layerling_hollow_object` | 用均匀的壁抽壳实体 |
| `layerling_cut_out` | 从一个实体中挖出另一个实体使两者配合：零件保留，按间隙放大的副本从另一个实体中减去 |
| `layerling_offset_object` | 移动实体的所有面以得到配合间隙：放大或缩小实体，或把放大的副本作为孔添加，或只移动侧面 |
| `layerling_list_faces` | 列出精确实体的面 |
| `layerling_delete_faces` | 删除面并闭合缺口 |
| `layerling_array_objects` | 按行或沿圆周复制 |
| `layerling_bundle_objects` | 像 Ctrl+B 一样捆绑对象：它们一起移动，保留各自颜色和类型，导出时分开输出 |
| `layerling_layer_text` | 把文字变成用于多色打印的分层堆叠（字母、更宽的边沿、无孔底板），或重新构建堆叠，可加钥匙孔、设置每层圆角和圆角或倒角的字母边缘；给出名称列表时，每个名称生成一个名牌 |
| `layerling_layer_icon` | 把 SVG 图标（文件文本或拉伸的草图实体）变成用于多色打印的分层图标牌——图标、更宽的边沿、无孔底板——或用新的宽度或层数重新构建；给出数量时用副本铺满底板 |
| `layerling_create_qr_code` | 从文字或网址生成二维码，如同形状库中的 {{ui:shape.qrCode}}——可仅二维码、在底板上凸起或雕刻，可设置纠错级别、宽度、高度、静区，也可按需作为孔；模块小于 0.8 mm 时会发出警告 |
| `layerling_reference_image` | 像 {{ui:import.referenceImage}} 一样从图片添加参考图片，或移动、旋转、校准（图片上的两个点及其实际距离）、淡化或锁定参考图片——这是一种永远不会被导出或打印的辅助参考；`trace` 将其暗部或亮部变为立在其上的草图实体 |
| `layerling_measure_section` | 在吸附到轮廓的两点之间的剖切平面上测量——壁厚、间隙、配合 |
| `layerling_show_overhangs` | 开启或关闭悬垂剖面线，设置角度，并报告每个实体需要支撑的面积 |
| `layerling_estimate_print` | 估算选中项或整个设计的体积、重量和耗材：既给出实体件的数值，也按与导出窗口相同的壁和填充给出粗略估计 |
| `layerling_add_reference_points` | 标记参考点——可位于对象的中心、角或边中点，也可位于精确位置——形状会吸附到这些点 |
| `layerling_list_reference_points` | 列出参考点及其 id 和位置 |
| `layerling_remove_reference_points` | 按 id 删除参考点，或删除全部 |
| `layerling_inspect_errors` | 显示最后一条消息和最后一个错误，以及本次会话的消息和错误 |
| `layerling_wrap_around_cylinder` | 把平躺的实体（例如 SVG 或文字）包裹到圆柱上，可向外，也可向内作为雕刻 |
| `layerling_texture_surface` | 给实体加上表面纹理：凹槽、滚花、蜂窝或凸点，用于防滑或美观，之后还可以修改或去除 |
| `layerling_simplify_mesh` | 减少导入网格的三角面数，可缩减到百分比比例或指定三角面数量 |
| `layerling_save_custom_shape` | 把实体保存为自定义形状，可存到服务器或浏览器，以便插入其他设计 |
| `layerling_list_custom_shapes` | 列出服务器和浏览器中的自定义形状 |
| `layerling_insert_custom_shape` | 把自定义形状插入当前设计，可指定 x/z 位置 |
| `layerling_delete_custom_shape` | 移除自定义形状；已插入的实体保留 |
| `layerling_show_workplane` | 隐藏和显示带网格的平台，例如为了拍摄底部图片（仅改变视图） |
| `layerling_set_section_view` | 沿一个平面把视图剖开以便查看内部（仅改变视图，不会真正切开任何东西） |
| `layerling_measurements` | 显示或隐藏卷尺的测量，并列出它们及其长度，并像 [[Q]] 一样隐藏或显示所选对象周围的尺寸 |
| `layerling_saved_view` | 把当前视图保存在按键 7、8、9 或 0 下，并可回到该视图，如同 Shift+按键和单独按该键（仅改变视图）；也可设置新设计的起始视图 |
| `layerling_clear_history` | 永久删除所有撤销步骤，如同历史记录视图的“删除历史记录”按钮；需要 `confirm: true` |
| `layerling_set_history_view` | 回看项目更早的状态，如同历史记录视图（实际设计不受影响；会改动设计的工具会等到它关闭） |
| `layerling_restore_from_history` | 把对象（也包括分组内的部件）从更早的状态作为副本带回设计，如同历史记录视图的“带入设计”——撤销会一次性撤回这一步 |
| `layerling_export_section_svg` | 以 1:1 的 SVG 返回剖切平面上的轮廓，所用实体与导出相同 |
| `layerling_sketch_from_section` | 用剖切平面上的轮廓创建一个位于切口上的草图：在编辑器中打开以便修改，或立即构建为给定高度的实体 |
| `layerling_export_drawing` | 制作“2D”导出的工作图：在 ISO 图纸上以 1:1 绘制三个视图，标注总体尺寸并列出圆孔表格，可输出 SVG 文本或 PDF |
| `layerling_export_mesh` | 按导出窗口写出 STL、3MF、OBJ、SVG（顶视图、轮廓或可见边）或用于激光切割的 DXF文件，所用实体相同；可写到这台电脑上的路径，或写成 base64 |
| `layerling_save_project` | 把整个可编辑设计保存为 .lyl 文件，写到运行 MCP 服务器的电脑上的路径，不弹出对话框；只有给出 `overwrite` 才会替换已有文件，写入会经过临时文件，编辑器中 Ctrl+S 的目标保持不变 |
| `layerling_list_attachments` | 列出附加到设计的文件（名称、类型、大小），与“Attachments”面板显示的一致 |
| `layerling_get_attachment` | 读取一个附件，以 base64 返回其字节，与面板中的“Download”相同 |
| `layerling_add_attachment` | 附加一个以 base64 给出的文件，并经过面板的检查；已附加的同名文件只有在 `replace` 时才会被覆盖 |
| `layerling_rename_attachment` | 为附件改名；内容不变 |
| `layerling_remove_attachment` | 永久移除一个附件；需要 `confirm: true` |
| `layerling_set_workplane` | 把工作平面放到实体的某个面上或放回基板，并隐藏或显示它 |
| `layerling_capture_image` | 拍摄视图图片：正面、顶部、侧面、从角上斜看等 |

这样 AI 就能自我检查：它创建一个东西，拍张照片，看一看再改进。

## 示例

你说：“给我做一个直径 60 mm、高 40 mm、壁厚 2.5 mm、顶部开口的圆盒，再加一个平的盖子，上面用弧形排列写出‘Tea’。”AI 会创建圆柱体、把其中一个抽壳、把弯曲的文字放到盖子上，最后拍几张照片看看是否合适。

> **提示：** 给 AI 具体的尺寸，并告诉它零件的用途（“用于 12 mm 圆杆的支架，适配 Bambu Lab A1”）。这样它做出的决定更合理。还要看着它搭建：你随时可以接手，因为用的是同一个编辑器。
