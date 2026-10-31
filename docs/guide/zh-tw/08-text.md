---
title: 文字與弧形文字
summary: 以八種字型或自訂字型製作凸起或凹刻的文字，還可以沿圓弧排列，例如硬幣、蓋子或戒指上的文字。
---

## 新增文字

在形狀庫中選擇 {{ui:shape.text}} 並放置。在右側的 {{ui:prop.text}} 欄位輸入要顯示的文字。以下是各項設定：

- **{{ui:prop.font}}：** 提供八種字型：Multilanguage、Sans、Serif、Script、Monospace、Rounded、Stencil（以直線構成的字母）與 Japanese（Zen Maru Gothic）。新文字預設為 Sans。ä、ö、ü、é 等帶重音的字母與 € 符號在每種字型中都有，假名、常用漢字，以及 澤、槇、檜 等姓名中許多罕用漢字也一樣：日文姓名在每種字型與名牌上都能正常顯示。日文字元會在文字第一次用到時才下載（罕用漢字放在第二個檔案，只有文字用到時才下載），因此這類文字會暫時顯示為問號。之後它們會留在電腦上，從此日文也能離線使用。自訂字型會排在最上方，見後面的[自訂字型](#your-own-fonts)。
- **{{ui:nameTag.letterSize}}：** 從上方看字母的大小；{{ui:prop.height}} 決定字母的厚度。
- **{{ui:prop.height}}：** 文字高出表面的距離。
- **{{ui:prop.bevel}}：** 把字母邊緣做成圓角，看起來更柔和。以 {{ui:prop.segments}} 決定分成幾段。
- **{{ui:nameTag.letterEdge}}：** 對字母頂邊做圓角或倒角，就像名牌那樣：{{ui:nameTag.edge.none}}、{{ui:nameTag.edge.round}} 或 {{ui:nameTag.edge.chamfer}}，並設定 {{ui:nameTag.letterEdgeSize}}（初始 0.4 mm，最大不超過文字高度）。它的作用範圍比 {{ui:prop.bevel}} 更廣，但只到筆畫寬度允許的地方：筆畫若比該尺寸的兩倍還窄，邊緣會收成較窄的頂面。底面保持平整，因此單一字母之後還能黏上去。選擇邊緣處理後，它會取代 {{ui:prop.bevel}}。
- **尺寸：** 與其他形狀一樣設定這一行的長度與寬度。拖曳控制點或輸入尺寸。
- **{{ui:prop.textSpacing}}：** 在字型原有間距之上再加的字母間距，以字母大小的百分比表示：0 表示維持字型的原始間距，大於 0 時字母分得更開，小於 0 時（最低 -50）更緊密，自訂字型經常需要這樣。字母大小不變，外框會跟著這一行調整，直線文字與弧形文字都一樣。阿拉伯文與希伯來文的字母會相連，不套用此間距。
- **{{ui:prop.textStretch}}：** 初始為關閉：字母維持原有比例並置於外框中央，因此外框拉得比文字所需更寬或更深時，外框仍會大於字母。開啟後，字母會在兩個方向拉伸以填滿整個外框：大寫字母可以變矮或變窄，與 Tinkercad 相同。這適用於直線文字；弧形文字有自己的字母大小。

文字一開始是單一實體。若想個別處理每個字母，點擊 {{ui:inspector.separateParts}}。之後每個字母都會成為獨立形狀。

文字的邊也能倒角或加圓角，直線或弧形文字皆可，見[邊緣倒角與抽殼實體](chapter:edges-and-hollowing)。請使用 0.2 至 0.5 mm 這類小尺寸，因為字母的筆畫很窄。

## 自訂字型

除了八種內建字型，還可以使用任何自訂字型：電腦上的字型檔案，或在 Chrome 與 Edge 中直接使用電腦已安裝的字型。在 {{ui:prop.font}} 底部選擇 {{ui:font.manage}}，會開啟 {{ui:font.title}} 視窗。

- **{{ui:font.addFile}}** 接受 TrueType 檔案（`.ttf`）、OpenType 檔案（`.otf`）或 WOFF 檔案（`.woff`）。也可以直接把檔案拖進視窗。
- **在 Windows 上**，已安裝的字型位於 Fonts 資料夾（`C:\Windows\Fonts`），瀏覽器的檔案對話方塊會隱藏這個資料夾。請改用檔案總管開啟該資料夾，再把字型拖到 {{ui:font.title}} 視窗。僅為你安裝的字型位於 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`，檔案對話方塊也會顯示這個位置。在 Mac 上，字型位於 `/Library/Fonts` 與 `~/Library/Fonts`。
- **{{ui:font.fromSystem}}** 會列出電腦上已安裝的字型。第一次使用時，瀏覽器會詢問是否允許 layerling 讀取這些字型。用搜尋欄位可快速找到字型，點擊即可選用。

若已選取文字，它會立即換成新字型。否則字型會出現在 {{ui:prop.font}} 下的 {{ui:font.customGroup}} 群組中，視窗中的 {{ui:font.use}} 可將它套用到選取的文字。自訂字型的運作方式與內建字型相同：弧形文字、邊緣倒角與圓角，以及 STEP 匯出都照常運作。字型缺少的字母會從 Sans 取用。

### 阿拉伯文與希伯來文

阿拉伯文、波斯文、烏爾都文與希伯來文由右往左書寫：第一個字母在最右邊，在「Name عربي」這類混合文字中，只有阿拉伯文單字會反向排列，數字維持正常方向。阿拉伯字母會依書寫規則與相鄰字母相連，lam-alef 會形成連字。這需要含有這些字母的字型；內建字型並沒有。請新增自訂字型，例如 Windows 上的 Arial、Tahoma 或 Segoe UI，或 Noto Naskh Arabic、Noto Sans Arabic、Amiri 等免費字型。母音符號會附在所屬的字母上。弧形文字、輪廓、剪影、分層與名牌的處理方式都與其他文字相同。

### 各瀏覽器支援的功能

| 瀏覽器 | 選擇字型檔案 | 使用電腦上的字型 |
| --- | --- | --- |
| 電腦上的 Chrome 與 Edge，以及已安裝的 layerling 應用程式 | 可以 | 可以，瀏覽器詢問後即可 |
| Firefox | 可以 | 不行 |
| Mac 上的 Safari | 可以 | 不行 |
| 平板與手機 | 可以，從裝置的檔案選擇 | 不行 |

網頁無法任意讀取已安裝的字型。只有 Chrome 與 Edge 具有這項權限，而且僅限於安全頁面，也就是像 layerling.com 那樣透過 `https` 存取。當 layerling 透過 `http` 執行時，例如架在你自己的伺服器上，或作為家庭網路中的 Docker 安裝，{{ui:font.fromSystem}} 不會出現；這時請從檔案總管把字型拖曳過來。在其他瀏覽器中，請從字型資料夾選擇字型檔案，結果相同。若你在 Chrome 或 Edge 中拒絕了詢問，可以在網站設定中重新允許，入口在位址列左側的鎖頭圖示後方。

layerling 無法讀取 WOFF2 檔案（幾乎總是有 TTF 或 OTF 版本）、字型集合（`.ttc`，一個檔案含多種字型）或彩色 emoji 字型。對於非常大的字型，例如中文字型，layerling 只取前 8000 個字元。可變字型會以其預設設定讀取，通常是標準字重。

有些字型（尤其是手寫體與可變字型）會用互相重疊的筆畫繪製字母。layerling 在讀取字型時會把它們合併成單一乾淨的輪廓，讓實體保持可列印。這類字母因此由許多很短的直線段構成，而不是曲線；外觀上看不出來。

### 字型存放位置

自訂字型只存放在**這台電腦的這個瀏覽器**中。其他瀏覽器或其他電腦要等你也在該處新增字型後，才會知道它。清除瀏覽器的網站資料也會一併清除字型。在 {{ui:font.title}} 視窗中，垃圾桶會把字型從瀏覽器移除。你的設計不會因此少掉任何東西，下一節會說明原因。

### 傳遞含有自訂字型的設計

設計**不會儲存字型檔案**，只儲存其文字所用字母的輪廓，也包括歷史記錄較早步驟中的文字。如果文字是「Hello」，跟著設計走的只有 H、e、l 與 o。設計以任何方式儲存都一樣：在瀏覽器中、在你自己的伺服器上、存成 `.lyl` 檔案，以及存到 {{ui:myShapes.title}} 中。

因此：

- **設計在任何地方都能正確開啟**，包括沒有該字型的電腦。文字看起來相同，也能移動、旋轉、縮放與加圓角。
- **新字母需要字型。** 如果沒有該字型的人輸入了設計未帶上的字母，layerling 會用 Sans 繪製。此時 {{ui:prop.font}} 下會把該字型標示為 {{ui:font.fromDesign}}。新增字型檔案後，每個字母都會回來。
- **匯出內容只有幾何。** STL、3MF、OBJ、STEP 與 SVG 只包含實體與輪廓，不含字型。
- **較舊的 layerling 版本**還不認得自訂字型，會以 Multilanguage 繪製這類文字。

**授權：** 字型受著作權保護，其授權條款規定你能如何使用。PDF 檔案從字型帶走的正是內嵌的字母輪廓，大多數授權允許這麼做。但有些商業字型連傳遞單一字母都禁止。在把含有自訂字型的設計傳給他人或公開發布之前，請先確認字型的授權。Google Fonts 等免費字型（大多採用 SIL Open Font License）可以放心傳遞。列印零件或匯出的 STL 則無妨：它們已不含字型，只有幾何。

## 凸起或凹刻

- **凸起：** 把文字放在表面上，再與實體群組。文字會從表面凸出形成浮雕。
- **凹刻：** 把文字切換為 {{ui:inspector.hole}}，讓它稍微伸入表面，再與實體群組。字母就會被刻進去。

要在側面加上文字，先把工作平面放到該面上，見[檢視與工作平面](chapter:view-and-workplane)。

## 輪廓、剪影與加寬

文字不一定要做成實心字母。屬性中的 {{ui:prop.textFill}} 提供與 Tinkercad 相同的選項：

- **{{ui:prop.textFill.filled}}：** 字母維持原樣。
- **{{ui:prop.textFill.outline}}：** 沿字母輪廓畫一條線，一半在輪廓內、一半在外。
- **{{ui:prop.textFill.outer}}：** 沿字母外側畫一條線。
- **{{ui:prop.textFill.inner}}：** 沿字母內側畫一條線。

選擇線條後，清單正下方會出現兩項設定：{{ui:prop.sketchLineWidth}} 設定線條粗細，{{ui:sketch.strokeJoin}} 設定線條如何繞過轉角（{{ui:sketch.strokeJoin.round}}、{{ui:sketch.strokeJoin.bevel}} 或 {{ui:sketch.strokeJoin.miter}}）。較少用的設定在 {{ui:inspector.more}} 之下：{{ui:prop.sketchSilhouette}} 會略去 O、A 或 e 中的孔，{{ui:prop.textWider}} 則讓字母保持實心，並沿四周以線寬加粗；相觸的字母會連成一體。

使用外側線、置中線條或「加寬」時，文字外框會變大，而字母大小維持不變。{{ui:prop.bevel}} 與 {{ui:prop.segments}} 僅適用於實心字母。

## 分層與名牌

多色列印用的名牌是分層的文字：最上層是字母，下面是用第二種顏色、稍微加寬的相同文字，最底層則是第三種顏色、沒有孔的底板。layerling 一鍵就能完成：

- **新名牌：** 在形狀庫中選擇 {{ui:shape.nameTag}} 並放置。它會顯示白色「Name」字母，搭配紅色邊框與深色底板。
- **從文字製作：** 選取文字，點擊其設定最上方的 {{ui:nameTag.makeLayers}}。

名牌的所有設定都在設定最上方的 {{ui:nameTag.title}} 卡片中：

- **{{ui:prop.text}}** 與 **{{ui:prop.font}}**，也包含自訂字型。名牌會隨文字增長。
- **{{ui:nameTag.letterSize}}：** 大寫字母的高度，單位為 mm。所有分層都會跟著調整並保持對齊。
- **{{ui:nameTag.layers}}：** 每個分層一列，由上往下排列。每列包含顏色（點擊色塊）、該層比字母寬出多少、高度，以及 {{ui:nameTag.noHoles}}，用來填平 O、A 等字母中的孔。{{ui:nameTag.corners}} 設定加寬的分層如何繞過字母轉角：{{ui:nameTag.corner.round}}、{{ui:nameTag.corner.bevel}} 或 {{ui:nameTag.corner.miter}}。最上面一列就是字母本身。**+** 會在底部新增一層，**–** 會移除最底層。名牌可有二到六層。
- **{{ui:nameTag.keyring}}：** 在底層加上一個末端為圓形的直舌片，並開一個鑰匙圈孔；舌片會隨孔一起變大。預設的 3 mm 孔會做出寬 6.5 mm、外伸 6.75 mm 的舌片，孔緣距底層邊緣 2 mm。選擇 {{ui:nameTag.keyringDiameter}} 與 {{ui:nameTag.keyringSide}}：{{ui:nameTag.side.left}}、{{ui:nameTag.side.right}} 或 {{ui:nameTag.side.top}}。{{ui:nameTag.side.free}} 會把孔從名牌上拿開，並在旁邊放一個獨立的 {{ui:nameTag.keyringTab}}，顏色和高度都與底層相同：這是一般形狀，你可以用控制點把它移到名牌需要的任何位置並旋轉。放好後，其面板中的 {{ui:nameTag.keyringTabFix}} 會把它併入最近的名牌，就固定在目前位置：孔會穿過它到達的每一層，耳片併入底層，而文字或尺寸改變時，兩者都會留在字母的該轉角處。{{ui:nameTag.side.free}} 會把舌片放回原位，讓你再次移動它。孔會穿過它接觸的每一層；改變文字、字母大小或字型時，舌片也會跟著移動。{{ui:nameTag.keyringAlong}} 會讓舌片沿所在邊上下移動（在頂邊上則是左右移動），直到即將離開該邊為止；0 表示中央。當邊的中央正好遇到空隙時（例如 J 旁邊），可以用它把舌片移到字母伸出的部位。
- **{{ui:nameTag.letterEdge}}：** 對頂層字母的頂邊做圓角或倒角，就像列印出的名牌那樣收邊：{{ui:nameTag.edge.none}}、{{ui:nameTag.edge.round}} 或 {{ui:nameTag.edge.chamfer}}，並設定 {{ui:nameTag.letterEdgeSize}}（初始 0.4 mm，最大不超過層高）。它適用於所有字型與文字。這個邊是字母網格的一部分，因此邊工具會把這類文字當作網格處理，對如此精細的文字負擔很重；請改在這裡選擇邊緣處理。

每次變更都會立即顯示。名牌是一個綁定：它會整體移動，而每一層仍是各自獨立、各有顏色的實體，切片軟體進行多色列印正需要如此。要對某一層的邊做圓角或倒角，點擊 {{ui:group.editBundle}} 並選擇該層，見[邊緣倒角與抽殼實體](chapter:edges-and-hollowing)。

### 一次製作多個名牌

在 {{ui:textLayers.names}} 中輸入姓名，每行一個，最多一百個。下方按鈕會顯示將製作多少個名牌，例如「製作 12 個名牌」。每個名牌都有相同的分層、字母大小與鑰匙圈孔，而且各自是獨立物件；它們會在第一個名牌下方分成數列排列，間距 5 mm。一般文字的設定較下方也有姓名清單。

## 圖示牌

圖示牌是相同的名牌，只是以 SVG 圖示取代字母：一顆心、一朵雲、社團標誌。最上層是圖示，下面是用第二種顏色、稍微加寬的相同輪廓，最底層則是沒有孔的底板。

- **新圖示牌：** 在形狀庫中選擇 {{ui:shape.iconTag}}。會開啟一個小視窗：點擊 {{ui:iconTag.browse}}，選擇 SVG、PNG 或 JPG 檔案，確認圖片，輸入圖示的 {{ui:iconTag.width}}，再點擊 {{ui:iconTag.ok}}。圖示牌會立在平台中央，分層與新名牌相同。
- **從草圖實體：** 匯入的 SVG，或你自己畫的草圖，其設定最上方有 {{ui:nameTag.makeLayers}}。

設定最上方的 {{ui:iconTag.title}} 卡片包含：

- **{{ui:iconTag.replace}}：** 把另一個檔案（SVG、PNG 或 JPG）的圖示換到圖示牌上；分層與寬度維持不變。
- **{{ui:iconTag.iconWidth}}：** 上層圖示的寬度，單位為 mm。所有分層都會跟著調整並保持對齊。
- **{{ui:nameTag.layers}}：** 各列與名牌相同——顏色、加寬多少、{{ui:nameTag.corners}}、高度與 {{ui:nameTag.noHoles}}，以及 **+** 與 **–**，二到六層。最上面一列就是圖示本身。
- **{{ui:nameTag.keyring}}：** 與名牌相同：穿過每一層的鑰匙圈孔，底層在圖示之外有一個末端為圓形的舌片。{{ui:nameTag.keyringDiameter}} 與 {{ui:nameTag.keyringSide}} 選擇大小與位置；{{ui:nameTag.side.free}} 會產生獨立舌片，與名牌相同。舌片是依圖示輪廓製作，因此輪廓很不規則的圖示請確認它與底板相接的位置。{{ui:nameTag.keyringAlong}} 會讓舌片沿所在邊移動，與名牌相同。
- **{{ui:iconTag.count}}：** 想要幾個圖示牌，1 到 100。{{ui:iconTag.fill}} 會依設定中所選印表機的列印平台計算，小標誌可以排滿一整個平台。下方按鈕會製作出來，間距 5 mm，以平台中央為中心排列；第一個就是圖示牌本身。

SVG 需要封閉輪廓；只有開放線條的圖形無法做成圖示牌。填充為線條的草圖實體會保留線條：該線條圍出的區域就是圖示。

**圖片（PNG 或 JPG）** 會被描摹成輪廓，預覽會顯示該輪廓。在 {{ui:iconTag.part}} 下選擇要由 {{ui:iconTag.part.dark}} 還是 {{ui:iconTag.part.light}} 成為圖示；初始是背景以外的部分。透明像素永遠不屬於圖示。只含一張圖片的 SVG（例如 Inkscape 儲存匯入的點陣圖）也會以相同方式描摹。輪廓會跟著像素走，因此小圖片的邊緣會較粗糙：幾百像素以上的圖片效果最好。{{ui:iconTag.replace}} 會取圖片中背景以外的部分。

## QR Code

QR Code 會把文字或網址變成手機相機可讀取的圖案：招牌上連到你商店的連結、杯墊上的 Wi-Fi 名稱、鑰匙牌上的電話號碼。

在形狀庫中選擇 {{ui:shape.qrCode}}。會開啟一個視窗，游標已經在文字欄位中：

- **{{ui:qrCode.text}}：** QR Code 的內容。按 Enter 建立 QR Code，Shift+Enter 換行。欄位下方會顯示已用掉多少空間；變音符號與其他特殊字母會佔用兩個位元組。文字過長時，欄位會提示。
- **{{ui:qrCode.errorCorrection}}：** L、M、Q 或 H。等級越高，QR Code 局部髒污或刮傷時仍可讀取（L 約 7 %，M 15 %，Q 25 %，H 30 %），但相同文字需要更多模組，因此每個模組會更小。初始選擇 M。
- **{{ui:qrCode.style}}：** {{ui:qrCode.style.code}} 只製作 QR Code 本身，高 4 mm。{{ui:qrCode.style.raised}} 把 QR Code 以 1 mm 高放在 3 mm 厚的白色底板上，成為雙色綁定，這樣多色列印會把 QR Code 印成深色、底板印成淺色。{{ui:qrCode.style.engraved}} 把 QR Code 刻入底板 1 mm 深。
- **{{ui:qrCode.sizeBy}}：** 輸入整個 QR Code 的 {{ui:qrCode.sizeBy.width}}（初始 40 mm）或單一模組的大小；另一個數值會顯示在下方。模組小於 0.8 mm 時會出現警告。這只是 0.4 mm 噴嘴的經驗法則，並非保證：印表機、材料、顏色與手機都會有影響。
- **{{ui:qrCode.quietZone}}：** 掃描器需要 QR Code 四周有一圈四個模組寬的空白區。在底板上，這圈空白區屬於底板；只有底板放在更大的淺色表面上時才可關閉。單獨的 QR Code 本身沒有空白區：請在四周留出空間。
- **高度：** QR Code 的高度；在底板上則是 QR Code 高度或雕刻深度，以及底板厚度。

預覽會顯示 QR Code 完成後的樣子。{{ui:qrCode.ok}} 會把它放到平台中央。

QR Code 與其他實體一樣：可以移動、旋轉、縮放（保持寬度與深度相同，否則 QR Code 會被拉伸）、群組，或把它設為孔並群組進你自己的零件，在那裡刻出 QR Code。縮放會縮放整個 QR Code；每個模組始終保持正方形。

設定最上方的 {{ui:qrCode.title}} 卡片中存有文字。修改後點擊 {{ui:qrCode.regenerate}}：QR Code 會在原處重新建立，寬度維持目前值。錯誤更正、空白區與建構方式維持原本的選擇；若要其他選擇，請從形狀庫新建 QR Code。

列印前先用手機掃描一次，列印後再掃描一次。深色配淺色最易讀取；深色底板上的淺色 QR Code 並非所有手機都讀得到。

## 弧形文字

文字不一定得排成直線，也可以沿硬幣、蓋子或戒指的邊緣排列。為此提供了 {{ui:prop.textCurved}} 設定。

![文字沿圓周排列。所有字母都立在同一條基線上。](shot:curved-text)

開啟後，文字會沿圓周排列。所有字母都立在同一條基線上，與一般文字一樣均勻。共有四項設定：

- **{{ui:prop.textRadius}}**（5 至 500 mm）：字母基線所在圓的半徑。字母保持原位，只改變彎曲程度。
- **{{ui:nameTag.letterSize}}：** 字母的高度。不再取決於形狀的寬度。
- **{{ui:prop.textInward}}：** 把文字從圓的頂部移到圓的底部。字母的頭部便朝向圓心。
- **{{ui:prop.textFlipped}}：** 只把字母翻面，讓你能從另一側閱讀。文字在圓上的位置不變。

**圓心就是形狀的中心。** 因此對齊照常有效：若把文字與圓柱或圓環置中對齊，它會正好同心。拉動控制點時，半徑與字母大小會一起增大，文字因此不會變形。

> **提示：** 在圓的頂部，字母立在基線外側；使用 {{ui:prop.textInward}} 時則立在基線內側，頭部朝向圓心。要讓文字剛好落在圓盤上，半徑加上字母大小應小於圓盤的半徑。
