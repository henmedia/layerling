---
title: 檢視與工作平面
summary: 在場景中移動、正對著觀察，以及把新形狀放到任何你喜歡的表面上。
---

## 移動檢視

使用滑鼠：

| 操作 | 效果 |
| --- | --- |
| 按住右鍵拖曳 | 旋轉檢視 |
| 點擊右鍵 | 在實體上開啟常用指令選單：複製、設為孔或實體、群組、隱藏、鎖定、刪除等；在空白處則為「貼上」與「全選」 |
| 按住中鍵拖曳 | 平移檢視 |
| 滑鼠滾輪 | 放大與縮小 |
| 按住 [[Ctrl]] / [[Cmd]] 並以左鍵拖曳 | 也可平移檢視（在 MacBook 觸控式軌跡板上：按住 [[Cmd]]，按下並拖曳） |
| 按兩下工作平面上的空白處或平台旁邊 | 平移檢視，使該處位於中央；之後檢視繞該處旋轉 |

滾輪縮放的速度在設定的 {{ui:workspace.appearance}} 下用 {{ui:workspace.zoomSpeed}} 設定：滑桿範圍 1 到 14，初始值為 5。它只影響滾輪與觸控式軌跡板：按鈕與 [[+]]、[[−]] 鍵一律以相同的小步距縮放。滑鼠滾輪的一格在任何瀏覽器中的縮放幅度都相同，觸控式軌跡板則依你滑過的距離縮放。

在平板或手機上，兩根手指可縮放（張開與捏合）並平移檢視（併攏滑動）。一根手指在空白處會轉動檢視，在那裡輕點則清除選取；落在形狀或控制點上時，則如同滑鼠左鍵般操作設計。若要讓從形狀上開始的手指也能轉動檢視，請開啟相機列中的 {{ui:camera.touchRotate}}。這個開關只會在具有觸控螢幕的裝置上顯示。

搭配筆的繪圖板用起來像滑鼠：筆尖是左鍵，筆身側鍵是右鍵，可用來轉動檢視與開啟選單。繪圖板的快速鍵可在其驅動程式中設為 layerling 的[鍵盤快速鍵](chapter:shortcuts)。

**在平板上，盡可能使用觸控筆。** 它的筆尖比指尖細得多，也不會遮住你要對準的地方，因此草圖中的小點、細線與控制點，以及量測點與邊，都能精確點中，長時間操作也比較不累。layerling 已經讓手指比滑鼠指標更容易搆到點、線、控制點與邊，但觸控筆仍是更精確的方式。這適用於繪圖板能辨識為筆的觸控筆（S Pen、Apple Pencil 等）。一般橡膠筆尖的觸控筆在螢幕上等同於手指，並不會更細。

平板沒有滑鼠右鍵：將手指在形狀或空白處按住半秒，就會開啟與按右鍵相同的選單，在空白處還會有**全選**。同一選單中的**多選**在平板上代替 Shift：之後每次點按實體，都會將它加入或移出選取，直到你點按空白處或按 [[Esc]]；手指在空白處仍會轉動檢視。選取形狀周圍的控制點時，手指從旁邊一點的位置也能抓住。

### 視圖立方體

左上角的立方體顯示你正看向何處。點擊它的任一面，就會跳到從上、下、前、後、左或右觀看的正視圖。點擊立方體的角，會從該角斜向觀看模型；點擊邊附近，則從該邊觀看，位於兩個面之間；指標停在上面時，該處會亮起。數字鍵 [[1]] 到 [[6]] 也能切換到正視圖。同時按住 [[Shift]]，檢視還會縮放至選取項目，就像 [[Shift]]+[[F]] 一樣。

拖曳立方體可以轉動檢視，就像按住右鍵拖曳一樣。沒有選取任何東西時，方向鍵也會轉動檢視：每按一次 15°，搭配 [[Shift]] 則為 90°。它們會依所指的方向轉動模型——[[→]] 將模型正面轉向右側，[[↑]] 將正面向上抬起。按住 [[Ctrl]] 時，方向鍵改為在螢幕上平移檢視：每按一次移動畫面的十分之一，同時按 [[Shift]] 則為一半。模型會依所指的方向移動。如果選取了東西，方向鍵會移動它；請先點擊空白處再轉動檢視。在觸控螢幕上，用一根手指即可，不必開啟 {{ui:camera.touchRotate}}。

### 相機列

