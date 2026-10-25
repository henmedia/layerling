# layerling 内置 AI 助手 —— 自然语言生成 3D 建模 详细设计

本文档描述在 layerling 编辑器内集成大模型能力、用自然语言驱动 3D 建模的设计与实现方案。

## 1. 项目研究结论

layerling 是本地优先（local-first）的浏览器 3D CAD 编辑器（Next.js 15 App Router，`apps/web`），
无账号、无云端存储。与 AI 相关的现有基础设施：

| 模块 | 位置 | 作用 |
| --- | --- | --- |
| MCP 工具定义（单一来源，纯数据 JS） | `scripts/layerling-mcp-tools.mjs` | 64 个 `layerling_*` 工具的 name/description/inputSchema（JSON Schema） |
| MCP stdio 服务器 | `scripts/layerling-mcp-server.mjs` | 外部 AI 客户端（Claude/Codex/Gemini）入口；把工具调用转发给桥 |
| 浏览器桥 | `apps/web/src/app/api/layerling-mcp/route.ts` + 编辑器内轮询循环（`LayerlingEditor.tsx` 约 10900 行起） | 编辑器页签心跳注册、长轮询取命令、执行后回传结果 |
| 命令执行核 | `LayerlingEditor.tsx` 的 `executeMcpCommand`（约 9032 行起） | `action + params → 场景变更`，全部 60 个建模动作（create_shape / boolean_cut / hollow_object / apply_edge_treatment …）都在浏览器内执行 |
| 协议类型 | `apps/web/src/lib/layerlingMcpProtocol.ts` | `LayerlingMcpCommandName`、场景摘要等类型 |

**关键发现**：编辑器本身已经具备完整的「命令执行核」——外部 AI 客户端经由 MCP 能做的每一步，
页内代码都能直接调用 `executeMcpCommand` 完成。因此集成大模型缺的只是**页内的模型接入与对话编排层**，
不需要新建第二套建模 DSL。

## 2. 方案选型

| 方案 | 说明 | 结论 |
| --- | --- | --- |
| A. 只用现有 MCP + 外部 AI 客户端 | 零开发，但要求用户额外起 node MCP 服务器并订阅 AI 客户端，编辑器内没有入口，不符合「集成大模型能力」 | 保留，不替代本设计 |
| B. 一次性 JSON DSL 生成 | 模型一次输出建模步骤清单再顺序执行；无法回看结果、无法自我纠错，复杂件成功率低 | 否决 |
| C. **页内 tool-calling agent 循环（选定）** | 把 MCP 工具定义转成 OpenAI function tools，模型边执行（直接调 `executeMcpCommand`）边用 `get_scene`/`capture_image` 回看，迭代收敛 | ✅ |

方案 C 的优点：执行核、工具描述、参数校验与外部 MCP 客户端完全同源（一份描述喂两种入口）；
纯浏览器运行，静态导出（`STATIC_EXPORT`）无服务器时照样可用；用户随时能看到每一步并接管。

## 3. 总体架构

```
┌─ 浏览器（编辑器页签） ────────────────────────────────────────────┐
│                                                                  │
│  SecondaryToolbar ──(✦ 按钮)──► AiAssistantPanel（聊天面板 UI）    │
│                                    │ onSend / onStop / 设置弹窗    │
│                                    ▼                              │
│  lib/ai/agent.ts   对话编排：system+history → 循环{流式调用LLM →   │
│                    执行 tool_calls → 结果回填} 直到无工具调用       │
│       │ 工具定义                     │ 流式请求                    │
│       ▼                              ▼                            │
│  lib/ai/tools.ts              lib/ai/openaiClient.ts              │
│  （过滤+转换为 OpenAI            （fetch /chat/completions,        │
│   function tools，去编辑器寻址字段   SSE 解析，tool_calls 增量聚合） │
│       │ 生成                              │                        │
│       ▼                                   ▼                        │
│  lib/ai/mcpToolDefs.generated.ts    用户配置的 OpenAI 兼容端点      │
│  （由脚本从 scripts/layerling-       （key 存 localStorage，        │
│    mcp-tools.mjs 生成，单一来源）      只发往该端点）                 │
│                                                                  │
│  agent 执行工具 ──► LayerlingEditor.executeMcpCommand(action,params)│
│                     （与 MCP 桥完全同一个执行核，直接页内调用）        │
└──────────────────────────────────────────────────────────────────┘
```

