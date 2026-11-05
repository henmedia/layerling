---
title: 用 AI 建模（MCP）
summary: Gemini、Claude 或 Codex 等 AI 助手如何在已開啟的編輯器中建立與修改形狀、把形狀群組起來，並為檢視畫面拍照。
---

layerling 內建 MCP 伺服器。MCP 是一種標準，讓 AI 助手能使用其他程式中的工具。透過它，Gemini、Claude 或 Codex 等 AI 用戶端能看到已開啟的編輯器分頁並在其中工作：建立形狀、修改尺寸、群組、切割、為邊做圓角、讀取場景，以及為檢視畫面拍照。你描述零件，AI 負責建立，你在旁邊觀看，隨時都能接手。

AI 用戶端與編輯器之間的橋接**在你自己的電腦上本機執行**。但請留意：AI 讀取的內容，也就是場景與檢視畫面圖片，會像其他任何輸入一樣，傳送到你的 AI 用戶端供應商。

> **重要：** MCP 橋接只存在於你在自己電腦上啟動的開發伺服器。在 layerling.com 以及採用靜態主機代管的安裝中，它是關閉的。自行架設的副本（例如 NAS 上的 Docker 映像檔）可以用存取權杖開啟；參見下文「NAS 或伺服器上的副本」。

## 新手逐步指南

你不需要懂任何程式設計。

**最簡單的方法：**把專案網址 `https://github.com/henmedia/layerling` 交給你喜歡的 AI，並請它：「在我的電腦上設定好 layerling，讓我能透過它的 MCP 伺服器和你一起建立 3D 模型。」它會自己下載並安裝所有東西，完成後告訴你。這需要一個能在你電腦上工作的 AI，例如 Claude 應用程式的 Code 分頁、Codex、Antigravity 或 Gemini CLI。瀏覽器裡的聊天做不到，因為它無法在你的電腦上安裝任何東西。

**或者自己動手，在 Windows 上使用 Claude 應用程式，分五步：**

**1. 安裝 layerling。**開啟開始功能表，輸入 `PowerShell`，然後開啟 Windows PowerShell。複製下面這一行，在視窗中按右鍵貼上，然後按 Enter：

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

它會安裝 layerling 所需的一切，把 layerling 下載到你使用者資料夾中的 `layerling` 資料夾（`C:\Users\<你的使用者名稱>\layerling`），並在瀏覽器中開啟。第一次需要幾分鐘。

![已貼上這一行的 Windows PowerShell。按 Enter 就開始了。](still:ai-quickstart-powershell)

**2. 讓 layerling 保持執行。**只要 PowerShell 視窗開著，layerling 就在執行，而 AI 只能在它執行時建立模型。下次改為按兩下桌面上的「Start layerling」。

**3. 安裝 Claude 應用程式。**安裝 Windows 版 Claude 應用程式並登入。下一步用到的 Code 分頁屬於 Claude 的付費方案。

**4. 在 Code 分頁中開啟 layerling 資料夾。**在 Claude 應用程式上方切換到 Code，選擇你使用者資料夾中的 `layerling` 資料夾作為工作資料夾。layerling 已內建 Claude 找到其工具所需的一切。如果 Claude 詢問是否可以使用此資料夾的 MCP 伺服器「layerling」，請允許。

**5. 告訴 Claude 要建立什麼。**例如：「使用 layerling 工具，幫我建立一個直徑 60 mm、高 40 mm、壁厚 2.5 mm 的圓盒。」如果沒有開啟編輯器，Claude 會在你的瀏覽器中開啟一個，在其中一步步建立盒子，並拍圖檢查自己的工作。你在一旁觀看，隨時可以自己修改任何內容。

**在 Mac 上**步驟相同，只有以下不同。第 1 步：開啟「終端機」App（按 Cmd+空白鍵，輸入 `Terminal`，按 Enter），貼上下面這一行並按 Enter：

```bash
curl -fsSL https://raw.githubusercontent.com/henmedia/layerling/main/scripts/mac-quickstart.sh | sh
```

如果缺少 Git 或 Node.js，它會告訴你需要安裝什麼（macOS 會在視窗中提供 Git，Node.js 可從 nodejs.org 下載安裝程式）；裝好後再執行同一行。第 2 步：桌面上的捷徑同樣叫「Start layerling」。第 3 步：安裝適用於 Mac 的 Claude App。

