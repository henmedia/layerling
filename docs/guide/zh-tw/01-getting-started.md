---
title: 快速上手
summary: 五分鐘內從一張空白頁面做出第一個 3D 列印零件，不需帳號，也不必安裝任何東西。
---

layerling 是一款直接在瀏覽器中執行的 3D 列印設計程式。你用簡單的形狀搭出零件，在上面挖孔，把邊緣修圓，再交給切片軟體。不必安裝，也不必註冊。你完成的設計留在自己的電腦上。

![layerling 的起始頁：最上方是「建立新的 3D 設計」，下方是你的設計與快速指南。](shot:start-page)

## 建立設計

開啟 [layerling.com](https://layerling.com/)。在起始頁點擊 {{ui:dashboard.createDesign}}。編輯器會開啟一個空白的工作平面，也就是所有東西成形所在的網格。

如果你已經有想接著做的檔案，請用 {{ui:dashboard.importGeometry}}。它支援 layerling 設計（`.lyl`），也支援 STL、OBJ、3MF、STEP 或 SVG 檔案。

你所有的設計之後都會出現在起始頁，並附有預覽圖。這些設計存放在瀏覽器的儲存空間，每次變更後自動儲存，所以沒有儲存按鈕。**layerling 不對存放在瀏覽器裡的設計負責。** 瀏覽器可能故障，瀏覽器更新也可能帶來問題，所以請不時用起始頁的 {{ui:dashboard.backupAll}} 備份設計，或把它們存成檔案。備份可以用 {{ui:dashboard.restoreBackup}} 還原。如何把設計打包成檔案並轉交他人，見[檔案與儲存](chapter:files-and-saving)。 如果想要一個提醒，請在設定（功能區中的齒輪）中開啟{{ui:workspace.confirmTabClose}}：之後在關閉或重新整理有開啟設計的分頁之前，瀏覽器會先詢問。

## 編輯器一覽

![編輯器的工作平面上有兩個形狀。上方是功能區，左側是相機控制，右側是所選形狀的設定。](shot:editor-overview)

- **上方**是功能區。它依任務分類：{{ui:editor.group.clipboard}}、{{ui:editor.group.history}}、{{ui:editor.group.shapes}}、{{ui:editor.group.visibility}}、{{ui:editor.group.combine}}、{{ui:editor.group.modify}}、{{ui:editor.group.arrange}}、{{ui:editor.group.file}} 和 {{ui:editor.group.help}}。將滑鼠移到圖示上就能看到名稱。凡是看到小問號的地方，例如形狀的設定裡、形狀庫中或工具面板裡，它都會直接帶你到本指南對應的章節。
- **中間**是工作平面。你在這裡放置形狀、把它們拉成想要的樣子，並看到結果。
- **右側**會顯示所選形狀的設定：顏色、尺寸、位置，以及構成該形狀的其他內容。輸入數字比拖曳更精確。
- **左側**是相機控制，上方是視圖立方體。它們帶你在場景中移動，詳見[視圖與工作平面](chapter:view-and-workplane)。
- **最上方**可以切換 {{ui:editor.modeGeometry}} 與 {{ui:editor.modeSketch}}、重新命名設計，並選擇語言與配色方案。

## 工作區周圍的按鈕

將滑鼠移到按鈕上就能看到名稱。如果不確定某個按鈕的作用，先點擊 {{ui:interactiveHelp.title}}（位於 {{ui:editor.group.help}} 區域，[[Shift]]+[[F1]]），再點那個按鈕。以下是詢問度最高的幾個。

### 貼上

{{ui:editor.tool.paste}}（[[Ctrl]]+[[V]]）會把用 {{ui:editor.tool.copy}} 複製的內容加入設計。{{ui:common.duplicate}} 則一步完成複製與貼上。

### 刪除

{{ui:common.delete}}（[[Delete]]）會移除所選形狀。{{ui:editor.tool.undo}} 可以把它們找回來。

### 取消群組

{{ui:editor.tool.ungroup}}（[[Ctrl]]+[[Shift]]+[[G]]）會把所選群組重新拆成組成它的那些形狀。

### 工作區設定

{{ui:editor.workspaceSettings}} 會開啟工作區的設定：單位、平台大小、印表機、網格、顏色、光源等。詳見[視圖與工作平面](chapter:view-and-workplane)。

### 主題

最上方的 {{ui:common.theme}} 決定 layerling 的外觀：跟隨系統、淺色、深色或石墨色。

### 重新命名設計

{{ui:editor.renameProject}}：最上方名稱旁邊的鉛筆圖示。輸入新名稱並按 [[Enter]]。

### 設計名稱

設計的名稱（{{ui:confirm.projectName}}）位於最上方。點擊它、輸入，按 [[Enter]] 即可保留該名稱。

### 顯示選項

{{ui:editor.visibilityOptions}}，也就是眼睛圖示旁的箭頭，裡面是你可以顯示或隱藏的內容：物件清單、你隱藏的所有東西、備註，以及列印的懸垂。詳見[選取與排列](chapter:select-and-arrange)。

### 隱藏所選

{{ui:editor.tool.hideSelected}}（[[Ctrl]]+[[H]]）會隱藏所選形狀。它們仍留在設計與物件清單中；{{ui:editor.visibilityOptions}} 可以讓它們重新顯示。

### 搜尋命令

{{ui:palette.open}}：輸入你要找的東西，一個工具、一個形狀或一項設定，然後點擊結果。

### 隱藏相機控制

{{ui:camera.hide}} 會收起左側的相機控制，讓工作區更寬敞；{{ui:camera.show}} 會把它們叫回來。

### 吸附網格

屬性面板底部的 {{ui:inspector.snapGrid}} 是移動與調整尺寸時吸附的步距。旁邊的小開關 **mm | in** 用來切換單位。詳見[視圖與工作平面](chapter:view-and-workplane)。

### 單位：公釐或英吋

{{ui:inspector.snapGrid}} 旁的開關 **mm | in** 會為這份設計更改單位、平台網格與吸附步距。

### 頁尾

視窗底部：{{ui:dashboard.sponsor}} 通往可以贊助本專案的頁面；{{ui:dashboard.userGuide}} 開啟本指南；{{ui:dashboard.forum}} 通往提問、分享想法與回報錯誤的地方（GitHub 上的討論區，德語使用者則是 drucktipps3d 論壇）；{{ui:editor.bugReport}} 會產生一份回報錯誤用的 ZIP；{{ui:dashboard.projectOnGitHub}} 通往 GitHub 上的專案，版本號則會開啟版本說明。法律聲明與隱私權政策的連結，屬於你所使用的那份 layerling 的營運者。

## 你的第一個零件

以下用一個帶孔的立方體作範例。

1. 點擊功能區中的 {{ui:editor.addShape}}，然後選 {{ui:shape.box}}。形狀會跟著滑鼠指標移動。在工作平面上點一下就能放下。
2. 在右側設定尺寸，例如長 40 mm、寬 40 mm、高 20 mm。
3. 用同樣的方式在中央放一個 {{ui:shape.cylinder}}，直徑 14 mm、高 30 mm。它要比立方體高，才能貫穿整個立方體。
4. 選取圓柱體，點擊右側的 {{ui:inspector.hole}}。它會變成半透明：實體變成了一個挖除材料的工具。
5. 同時選取兩個形狀，點擊 {{ui:editor.tool.group}}。立方展現了一個孔。

![圓柱體是孔，並從立方體頂部突出來。](shot:hole-before)

![群組之後，立方體上有了一個孔。](shot:hole-after)

孔、槽與凹槽就是這樣做出來的。[實體與孔](chapter:solids-and-holes)一章有詳細說明。

## 上次造訪後的新內容

更新之後再次開啟 layerling 時，起始頁上會有一張卡片列出你上次造訪以來新增的內容：從那時起的每個版本，最新的排在最上面。隔了很久才回來，就在卡片裡向下捲動。在這些版本下方，{{ui:whatsNew.earlier}} 會把上次造訪之前的版本也加進來。用 {{ui:whatsNew.dismiss}} 關掉它，它就會一直消失到下次更新。起始頁頁尾的 {{ui:whatsNew.footerLink}} 隨時可以再次顯示最新的新增內容。瀏覽器會記住你上次看到的版本，關於你的任何資訊都不會離開瀏覽器。

在自己電腦或伺服器上執行的 layerling 副本中，「有可用更新」的提示會有一個按鈕 {{ui:update.previewShow}}，讓你在安裝前先看這次更新帶來什麼。只有在你按下按鈕時，清單才會從 GitHub 取得。

## 從設計到列印

零件做好後，點擊 {{ui:editor.export}}，選擇 STL 或 3MF 並下載檔案。用你的切片軟體開啟它，例如 Bambu Studio、PrusaSlicer、OrcaSlicer 或 Cura。如果在設定中選好印表機，你在建模時就能看出零件是否放得下列印床。詳見[列印](chapter:printing)。

> **提示：** 如果你來自 Tinkercad，會很快上手：平台、形狀、實體與孔、群組、對齊與鏡像的用法幾乎相同。新的東西主要是倒角與圓角、抽殼、螺紋與草圖。 你自己的 Tinkercad 設計也可以帶過來，見 [檔案、儲存與分享](chapter:files-and-saving)。