MCP 外部链路（node stdio → `/api/layerling-mcp` 桥）保持不变，两条链路共用 `executeMcpCommand`。

## 4. 模块设计

### 4.1 工具定义单一来源（生成脚本）

- 新增 `scripts/generate-ai-mcp-tool-defs.mjs`：`import` 现有 `scripts/layerling-mcp-tools.mjs`
  的 `tools`，序列化为 TS 字面量，写出
  `apps/web/src/lib/ai/mcpToolDefs.generated.ts`（头部注明 Generated … do not edit，
  与 `printerPresets.generated.ts` 同风格，文件提交入库）。
- `package.json` 增加 `ai:tools` 脚本并挂入 `predev`/`prebuild`，与 `copy:occt`、
  `fonts:japanese` 同批执行，防止描述漂移后忘记再生成。
- 单元测试断言生成文件与源文件工具名集合一致（跑一次源导入对比）。

### 4.2 `lib/ai/tools.ts` —— OpenAI 工具面

- **允许清单**（面向"生成建模"，剔除对页内助手无意义或依赖外部文件的工具）：
  - 状态读取：`read_scene`、`list_objects`、`inspect_errors`、`estimate_print`、
    `list_edges`、`list_faces`、`list_custom_shapes`、`measure_section`、`saved_view`、`show_workplane`
  - 建造：`create_shape`、`update_object`、`select_objects`、`delete_objects`、
    `align_objects`、`scale_objects`、`lay_flat`、`place_on_face`、`mate_faces`、
    `group_objects`、`ungroup_objects`、`open_group`、`close_group`、`boolean_cut`、
    `intersect_objects`、`split_objects`、`separate_parts`、`hollow_object`、`array_objects`、
    `bundle_objects`、`perforate_face`、`push_face`、`sweep_sketch`、`wrap_around_cylinder`、
    `apply_edge_treatment`、`delete_faces`、`layer_text`、`create_qr_code`、
    `insert_custom_shape`、`set_workplane`、`set_section_view`、`show_overhangs`、
    `add_reference_points`
  - 观察：`capture_image`（结果以 image 内容回给支持视觉的模型）
  - 排除：`list_editors`/`open_editor`（桥管理）、`save_project`/`export_mesh`/
    `export_drawing`/`export_section_svg`（写本机磁盘路径，由 node 服务器完成，页内无意义）、
    `import_file`/`import_mesh`/`add_font`/`reference_image`/`layer_icon`（需要用户提供文件内容）、
    `clear_history`/`set_history_view`/`restore_from_history`（破坏性/与用户视图竞争）、
    `simplify_mesh`、`save_custom_shape`/`delete_custom_shape`（非建模必需）。
- **转换**：`{name, description, inputSchema}` → `{type:"function", function:{name, description, parameters}}`；
  从每个 inputSchema 的 `properties` 中删除 `editorNumber`、`editorId`、`timeoutMs`
  （页内直调不需要寻址），`required` 中同步剔除。
- **动作映射**：`layerling_xxx` → action `xxx`；唯一特例 `layerling_read_scene` → `get_scene`
  （与 `layerling-mcp-server.mjs` 的 callTool 一致）。

### 4.3 `lib/ai/openaiClient.ts` —— OpenAI 兼容流式客户端

- 只依赖 `fetch`，零 npm 依赖（符合项目依赖克制原则）。
- `POST {baseURL}/chat/completions`，body：`{model, messages, tools, stream:true, tool_choice:"auto"}`；
  Header：`Authorization: Bearer <key>`。
- SSE 解析：逐行取 `data:` 段，`[DONE]` 结束；增量聚合 `delta.content`（回调透传给 UI）与
  `delta.tool_calls[]`（按 index 累积 id/name/arguments 字符串，结束时 `JSON.parse` arguments）。
- 支持 `AbortSignal`（停止按钮、面板卸载）；HTTP 非 2xx 与流中断抛出带 provider 错误信息的异常。
- 兼容 `reasoning_content`（DeepSeek-QwQ 等）——作为"思考"活动透传展示，不回灌历史。

### 4.4 `lib/ai/agent.ts` —— 对话编排（纯逻辑，可注入依赖便于测试）

```ts
runAssistantTurn({ settings, history, runCommand, onEvent, signal })
```