> **提示：**如果有什麼不正常，把你看到的情況告訴 Claude。它能讀取錯誤，通常會自己修復。如果編輯器裡沒有任何動靜，先檢查 layerling 是否仍在執行（第 2 步）。

## 設定

1. 從 [GitHub](https://github.com/henmedia/layerling) 取得 layerling，並在專案資料夾中以 `npm run dev` 啟動。必須安裝 Node.js。在 Windows 上，README 中的快速開始指令會幫你處理。
2. 開啟一個編輯器分頁，例如 `http://127.0.0.1:3000/?editor=1`。也可以交給 AI：沒有編輯器開啟時，第一個需要編輯器的工具會啟動瀏覽器並開啟編輯器，然後等待它連線。這對你自己電腦上的 layerling 有效；NAS 或伺服器上的副本則需要你自行開啟編輯器。若要關閉這個行為，請為 MCP 伺服器設定 `LAYERLING_MCP_OPEN_EDITOR=0`。
3. 把你的 AI 用戶端連線到 MCP 伺服器。用戶端會自行以 `node scripts/layerling-mcp-server.mjs` 啟動它。

### Claude Code

無需安裝：專案自帶 `.mcp.json` 來註冊伺服器，以及 `.claude/skills/layerling-mcp-skill` 下的技能。在 Claude Code 中開啟 layerling 資料夾，然後這樣提問，例如：「用 layerling MCP 工具列出我開啟的編輯器，並檢查場景。」

### Claude Desktop

Claude Desktop 不會讀取專案檔案。要在它自己的設定中加入伺服器。可拿專案中的 `docs/mcp/claude-desktop-config.example.json` 當範本，把指令碼路徑換成你電腦上的絕對路徑，然後重新啟動 Claude Desktop。

### Codex

把 `docs/skills/layerling-mcp-skill` 的技能複製到 Codex 的技能資料夾，參考 `docs/mcp/codex-config.example.toml` 把伺服器寫進 Codex 設定，然後重新啟動 Codex。

### Gemini & Antigravity

Antigravity 會自動找到 `.agents/skills/layerling-mcp-skill` 中的工作區技能。使用 Gemini CLI 時，把 `docs/skills/layerling-mcp-skill` 的技能複製到全域技能資料夾（`~/.gemini/skills/`），參考 `docs/mcp/gemini-config.example.json` 把伺服器加入設定，然後重新啟動用戶端。

各用戶端的詳細說明見 [GitHub 上的 README](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill)。

## NAS 或伺服器上的副本

自行架設的副本可以讓 AI 用戶端透過網路驅動它已開啟的編輯器。這項功能預設關閉，因為能驅動橋接的人就能讀取並修改已開啟的設計。在伺服器上，把 `LAYERLING_MCP_REMOTE` 設為 `true`，並把 `LAYERLING_MCP_TOKEN` 設為至少 16 個字元的密鑰（Docker 映像檔寫在 compose 檔案的 `environment:` 下；不需重新建置）。開啟該副本的一個編輯器分頁並保持開啟，然後把位址與同一個權杖交給 MCP 用戶端：`LAYERLING_URL=http://nas:3000` 和 `LAYERLING_MCP_TOKEN=<the token>`。

只有持有權杖的用戶端才能列出或驅動編輯器。編輯器頁面本身不需要權杖，但只有在僅限自家網路使用的位址或名稱下才會被認可（IP 位址、不含點的名稱，或以 `.local` 或 `.lan` 結尾的名稱）；若經過反向代理使用真實網域名稱，要寫進 `LAYERLING_MCP_ALLOWED_HOSTS`。請在可信任的網路上使用，跨出該網路時改用 HTTPS。詳情見 README。

## AI 能做什麼

AI 使用的是與你相同的功能，走的也是你在編輯器中操作時的同一條路徑。layerling 新增的功能會立刻有對應的 MCP 動作。工具如下：

| 工具 | 作用 |
| --- | --- |
| `layerling_list_editors` | 列出已開啟的編輯器分頁 |
| `layerling_open_editor` | 在你的預設瀏覽器中開啟新的編輯器分頁，並等待它連線（僅限你自己的電腦） |
| `layerling_read_scene` | 讀取場景、選取範圍、單位，以及所有物件的精確尺寸 |
| `layerling_list_objects` | 列出所有物件及其尺寸、位置、旋轉與 id |
| `layerling_select_objects` | 選取物件 |
| `layerling_delete_objects` | 刪除物件 |
| `layerling_move_object` | 把物件移到物件清單中的另一個位置 |
| `layerling_create_shape` | 建立形狀：方塊、圓柱、文字（也能彎曲）、螺紋、齒輪、草圖實體，以及其他所有形狀 |
| `layerling_import_file` | 像匯入視窗一樣匯入檔案：彩色 OBJ 或 3MF 會依顏色各成一個實體，含多個物件的 3MF 則依物件各成一個實體 |
| `layerling_add_font` | 為文字新增自訂字型，支援 TrueType、OpenType 或 WOFF 檔案；字型會留在瀏覽器中，設計只保留用到的字母 |
| `layerling_list_fonts` | 列出內建字型與自訂字型，含 id 與名稱 |
| `layerling_import_mesh` | 把三角網格帶入設計 |
| `layerling_update_object` | 修改尺寸、位置、顏色、名稱、實體或孔，以及構成該形狀的其他所有設定，包括文字的字母邊緣 |
| `layerling_align_objects` | 讓物件彼此對齊 |
| `layerling_scale_objects` | 依百分比縮放物件，可一起縮放，或各自在原位縮放 |
| `layerling_lay_flat` | 讓物件以某個面平放在平台上 |
| `layerling_place_on_face` | 把物件放到另一個物件的面上，斜面也可以，就像 C 鍵 |
| `layerling_perforate_face` | 在平面上切出孔陣列；孔仍會以孔的形式與實體群組在一起 |
| `layerling_sweep_sketch` | 沿著由點構成的路徑，把矩形或圓形斷面掃掠成一個精確實體；封閉路徑會形成圓環 |
| `layerling_push_face` | 把平面推出，或在其中挖出凹槽，可設定距邊緣的內縮與轉角半徑；新零件是與實體群組在一起的草圖實體 |
| `layerling_mate_faces` | 把一個物件的面貼到另一個物件的面，可面對面或齊平 |
| `layerling_open_group` | 開啟群組，以便逐一修改其中的部件，開啟中的群組內還能再開啟群組 |
| `layerling_close_group` | 再次關閉群組（「完成」）或取消 |
| `layerling_add_to_group` | 不開啟群組就把單獨的物件放進群組 |
| `layerling_take_out_of_group` | 不開啟群組就從群組取出一個零件 |
| `layerling_group_objects` | 群組物件 |
| `layerling_ungroup_objects` | 取消群組 |
| `layerling_boolean_cut` | 用孔切割實體 |
| `layerling_intersect_objects` | 只保留物件共同的部分（交集） |
| `layerling_hull_objects` | 把物件包成一個凸體，就像用收縮膜包住一樣（凸包） |
| `layerling_cookie_cutter` | makes a cookie cutter from the objects: a wall and a rim round the outline (Cookie cutter) |
| `layerling_flexi_joints` | cuts a flat body into links with joints printed in place that swing to the sides (Flexi joints) |
| `layerling_make_lid` | makes a lid for a body open at the top: pushed in, over the top or flat, with the fit you choose and magnets if you like (Lid) |
| `layerling_make_cable_channel` | runs a round channel for a cable through a body from an entry to an exit, finding the way itself with gentle bends (Cable channel) |
| `layerling_loft_sketches` | joins two sketch bodies into a loft from one outline to the other (Loft sketches) |
| `layerling_separate_parts` | 把形狀分離成各自的鬆散部件；草圖實體則依輪廓拆成每個輪廓一個實體 |
| `layerling_split_objects` | 用平面把實體或孔切成兩半 |
| `layerling_list_edges` | 列出一個物件真實的 CAD 邊 |
| `layerling_apply_edge_treatment` | 對選定的邊倒角或圓角 |
| `layerling_hollow_object` | 以均勻壁厚抽殼實體 |
| `layerling_cut_out` | 從一個實體中挖出另一個實體使兩者配合：零件保留，依間隙放大的副本從另一個實體中減去 |
| `layerling_punch` | 沿 x、y 或 z 把一個實體的輪廓筆直沖穿另一個實體；沖頭保留，且不必接觸它 |
| `layerling_offset_object` | 移動實體的所有面以得到配合間隙：放大或縮小實體，或把放大的副本作為孔加入，或只移動側面 |
| `layerling_list_faces` | 列出精確實體的面 |
| `layerling_delete_faces` | 刪除面並補平缺口 |
| `layerling_array_objects` | 以直線、網格排列或環繞圓周複製 |
| `layerling_bundle_objects` | 像 Ctrl+B 一樣綁定物件：它們一起移動、保留各自的顏色與類型，匯出時分開輸出 |
| `layerling_layer_text` | 把文字變成多色列印用的分層堆疊（字母、較寬的外框、無孔底板），或再次重建這樣的堆疊，可加入鑰匙圈孔、設定每層轉角，以及圓角或倒角的字母邊緣；給出名稱清單時，每個名稱做一個名牌 |
| `layerling_text_block` | 產生文字區塊：一段文字成為多行中的第一行，每行都是上一行下方的獨立文字，靠左、置中或靠右對齊，每行大小相同或更小 |
| `layerling_layer_icon` | 把 SVG 圖示（檔案中的文字，或擠出後的草圖實體）變成多色列印用的分層圖示牌——圖示、較寬的外框、無孔底板——或以新的寬度或層數重建；給出數量時，用副本鋪滿平台 |
| `layerling_create_qr_code` | 從文字或網址產生 QR Code，就像形狀庫中的 {{ui:shape.qrCode}}——可只留 QR Code 本身、在平台上凸起或雕刻，並設定糾錯等級、寬度、高度與靜區，也能指定做成孔；模組小於 0.8 mm 時會提出警告 |
| `layerling_create_sbc_board` | 放置按實際尺寸的 SBC 主機板，就像形狀庫中的 {{ui:shape.sbcBoard}}——Raspberry Pi 5、4、3 B+、Zero 2 W 或 BIGTREETECH Pi，帶孔和接頭，可設定邊緣接頭的間隙與位置，也可作為孔來切割外殼 |
| `layerling_reference_image` | 像 {{ui:import.referenceImage}} 一樣從圖片新增參考圖片，或移動、旋轉、校準（圖片上的兩個點及其實際距離）、淡化或鎖定參考圖片——這是一種永遠不會被匯出或列印的輔助參考；`trace` 將其暗部或亮部變為立在其上的草圖實體 |
| `layerling_measure_section` | 在兩點之間的剖切平面上量測，兩點會吸附到輪廓——壁厚、間隙、配合 |
| `layerling_show_overhangs` | 開啟或關閉懸垂剖面線、設定角度，並回報每個實體需要支撐的面積 |
| `layerling_estimate_print` | 估算選取範圍或整個設計的體積、重量與線材用量：以實心實體計算，也像匯出視窗那樣以壁厚與填充做粗略估計 |
| `layerling_check_clearance` | 列印前檢查哪些零件重疊、接觸或間距小於最小間隙，也檢查同一物件中彼此分離的零件 |
| `layerling_add_reference_points` | 標記參考點——可落在物件的中心、角落或邊中點，也可指定精確位置——形狀會吸附到這些點 |
| `layerling_list_reference_points` | 列出參考點及其 id 與位置 |
| `layerling_remove_reference_points` | 依 id 刪除參考點，或全部刪除 |
| `layerling_list_notes` | 讀取使用者的備註，包括文字、每則所附著的實體，以及它是否是給 AI 的請求 |
| `layerling_wait_for_notes` | 等待你在註記上勾選 {{ui:note.forAi}}，並立即轉交該請求 |
| `layerling_add_note` | 在模型上放一則備註，附著在物件上或自由放在工作板上 |
| `layerling_update_note` | 修改一則備註或回覆它；回覆會關閉請求 |
| `layerling_remove_notes` | 依 id 刪除備註 |
| `layerling_inspect_errors` | 顯示最後一則訊息與最後一個錯誤，以及本次工作階段的訊息與錯誤 |
| `layerling_wrap_around_cylinder` | 把平放的實體（例如 SVG 或文字）包覆到圓柱上，可向外，或向內作為雕刻 |
| `layerling_texture_surface` | 為實體加上表面紋理：凹槽、滾花、蜂巢或凸點，用於止滑或美觀，之後仍可修改或移除 |
| `layerling_simplify_mesh` | 減少匯入網格的三角面數量，可縮減到某個百分比，或指定三角面數 |
| `layerling_make_exact` | 將匯入網格轉為精確的 CAD 實體：平面、圓柱面、圓錐面、球面和圓環面成為真正的面，邊能乾淨地倒圓角，STEP 也會帶上它們 |
| `layerling_save_custom_shape` | 把實體儲存為自訂形狀，可儲存在伺服器或瀏覽器，之後插入其他設計 |
| `layerling_list_custom_shapes` | 列出伺服器與瀏覽器中的自訂形狀 |
| `layerling_insert_custom_shape` | 把自訂形狀插入開啟中的設計，可指定 x/z 位置 |
| `layerling_delete_custom_shape` | 移除自訂形狀；已插入的實體會保留 |
| `layerling_show_workplane` | 隱藏或顯示帶格線的平台，例如為了拍攝底面（只影響檢視） |
| `layerling_set_section_view` | 沿平面剖開檢視以查看內部（只影響檢視，不會真的切開任何東西） |
| `layerling_measurements` | 顯示或隱藏捲尺的量測，並列出它們及其長度，並像 [[Q]] 一樣隱藏或顯示所選物件周圍的尺寸 |
| `layerling_measure_angle` | 像量角器一樣量測角度：三點的頂點處或兩個平面之間，並在檢視中顯示 |
| `layerling_saved_view` | 把目前檢視儲存到按鍵 7、8、9 或 0，之後可回到該檢視，就像 Shift+按鍵與單按該鍵（只影響檢視）；也可設定新設計的起始視圖 |
| `layerling_build_plates` | 列出、新增、命名、排序和移除列印板，把物件移到某個列印板並分配到各列印板上，如同列印板列 |
| `layerling_clear_history` | 永久刪除所有復原步驟，就像歷史記錄檢視的「刪除歷史記錄」按鈕；需要 `confirm: true` |
| `layerling_set_history_view` | 回看專案較早的狀態，就像歷史記錄檢視（實際設計不受影響；會修改設計的工具會等到它關閉） |
| `layerling_restore_from_history` | 把物件（也包括群組內的部件）從較早的狀態以副本帶回設計，就像歷史記錄檢視的「帶入設計」——復原時一步就能撤回 |
| `layerling_export_section_svg` | 以 1:1 的 SVG 回傳剖切平面上的輪廓，所用實體與匯出時相同 |
| `layerling_sketch_from_section` | 用剖切平面上的輪廓建立一個位於切口上的草圖：在編輯器中開啟以便修改，或立即建構為指定高度的實體 |
| `layerling_export_drawing` | 製作「2D」匯出的工程圖：在 ISO 圖紙上以 1:1 繪出三個視圖，標註整體尺寸並附圓孔表格，可輸出 SVG 文字或 PDF |
| `layerling_export_mesh` | 寫出匯出視窗的檔案，可為 STL、3MF、OBJ、SVG（俯視、底面輪廓或可見邊）或用於雷射切割的 DXF，所用實體相同；可寫到這台電腦上的路徑，或以 base64 回傳 |
| `layerling_save_project` | 把整個可編輯設計儲存成 .lyl 檔，寫到執行 MCP 伺服器的那台電腦上的路徑，不會跳出對話方塊；既有檔案只有在指定 `overwrite` 時才會被取代，寫入時會先經過暫存檔，而編輯器中 Ctrl+S 的目標維持不變 |
| `layerling_list_attachments` | 列出附加到設計的檔案（名稱、類型、大小），與「Attachments」面板顯示的一致 |
| `layerling_get_attachment` | 讀取一個附件，以 base64 傳回其位元組，與面板中的「Download」相同 |
| `layerling_add_attachment` | 附加一個以 base64 提供的檔案，並經過面板的檢查；已附加的同名檔案只有在 `replace` 時才會被覆寫 |
| `layerling_rename_attachment` | 為附件改名；內容不變 |
| `layerling_remove_attachment` | 永久移除一個附件；需要 `confirm: true` |
| `layerling_set_workplane` | 把工作平面放到實體的某個面，或放回底板，並可隱藏或顯示 |
| `layerling_capture_image` | 擷取檢視畫面：前視、上視、側視、從角落斜看等 |

這樣 AI 就能自我檢查：建立東西、拍張圖片、看一看再改進。

## 範例

你說：「幫我做一個直徑 60 mm、高 40 mm、壁厚 2.5 mm、頂部開口的圓盒，再加一個平的蓋子，上面用弧形排列寫出『Tea』。」AI 會建立圓柱、把其中一個抽殼、把彎曲的文字放到蓋子上，最後拍幾張圖片看看合不合。

> **提示：** 給 AI 具體的尺寸，並告訴它零件的用途（「12 mm 圓桿的固定座，適用 Bambu Lab A1」）。這樣它做的決定會更合理。也看著它建立：你隨時都能自己接手，因為用的是同一個編輯器。