左側邊緣有一條窄列。由上而下：

- {{ui:camera.home}} 將整個場景重新帶回畫面。快速鍵是 [[Home]]；沒有選取任何東西時，[[F]] 也可以。
- {{ui:camera.focusSelection}} 縮放至選取項目（[[F]] 或 [[Shift]]+[[F]]）。
- {{ui:camera.zoomIn}} 與 {{ui:camera.zoomOut}} 逐步縮放，[[+]] 與 [[−]] 鍵也是如此。
- {{ui:camera.orthographic}} 切換到平面檢視，平行邊會保持平行。對於量測與對齊邊，這通常比透視檢視更順手。[[O]] 可來回切換，再點一次也會返回。
- {{ui:camera.hideWorkplane}}（網格上方的眼睛）會連同網格一起隱藏平台，讓你從下方查看設計的底面。改變的只有檢視：新形狀仍會落在工作平面上。再點一次就會重新顯示。
- {{ui:camera.placeWorkplane}}、捲尺與角尺是各自的工具，下文以及[量測與備註](chapter:measuring-and-notes)中會介紹。

列最頂端的小箭頭可在它擋住畫面時將它收起。

設計會以你離開時的樣子開啟：檢視的角度、縮放與位置會隨設計儲存在這個瀏覽器中，因此你可以從停下的地方繼續，即使回過首頁或關閉過頁面也一樣。儲存的檔案（.lyl）會一併帶上檢視，所以在其他地方開啟時也是這個視角。檢視不屬於復原歷史。

每個設計中還可以儲存四個自己的檢視。[[Shift]]+[[7]]、[[Shift]]+[[8]]、[[Shift]]+[[9]] 或 [[Shift]]+[[0]] 會將目前檢視原樣儲存到該鍵下——包括角度、位置、縮放，以及平面或透視——只按該鍵（[[7]]、[[8]]、[[9]] 或 [[0]]）即可叫回。底部會出現訊息確認儲存；在同一鍵下再次儲存會取代原本的檢視。與上述檢視一樣，儲存的檢視會隨設計留在這個瀏覽器中，並隨儲存的檔案（.lyl）一起帶走，它們同樣不屬於復原歷史。

## 查看內部：剖視圖

{{ui:camera.sectionView}}，列中最後一個按鈕（切割工具），會沿一個平面將檢視切開，讓你檢查壁面、空腔與互相嵌合的零件。不會真的切掉任何東西：設計、其檔案與所有匯出都保持完整。平面穿過實體的地方，切口會以該實體稍暗的顏色填滿，內部的孔則保持空白，因此能分辨實心與空心；平面停止移動片刻後，填滿的面才會出現。在{{ui:camera.sectionCutFace}}中選擇剖切面的樣子：{{ui:camera.sectionCutFaceHatch}}（預設）像工程圖一樣畫剖面線，位於另一實體內部的實體剖面線方向相反，兩者因此分得清；{{ui:camera.sectionCutFaceFill}}以單色填滿；{{ui:camera.sectionCutFaceOpen}}保持開放，你會看到實體外殼的內部。這個選擇對所有設計都有效。

