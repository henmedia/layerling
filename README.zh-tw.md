<div align="center">
  <table>
    <tr>
      <td width="145" align="center">
        <img src="apps/web/public/assets/layerling/layerling-logo.svg" width="110" alt="layerling 標誌">
      </td>
      <td>
        <h1 align="right">layerling</h1>
        <h3 align="right">簡單易用的 3D 列印 CAD</h3>
        <p align="right">
          放下形狀、挖出孔洞、倒個圓角，列印出來。在瀏覽器裡就能完成，不需要帳號，也不需要 CAD 背景。
        </p>
      </td>
    </tr>
  </table>

  <p>
    <a href="LICENSE"><img alt="GNU AGPLv3 授權條款" src="https://img.shields.io/badge/license-AGPLv3-663399"></a>
    <img alt="無需帳號" src="https://img.shields.io/badge/no%20account-nothing%20to%20sign%20up%20for-dd7906">
    <img alt="專為 3D 列印打造" src="https://img.shields.io/badge/made%20for-3D%20printing-ff9e2c">
    <a href="#layerling-mcp-skill"><img alt="可由 AI 驅動" src="https://img.shields.io/badge/AI--drivable-MCP%20server-16c0d4"></a>
  </p>

  <p><a href="README.md">English</a> · <a href="README.de.md">Deutsch</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.ar.md">العربية</a> · <a href="README.zh-cn.md">简体中文</a> · <strong>繁體中文</strong></p>
</div>

<p align="center">
  <img src="docs/media/screenshot-en.png" width="763" alt="瀏覽器中的 layerling">
</p>

<p align="center"><em>瀏覽器中的 layerling</em></p>

<p align="center"><a href="https://layerling.com/zh-tw/index.html"><strong>使用者指南</strong></a>，一步一步說明並附有圖片</p>

## 適合誰用

你有一台 3D 印表機。你想要的是剛好能裝上某個東西的零件，而不是一份 CAD 職業。

layerling 照著你原本的思路運作：把形狀放到平台上，拖曳到合適尺寸，把第二個形狀變成孔，將兩者組成群組，匯出，列印。開始之前沒有東西要學，也**沒有帳號要註冊**——打開頁面就能開始做。你的設計留在自己的瀏覽器裡：沒有帳號、沒有雲端，任何東西都不會上傳。

### 從 Tinkercad 過來？

layerling 比 Tinkercad 再往 Fusion 360 靠近一步：操作方式相同，所以你會認得所有東西——平台、形狀、實體與孔、群組與取消群組、綁定、按住 Alt 拖曳複製——但它不會停在 Tinkercad 停下的地方。你一直缺少的功能，這裡都準備好了：

- **倒角與圓角。** 選一條邊，把它切平或倒圓——列印件要摸起來精緻、或要嵌進某個東西時，這是最多人要求的功能。處理過的邊仍然可以修改：隨時移除處理，或按「編輯」在同一批邊上改數值。
- **抽殼、分割、草圖、螺紋。** 把實體抽成均勻壁厚、用平面切開、繪製有精確長度與角度的草圖再擠出或旋轉，還能加入螺絲、螺帽與攻牙孔。
- **陣列與包覆。** 讓形狀沿一排、圓周或螺旋重複，或把圖案或文字包覆到圓柱上。
- **孔陣列。** 點擊平面，把圓孔、方孔、矩形孔、六角孔或長圓孔鋪滿它，可排成網格或交錯排列，並設定間距、邊距與深度——通風口、喇叭網罩和籃子一步完成。
- **按百分比縮放。** 把一個或多個零件按百分比放大或縮小——可整體縮放，讓排列跟著變大，也可各自原地縮放。
- **量測與看進內部。** 捲尺、標尺、能把模型切開的剖視圖，以及可回看先前狀態的歷史記錄滑桿。
- **底層是真正的幾何。** layerling 保留精確的 CAD 形狀，而不只是一堆網格，所以圓角始終是圓角——一路保留到供完整 CAD 程式使用的 STEP 檔。

