---
title: 安裝為應用程式、離線使用與自架
summary: 像一般程式一樣啟動 layerling，即使沒有網路也行，以及在自己電腦上執行它的方法。
---

## 安裝為應用程式

layerling 可以像一般程式一樣安裝。安裝後它會有自己的圖示和視窗，沒有網址列。第一次造訪之後，即使**沒有網路**也能啟動。你的設計留在自己的電腦上。值得安裝：應用程式啟動更快，因為不必每次都重新載入；沒有網路也能用，還能減輕伺服器的負擔。你什麼都不會失去，layerling 仍會在新版本推出時通知你。 這也能保護你的設計：Mac、iPhone 和 iPad 上的 Safari 會清除七天未造訪的網站所儲存的資料，但不會清除已安裝 App 的資料。

如果你的瀏覽器支援，起始頁上會出現帶有 {{ui:installHint.install}} 的提示。否則：

- **Chrome 與 Edge：** 點擊網址列右側的安裝圖示，或在瀏覽器選單中選擇「安裝為應用程式」。
- **Mac 上的 Safari：** 「檔案」選單，然後「加入 Dock」。
- **iPhone 與 iPad 上的 Safari：** 分享圖示，然後「加入主畫面」。
- **Firefox：** 在 Windows 上，自版本 143 起，點擊網址列右側的「將分頁新增到工作列」圖示；隱私視窗中沒有此圖示。你的設計保持不變。在其他系統上，layerling 仍可在分頁中離線啟動。

起始頁上的提示可以用 {{ui:installHint.dismiss}} 關閉。在 Chrome 或 Edge 中第二次啟動已安裝的應用程式時，會把已開啟的視窗帶到最前面，而不是再開一個。

在電腦上，Chrome 或 Edge 中安裝的 layerling 也會註冊為 `.lyl` 檔案的程式：在檔案管理員中雙擊設計，就會在 layerling 中開啟，而 [[Ctrl]]+[[S]] 會存回該檔案。在 Android 上這行不通，那裡的瀏覽器不為已安裝的網頁應用程式提供檔案關聯；請在起始頁用 {{ui:dashboard.importGeometry}} 開啟設計。

## 更新

有新版本時，layerling 會在起始頁顯示。透過 {{ui:dashboard.updateBannerLink}} 可以閱讀變更內容。版本號碼在右下角。重新載入頁面後就是新版本。

在 layerling.com 和其他網頁伺服器上，已開啟的頁面會自行察覺更新。它會不時向伺服器詢問版本，當你回到該分頁時也會，而如果它需要的某個程式檔案消失了，就立刻詢問。若期間安裝了新東西，右下角的卡片會說明並列出新內容。{{ui:newVersion.reload}} 會先把目前開啟的設計寫入瀏覽器，然後重新載入頁面；設計會以你離開時的模樣回來。{{ui:newVersion.later}} 會把卡片延後 15 分鐘。請儘快重新載入：停留在舊版本的頁面可能會載入新版本中不相容的部分。這種情況已經發生時也會出現同一張卡片：CAD 工作執行緒只在第一次需要時載入，它們會說明自己來自哪個建置；如果不是頁面本身的建置——更新之後，或使用了舊版本的儲存副本——卡片會要求重新載入，以免兩者互相誤解。

layerling 同時在好幾個分頁開啟時，它們會互相留意：如果另一個分頁已經在執行較新的版本，舊分頁底部會有提示，請你重新載入它。而如果同一個設計在兩個分頁中開啟，兩邊都會警告你，因為它們會自動儲存，會互相覆蓋。如果已經有一個分頁開著，你又在另一個分頁開啟 layerling，新分頁會建議在舊分頁中繼續，並提議關閉自己。如果你刻意要兩個分頁，比如並排放兩個設計，就在那裡點擊 {{ui:tabs.keepHere}}。本指南也會開在獨立的分頁中：當 layerling 就在旁邊開著時，它右上角的按鈕會顯示「返回編輯器」，點擊會關閉指南，而不是再開一次編輯器。

## 語言與外觀

在右上角從語言清單中選擇語言。旁邊的配色方案提供 {{ui:theme.short.system}}（跟隨作業系統）、{{ui:theme.short.light}}、{{ui:theme.short.dark}} 與 {{ui:theme.short.graphite}}，一種中性的深灰色。

## 自行執行

layerling 是自由軟體（AGPL-3.0），可以執行在自己的電腦或伺服器上，例如工作坊、社團或學校。有幾種方式，說明見 [GitHub 上的 README](https://github.com/henmedia/layerling/blob/main/README.zh-tw.md#快速上手)：

- **Windows 快速開始：** 在 PowerShell 中輸入一行指令就能安裝全部內容，並在桌面放一個捷徑。當 layerling 已經在執行時，再次雙擊不會啟動第二個伺服器，只會開啟頁面。
- **Docker：** 適合 NAS 裝置和家用伺服器，不必安裝 Node.js。每個版本都以現成映像 `henmedia/layerling` 發布在 Docker Hub（也有 `ghcr.io/henmedia/layerling`），支援 amd64 與 arm64；`docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` 就能啟動，在 NAS 上則在容器管理員的映像倉庫中搜尋。磁碟區 `layerling-thumbnails` 能讓起始頁的預覽圖片在更新後保留下來；沒有它，每次重新建立容器後預覽圖片都會不見，直到你開啟該設計。
- **靜態匯出：** 結果是一般的檔案，任何網頁伺服器都能提供。它們要放在網址的根目錄（`https://layerling.example.com/` 或 `http://192.168.0.5:8080/`），不能放在子資料夾，也不能直接從磁碟開啟；步驟見 README。若 `index.html` 旁邊有可寫的 `store` 資料夾，且伺服器裝有 PHP，它也會成為設計的共用儲存空間。

AI 助理用的 MCP 橋接只存在於開發伺服器，見[用 AI 建構](chapter:ai-with-mcp)。

## 說明與回饋

- 在編輯器中，{{ui:editor.group.help}} 區域有 {{ui:editor.guide}}，包含最重要的操作與[鍵盤快速鍵](chapter:shortcuts)起始頁。快速指南的每一節都有一個問號，會帶你到這裡對應的章節。快速指南頂端的 {{ui:guide.fullGuide}} 會開啟本指南；指令搜尋（[[Ctrl]]+[[K]]）也能找到它。

![編輯器中的快速指南。頂部列出他人的影片，每一節都有一個問號。](shot:quick-guide)

- 問題、願望與錯誤回報都歡迎到[論壇](https://forum.drucktipps3d.de/forum/board/127-layerling/)與 [GitHub](https://github.com/henmedia/layerling/discussions) 提出。
- 哪個版本改了什麼，見版本說明，位於起始頁與編輯器的底部。