- 選擇平面橫跨的軸：X（寬度）、Y（深度）或 Z（高度），與位置欄位中的相同。平面會從設計中央開始。
- {{ui:camera.sectionOrientation}} 設定這些軸要跟隨什麼。{{ui:camera.sectionOrientationWorld}} 採用設計的座標軸。{{ui:camera.sectionOrientationWorkplane}} 採用工作平面的座標軸：此時 Z 平行於它切割，X 與 Y 則與它垂直，位置從其原點起算。工作平面位於斜面時，你就平行於該面切割，移動工作平面時切口也會跟著移動。{{ui:camera.sectionOrientationView}} 會將平面轉向螢幕：它會移除前方遮擋的部分，滑桿則沿你的視線將平面往設計深處推，例如為了搆到埋在裡面的零件並點擊它。轉動檢視後再點一次，切口就會跟隨新的檢視。
- {{ui:camera.sectionCoarse}} 讓平面橫跨整個設計移動，{{ui:camera.sectionFine}} 則讓它在目前位置兩側小幅移動，以十分之一公釐為單位。也可以直接輸入位置。
- 座標軸旁的按鈕會切換到切口的另一側，{{ui:camera.sectionReset}} 將平面放回中央，{{ui:camera.sectionShowPlane}} 則隱藏藍色平面。
- 你可以點擊並選取切口露出的內容，包括內壁。
- {{ui:camera.sectionWorkplane}} 會將工作平面放到切口上。它位於剖面上，朝向保留下來的實體外側，就像切割留下的面。若你接著切換到草圖，草圖會正好從那裡開始，淡淡的輪廓會顯示切口，你可以沿著它繪製並吸附。例如，這就是為你用剖視圖打開的空腔畫出合適蓋子的方法。座標軸旁的按鈕可選擇保留哪一側，也就決定工作平面朝向哪邊。你可以照平常的方式將工作平面放回底板。
- {{ui:camera.sectionSketch}} 直接在切口上開始一個新草圖，切口的輪廓已經作為線條放在裡面：孔是真正的圓，圓角是圓弧。修改它們，刪掉不需要的，繼續繪製，然後完成：實體從切口向被切掉的那一側長出，因此必須與另一個零件配合的零件，例如蓋子、嵌件或密封墊，正是從那個零件自己的輪廓開始。座標軸旁邊的按鈕選擇這一側。與 SVG 一樣，只計入可見實體，孔已經扣除。
- {{ui:camera.sectionMeasure}} 可直接在切口上量測：輪廓會以藍色顯示，在它上面點擊兩次即可得到距離，以及沿平面兩個軸的分量。兩個點都會吸附到輪廓上，並優先吸附角點。當第二次點擊落在對側壁面的任何位置時，它會與第一個點垂直對齊——因此不必精確瞄準，就能讀出壁厚、間隙與公差。第三次點擊會開始下一次量測，[[Esc]] 則結束量測。移動平面會清除量測結果。在圓形輪廓上，例如穿過圓柱或孔的切口，小十字會標出圓心，圓心也會吸附。點擊圓上的一點，再靠近它正對面的點：第二次點擊會正好落在圓心的另一側，讀數顯示 Ø，也就是直徑。從圓心到圓上的一點則得到 R，也就是半徑。
- {{ui:camera.sectionExportSvg}} 會將切割平面上的輪廓以 1:1 儲存為 SVG，供雷射切割機、繪圖機、模板或墊片使用。X 切口從右側觀看，Y 切口從前方觀看，Z 切口從上方觀看。與匯出時相同，只有可見的實體會包含在內，孔已經扣除，同色的實體會合併成一個輪廓。每種顏色各自保持為獨立的無填色路徑，讓雷射軟體能將它們當作不同圖層分開。

面板附著在它的按鈕上。如果它擋住東西，可以抓住標題列將它拖曳到工作平面上的任何位置；下次也會在那裡開啟。雙擊標題列或將它放回按鈕處，即可歸位。

X 與 [[Esc]] 會關閉面板；若正在量測，[[Esc]] 會先結束量測。切口會一直保留，直到你用 {{ui:camera.sectionActive}} 關閉它，或回到設計起始頁。開啟期間，它的按鈕會保持醒目。放在被切掉那一側的任何東西，都要等你關閉切口後才會顯示。平板沒有 [[Esc]]，所以那裡的面板多了兩個按鈕：{{ui:camera.sectionBack}} 會在量測進行中時結束量測，否則關閉面板；{{ui:camera.sectionConfirm}} 則一步關閉面板。電腦上不會顯示這兩個按鈕。

## 工作平面

新形狀會與工作平面對齊。起初工作平面是帶有網格的底板。但你可以將它放到任何表面上，以便把東西放在側面或斜面上。

1. 按 [[W]] 或點擊 {{ui:camera.placeWorkplane}}。
2. 將滑鼠移到實體的某個面上。該面會亮起。
3. 點擊一下，工作平面就會放在那裡。此後新增的所有東西都會位於該面上。

改為點擊空白的平台，工作平面就會平放在你點擊的位置，並對齊吸附網格。新形狀與完成的草圖（包括旋轉產生的草圖）接著會出現在那裡，而不是平台中央。工作平面這樣平放在平台上時，平台只會顯示輪廓：同一平面上的兩個網格會形成閃爍的花紋。

在面上時，工作平面的原點一般會吸附到網格。點擊靠近面角的位置，它就會正好落在該角上。靠近邊時，它會落在邊上，網格也與邊對齊；這就是刻意選擇網格角度的方式。若沒有角或邊，平放面上的網格會與實體平行，所以在轉過的長方體上，網格也會跟著轉。