- 输入当前会话历史（system + user/assistant/tool 交替），循环上限 **24 轮**模型调用；
- 每轮：流式调用 → 有文本则 `onEvent({type:"text-delta", text})`；
  有 tool_calls 则逐个 `onEvent({type:"tool-start", name, args})` → `runCommand(action, args)` →
  成功 `onEvent({type:"tool-result", summary})`，结果 JSON（>4000 字符截断，防止场景快照挤爆上下文）
  以 `role:"tool"` 消息回填；失败时把错误文本回填（模型可自纠，例如尺寸越界被钳位的提示）；
- `capture_image` 的成功结果同时把 dataUrl 作为多模态内容项附上。**实测更正**：纯文本模型
  （如本项目对接的 deepseek 兼容端点）不会报错，而是**静默收不到图**，于是换个视角反复拍照，
  一路转到 24 轮上限。现在每张图都随文附 `PICTURE_NOTE`（「若你没有收到图片，不要再拍，
  改用场景数值判断」），模型会照做并在回复里说明它是按数值判断的；
- **空转防护**（`MAX_REPEAT_READS` = 3 / `MAX_REFUSED_READS` = 3）：`READ_ONLY_ACTIONS`
  里的只读调用（read_scene / list_objects / capture_image / list_edges …）在**两次调用之间没有
  任何改动场景的调用**时计数，第三次不再执行，只回一句「场景没变，这个答案你已经有了」；
  累计被拒 3 次则整个循环以 outcome `"stuck"` 结束（面板提示用户可说「继续」）。
  只数只读调用，因此正常建模里连续十次 `create_shape` 不受影响；
  被拒/被停的 tool_call 一律仍会写入 `role:"tool"` 回复，否则历史不完整、下一次请求会被 provider 拒绝；
- 无 tool_calls 即 `done`，到达上限即 `turn-limit`，中止即 `stopped`。
- 历史只存在于内存（页签刷新即清，符合"不上传、不留痕"红线）。

### 4.5 `lib/ai/prompts.ts` —— system prompt

要点（英文书写，要求模型用用户语言回复）：你是 layerling 页内建模助手；单位毫米、构建板
居中于原点、`z` 正方向朝观察者前方；先 `read_scene` 了解现状再动手；小步执行、用
`capture_image`/`read_scene` 验证；布尔=先建 hole 形再 `group_objects`（与编辑器语义一致）；
完成后一段不超过 3 句的总结；不要臆造工具与参数，工具描述即权威。

### 4.6 `lib/ai/settings.ts` —— 模型接入配置

- localStorage 键 `layerling.ai.settings`：`{ baseUrl, apiKey, model }`。
- 校验：baseUrl 必须是 http(s) 绝对地址（去尾部 `/`）；模型名必填。
- 附内置快捷预设占位（OpenAI / OpenRouter / DeepSeek / 本地 Ollama·LM Studio 提示），
  仅作为输入提示文案，不写入任何真实端点默认值以外的数据。

### 4.7 UI —— `components/ai/AiAssistantPanel.tsx` + CSS

- 面板：可移动、可折叠，`useMovablePanel`（存储键 `layerling.editor.aiPosition`）、
  `useRememberedFlag`（`layerling.editor.aiAssistantOpen`），默认停靠右上角（视图立方右侧区域，
  与 outliner 左侧错开），样式写入 `apps/web/src/app/aiAssistant.css` 并在 `layout.tsx` 引入，
  视觉沿用现有面板（同 `.outliner-panel` 的圆角、底色、标题条语言）。
- 结构：
  - 标题条：`AI 助手` + 设置（齿轮）+ 关闭（X）；
  - 消息流：用户气泡 / 助手流式文本 / 工具活动行（中文动作名，如「创建形状 · 长方体」，
    展开可见参数 JSON 与结果摘要）/ 错误行（红色，原文）；
  - 底部：多行输入（Enter 发送，Shift+Enter 换行）、「停止」按钮（运行中显示，触发 abort）、
    「清空对话」按钮。
- 未配置 baseUrl/key/model 时，发送即弹出设置窗（同页内联小卡，不新增路由）。
- 与历史视图/编辑锁的冲突由执行核天然兜底：`executeMcpCommand` 在历史视图打开时拒绝变更，
  错误文本回灌模型并在面板显示。

### 4.8 接线 —— LayerlingEditor / SecondaryToolbar

