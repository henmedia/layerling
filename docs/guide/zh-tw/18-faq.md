---
title: 常見問題
summary: 針對大家最常問的問題提供簡短回答，涵蓋儲存、大型模型、圓角、AI 與列印，每個回答都指向完整說明。
contents: questions
---

每個回答都很簡短，結尾指出本指南中完整說明它的地方。頂端的搜尋框可以用問題裡的任何一個詞找到它。

## 儲存與備份

### 我的設計存放在哪裡？有雲端嗎？

存放在你自己電腦的瀏覽器裡。沒有帳號，也沒有雲端，不會上傳任何東西；每項變更都會自動儲存。在自己的伺服器上執行 layerling 的人，還可以把設計存放在伺服器上的共用資料夾裡。

更多：[設計存放在哪裡](chapter:files-and-saving#where-your-designs-live)

### 我的設計不見了。怎麼回事？

設計只存在於一台電腦上的一個瀏覽器裡。如果瀏覽器中該頁面的資料被清除，設計就沒了；在另一個瀏覽器或另一台電腦上也看不到它們。Mac、iPhone 和 iPad 上的 Safari 會在七天沒有造訪頁面後刪除它的資料，除非 layerling 已安裝為應用程式。如果你有備份，起始頁上的 {{ui:dashboard.restoreBackup}} 可以把設計連同資料夾和圖片一起找回來。

更多：[你的設計，你的備份](chapter:files-and-saving#your-designs-your-backup)

### 怎樣備份全部內容，還能自動備份到資料夾？

起始頁上的 {{ui:dashboard.backupAll}} 會把所有設計打包成一個 ZIP 檔案。此外，layerling 會自動保留每個設計的早期版本；在 Chrome 和 Edge 中，它還能把每個版本以 .lyl 檔案寫入你選擇的資料夾。保留在瀏覽器裡的版本會隨瀏覽器資料一起消失，所以它們不能取代 ZIP 或資料夾。

更多：[早期版本](chapter:files-and-saving#earlier-versions)

### 怎樣把設計帶到另一台電腦或另一個瀏覽器？

在匯出視窗中把它存成 .lyl 檔案，再到另一台電腦的起始頁開啟該檔案。要一次帶走所有設計，在這邊使用 {{ui:dashboard.backupAll}}，在那邊使用 {{ui:dashboard.restoreBackup}}；已經存在的設計不會重複加入。

更多：[備份與轉交](chapter:files-and-saving#backing-up-and-passing-on)

### 清除瀏覽器資料會怎樣？

存在該瀏覽器裡的設計會被刪除，layerling 保留在那裡的早期版本也一樣。用 {{ui:dashboard.backupAll}} 產生的 ZIP、你的 .lyl 檔案以及硬碟上的備份資料夾不受影響。請先備份，再清除。

更多：[你的設計，你的備份](chapter:files-and-saving#your-designs-your-backup)

### 怎樣回到先前的狀態？

復原會一步一步往回走。歷史記錄檢視用滑桿顯示每一步，不會更動設計，還能從任一步建立新設計。如果想要今天稍早或上週的狀態，可以從早期版本清單把舊版本當成新設計開啟，目前的設計保持原樣。

更多：[回看：歷史記錄檢視](chapter:select-and-arrange#looking-back-the-history-view)和[早期版本](chapter:files-and-saving#earlier-versions)

### STL 和 3MF 能直接存進我的專案資料夾嗎？又怎樣改回下載？

在 Chrome 和 Edge 中，一個設計第一次匯出時會詢問儲存位置，之後的匯出會直接寫入同一個檔案，不再詢問。Firefox 和 Safari 一律下載。如果你希望每次都下載，請在設定中開啟 {{ui:workspace.stlAsDownload}}。

更多：[匯出](chapter:files-and-saving#exporting)

### 儲存對話方塊關掉了，卻沒有檔案。為什麼？

對於無法使用的對話方塊，瀏覽器回報的結果和你取消它時一樣；被防毒軟體擋下的檔案同樣寫不進去。這時頂端的訊息會提供 {{ui:status.saveAsDownload}}，它會把檔案放進你的下載項目。要完全略過對話方塊，請在設定中開啟 {{ui:workspace.lylAsDownload}} 和 {{ui:workspace.stlAsDownload}}。

更多：[備份與轉交](chapter:files-and-saving#backing-up-and-passing-on)

## 安裝與更新

### 有可以下載的應用程式嗎？

layerling 是從瀏覽器安裝的：安裝後它有自己的圖示和視窗，沒有網路也能啟動。沒有需要下載的安裝程式，正版只在 layerling.com。**不要從任何其他網站下載或執行「layerling」安裝程式：** 它並非來自 layerling，可能含有惡意軟體。如果要執行自己的副本，有 Windows 快速開始方式和 Docker 映像。

更多：[安裝為應用程式](chapter:offline-and-install#installing-as-an-app)和[自行執行](chapter:offline-and-install#running-it-yourself)

### layerling 沒有網路能用嗎？

可以。第一次造訪之後，沒有網路也能啟動，最好安裝為應用程式。只有一樣東西要到第一次需要時才載入：第一次匯出 STEP 時用到的 CAD 核心，約 22 MB。

更多：[安裝為應用程式](chapter:offline-and-install#installing-as-an-app)

### 怎樣取得更新？

更新會自動送到。開著的頁面會察覺新版本，並顯示一張列出新內容的卡片；{{ui:newVersion.reload}} 會先儲存目前開啟的設計，再載入新版本。起始頁也會顯示有較新的版本。

更多：[更新](chapter:offline-and-install#updates)

### 支援哪些瀏覽器和平板電腦？

電腦、平板電腦或手機上的 Chrome、Edge、Firefox 和 Safari；3D 檢視需要 WebGL。有幾件事只有 Chrome 和 Edge 做得到：寫入你自己的檔案和資料夾、備份資料夾，以及雙擊開啟 .lyl 檔案。在平板電腦上，手指的作用等同滑鼠左鍵。

更多：[手指與觸控筆](chapter:tablet-and-touch#fingers-and-a-stylus)

## AI

### 設定 AI 最簡單的方法是什麼？

把網址 `https://github.com/henmedia/layerling` 交給能在你電腦上工作的 AI，請它幫你設定好 layerling 和它的 MCP 伺服器。它需要這類程式：Claude 應用程式的 Code 分頁、Claude Code、Codex、Antigravity、Gemini CLI 或 Grok Build。針對 Windows 和 Mac，指南裡也有逐步說明。

更多：[新手逐步指南](chapter:ai-with-mcp#step-by-step-for-beginners)

### 為什麼 AI 連不上 layerling.com？

AI 和編輯器之間的橋接只存在於在你自己電腦上執行的 layerling 副本中。在 layerling.com 上它永遠是關閉的，而瀏覽器裡的聊天無法安裝任何東西。所以 AI 需要一個在本機啟動的 layerling，以及一個支援 MCP 的程式。

更多：[設定](chapter:ai-with-mcp#setting-up)

### 安裝好的應用程式算是本機副本嗎？

如果是從 layerling.com 安裝的，就不算：它仍然是在獨立視窗中執行的 layerling.com，即使沒有網路也能啟動。本機副本會在你的電腦上執行一個小型伺服器，AI 透過它以 MCP 與編輯器溝通；網頁應用程式沒有這樣的伺服器。快速安裝完成後，你自己的副本位於 `http://127.0.0.1:3000/`。

更多：[設定](chapter:ai-with-mcp#setting-up)

### 哪種 AI 可以用？要花多少錢？

任何支援 MCP 的程式都可以；指南介紹了 Claude、Codex、Gemini、Antigravity 和 Grok Build。網頁或手機應用程式裡的聊天無法連上 layerling，因為它無法在你的電腦上啟動任何程式。layerling 本身不收費。AI 收多少錢由它的供應商決定：例如，Claude 應用程式的 Code 分頁屬於 Claude 的付費方案。

更多：[設定](chapter:ai-with-mcp#setting-up)

### 我自己的副本怎麼更新？

如果你用捷徑「Start layerling」啟動它，它每次啟動時都會先取得最新版本，MCP 伺服器也一併更新。如果它是以別的方式啟動的，例如由 AI 用 `npm run dev` 啟動，它就維持原樣：之後改用捷徑啟動，或請 AI 更新 layerling（`git pull` 和 `npm install`）並重新啟動。之後也請重新啟動 AI 用戶端，讓它看到新工具。

更多：[設定](chapter:ai-with-mcp#setting-up)

### 哪些資料會傳給 AI 供應商？

AI 讀取的內容：目前開啟的設計中的物體，以及它拍下的檢視圖片。這些會像你在 AI 程式裡輸入的其他內容一樣，傳給該程式的供應商。橋接本身在你的電腦上執行，沒有使用 AI 時，不會有任何東西離開你的電腦。

更多：[AI 能做什麼](chapter:ai-with-mcp#what-the-ai-can-do)

## 記憶體、速度與歷史記錄

### 為什麼 layerling 處理我的 STL 時變慢？

STL 是由三角形組成的網格，非常大的網格會讓編輯器變慢、佔用大量記憶體，儲存也會變慢。匯入後，如果單一網格達到 400,000 個三角形，或整個設計達到 100 萬個，layerling 會告訴你。請先簡化網格、只匯入需要的零件，或用 layerling 自己的形狀來做出這個零件。

更多：[大型網格](chapter:files-and-saving#large-meshes)

### 為什麼我的歷史記錄少了一些步驟？

有兩件事會讓它變短。設定 {{ui:workspace.savedHistory}} 在你沒有更改時，每個設計保留 100 步，更早的步驟會被捨棄。另外，當設計太大、無法連同完整歷史記錄一起儲存時，layerling 會只帶一半的步驟儲存，還不行就再減半，並告訴你。設計本身一定完整儲存。

更多：[儲存的歷史記錄](chapter:view-and-workplane#saved-history)

### 瀏覽器的儲存空間滿了怎麼辦？

不要關閉或重新載入分頁：你最新的變更只存在那裡。先用匯出為 .lyl 的方式留一份副本。接著騰出空間：在歷史記錄檢視中刪除步驟、移除不再需要的設計，或先備份再刪除它們。

更多：[你的設計，你的備份](chapter:files-and-saving#your-designs-your-backup)

### 我的設計太大，存不進去。怎麼辦？

它的歷史記錄和網格加起來佔用太多空間。在出現這個訊息之前，layerling 已經試過用較少的歷史步驟儲存。請在歷史記錄檢視中刪除歷史記錄、簡化佔用最大的匯入網格，或儲存一個只含目前狀態的 .lyl。

更多：[備份與轉交](chapter:files-and-saving#backing-up-and-passing-on)和[簡化匯入的網格](chapter:files-and-saving#simplifying-an-imported-mesh)

### 瀏覽器記憶體不足。有什麼辦法？

這種情況發生在有數百萬個三角形的網格上，其中某一步需要的記憶體超過一個瀏覽器分頁能取得的量。用 {{ui:editor.tool.simplify}} 減少匯入網格的三角形、關閉其他分頁，然後再試一次。如果是在儲存時發生，縮短歷史記錄也有幫助。

更多：[大型網格](chapter:files-and-saving#large-meshes)

### 某個設計開啟得很慢或根本打不開。我能做什麼？

多半是它的復原步驟歷史記錄變得非常大。起始頁上該設計選單中的 {{ui:dashboard.openWithoutHistory}} 只讀取目前狀態；它會永久刪除較早的步驟，所以如果你想保留它們，請先備份該設計。備份中的早期版本會以新設計開啟。

更多：[備份與轉交](chapter:files-and-saving#backing-up-and-passing-on)

### layerling 會卡頓。哪些設定有幫助？

設定中的 {{ui:workspace.fastMode}} 會關閉陰影、所有實體上的邊線和相機慣性，並且只以螢幕解析度繪製檢視。檢查瀏覽器是否使用顯示卡：在 `chrome://gpu` 或 `edge://gpu` 頁面上，WebGL 旁應顯示「Hardware accelerated」。大型匯入網格是另一個常見原因。

更多：[layerling 感覺很慢的時候](chapter:view-and-workplane#when-layerling-feels-slow)

### 編輯器停住不動或計算很久。要等還是重新載入？

先等一下。切割、群組和邊緣處理在背景計算，執行期間會顯示 {{ui:status.computing}}；抽殼之類的耗時工作會自行停止並顯示訊息，不做任何變更。如果 CAD 核心必須重新啟動，訊息會說明這一點，不需要重新載入。重新載入是安全的，因為每項變更都會自動儲存，只有一個例外：當紅色通知 {{ui:notice.designNotSavedTitle}} 顯示時，請先匯出一個 .lyl。

更多：[layerling 感覺很慢的時候](chapter:view-and-workplane#when-layerling-feels-slow)

### 3D 檢視一直空白，或訊息說它無法啟動。怎麼辦？

瀏覽器無法啟動負責繪製 3D 檢視的 WebGL。原因出在瀏覽器或顯示卡驅動程式，不在你的設計，你儲存的設計也不會被刪除。關閉其他含有 3D 內容的分頁並重新啟動瀏覽器、開啟硬體加速；如果某項隱私設定或擴充功能擋住了 WebGL，請允許它；並更新瀏覽器和顯示卡驅動程式。換一個瀏覽器是快速的測試方法。

更多：[layerling 感覺很慢的時候](chapter:view-and-workplane#when-layerling-feels-slow)

## 匯入的模型

### 「簡化網格」還是「轉為精確實體」：該選哪一個？

{{ui:editor.tool.simplify}} 保留一部分三角形，讓笨重的模型變輕；它仍然是網格。{{ui:editor.tool.makeExact}} 把由平面、圓柱、圓錐和球面組成的模型重建為真正的 CAD 實體，讓圓角和倒角能沿著乾淨的邊走，匯出的 STEP 也帶有真正的面。它最多處理 400,000 個三角形；公仔或掃描件仍然是網格。對於大型技術零件：先開啟 {{ui:simplify.keepEdges}} 進行簡化，再轉為精確實體。

更多：[簡化匯入的網格](chapter:files-and-saving#simplifying-an-imported-mesh)和[將匯入的網格轉為精確實體](chapter:files-and-saving#making-an-imported-mesh-exact)

### 為什麼切割失敗？為什麼說我的網格「不是水密的」？

只有表面封閉的實體才能切割。如果匯入的網格有缺口，layerling 會指出是哪個零件以及開放邊的數量，並把它排除在外。小洞它會自己補上；較大的洞必須在製作該模型的程式或網格修復工具中修復。列印檢查會顯示哪個實體是開放的。

更多：[檢查列印](chapter:printing#checking-the-print)

### 怎樣正確匯入 SVG？

SVG 匯入後是一個高 4 mm 的草圖實體，它的點可以在草圖模式中修改。匯入前請在匯入視窗中輸入以公釐為單位的寬度；不填數字就保留它原本的大小。自我交叉的輪廓無法成為實體，會被略過並計數：請在繪圖程式中合併重疊的部分並封閉輪廓，然後重新匯入。

更多：[匯入](chapter:files-and-saving#importing)

## 圓角與倒角

### 為什麼圓角套用不上去？

多半是對那個位置來說圓角太大：它會延伸到相鄰的面上，或者邊彎得比圓角半徑還急。通常少一兩公釐就行；在尖角處，圓角需要的空間比半徑看起來的更多。如果這些邊無法一起做圓角，請一次少選幾條；擋路的那條邊會畫成紅色。{{ui:edge.findLargest}} 會幫你找出合適的尺寸。

更多：[為邊做倒角與圓角](chapter:edges-and-hollowing#chamfering-and-filleting-edges)

### 為什麼修改草圖後我的圓角不見了？

執行 {{ui:inspector.editSketch}} 之後，實體會重新建立，邊也是新的。只要實體的邊數和之前一樣，layerling 就會把圓角和倒角重新套到位置與舊邊相同的邊上。如果多了或少了一個角，它們就會被略去，訊息會說明略去了多少。復原可以把一切找回來。

更多：[用它生成實體](chapter:sketches#making-a-body-from-it)

### 為什麼匯入模型的某些邊選不到？

STL、OBJ 和 3MF 只帶來三角形，而邊緣工具只能處理最多 4,000 個三角形的網格。{{ui:editor.tool.makeExact}} 會把技術零件變成真正的 CAD 實體，其上的鑽孔有一圈完整的圓形邊緣，圓角可以沿著它走。STEP 檔案從一開始就帶有精確幾何。

更多：[將匯入的網格轉為精確實體](chapter:files-and-saving#making-an-imported-mesh-exact)

## 群組、孔與尺寸

### 為什麼拉長群組時孔會變成橢圓？

調整群組大小時，裡面的所有東西都會被拉伸，就像畫在橡皮上一樣。在群組設定的 {{ui:inspector.groupResize}} 下選擇 {{ui:inspector.groupResizeKeepParts}}：橫跨整個群組的零件會被拉伸，孔和小零件則保持原本的大小，以及它們到較近一側的距離。

更多：[調整群組大小：保留孔與小零件](chapter:solids-and-holes#resizing-a-group-keeping-holes-and-small-parts)

### 為什麼群組失敗？為什麼結果有缺口？

不是某個零件沒有封閉（訊息會指出它），就是兩個零件幾乎相接卻沒有真正碰到。請解散群組、把零件精確對齊，或稍微改一下尺寸或位置，然後重新群組。超過匯入網格切割上限的非常密集的網格根本不會被合併。

更多：[群組](chapter:solids-and-holes#grouping)

### 怎樣修改群組裡的某一個零件？

選取群組並按 [[E]]，或雙擊它。這時各零件會分開放置，可以修改；完成編輯時群組會重新建立。套在整個群組上的圓角和倒角在重新建立時會遺失。

更多：[編輯群組](chapter:solids-and-holes#editing-a-group)

### 怎樣從先前的狀態取回某一個零件？

開啟歷史記錄檢視，把滑桿移到還有該零件的狀態，點擊該零件並選擇 {{ui:historyView.bringBack}}。一個副本會放進目前的設計，模樣和位置與當時相同，名稱中帶有時間。

更多：[回看：歷史記錄檢視](chapter:select-and-arrange#looking-back-the-history-view)

## 列印與匯出

### STL、3MF、OBJ 還是 STEP：該選哪一個？

給印表機用 3MF 或 STL。3MF 把每個實體保留為一個帶名稱和顏色的零件；STL 是單一顏色的一個網格。OBJ 也能攜帶顏色。STEP 用於其他 CAD 程式：它包含帶有圓角和倒角的精確幾何。

更多：[匯出](chapter:files-and-saving#exporting)

### 怎樣把我的顏色帶進切片軟體？

匯出 3MF。每個實體都保留自己的顏色，上了多種顏色的實體，其面上帶有上色資訊。Bambu Studio 和 OrcaSlicer 在開啟時會詢問這些顏色如何對應到你的線材。

更多：[多色上色](chapter:shapes#painting-in-several-colours)

### 我的零件裝不進彼此。需要多少間隙？

通常是 0.2 到 0.4 mm，視印表機而定。配合測試可以量出它：列印有七個孔的小板，找出插銷在裡面還轉得動的最緊的孔，把這個值填為你的印表機間隙。之後新建的蓋子、鳩尾榫和螺紋都會以它為起點。

更多：[印表機間隙：配合測試](chapter:printing#your-printer-s-play-the-fit-test)

### 為什麼 layerling 說某個零件放不進印表機？

該零件超出列印板邊緣，或高度超過你所選印表機能列印的高度。這只是提示，可以關閉。請在設定中選擇你的印表機，或用 {{ui:editor.tool.split}} 切開過大的零件。

更多：[零件放不下時](chapter:printing#when-something-does-not-fit)

## 關於 layerling

### layerling 免費嗎？我可以販售用它設計的東西嗎？

layerling 是採用 AGPL-3.0 授權的自由軟體，不需要帳號。這項授權針對的是程式本身：任何人修改 layerling 並透過網路提供給他人使用，也必須提供原始碼。它對你製作的模型不設任何條件。你匯入的字型和模型保留各自的授權。

如果你想支持這個專案，一筆[小額捐款](support:)可以幫忙分擔伺服器和開發費用。捐款完全自願，layerling 裡的任何功能都不取決於它。

更多：[自行執行](chapter:offline-and-install#running-it-yourself)

### 怎樣回報錯誤或提出需求？

頁尾的 {{ui:editor.bugReport}} 會儲存一個 ZIP，裡面有該設計和一段關於版本與瀏覽器的簡短文字；其中沒有任何個人資料。請把它附在論壇或 GitHub 的討論區裡。兩處都歡迎提問和許願。

更多：[回報問題](chapter:files-and-saving#reporting-a-bug)和[說明與回饋](chapter:offline-and-install#help-and-feedback)