點擊平台旁邊或按 [[Esc]]，會將工作平面送回底板。更快的方法是 {{ui:camera.resetWorkplane}}：工作平面位於面上時，帶有向下箭頭的按鈕會出現在相機列中眼睛的下方。[[Shift]]+[[W]] 會直接將它放到目前選取的面。[[Alt]]+[[W]] 隨時將它放回底板，無論是否選取了東西。若點擊時按住 [[Shift]]，平面會朝向另一邊。

工作平面位於面上時，{{ui:camera.placeWorkplane}} 旁邊會出現一隻眼睛。它會隱藏工作平面而不取消它，方便清楚查看設計：新形狀仍會落在該面上，旋轉也仍繞著它進行。點擊眼睛會重新顯示，設定新的工作平面也會。

## 網格與吸附

網格顯示平台的大小。右下角是**吸附步距**：移動與縮放會依這個步距吸附，例如 1 mm。精細作業時調小，粗略擺放時調大。功能區中的 {{ui:editor.tool.snapToGrid}} 會在事後將選取的形狀移到最近的網格交叉點。移動時，形狀也會吸附到其他形狀，參見[選取與排列](chapter:select-and-arrange)。

> **提示：** 精確拼合零件時，不要一邊轉動檢視。用數字鍵切到俯視或正視，再按 [[O]] 切換為平面顯示。這樣就能立刻看出兩條邊是否真的齊平。

### 設定視窗

標題列中的齒輪（{{ui:editor.workspaceSettings}}）會開啟設定。左側有五個區域：{{ui:workspace.appearance}}、{{ui:workspace.measurement}}、{{ui:workspace.workplane}}、{{ui:workspace.shapeDefaults}} 與 {{ui:workspace.history}}。變更會立即生效。底部的 {{ui:workspace.makeDefault}} 會將目前設定儲存為預設值，讓新設計從這些設定開始；右上角的 {{ui:workspace.close}} 則關閉視窗。本節會逐一說明這些設定。

### 外觀：主題、工具列與視圖立方體

{{ui:workspace.theme}} 設定整個程式的配色方案：{{ui:workspace.themeSystem}} 跟隨你的電腦，其餘為 {{ui:workspace.themeLight}}、{{ui:workspace.themeDark}} 與 {{ui:workspace.themeGraphite}}。也可以在編輯器右上角變更。

{{ui:workspace.toolbarSize}} 會讓頂部功能區的按鈕、其形狀選單、左側的相機控制項與右側的屬性面板變小或變大：{{ui:workspace.toolbarSizeSmall}}、{{ui:workspace.toolbarSizeMedium}}（一直以來的樣子）或 {{ui:workspace.toolbarSizeLarge}}。小尺寸在筆記型電腦上能為工作平面留出更多空間；大尺寸在大螢幕上或用手點按時更容易命中。使用大按鈕時，若視窗太窄，功能區的各群組會排到第二列。尺寸會儲存在這個瀏覽器中，並套用於所有設計。

{{ui:workspace.viewCubePosition}} 會將視圖立方體放到工作平面的另一個角：{{ui:workspace.viewCubePositionTopLeft}}（一直以來的位置）、{{ui:workspace.viewCubePositionTopRight}}、{{ui:workspace.viewCubePositionBottomLeft}} 或 {{ui:workspace.viewCubePositionBottomRight}}。除了左上角以外，相機控制項都會上移到立方體讓出的位置。在右下角時，立方體會正好位於 {{ui:inspector.snapGrid}} 控制項上方。右側開啟形狀屬性時，位於右側的立方體會讓到屬性面板左邊。這個角會儲存在瀏覽器中，並套用於所有設計。視窗較窄時（例如手機），此設定會隱藏，立方體則留在左上角。

### 外觀：快速模式

{{ui:workspace.fastMode}} 適用於較慢的電腦。它會關閉陰影、所有實體的邊線與相機慣性，並且只以螢幕解析度繪製檢視。你自己的設定會保留供日後使用，開啟期間被它覆寫的開關會顯示 {{ui:workspace.offInFastMode}}。更多有助於慢速電腦的說明，請見下文「layerling 感覺很慢的時候」。

### 外觀：工作區與草圖的顏色