它不是完整的 CAD 套件：沒有參數式時間軸，也沒有組合件。不過你可以**自己執行它**：安裝成應用程式（之後沒有網路也能啟動），或在 Windows、NAS 或家用伺服器上架設自己的副本——見[快速上手](#快速上手)。

> **AI 可以陪你一起建模。** layerling 內建 MCP 伺服器。Gemini、Claude 或 Codex 之類的 AI 用戶端能看到開啟的編輯器分頁並在其中操作：新增形狀、修改尺寸、群組、切割、倒圓角、讀回場景、擷取視埠畫面。你描述零件，AI 負責建模，你在旁邊看，隨時可以接手。這一切都在本機執行，什麼都不會離開瀏覽器——設定方式見 [layerling MCP Skill](#layerling-mcp-skill)。

## 它能做什麼

### 建模

- **真正的建模平台**——網格、吸附、用來移動、縮放和旋轉的控點，以及需要時顯示精確數字的面板。
- **直接輸入位置**——位置卡片能把實體放到精確的 X、Y、Z 座標，零件也可以停放在平台旁邊，就像 Tinkercad 那樣。
- **座標軸箭頭**——平台左前方的紅、綠、藍箭頭，依照數值計算的方向顯示 X、Y、Z，與 Bambu Studio 和 OrcaSlicer 一致；可在設定中關閉。
- **會跟著走的軸心**——為實體設定軸心後，它會一直跟著該實體：隨實體移動、旋轉和縮放，會被儲存，可用 X、Y、Z 數值輸入，也可用滑鼠拖曳，並吸附到角落與邊中點——適合鉸鏈和關節。
- **光影任你調**——明暗對比、陰影強度與柔和度，以及光線的方向和高度（最高可像 Tinkercad 那樣從正上方照射），都在設定裡。「Tinkercad 外觀」按鈕能一次把顏色、網格和光線設成那邊的樣子，較深的網格線還可以每公分一條，各自使用一種顏色。
- **快速模式**——給較慢的電腦用：設定裡的一個開關會關閉陰影、邊線和相機慣性，並以螢幕解析度繪製視圖；相機慣性也可以單獨關閉，這樣你一放開，視圖就會停下。
- **對齊面並查看角度**——「對齊面」工具能讓一個零件的面貼上另一個零件的面，可接觸或齊平，也可留間隙；旋轉過的實體會在選取項目下方顯示繞 X、Y、Z 的角度，設定裡的旋轉卡片可以直接輸入這些數值。
- **吸附到其他形狀**——移動時，形狀會把邊或中心鎖定到周圍形狀的邊和中心上，並顯示參考線，因此不用輸入數字就能讓零件齊平。拖曳時按 Alt 可暫停吸附；Shift 讓移動保持在單一軸向；一開始就按住 Alt 則會拖曳出副本，與 Tinkercad 相同。
- **放到面上**——類似 Tinkercad 的 Cruise：新形狀會平放在指標下方的面上，斜面也可以；按 C 可拿起選取項目，並以同樣方式放到另一個面上。
- **參考點**——在實體上按右鍵，用點標記它的中心、角落或邊中點；這些點不會被列印，被拖曳的形狀會吸附到它們。可以拖曳點或輸入座標，標記會隨設計一起儲存。捲尺還能標記量測結果的中點——例如圓孔的中心。
- **互動式說明**——按 Shift+F1，或點「說明」群組裡的問號，然後點任何按鈕、欄位或視窗：小視窗會顯示使用者指南中對應的部分，並可依需求開啟。
- **指令搜尋**——按 Ctrl+K，輸入工具、形狀或指令（「fillet」「mirror」「cylinder」），就能直接跳過去；它認得英文和德文詞彙，並在每個項目旁顯示快速鍵。
- **歷史記錄視圖**——用滑桿回看專案的任何先前狀態，不會改動任何東西；可以匯出該狀態，或從它開始新專案。由 @rmpel 提供。
- **公釐或英吋**——使用英制單位時，所有量測值都以英吋顯示，可像 Tinkercad 那樣用分數（1 5/8），也可用小數；吸附網格步距從 1/64 到 1 英吋，平台網格也以英吋繪製。
- **你印表機的列印平台**——從超過 220 種常見印表機中選一台，平台就會採用它的尺寸。名稱和成型體積顯示在工作平面角落（設定裡的開關可隱藏這些資訊與設計名稱），實體超出邊緣時會出現警告。
- **懸垂與線材**——「顯示懸垂」會用剖面線標出所有比 45°（或你印表機的角度）更陡、需要支撐的面，匯出視窗會在切片前顯示體積、重量和線材公尺數。
- **形狀庫**——長方體、圓柱、膠囊體（需要時一端可以更小，例如做皮帶罩）、球體、圓錐、角錐、楔形、文字、屋頂、半球、圓環、管、從一個輪廓放樣到另一個輪廓（例如方形到圓形，實心或帶壁，直的或平滑外擴，扭轉或頂部傾斜）、三到二十四邊的多邊形柱體、螺旋彈簧、可直接列印的鉸鏈、Gridfinity 收納盒和底板、滾花握把（直紋、交叉紋或圓紋）等等。
- **能配合的螺紋**——螺桿、帶內六角、沉頭或六角頭的螺絲、六角螺帽和攻牙孔。從 M2 到 M12、從 #4 到一英吋的 UNC/UNF，以及 G1/16 到 G4 的惠氏管螺紋（ISO 228-1），選一下就有；也可以自己設直徑和螺距，還支援左旋；英制或 G 規格會用每英吋牙數取代公釐。端部可以倒角，而攻牙孔是切割體：把它放進零件裡組成群組，出來的孔就帶螺紋。
- **能齧合的齒輪**——正齒輪、斜齒輪、人字齒輪和傘齒輪，以及內齒輪和齒條，採用漸開線齒形，像齒輪產生器一樣按模數和齒數設定，並可設定壓力角和列印用背隙——也可以使用圓齒，在小尺寸列印齒輪上更寬容，在旋鈕上握感滑順。選取兩個齒輪，面板會給出它們齧合的中心距。
- **實體與孔**——把形狀變成切割體，再組成群組形成最終幾何。編輯群組（**E**）會把群組的零件攤開放置以便修改，完成後按「完成」重新建立——群組裡再套群組也可以，無論設計巢狀多深。
- **多色群組**——群組可以讓每個零件顯示自己的顏色，即使已經挖過孔也一樣；匯出 3MF 或 OBJ 會保留這些顏色，切片軟體就能把各零件對應到線材。
- **綁定**——Ctrl+B 像 Tinkercad 的綁定一樣把零件連在一起：它們作為一個整體移動、旋轉和縮放，但保留各自顏色，匯出時仍是獨立實體——很適合多色列印。
- **交集**——只保留兩個以上選取實體的公共部分，或實體與孔重疊的部分。
- **分割**——用平面把實體或孔切成兩半；抽殼過的實體仍保留內腔。轉動平面可做斜切，拖曳它的箭頭，或用「選取面」把它貼到任何面上。

### 細節修整

- **倒角與圓角**——切平或倒圓實體的任何一條邊，之後還可以移除或修改該處理。
- **草圖**——用直線、曲線和現成形狀繪製輪廓，繪製時依長度和角度設定直線（「50<30」，Shift 以 15° 步進吸附），輸入長度、角度和尺寸（像「60+12.5」這樣的算式在每個數字欄位都能用），給角落倒圓或倒角，吸附到其他實體的輪廓，繪製可吸附的構造線，然後擠出或旋轉成精確實體。帶螺距的旋轉會把輪廓繞成一條連續的螺旋股，而不是一圈圈圓環，就像線軸上的線材。草圖也可以做成筆畫：閉合輪廓變成邊框，位於線內側、外側或以線為中心；開放線條變成條帶，端部可選平頭、方頭或圓頭。
- **抽殼**——把實體變成單一壁厚的殼，你選擇的面可以開口（上、下、前、後、左、右，可任意組合）或全部封閉——適合盒子、杯子和外殼。
- **刪除面**——點擊圓角、孔或凸台的面並刪除：周圍的面會延伸過來補上缺口，實體仍保持精確，可以繼續倒圓角並用於 STEP 匯出。
- **自訂形狀**——把反覆用到的實體儲存在形狀庫頂端，點擊或拖曳即可插入任何設計；可以存在瀏覽器裡，也可以放在伺服器的共用儲存區供所有裝置使用。「全部備份」會把它們一起帶上。
- **孔陣列**——在實體的平面上打孔：選面，挑選圓孔、方孔、矩形孔、六角孔或長圓孔，設定尺寸、間距、網格或交錯排列、到邊緣的邊距和深度（貫穿整個零件或指定深度），建立前可預覽孔的樣子。它們仍是與實體組成群組的普通孔，取消群組後又能自由處理。
- **面**——把實體的平面往外推，或在其中挖一個凹槽：選面，選擇「向外」或「向內」，設定距邊緣的內縮、圓角半徑和深度，並預覽結果。它對匯入的 STL 也有效，新增的部分仍是與實體組成群組的普通草圖實體。
- **包覆到圓柱**——把 SVG 圖案、標誌或文字貼到杯子或管子的壁上，可凸起或雕刻，並讓它居中於圓柱。

### 檔案

- **自己的字型**——文字可以使用任何 TrueType、OpenType 或 WOFF 字型；在 Chrome 和 Edge 中還能使用電腦上安裝的字型。設計只保留所用字母的輪廓，所以在哪裡都能開啟。阿拉伯文和希伯來文由右往左排列，阿拉伯文字母會連寫。
- **帶上自己的模型**——匯入 STL、OBJ、3MF、STEP、SVG 或 DXF，並在其基礎上建模。雷射切割服務商或供應商寄來的 DXF 零件輪廓會匯入為一個實體，其中的孔各自成為獨立的孔，圓弧和圓保持為真正的圓弧和圓。SVG 會以草圖實體匯入：區域、線條外側或內側的筆畫、去掉孔的剪影，或四周加寬的圖形——一個檔案就能做出餅乾模具，或多色標誌的分層。文字形狀也有相同的填滿模式，形狀庫還提供名牌：用彩色分層製作適合多色列印的文字，可選鑰匙圈孔，字母邊緣可倒圓或倒角；以及圖示標籤：用同樣的彩色分層製作 SVG 圖示，可設定數量，還有「能放幾個就放幾個」來填滿平台。彩色 OBJ——來自 layerling，或來自 Tinkercad 的 ZIP（附帶 `.mtl`）——以及彩色 3MF（包括切片軟體專案），都會依每種顏色匯入為一個實體；包含多個物件的 3MF 則依每個物件匯入為一個實體。
- **匯出切片軟體要的格式**——STL、帶名稱和顏色的 3MF，或帶顏色的 OBJ，可匯出選取項目或整個場景（隱藏部分不會包含），另有 STEP，方便設計繼續進入完整 CAD 程式；俯視圖還可匯出為 SVG，或匯出為帶真正圓弧和圓的 DXF，供雷射切割使用。PNG 可儲存一張乾淨的視圖圖片，解析度是兩倍，還可以選擇透明背景。
- **圖紙匯出**——選取一個零件，或清除選取範圍以匯出整個可見設計，然後選擇 **匯出 → 圖紙 → PDF 或 SVG**。它會產生第一角投影版面的前視圖、上視圖和右側視圖，放在帶邊框的工程圖紙上，附分區編號和右下角標題欄，並標註總體尺寸、隱藏邊，以及軸向對齊圓孔的直徑／位置表格。視圖以公釐 1:1 輸出；圖紙採用能容納內容的最小 ISO 橫向尺寸（也可以自訂更大尺寸）。列印時選擇 **100%／實際大小**。位置從每個視圖左下角的總輪廓角點量起。孔表使用標稱網格幾何，不會自動標註斜孔／非圓孔、螺紋、深度或公差。投影引擎改編自 [Cadverix-3D](https://github.com/WC3D/Cadverix-3D) 的製圖工作。
- **更新提示**——在已發行的程式上，開啟中的頁面會自行發現新版本，並提示儲存後重新載入，同時列出更新內容。
- **為設計建立資料夾**——把起始頁上的設計拖曳到資料夾（資料夾還能放進資料夾），或使用「移到……」，藉此整理；搜尋會查遍所有資料夾，「全部備份」會把它們一併儲存。
- **把專案存成檔案**——把整個專案（包括歷史記錄、草圖和群組）儲存為 `.lyl` 檔，帶到別處繼續。在 Chrome 和 Edge 中，你可以自己選擇資料夾，Ctrl+S 會再次儲存到同一個檔案；其他瀏覽器則會下載它。舊版本留下的 `.skf` 檔仍可開啟；儲存時會在旁邊寫入一個 `.lyl`。
- **錯誤回報**——頁尾的一個連結會儲存一個 ZIP，裡面包含 `.lyl` 格式的設計，以及記錄版本、瀏覽器和最近訊息的文字檔，可直接附到論壇或 GitHub，因為它們不接受單獨的 `.lyl`。
- **一眼就認出的設計**——所有內容都在你自己的瀏覽器裡，每個設計都有縮圖。

### 視圖

- **透視或正交**——用縮放控制項旁的立方體按鈕，或按 **O**，在一般視圖和平坦的正交視圖之間切換。你的觀察方向和取景範圍會保持不變。
- **在立方體上轉動視圖**——拖曳視圖立方體能像按住滑鼠右鍵一樣轉動視圖，在平板上用一根手指即可；點擊仍會跳到對應的那一側，點擊角落或邊則從那個方向觀察。按鍵 **1**–**6** 也能跳轉，**Shift+1**–**6** 還會縮放到選取項目。
- **每個設計四個儲存的視圖**——**Shift+7**、**8**、**9** 或 **0** 會按目前樣子儲存視圖（角度、平移、縮放），單獨按對應鍵即可還原。每個設計各有自己的視圖，儲存的 `.lyl` 檔也會帶上它們。
- **視圖立方體可放在任何角落**——設定 > 外觀 > **視圖立方體位置** 可把立方體放到左上、右上、左下或右下；只要不是左上角，相機控制項就會上移填補它的位置。
- **從下方觀察**——相機列中網格上的眼睛圖示會隱藏平台，這樣就能看到設計的底面，而不會被平台擋住。
- **把面板放到想要的位置**——物件清單、設定、剖視圖、捲尺，以及邊、抽殼和陣列的工具面板都可以拖曳標題列移動，並在那裡再次開啟；雙擊即可停靠。
- **右鍵選單**——在實體上短按右鍵會彈出最常用的指令：複製、孔或實體、群組、對單一實體倒角、倒圓角和抽殼、鏡像和按百分比縮放、隱藏、鎖定、放到工作平面、刪除。按住右鍵拖曳仍然會轉動視圖。
- **剖視圖**——沿 X、Y 或 Z 方向的平面把視圖剖開，查看壁厚、內腔和互相配合的零件，並附粗調和細調滑桿。只有視圖被剖開：設計和所有匯出內容都保持完整。「剖切為 SVG」會把剖切結果按 1:1 儲存下來，可用於雷射切割或做模板；「量測」能直接在剖切面上讀取壁厚和間隙，並自動與壁面對正。
- **在任何面上設定工作平面**——按 W 並點擊一個面，就能在該面上建模；點擊角落附近會正好落在角落，點擊邊附近會落在邊上且網格沿邊延伸，點擊空白平台則落在該處。眼睛圖示可以隱藏平面以便看清視圖，同時它仍然生效。AI 也能把工作平面設到某個面上。
- **在平板上**——一根手指就能操作設計，效果與滑鼠左鍵完全相同：點按選取、拖曳移動、在空白處拖曳會拉出選取框。**兩根手指屬於視圖**：張開或捏合可縮放，一起移動可平移工作平面。放下第二根手指會取消第一根手指已經開始的操作，所以捏合永遠不會碰動零件。轉動視圖沒有專屬手勢；相機列上有一個開關，僅在觸控螢幕上顯示，開啟後一根手指就改為環繞視圖而不是選取。數字欄位在你點按時會交出完整數值，方便直接覆寫——數字小鍵盤沒有方向鍵可以移動游標。手指在繪製草圖點、直線、控點、量測點和邊時比滑鼠伸得更遠，不過**在平板上觸控筆是更好的工具**：更精細，也不會擋住你要瞄準的位置。

### 影片

由其他人製作，不是本專案出品：

<!-- videos:start -->
- [Layerling Tutorials](https://www.youtube.com/playlist?list=PLZ-ZWS0D1JIk) – HL ModTech（英語）。一位 Tinkercad 使用者的播放清單，目前包含約 23 分鐘的 layerling 概觀（免費、以瀏覽器執行、延伸 Tinkercad 能力的 CAD）、對其功能的深入介紹，以及關於列印螺紋的簡短更新。
- [Layerling – Playlist](https://www.youtube.com/playlist?list=PLCsBmX2kOGWs) – Making Layers（英語）。一個關於 layerling 的系列，目前收錄「Tinkercad alternative / upgrade? Introducing Layerling!」——寫給從 Tinkercad 轉來的人的概觀，以及講解草圖工具的「Layerling Sketch Tools!」。
- [Layerling](https://www.youtube.com/playlist?list=PLYqVFeqYBrPE) – TECHNOBENTO（英語）。一個關於 layerling 的播放清單，目前收錄「A new way to sketch in Layerling」。
- [Layerling CAD Videos](https://www.youtube.com/playlist?list=PLc09BHr_6nn8) – Printology（英語）。一個關於 layerling 的播放清單，目前收錄「I'm 100% In on Layerling - The Next Big Free CAD」和「Layerling Features That Blow Tinkercad Out Of The Water」。
- [I Tried Layerling After Tinkercad… Is It REALLY Better?](https://youtu.be/5DpOxdoNwqs) – Maker Mates Studio 3D Printing（英語）。一位 Tinkercad 使用者試用 layerling，並比較兩者。
- [Print by Layer](https://www.youtube.com/playlist?list=PLejZBz4L7CGQ) – Print N Repeat（英語）。一個關於 layerling 的播放清單，目前收錄「The EASIEST Way to Design Hinges in Layerling」和「The EASIEST Way to 3D Model Threads!」。
- [Tinkercad Too Basic? Fusion 360 Too Much? Meet Layerling for 3D Printing](https://youtu.be/kzV7fQ3rXhw) – 3D Jesus | 3D Printing & Design（英語）。在完全沒有手冊的情況下初次試用 layerling：圓角與倒角、抽殼、螺紋、草圖、旋轉實體、陣列、匯入與印表機設定。
- [Layerling la nueva herramienta gratuita de modelado 3D, más completo que Tinkercad](https://youtu.be/-EEt0RSINoY) – Fulcro 1900（西班牙語）。一支關於 layerling 的影片：這款新的免費 3D 建模工具比 Tinkercad 更完整。
- [Layerling](https://www.youtube.com/playlist?list=PLQuXPoMXTnRQ) – Werkplaats Marc（荷蘭語）。一個關於 layerling 的播放清單，目前收錄給 Tinkercad 使用者的初探（「Layerling - De Gratis Tussenstap van Tinkercad naar Fusion 360」）和草圖教學：描摹照片、旋轉與沿路徑掃掠（「Schetsen Uitgelegd」）。
<!-- videos:end -->

## 快速上手

最省事的方式是使用代管版本。無需安裝，無需註冊——打開就能開始做：

**https://layerling.com/**

本節其餘內容說明如何執行你自己的副本：在自己的電腦上，或在工作室裡一台大家用瀏覽器存取的機器上。無論應用程式從哪裡提供，設計都不會離開建立它的瀏覽器，匯出檔會直接下載到使用者自己的電腦。

### Windows 快速上手

從沒用過終端機？在還沒安裝任何東西的 Windows 11（或目前版本的 Windows 10）電腦上，開啟
**PowerShell**（在開始功能表搜尋即可，不需要系統管理員權限），貼上下面這一行：

```powershell
irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1 | iex
```

如果缺少 Git 和 Node.js，它會先裝好；接著把 layerling 下載到 `%USERPROFILE%\layerling`，並在瀏覽器中開啟
`http://127.0.0.1:3000/`。使用 layerling 時請讓 PowerShell 視窗保持開啟；在該視窗按 `Ctrl+C` 即可停止。

想**更新** layerling 時，再執行同一行指令——它會發現資料夾已存在，改為取得最新版本，而不是重新下載一次。指令碼本身位於
[`scripts/windows-quickstart.ps1`](scripts/windows-quickstart.ps1)，執行前你可以先讀清楚它到底做什麼，也可以把它下載下來
在本機執行，而不是用管線交給 PowerShell。

#### 之後再次開啟

上面的一行指令還會在桌面留下一個名為 **「Start layerling」** 的捷徑。以後想再次開啟 layerling，雙擊它即可——
不用 PowerShell、不用重新安裝、不用重新下載，伺服器會啟動，瀏覽器會自動開啟。它還會**先更新 layerling**
（當資料夾裡沒有你自己的變更時），並且只在伺服器真正就緒後才開啟瀏覽器。如果 layerling 已經在執行，它不會啟動
第二個伺服器，也不會在執行中的副本背後更新——只會開啟頁面。想把 layerling 放在別處，例如另一個磁碟機？以你要的資料夾執行指令碼：

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/henmedia/layerling/main/scripts/windows-quickstart.ps1))) -InstallPath "D:\3DPrinter\Layerling"
```

如果你的捷徑是由舊版指令碼建立的，再執行一次一行指令；它會用新的捷徑替換舊的。

想手動操作？開啟 PowerShell 並執行：

```powershell
cd $env:USERPROFILE\layerling
npm run dev
```

然後自己開啟 `http://127.0.0.1:3000/`。無論哪種方式，在該視窗按 `Ctrl+C` 都能停止。

### Docker

想在電腦、NAS（Synology、Unraid 等）或家用伺服器上執行 layerling 又不想安裝 Node.js，可以使用 Docker Hub 上現成的映像
**`henmedia/layerling`**（**`ghcr.io/henmedia/layerling`** 也是同一個映像）。每個版本都會以版本號和 `latest` 發行
amd64 與 arm64（樹莓派、ARM NAS）映像。應用程式監聽 **3000** 連接埠。

最快的方式是一行指令：

```bash
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`-v` 選項會把起始頁的預覽圖片儲存在名為 `layerling-thumbnails` 的 Docker 磁碟區裡，讓它們在更新後仍然存在；不加這個選項，
圖片就在容器內部，每次重新建立容器都會遺失（設計本身儲存在瀏覽器裡，不受影響）。在有容器管理員的 NAS 上
（Synology Container Manager、Unraid、Portainer），在其映像登錄（Docker Hub）中搜尋 `henmedia/layerling`，
或輸入 `henmedia/layerling:latest`，把 3000 連接埠對應進去，並為 `/app/.codex/project-thumbnails` 新增一個磁碟區。要更新，
重新提取映像並重新建立容器（或讓 Watchtower 代勞）。

映像標籤是純版本號，**不帶「v」**：`ghcr.io/henmedia/layerling:1.42.0`，而 GitHub 發行版本叫 `v1.42.0`。
提取只會取得新映像；已經存在的容器仍會執行舊映像，直到它被刪除並重新建立：

```bash
docker pull ghcr.io/henmedia/layerling:latest
docker stop layerling
docker rm layerling
docker run -d --name layerling -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails --restart unless-stopped ghcr.io/henmedia/layerling:latest
```

`docker inspect layerling | grep image.version` 會顯示容器實際執行的版本。如果你為伺服器儲存區掛載了資料夾，請再加上同樣的 `-v` 選項。

想自己建置映像，可以使用儲存庫裡的 [`Dockerfile`](docker/Dockerfile) 和 [`compose.yml`](docker/compose.yml)：

1. **安裝 Docker。** 在 Windows 或 macOS 上，安裝並啟動 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。在 Linux 或 NAS 上，你需要帶 Compose 的 Docker（`docker compose` 或獨立的 `docker-compose`）。
2. **取得檔案。** 可以下載儲存庫 ZIP（[Code → Download ZIP](https://github.com/henmedia/layerling/archive/refs/heads/main.zip)）並解壓縮，或複製它：
   ```bash
   git clone https://github.com/henmedia/layerling.git
   cd layerling
   ```
3. **啟動它。** 在專案資料夾中開啟終端機（例如 Windows 上的 PowerShell）並執行：
   ```bash
   docker compose -f docker/compose.yml up -d --build
   ```
   使用較舊的獨立版程式時，把 `docker compose` 寫成 `docker-compose`。Docker 會建置映像並在背景執行容器（`-d`）；首次建置大約需要 2–3 分鐘。不加 `--build` 時，同一條指令會改為提取現成的映像。
4. **開啟它。** 在同一台電腦上前往 **`http://localhost:3000/`**；從網路中的其他裝置前往 **`http://<YOUR-SERVER-IP>:3000/`**。

日常指令：

- **停止：** `docker compose -f docker/compose.yml down`
- **重新啟動：** `docker compose -f docker/compose.yml up -d`
- **更新**（取得新程式碼或解壓縮新 ZIP 之後）：`docker compose -f docker/compose.yml up -d --build`；使用現成映像時，先 `docker compose -f docker/compose.yml pull`，再 `up -d`

**安裝為應用程式與離線使用都需要 https，而且需要靜態匯出。** 瀏覽器只會在 `https://` 或 `localhost` 上安裝應用程式並保留供離線使用；
在普通的 `http://192.168.x.x:3000` 位址上兩者都不提供（layerling 會在那裡隱藏安裝提示）。即使有 https，離線檔案
（`sw.js`）也只寫入靜態匯出（見[靜態託管](#靜態託管web-伺服器上的純檔案)），不會寫入這個在伺服器上執行的映像。
要在網路上安裝並離線使用，請透過 https 提供靜態匯出；要在容器前面加上一個 https 位址，可使用 Caddy 或帶憑證
（例如來自 mkcert）的 nginx 之類反向代理。

該映像在正式模式下執行 `next start`，所以除非你開啟它，MCP 橋接在那裡是關閉的（見[讓 AI 用戶端存取 NAS 或伺服器上的副本](#讓-ai-用戶端存取-nas-或伺服器上的副本)）。要提供共用專案資料夾，請綁定一個可寫入的目錄，
並在 `compose.yml` 中把 `LAYERLING_SHARED_PROJECTS_DIR` 設為它在容器內的掛載路徑，例如 `./shared-projects:/shared-projects`
搭配 `LAYERLING_SHARED_PROJECTS_DIR: "/shared-projects"`（見[網路上的共用設計](#網路上的共用設計)）。容器以 UID 999 的身分執行，所以必須允許該使用者寫入這個資料夾：`sudo chown 999:999 ./shared-projects`，或給服務加上
`user: "1000:1000"`（換成你自己的使用者和群組編號，`id -u` 和 `id -g` 可查看），讓容器以你的身分執行。不加的話，
資料夾會顯示在起始頁上，但什麼都存不進去。修改後執行 `docker compose up -d`：`docker compose restart` 會保留舊設定。
`docker exec <container> printenv LAYERLING_SHARED_PROJECTS_DIR` 會顯示正在使用的值。

要選擇人們首次存取時看到的配色主題，把 `LAYERLING_DEFAULT_THEME` 設為 `system`、`light`、`dark` 或 `graphite`
（同樣在 `compose.yml` 中或 `npm run start` 的環境變數裡設定）。之前開過 layerling 的人會保留瀏覽器已有的主題，
任何人仍可用主題開關更改。不設定時主題跟隨系統。以純檔案方式提供的副本沒有可讀取該設定的伺服器，所以在那裡不生效。

給有兒童的班級或工作坊用的話，`LAYERLING_SIMPLE_MODE` 會讓 layerling 以簡易模式啟動：功能區只保留工作坊會用到的工具，
形狀庫只顯示簡短清單，按鈕更大，起始頁只顯示設計，沒有新聞、沒有歡迎文字，也沒有離開 layerling 的連結。`true`
是尚未選擇的人採用的初始值（設定裡有開關，在該模式下退出需要按住兩秒），`always` 對所有人固定生效並移除開關。以
`?mode=simple` 結尾的連結會為開啟它的裝置開啟該模式，`?mode=full` 則關閉。它的設定方式與其他變數相同，
以純檔案方式提供的副本沒有可讀取它的伺服器（連結和設定在那裡仍然有效）。

開啟共用資料夾後，`LAYERLING_NEW_DESIGNS_ON_SERVER` 會讓新增設計預設放在伺服器上：`true` 是尚未選擇的人採用的初始值
（他們可以在起始頁取消勾選 **在伺服器上新增設計**），`always` 對所有人固定生效並鎖定該核取方塊。設定方式相同，
以純檔案方式提供的副本沒有可讀取它的伺服器。

在搭配網域的反向代理後面，代理必須傳遞原始的 `Host` 和 `X-Forwarded-Proto`（nginx：`proxy_set_header Host $host;`
和 `proxy_set_header X-Forwarded-Proto $scheme;`），否則儲存到伺服器會被拒絕，並提示
「Shared projects only accept requests from this site.」。如果代理改寫了主機名稱而你又無法更改，請把人們使用的位址列入
`LAYERLING_ALLOWED_ORIGINS`（逗號分隔，例如 `https://layerling.example.com`）。

### 靜態託管：Web 伺服器上的純檔案

任何 Web 伺服器都能以純檔案方式提供 layerling；伺服器上不執行 Node.js。在一台裝有 Node.js 的電腦上建置一次檔案
（見[你需要什麼](#你需要什麼)）：

```bash
npm install
npm run export
```

完成的網站位於 **`apps/web/.next-export/`**。把該資料夾的**內容**（不是資料夾本身）複製到 Web 伺服器的網站根目錄，
讓 `index.html` 直接位於其中。

有四件事要知道：

- **layerling 需要自己的位址。** 檔案之間以根路徑開頭的位址互相引用（`/_next/...`），所以 layerling 必須從某個位址的根路徑提供，例如 `https://layerling.example.com/` 或 `http://192.168.0.5:8080/`。它不能放在子資料夾裡（`https://example.com/layerling/`），也不能從磁碟開啟（`file://`）。如果你只看到一大段沒有任何樣式的純文字，表示指令碼和樣式檔沒有載入：開啟瀏覽器的開發者工具（F12），在「網路」分頁查看紅色的 `/_next/...` 項目，並比較它們的位址與你放置檔案的位置。
- **以底線開頭的資料夾也必須能存取。** 有些伺服器會隱藏它們（例如 GitHub Pages 在沒有 `.nojekyll` 檔案時會這樣），而 `_next` 裡裝著整個程式。
- **在自己的電腦上快速測試：** `npx serve apps/web/.next-export`，然後開啟它印出的位址。
- **安裝為應用程式與離線使用都需要 https。** 匯出中包含離線檔案（`sw.js`），但瀏覽器只會在 `https://` 位址或 `localhost` 上使用它們，不會在你網路中的普通 `http://` 位址上使用。

### 網路上的共用設計

layerling 本身只是檔案，所以共用資料夾需要伺服器上有能寫入的程式。有兩種方式，只需要其中一種：**Node 或 Docker**
（本節，搭配 `LAYERLING_SHARED_PROJECTS_DIR`），或者**帶 PHP 的普通 Web 伺服器**（`store` 資料夾，見下文）。
如果一個 Web 伺服器這兩種方式都沒有，只提供這些檔案——`npx serve`、nginx 或沒有 PHP 的 Apache——layerling 能正常顯示，
但沒有伺服器資料夾。

如果你在一台別人會用瀏覽器存取的機器上用 `npm run dev` 或 `npm run start` 執行 layerling，它可以為 `.lyl` 設計提供一個
共用資料夾。`npm run start` 提供的是 `npm run build` 產生的內容，所以先執行一次建置。把 `LAYERLING_SHARED_PROJECTS_DIR`
指向啟動 layerling 的使用者可寫入的目錄（`/srv` 下的資料夾通常屬於 root，可以自己建一個或更改擁有者）並啟動：

```bash
LAYERLING_SHARED_PROJECTS_DIR=/srv/layerling-projects npm run start
```

起始頁隨後會在瀏覽器設計旁顯示一個名為 **在伺服器上** 的資料夾。開啟它就進入了該資料夾：**新增設計** 會直接在那裡新增一個，
**新增資料夾** 會建立子資料夾，標題下方的一串路徑會顯示你目前的位置。一個 `..` 圖磚可以退回上一層，按鈕左側的
**返回此瀏覽器中的設計** 會回到此瀏覽器的設計。把設計拖曳到資料夾、該圖磚或路徑中的某一層，或使用其選單裡的
**移到……**，就能移動設計。從瀏覽器把設計放到伺服器也是同樣方式：把它的卡片拖曳到伺服器資料夾上。

起始頁上的兩個按鈕省去了逐一移動設計的麻煩：**全部放到伺服器** 會一次把此瀏覽器的所有設計移入伺服器資料夾，
而 **在伺服器上新增設計** 核取方塊會讓每個新設計都從伺服器資料夾開始，因此從第一次修改起就儲存在那裡。
名稱在伺服器上已被佔用的設計會留在瀏覽器裡。

頂端的搜尋框會搜尋整個伺服器資料夾，而不只是你目前所在的資料夾。每個結果都會說明它在哪個資料夾裡，
而那個資料夾本身就是一個按鈕：點擊就能過去，搜尋會被清空。資料夾也能按名稱找到。搜尋期間，
起始頁上的伺服器圖磚會顯示那邊有多少個相符項目。

設計選單裡的 **複製** 會建立它的副本。在伺服器上，檔案本身會被複製到原檔案旁邊，使用一個未佔用的名稱，連圖片一起複製——
不會重新打包，所以副本與原件的幾何完全一致。在瀏覽器裡，副本會成為獨立的設計，擁有相同的形狀、相同的歷史記錄和
自己的預覽圖片，並且在伺服器上不屬於任何人。

伺服器上的設計會自動存回伺服器，時間點是最後一次修改後五秒，以及你離開編輯器時。縮圖會放在檔案旁邊的
`.thumbnails` 中。只存在於瀏覽器裡的設計會留在那裡，不受影響。

儲存到伺服器的自訂形狀會放進儲存區頂端的 `Custom shapes` 資料夾，每個形狀一個 `.lyl` 及對應圖片。layerling 會在第一個
這樣的形狀出現時建立它；它是個普通資料夾，所以會顯示在起始頁上，裡面的形狀也能像任何設計一樣開啟和儲存。
無論走 Node 方式還是 `store.php`，都不需要額外設定。

從伺服器開啟設計會得到一份私有的本機工作副本。存回時會先檢查伺服器上的修訂版本；如果期間有人改過該檔案，
layerling 會拒絕覆寫，並讓你重新載入或另存新檔。這是共用檔案儲存，不是同時協作編輯。

#### 不用 Node：`store` 資料夾

以靜態匯出方式提供（Web 伺服器上的純檔案）的安裝無法自行寫入任何東西。針對這種情況，匯出中附帶了 `store.php`。
在 `index.html` 旁建立一個名為 `store` 且 Web 伺服器可寫入的資料夾，layerling 就會提供與上面相同的共用儲存，
包括資料夾等全部功能。沒有這個資料夾時該功能不會出現，編輯器裡的簡短指南會說明如何開啟。Web 伺服器需要 PHP。

該資料夾**沒有登入保護**：任何能存取該頁面的人都能讀取、寫入和刪除其中的內容。在家庭網路或工作坊裡這正是想要的；
在可公開存取的網站上，請保護它或乾脆不要使用。

部署時有一件事要記住：如果用會刪除多餘內容的選項來鏡像匯出檔案——`rsync --delete`、`robocopy /MIR`、WinSCP `-delete`——
請明確排除 `store`，否則每次更新都會清空專案。

## 開發 layerling

想修改程式碼，就走這條路。

### 你需要什麼

- Node.js 22.18 或更新版本（指南和字型指令碼會直接載入 TypeScript 檔案，舊版本做不到）；24 也可以，Docker 映像用的就是它
- npm，隨 Node.js 一起提供

用 `node -v` 和 `npm -v` 檢查版本。如果這些指令沒有作用，請從 Node.js 官網安裝 Node.js，然後重新開啟終端機。

### 安裝與執行

```bash
git clone https://github.com/henmedia/layerling.git
cd layerling
npm install
npm run dev
```

沒有 Git？在 GitHub 頁面上點綠色的 **Code** 按鈕，選擇 **Download ZIP**，解壓縮後在解開的資料夾裡開啟終端機，
從 `npm install` 開始。

然後開啟 `http://127.0.0.1:3000/`。使用應用程式時讓終端機保持開啟；`Ctrl+C` 會停止開發伺服器。

想從另一台電腦透過名稱存取開發伺服器，例如 `http://myhost.local:3000/`，請在啟動前把該名稱列入環境變數
`LAYERLING_ALLOWED_DEV_ORIGINS`（多個名稱用逗號分隔，`*.local` 表示所有以 `.local` 結尾的名稱）。不設定時，
開發伺服器只回應 `localhost` 和 `127.0.0.1`。靜態匯出和 `npm run start` 不需要它。

在 Linux 和 macOS 上，`scripts/start-layerling.sh` 會替你完成每天的啟動：先更新程式碼工作目錄（如果你改過裡面的檔案就跳過），
啟動伺服器，等它回應後開啟瀏覽器。可以從任何位置執行，例如 `~/layerling/scripts/start-layerling.sh`。它需要 Git 和
Node.js，如上所述。如果 layerling 已經在該連接埠執行，它只會開啟瀏覽器，不會再啟動一個伺服器。3000 連接埠被別的程式佔用了？
用 `PORT=3100 scripts/start-layerling.sh` 啟動。它已在 Debian Linux（沒有桌面，所以瀏覽器這一步只印出位址）和
Windows shell 中測試過；macOS 尚未測試——如果在你的系統上表現異常，請在討論區告訴我們。

### 在容器中開發

不想安裝 Node.js？那就改用容器開發。你需要帶 Compose 的容器引擎——`docker compose` 或 `podman compose`
（SELinux 上的 Rootless Podman 也可以；compose 檔案裡的 `:z` 標誌會處理檔案標籤）：

```bash
docker compose -f docker/compose.dev.yml up
```

開啟 `http://127.0.0.1:3000/`。首次啟動會安裝相依套件；之後的啟動會直接進入支援熱重載的開發伺服器。按 `Ctrl+C` 停止。
如果更新了相依套件後發現有些東西還是舊的，刪除專案資料夾裡的 `node_modules/` 再重新啟動。

同時還在執行 `docker/compose.yml` 裡的正式環境容器？它也使用 3000 連接埠——把其中一個的主機連接埠改掉
（例如 `"3100:3000"`）。

### 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm run typecheck` | TypeScript 檢查 |
| `npm run test` | 單元測試 |
| `npm run test:e2e` | 端對端測試 |
| `npm run build` | 正式版建置（由 `npm run start` 提供） |
| `npm run export` | 用於純 Web 代管的靜態匯出 |
| `npm run guide` | 從 `docs/guide` 建置使用者指南頁面（匯出和 `npm run dev` 也會這樣做） |
| `npm run guide:images` | 從執行中的程式重新拍攝指南圖片（需要 `npm run dev -- -p 3010`；見 `docs/guide/README.md`） |
| `npm run printers:update` | 從 OrcaSlicer 的設定重新整理印表機預設 |
| `npm run mcp:layerling` | 為 AI 用戶端啟動 MCP 伺服器（見下文） |

## layerling MCP Skill

layerling 內建一個本機 MCP 伺服器，供支援 MCP 工具的 AI 用戶端使用。它讓 AI 代理能夠檢查和操作一個執行中的
編輯器分頁：列出開啟的編輯器、讀取場景、建立、更新和選取物件、群組、切割和分離零件、列出 CAD 邊 ID、
套用倒角或圓角、抽殼實體、檢查錯誤並擷取視埠畫面。

它針對本機開發伺服器運作。在正式版建置和靜態託管中，MCP 路由是停用的，除非伺服器用存取權杖開啟它
（[見下文](#讓-ai-用戶端存取-nas-或伺服器上的副本)）；在 layerling.com 上它一律關閉。

1. 在專案資料夾中用 `npm run dev` 啟動 layerling（見[安裝與執行](#安裝與執行)）。
2. 開啟一個編輯器分頁，例如 `http://127.0.0.1:3000/?editor=1`——也可以不開：當沒有編輯器開啟時，第一個需要它的工具會幫你開啟瀏覽器並進入編輯器（NAS 或伺服器上的副本不適用；`LAYERLING_MCP_OPEN_EDITOR=0` 可關閉此行為）。
3. 按下面的說明連線你的 AI 用戶端。它會自行用
   `node scripts/layerling-mcp-server.mjs` 啟動 MCP 伺服器。

主要工具名稱包括 `layerling_list_editors`、`layerling_read_scene`、`layerling_list_objects`、
`layerling_create_shape`、`layerling_update_object`、`layerling_list_edges`、`layerling_apply_edge_treatment`、
`layerling_hollow_object`、`layerling_array_objects`、`layerling_set_section_view` 和 `layerling_capture_image`。

### Claude Code

無需安裝：儲存庫已經包含 `.mcp.json`，它會為本專案註冊 MCP 伺服器；還包含一份位於 `.claude/skills/layerling-mcp-skill`
的技能副本，這正是 Claude Code 尋找技能的位置。在 Claude Code 中開啟 layerling 資料夾並提問：

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### Claude Desktop

Claude Desktop 不會讀取專案的 `.mcp.json` 或技能檔案，但可以透過自己的設定使用同一個 MCP 伺服器。在那裡新增伺服器，
以 [`docs/mcp/claude-desktop-config.example.json`](docs/mcp/claude-desktop-config.example.json) 為範本，並把指令碼路徑替換成
你電腦上的絕對路徑。重新啟動 Claude Desktop 後，提問：

```text
Use the layerling MCP tools to list open editors, inspect the scene, and modify the selected object.
```

### Codex

把 `docs/skills/layerling-mcp-skill` 中的技能複製到你的 Codex 技能資料夾。

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

然後在 Codex 設定中新增一個 MCP 伺服器項目，以 [`docs/mcp/codex-config.example.toml`](docs/mcp/codex-config.example.toml)
為範本，並把指令碼路徑替換成你電腦上的絕對路徑。重新啟動 Codex 並提問：

```text
Use $layerling-mcp-skill to list my open layerling editors and inspect the current scene.
```

### Gemini 與 Antigravity

對於 Antigravity，儲存庫在 `.agents/skills/layerling-mcp-skill` 附帶了一份技能副本，Antigravity 會自動發現它。
對於 Gemini CLI，把 `docs/skills/layerling-mcp-skill` 中的技能複製到你的全域技能資料夾。

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

然後把這台伺服器新增到 Gemini CLI 的 `settings.json` 或 Antigravity 的 `mcp_config.json`，以
[`docs/mcp/gemini-config.example.json`](docs/mcp/gemini-config.example.json) 為範本，並把指令碼路徑替換成你電腦上的絕對路徑。
重新啟動用戶端並提問：

```text
Use the layerling MCP tools to list my open layerling editors and inspect the current scene.
```

### 讓 AI 用戶端存取 NAS 或伺服器上的副本

你自己代管的副本（NAS 上的 Docker 映像、家用伺服器）可以讓 AI 用戶端透過網路操作其開啟的編輯器。它**預設關閉**，
因為任何能操作這個橋接的人都能讀取和修改開啟的設計。用伺服器上的兩個設定開啟它，這些設定會在啟動時讀取——現成映像無需重新建置：

```yaml
environment:
  LAYERLING_MCP_REMOTE: "true"
  LAYERLING_MCP_TOKEN: "a-long-random-secret-of-at-least-16-characters"
```

沒有至少 16 個字元的權杖，橋接就會保持關閉。然後：

1. 在瀏覽器中開啟該副本的一個編輯器分頁，例如 `http://nas:3000/?editor=1`，並保持開啟。
2. 把位址和同一個權杖交給 MCP 用戶端：在它的設定中設定 `LAYERLING_URL=http://nas:3000` 和
   `LAYERLING_MCP_TOKEN=<the token>`（參見 `docs/mcp` 中的範例）。

權杖保護這些指令：只有傳送它的用戶端才能列出或操作編輯器。編輯器頁面不需要權杖，但只有當它們是該副本的頁面，
並且是透過只有你自己網路中的人才能使用的位址或名稱（IP 位址、不帶點的名稱，或以 `.local` 或 `.lan` 結尾的名稱）開啟時，
才會計入。這樣可以防止網際網路上的網頁透過你的瀏覽器存取你的 NAS。如果你透過真實網域開啟副本，例如在反向代理後面，
請把它列入 `LAYERLING_MCP_ALLOWED_HOSTS`（逗號分隔）。在你信任的網路上使用它，超出該範圍的任何情況都使用 HTTPS：
權杖是在請求標頭中傳輸的。

## 參與貢獻

歡迎貢獻，你不需要是 3D 列印專業人士也能幫忙——把這份 README 裡的一句話寫得更清楚也算。適合入手的地方：

- 編輯器錯誤修正
- 幾何與布林測試案例
- 匯入和匯出的邊界情況（STL、OBJ、3MF、STEP、SVG、DXF）
- 介面細節調整
- 說明文件截圖和影片
- 無障礙與效能改進

提交提取要求前請閱讀 [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)。每個版本的變更見
[版本說明](docs/CHANGELOG.md)。

## 安全性

安全敏感的問題請不要公開提交。回報流程見 [.github/SECURITY.md](.github/SECURITY.md)。

## 來源

layerling 是 Formsmith746 和 SketchForge 貢獻者所開發的 [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D)
的分支。該分支於 2026 年 9 月 16 日從 SketchForge 1.0.9 開始。SketchForge 仍是一個出色的專案，
也是本專案存在的原因。

## 商標

Tinkercad 是 Autodesk, Inc. 的商標。layerling 是一個獨立專案，與 Autodesk 沒有關聯，也未獲其認可或贊助。

## 授權條款

著作權所有 (C) 2026 layerling 貢獻者。
著作權所有 (C) 2026 SketchForge 貢獻者。

layerling 是 SketchForge-3D 的修改版本，依 **GNU Affero 通用公共授權條款第 3.0 版（僅此版本）**
（`AGPL-3.0-only`）授權——與原專案相同。見 [LICENSE](LICENSE)。

如果你修改了 layerling 並讓其他人透過網路使用修改後的版本，授權條款第 13 條要求你向他們提供對應的原始碼。
起始頁正是為此提供了一個 **原始碼** 連結：在建置時把 `NEXT_PUBLIC_SOURCE_CODE_URL` 設為你的建置所依據之原始碼的公開 URL。