- `LayerlingEditor.tsx`：新增 `aiOpen` 状态与 `runAiCommand` 回调
  （`executeMcpCommandRef.current({ id: 随机 id, action, params, createdAt })`，
  超时经 AbortSignal 传入 agent，而非桥的 timeoutMs）；在 `editor-body` 内渲染
  `<AiAssistantPanel>`（history 视图激活时传 `inert` 与 outliner 同策略）；向
  `SecondaryToolbar` 传 `aiOpen` / `onToggleAi`。
- `SecondaryToolbar.tsx`：独立的 `aiTool` + 自己的 `toolbar-section`（`data-group="assistant"`，
  标签 `editor.group.ai`，紫色 `--group-assistant`），夹在「历史记录」与「形状」之间。
  不要把它塞进 `leftTools`——那条数组靠 `slice(4)` 分成剪贴板组与历史组，追加进去会让按钮
  挂到「历史记录」标签下，看不出是助手入口（首版正是这样，用户找不到入口）。
  命令面板同步加 `fromTool(aiTool, t("editor.group.ai"))`，关键词在 `lib/commandKeywords.ts`；
  simple mode 的保留清单 `lib/simpleMode.ts` 加了 `"ai"`（自然语言正是新手最短路径）。
  历史视图下它随其它工具一起置灰（`renderToolButton` 的既有规则），面板本身传 `inert`。
- `app/layout.tsx`：追加 `import "./aiAssistant.css";`。

### 4.9 i18n

- `messages.en.ts` 新增 `ai.*` 键（面板标题、按钮、状态、设置窗标签与说明、错误文案）。
  `lib/languages.ts` 里标 `complete: true` 的六种语言（cs/de/fr/nl/sl/ru）由测试强制
  覆盖每个键，所以这 66 个键七份文件都要补，占位符 `{count}` `{model}` 必须保留；
  其余语言是 Partial、自动回退英文（`lib/i18n.ts` 机制），`zh-cn` 顺手补齐面板主文案。
  工具活动行的动作中文名放 `lib/ai/tools.ts` 内的映射表，不进主 i18n 目录
  （工具名是技术名词，保持一份）。

### 4.10 服务端接入（环境变量 + 同源代理）—— `lib/ai/serverConfig.ts` + `app/api/ai-chat/route.ts`

浏览器直连托管模型端点会被 CORS 挡（多数供应商拒绝带浏览器 `Origin` 的请求），
把 key 填进页面等于把 key 交给每一个访问者的浏览器。部署方因此可以改用服务端接入：

- 环境变量：`BASE_URL` / `API_KEY` / `MODEL_ID`（供应商示例惯用的裸名，`.env` 里的引号会剥掉），
  或带前缀的 `LAYERLING_AI_BASE_URL` / `LAYERLING_AI_API_KEY` / `LAYERLING_AI_MODEL`；
  两者同时存在时前缀名优先。`baseUrl` + `model` 齐了才算配好，`API_KEY` 可空（本机 Ollama 一类）。
  文件位置是 `apps/web/.env`（`next dev apps/web` 读它，仓库根的 `.env` 不读；
  `npm run dev` 改文件会自动 `Reload env`，`npm run start` 要重启）。
  这些名字都不带 `NEXT_PUBLIC_` 前缀，Next 不会把它们烧进客户端产物，只在 Node 服务端可读。
- `POST /api/ai-chat`（沿用 `/api/server-defaults` 的「非 GET 路由每次请求都在 Node 里跑」写法）：
  - `body.probe === true` → 只回答 `{ configured, model }`，绝不回传 key；
  - 否则取 `messages` / `tools`，`model` 一律用服务端的名字（调用方无法借这条路由换成别的模型、
    也无法把 key 当作通用代理使），补上 `Authorization` 与 `stream: true` 后转发 `${baseUrl}/chat/completions`，
    上游 SSE 原样回灌；
  - 上游非 2xx → 502，正文压成一行、截 300 字符的摘要（上游响应体可能回显请求，不能整份转给浏览器）；
  - 页面 abort → 直接抛出，不编造响应。
- `openaiClient` 用 `chatEndpointFor(baseUrl)`：以 `/` 开头即视为本应用自己的路由，不再拼
  `/chat/completions`；其余照旧拼绝对地址。
- 面板启动时探测（`NEXT_PUBLIC_STATIC_EXPORT === "true"` 直接判定「没有路由」）：
  服务端已配好 → 用 `{ baseUrl: "/api/ai-chat", apiKey: "", model: <服务端回报的名字> }` 跑对话，
  顶栏齿轮按钮与设置窗收起，正文顶部一行说明「本服务器已为助手配置模型 X」；
  没配好/探测失败 → 完全回到 §4.6 的浏览器自配路径，行为与之前一致。