工作區的顏色在 {{ui:workspace.appearance}} 下設定：淺色主題的 {{ui:workspace.backgroundColor}} 與 {{ui:workspace.surfaceColor}}（深色主題保留自己的顏色），網格顏色則在 {{ui:workspace.workplane}} 下。每種顏色都是一個顯示該顏色的按鈕。點擊後會開啟一個小視窗，其中有色域、一排現成顏色、十六進位值欄位，以及一個將顏色還原為 layerling 初始值的箭頭。按 [[Enter]] 會套用輸入的十六進位值，點擊視窗外也會套用。

草圖檢視有自己的顏色：{{ui:workspace.sketchBackground}} 用於紙張周圍的視窗，{{ui:workspace.sketchPlateColor}} 用於網格下方的紙張，{{ui:workspace.sketchGridColor}} 用於網格，皆為淺色主題。{{ui:workspace.sketchMatch}} 可一鍵套用工作區的三種顏色。

{{ui:workspace.classicLook}} 會將工作區佈置成 Tinkercad 的樣子：白色地面、淡藍色的公釐網格（每隔一公分有一條較深的線）、黑色邊線、來自上方的光線與柔和陰影。之後每個數值仍可個別變更。所有初始值都是 layerling 一直以來的樣貌，哪一種適合你取決於你的螢幕。

![外觀下的設定：淺色主題的背景色與工作平面顏色，以及所有實體邊線的開關。](shot:settings-appearance)

![深色配色方案下的編輯器。配色方案在右上角設定：跟隨系統、淺色、深色或石墨。](shot:editor-dark)

### 外觀：座標軸箭頭與邊線

{{ui:workspace.showAxes}}（預設開啟）會在平台後左角畫出三個箭頭：**X** 為紅色指向右方，**Y** 為綠色指向後方，**Z** 為藍色指向上方，與位置欄位的計算方式一致。這就是 Tinkercad、CAD 程式與切片軟體也採用的右手定則。工作平面位於面上時，它們會跟隨該面。如果它們擋路，可以在這裡關閉。

{{ui:workspace.edgeLines}} 會為每個實體繪製輪廓，顏色由 {{ui:workspace.edgeColor}} 決定（初始為黑色，與 Tinkercad 相同）：當深色彼此混在一起時很有幫助。它預設關閉，而非常大的匯入網格會被略過。

![三個開啟邊線的深色實體：輪廓讓它們彼此分明。](shot:edge-lines)

{{ui:workspace.strongHoles}} 會將孔畫成較深的灰色、較不透明，並在周圍加上深色線條。當孔在透明實體中難以找到時很有幫助。與邊線不同，它在快速模式下仍會保持開啟。

### 外觀：光線與陰影

{{ui:workspace.showShadows}} 開啟或關閉投射陰影。兩個滑桿設定實體的受光方式。{{ui:workspace.shadowStrength}} 決定投射陰影的深淺，{{ui:workspace.shadeContrast}} 則將光線從均勻的環境光轉向主光源：偏向「強烈」時，背光面會更暗、陰影更明顯；偏向「柔和」時，整體會更平坦。對比拉到最高時會非常強烈，背光面與陰影會變得非常暗。{{ui:workspace.shadowSoftness}} 讓陰影邊緣變得柔和而不是銳利。{{ui:workspace.lightAzimuth}} 讓主光源繞著平台旋轉（0° 從前方，90° 從右方），{{ui:workspace.lightElevation}} 則將它抬高；在 90° 時它會像 Tinkercad 那樣位於平台正上方，陰影正好落在實體下方。{{ui:workspace.lightReset}} 會還原所有設定。

### 外觀：工作平面上的量測

{{ui:workspace.showMoveDimensions}} 顯示拖曳時移動了多少，{{ui:workspace.showOriginDimensions}} 顯示選取範圍到平台原點的距離，選取多個實體時也會顯示。開啟 {{ui:workspace.dimensionsAlwaysVisible}} 後，這些量測會永久可見，而不只在拖曳時顯示。選取轉過的實體時，其角度會顯示在工作平面上它的下方；{{ui:workspace.showRotationAngles}} 可關閉這項顯示。更多內容見[量測與備註](chapter:measuring-and-notes)。

### 外觀：選取與移動

{{ui:workspace.selectBeforeMoving}}：實體必須先被選取，下一次拖曳才會移動它。當小孩或匆忙的手會碰到實體時，以及在觸控螢幕上，這很有幫助。

{{ui:workspace.frameByDirection}}：往右拖曳的選取框只會選取完全位於其中的物件，往左拖曳的選取框則會選取它碰到的所有物件（以虛線繪製），與 SketchUp 相同。

{{ui:workspace.doubleClickOpensSketch}} 決定雙擊擠出的草圖是否會重新開啟草圖，與 Tinkercad 相同；{{ui:workspace.doubleClickOpensGroup}} 則決定雙擊群組或綁定是否會開啟它進行編輯。{{ui:workspace.doubleClickCentersView}} 決定按兩下工作平面上的空白處是否會把檢視移到該處。

{{ui:workspace.objectSnap}} 讓形狀的邊與中心在拖曳時吸附到其他形狀；右下角的網格選單有同樣的開關。{{ui:workspace.cruise}} 讓新形狀掛在滑鼠指標上，並落在其下方的面，類似 Tinkercad 的 Cruise；關閉時，新形狀會出現在平台中央。更多內容見[選取與排列](chapter:select-and-arrange)。

### 外觀：檢視

{{ui:workspace.startInPerspective}}：編輯器接著會以透視檢視開啟，而不是平面檢視。

{{ui:workspace.zoomSpeed}} 是一個從慢到快的滑桿：滾輪與觸控式軌跡板的縮放速度；縮放按鈕與按鍵仍維持自己的小步距。{{ui:workspace.cameraInertia}}：放開滑鼠後，檢視會繼續轉一下子並平緩減速。關閉後它會立刻停住，與 Tinkercad 和 Fusion 360 相同。

{{ui:workspace.overhangAngle}} 是在可見度選單中開啟「顯示懸垂」時，面被視為懸垂的起始角度：這些面會以紅白斜線標示。30° 偏保守，70° 則仰賴良好的列印冷卻；45° 是常用的起點。

{{ui:workspace.booleanTriangleLimit}} 限制匯入網格在切割、合併或交集時可容許的三角形數量，因為這些計算是在你的瀏覽器中進行。超過上限的網格不會被處理；請先簡化網格，或者若你的電腦負荷得了，就提高上限。上限過高可能讓編輯器凍結幾秒鐘。

### 量測：單位、比例與吸附步距

在 {{ui:workspace.measurement}} 下，你可以設定 {{ui:workspace.units}}，也就是量測顯示所用的單位（{{ui:workspace.scale}}：公制為公釐、公分或公尺，英制為英吋或英尺）、數字顯示的小數位數（{{ui:workspace.accuracy}}）、移動與調整尺寸時吸附的 {{ui:workspace.snapGrid}}，以及 {{ui:workspace.customSnapGrids}} 下你自己的吸附步距。

在設定的 {{ui:workspace.measurement}} 下設定 {{ui:workspace.units}}。使用 {{ui:units.imperial}} 時，layerling 會將所有量測顯示為英吋——形狀上、屬性面板中、捲尺與標尺上都是如此。吸附網格接著會提供從 1/64 到 1 英吋的步距，平台的網格也會以英吋繪製（1/8 到 1 英吋，預設為 1/4 英吋），每滿一英吋就有一條較粗的線。在 {{ui:workspace.inchFormat}} 下，你可以選擇英吋要以像 Tinkercad 那樣的分數顯示（1 5/8，四捨五入到 1/64 英吋），或以小數顯示（1.625），小數位數則依 {{ui:workspace.accuracy}} 的設定。兩種寫法都能輸入，包括「1 5/8」。在公釐與英吋之間快速切換的方法，是屬性視窗底部 {{ui:inspector.snapGrid}} 旁的小開關 **mm | in**：它會像設定一樣改變單位、平台網格與吸附步距，且只作用於目前這個設計。

在 {{ui:workspace.customSnapGrids}} 下可以新增自己的吸附步距：一個名稱與一個以公釐為單位的大小，例如「Pin pitch 2.54 mm」代表 DIP 晶片、排針與洞洞板孔的間距，或用 19.05 mm 的「MX Key Unit」代表鍵盤按鍵的間距。吸附步距選單接著會提供該尺寸的整份、一半與四分之一（1 ×、½ × 與 ¼ ×），因此形狀可以按一個間距、半個間距或四分之一個間距移動。如果你只想要該尺寸本身，取消勾選旁邊的 {{ui:workspace.customSnapGridParts}}；選單就只會有這一個步距。自訂步距會隨設計儲存，也會跟著 {{ui:workspace.makeDefault}} 一起儲存。

### 工作平面：平台與印表機