- 静态导出（纯文件托管）没有路由可读环境，只有 §4.6 那条自配路径可用。

## 5. 安全与隐私红线

1. 浏览器自配时 API key 仅存 `localStorage`，只随请求发往用户自配的端点；不进 URL、不进项目文件、
   不进工程保存/导出链路、不打日志。服务端配置时 key 只在 Node 进程的环境变量里，
   探测响应与错误摘要都不含它（`aiServerProxy.test.ts` 有断言）。
2. 场景数据默认只在「用户浏览器 ↔ 用户自配端点」之间流动，静态导出可用。部署方启用 §4.10 的
   服务端接入后，对话内容会经过自己的 layerling 服务器再转发给模型——那是部署方自己的选择，
   代码不把它当作第三方，但也不能再说「服务器不经手 AI 请求」。
3. 模型执行的每条命令与人工操作共享同一执行核的既有保护（锁定对象、历史视图拒写、
   尺寸钳位），不新增旁路。
4. 会话历史不落盘；页签关闭即消失。

## 6. 测试设计（与体量匹配，全部 vitest 纯 Node/JSDOM 可跑）

| 测试 | 断言 |
| --- | --- |
| `aiToolDefsSync.test.ts` | 生成的 `mcpToolDefs.generated.ts` 与 `scripts/layerling-mcp-tools.mjs` 工具名集合、逐工具 description 一致（防忘记重新生成） |
| `aiTools.test.ts` | 允许清单每个名字都在注册表中存在；转换后不含 editorNumber/editorId/timeoutMs；required 剔除干净；`read_scene→get_scene` 映射 |
| `aiOpenaiClient.test.ts` | 用 mock ReadableStream 喂 SSE：文本增量、tool_calls 分片聚合、`[DONE]`、错误分支、abort |
| `aiAgent.test.ts` | 假 fetch + 假 runCommand：两轮工具调用后收敛；工具错误回灌后再试；轮次上限；abort 即停；大结果截断；图片随文的 `PICTURE_NOTE`；第三次无变化的只读被拒；改过场景后计数归零；无视拒绝的模型以 `stuck` 收场且每个 tool_call 都有回复 |
| `aiServerProxy.test.ts` | 环境变量的两套名字与前缀优先、引号与尾斜杠处理；代理探测不回传 key；转发时改用服务端 model；上游失败只给摘要；`chatEndpointFor` 对相对地址不拼接；探测失败回落自配 |

验证口径：`npm run typecheck` 无新增错误 + `npm run test` 绿 + `npm run build` 通过；
界面实际效果由用户在浏览器中验收（项目惯例）。

服务端接入的实测证据（2026-10-24）：`npm run dev` + `apps/web/.env` 里三个裸名 →
`POST /api/ai-chat {"probe":true}` 回 `{configured:true,model:<环境里的名字>}`（不含 key）；
一条最小对话经代理流回上游 SSE（含 `reasoning_content` 增量），证明浏览器侧不再直连、无 CORS；
`npm run export` 通过，`/api/ai-chat` 与既有路由同样以 ƒ 列出。
浏览器面板的探测/直连切换由用户验收。

空转的实测证据（2026-10-24，同一端点、同一 stub 执行核，临时脚本跑完即删）：
「创建一个 20×30×5 的长方体，然后拍一张照看看对不对」在修复前 5 轮内不产出任何文本、
连开 3 次 `capture_image`（`face` 依次 front-right-top / home / front-right-top+clean）
并以 `turn-limit` 收场（用户所见即此，实际会烧到 24 轮）；
加上 `PICTURE_NOTE` 与只读守卫后同一句话 3 次调用即 `done`，回复里主动说明
「截图是空白的，尺寸按场景数值确认」。

## 7. 后续扩展（不在本期）

- 图片输入（拍照→建模参照）：把用户图作为 `image_url` 传入，配合 `reference_image` 工具。
- 页内「导出 STL 下载」工具（把 `export_mesh` 的 base64 直接转浏览器下载，绕开 node 路径）。
- 多编辑器页签选择（复用桥寻址）。
- 会话持久化与回滚点（每轮开始前 `save_project` 到 IndexedDB）。