{{ui:workspace.printer}} 會將工作平面調整為印表機的列印平台大小，並標出超出範圍的實體，參見[列印](chapter:printing)。{{ui:workspace.showPlateLabels}} 會在平台上寫出設計名稱；選擇印表機後，還會寫上印表機名稱與建構體積。

{{ui:workspace.size}} 可為平台設定自訂尺寸，使用 {{ui:workspace.width}} 與 {{ui:workspace.length}}，單位為公釐或你選擇的單位。網格一律穿過原點，所以無論平台多大，較粗的線都會位於座標軸上。

### 工作平面：網格

{{ui:workspace.showGrid}} 顯示或隱藏平台上的網格。{{ui:workspace.gridBlockSize}} 設定網格線的間距，{{ui:workspace.gridMajorEvery}} 設定較深的線是每隔 5 個還是 10 個網格步距出現；{{ui:workspace.gridMajorColor}} 給這條線專屬的顏色，中心十字與平台邊框也會採用；{{ui:workspace.gridColor}} 則是一般網格線的顏色。

放大時，網格的每條線都會變寬，與 Tinkercad 相同，縮小時也仍保持可見。如果覺得太粗，可以關閉 {{ui:workspace.gridLinesGrow}}，線條在任何縮放比例下都會維持一個像素寬，與草圖中相同。

如果網格消失了，例如因為顏色被設成與平台相同，{{ui:workspace.workplane}} 區域末尾的 {{ui:workspace.resetGrid}} 會將它的可見度、顏色、間距與線寬還原為標準值，這裡的設定以及以 {{ui:workspace.makeDefault}} 儲存的預設值都會還原。

### 形狀預設值

在 {{ui:workspace.shapeDefaults}} 下，你可以用 {{ui:workspace.shape}} 選擇形狀，並設定新增它時的初始狀態：寬度、長度與高度。{{ui:workspace.useAppDefaults}} 會將該形狀還原為應用程式的初始值。有各自設定的形狀會在 {{ui:workspace.shapeDetails}} 下顯示這些設定。這些數值只套用於新形狀，不套用於已經在平台上的形狀。{{ui:workspace.customLimit}} 可為控制點與屬性允許將該形狀做多大設定你自己的上限；留空則維持一般限制。

### 儲存的歷史記錄

在 {{ui:workspace.history}} 下，滑桿 {{ui:workspace.savedHistory}} 設定在儲存或重新開啟設計後，有多少已完成的操作仍可供復原使用。每個設計的預設值為 100 個操作。降低上限會永久捨棄該設計較早的復原步驟。

## layerling 感覺很慢的時候

layerling 會在你的瀏覽器中計算並繪製所有內容。因此在較舊的電腦上、顯示卡較弱時，或在多個大螢幕上，檢視可能會顯得遲緩。以下方法有幫助：

- **{{ui:workspace.fastMode}}** 位於 {{ui:workspace.appearance}} 下，會立即關閉所有讓檢視負擔很大的效果：陰影、所有實體的邊線與相機慣性。它也只以螢幕本身的解析度繪製檢視，在高解析度螢幕上像素最多可減少到四分之一。你自己的設定會保留，一旦關閉它就會重新生效。
- **相機持續轉動：** 轉動後放開滑鼠時，檢視會繼續轉一下子並平緩減速。這是刻意設計，不是卡頓。如果你習慣 Tinkercad 或 Fusion 360，可在 {{ui:workspace.appearance}} 下關閉 {{ui:workspace.cameraInertia}}，檢視就會立刻停住。
- **個別開關：** 不使用快速模式，也可以只關閉 {{ui:workspace.showShadows}} 或 {{ui:workspace.edgeLines}}。
- **使用顯示卡：** 在 Chrome 中開啟 `chrome://gpu`（Edge 中為 `edge://gpu`）。「WebGL」旁邊應顯示「Hardware accelerated」。若顯示「Software only」，表示瀏覽器設定中的硬體加速已關閉。在 Windows 上，還可以在「設定」→「系統」→「顯示器」→「圖形」中為瀏覽器選擇「高效能」，讓它使用真正的顯示卡，而不是處理器中較弱的顯示卡。
- **簡化大型匯入網格：** 包含數十萬個三角形的模型會拖慢任何檢視。精簡的方法見檔案一章中的「簡化匯入的網格」。
- **關閉其他分頁：** 每個開啟的 layerling 分頁與其他任何 3D 頁面都會共用同一張顯示卡。
