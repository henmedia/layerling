---
title: 放置與調整形狀
summary: 形狀庫、以數字與控制點設定尺寸、顏色、旋轉、錐度與扭曲。
---

layerling 的每個零件都從一個形狀開始。其餘一切都是由形狀搭建而成：形狀彼此互補、互相挖空，或合併成一個新形狀。

## 新增形狀

點擊功能區的 {{ui:editor.addShape}}。形狀庫隨即開啟。

![形狀庫。每一張小圖都是由形狀的真實幾何渲染而成。](shot:shape-menu)

每選取一個形狀，形狀庫就會關閉。拖曳它的標題列可以移動它，讓你把它放到不會擋住目標位置的地方，例如屬性面板上方；按兩下標題列會讓它回到按鈕下方，你上次留下的位置會儲存在瀏覽器中。標題列的圖釘可讓形狀庫保持開啟，方便你連續放置多個形狀。拖曳它的邊緣與角落可調整大小，最大到螢幕允許的寬高；尺寸同樣儲存在瀏覽器中，按兩下邊緣即可還原。拉窄之後，形狀庫會省略名稱、只顯示圖片；把指標移到形狀上時才會出現名稱。

選一個形狀。它會跟著滑鼠指標，並在你點擊的位置落下。把它移到實體上方，它會貼在指標底下的面上，斜面也一樣，就像 Tinkercad 的 Cruise；移到空白平台上方，則落在工作平面。[[Esc]] 取消放置。等待點擊的工具（例如捲尺、角尺、備註、{{ui:camera.placeWorkplane}}、{{ui:editor.tool.layFlat}} 或邊緣工具）在你選取形狀時會被關掉，因此那一下點擊就是放置形狀。反過來，開啟其中一個工具也會把形狀放下。如果你希望形狀直接出現在平台中央，可以在設定中關閉點擊放置（{{ui:workspace.appearance}} 區域的 {{ui:workspace.cruise}} 開關）。

在一個面上,指標靠近面中心時形狀會吸附到該面的中心,就像吸附到角或邊一樣;按住 [[Alt]] 可放在任意位置。如果從形狀庫把它拖到一個面上,它總是落在面的中心,按住 [[Alt]] 則落在放開的位置。

形狀庫提供：

- **基本形狀：** {{ui:shape.box}}、{{ui:shape.roundedBox}}、{{ui:shape.cylinder}}、{{ui:shape.slot}}、{{ui:shape.ellipse}}、{{ui:shape.polygon}}（三到二十四邊）、{{ui:shape.sphere}}、{{ui:shape.cone}}、{{ui:shape.pyramid}}（三到二十四邊，因此也有三角錐）、{{ui:shape.wedge}}、{{ui:shape.roundRoof}}、{{ui:shape.halfSphere}} 和 {{ui:shape.torus}}。
- **管：** {{ui:shape.tube}} 和 {{ui:shape.bentTube}}，由最多十二段直管與其間的彎角組成，以及從一個輪廓過渡到另一個輪廓的 {{ui:shape.loft}}，例如從方形到圓形。
- **裝飾形狀：** {{ui:shape.star}}、{{ui:shape.heart}} 和 {{ui:shape.crescent}}。
- **文字：** {{ui:shape.text}}，也可沿圓弧排列。更多內容見[文字](chapter:text)。
- **機械件：** {{ui:shape.thread}}（螺桿、螺絲、螺帽與螺紋孔）、{{ui:shape.spring}}、{{ui:shape.gridfinity}} 收納盒與底板、{{ui:shape.gear}}，以及用於握把的 {{ui:shape.knurl}}。更多內容見[螺紋與機械件](chapter:threads-and-mechanics)。
- **結構用：** 可一體列印的 {{ui:shape.hinge}}、{{ui:shape.dovetail}}、用於水平孔的 {{ui:shape.teardrop}}、用於螺絲頭的 {{ui:shape.counterbore}} 與 {{ui:shape.countersink}}，以及 {{ui:shape.ruler}}，它只是量測工具，永遠不會出現在匯出結果中。

要得到三角形有兩種方式：三邊的 {{ui:shape.polygon}} 是等腰三角形，也就是 Tinkercad 的「Roof」；{{ui:shape.wedge}} 則是直角三角形。兩者都是真正的三角柱。想挖出三角形孔，可複製該形狀、把副本縮小、標記為孔，再用 {{ui:editor.tool.centerOnWorkplane}} 或 {{ui:editor.tool.align}} 對齊。兩者都按形狀的邊界框運作，也就是包住它的最小方框，所以切掉一半的正方形仍算作完整正方形。命令搜尋（[[Ctrl]]+[[K]]）在「triangle」或「roof」下也找得到這兩種形狀。

{{ui:shape.slot}} 可以一端比另一端窄，例如用在兩顆皮帶輪之間的皮帶護罩。在 {{ui:inspector.properties}} 下設定 {{ui:prop.slotSmallEnd}}；大端與膠囊同寬，兩側從一段圓弧直通到另一段圓弧。{{ui:prop.slotCentreDistance}} 是兩段圓弧圓心之間的距離，也就是兩顆皮帶輪的間距。改變小端時圓心距保持不變，膠囊會變長或變短。錐形膠囊同樣是精確實體，可套用圓角並匯出 STEP。

## 形狀的設定

選取形狀後，它的設定會立刻出現在右側。最上方是名稱，旁邊的鉛筆（{{ui:outliner.rename}}）可讓你輸入新名稱。按 [[Enter]] 保留，按 [[Esc]] 取消，名稱為空則還原形狀的預設名稱。再往右，掛鎖可鎖住形狀、避免誤移動，眼睛圖示則可隱藏它。最左側的箭頭會把設定收合到只剩標題列。下方的卡片點擊標題即可展開與收起（{{ui:inspector.properties}}、{{ui:inspector.position}}、{{ui:inspector.rotation}}、{{ui:inspector.taper}}、{{ui:inspector.twist}} 以及特殊形狀的卡片）；layerling 會記住你留下哪些展開的卡片，下一個形狀與下次造訪都適用。

設定停靠在右側邊緣。如果它擋住你想看的內容，拖曳標題列就能讓它浮動到你放下的位置；下一個形狀也會留在那裡。把它拖回右上角，或按兩下標題列，它就會重新停靠。浮動或收合時，吸附步距會從設定底部移到工作平面的右下角。

![圓柱的設定：實體或孔、直徑與高度，可用數字和滑桿設定。](shot:editor-overview)

- **{{ui:inspector.solid}} 或 {{ui:inspector.hole}}：** 實體保留材料，孔則移除材料。點擊 {{ui:inspector.solid}} 會開啟顏色；你在那裡調出的自訂顏色之後會留在 {{ui:inspector.recentColors}} 下，最多最近八個。更多內容見[實體與孔](chapter:solids-and-holes)。{{ui:inspector.keptColors}} 那一列的圖釘可永久保留你選的顏色：它獨佔一列，較新的顏色永遠不會把它擠掉，再按同一枚圖釘即可取消保留；這個瀏覽器最多保留 21 種顏色。
- **{{ui:inspector.transparent}}：** 讓你能看穿實體，例如看清它後面的形狀。
- **{{ui:inspector.multicolor}}：** 僅適用於群組；[[Shift]]+[[M]] 可切換。開啟後，群組中的每個部件都顯示自己的顏色，被孔挖成單一實體的群組也一樣（孔留下的壁會採用被挖入實體的顏色）。為群組選顏色會關閉這個選項，並為整個群組上色。綁定則一律保留各部件自己的顏色。匯出 3MF 時每個部件都保留顏色，切片軟體便能據此把各部件對應到線材；OBJ 把顏色記錄在頂點上，因此那裡兩種顏色的交界會稍微粗糙一些。
- **{{ui:inspector.properties}}：** 尺寸以及屬於這個形狀的一切。圓柱有直徑、高度與邊數。圓管或圓環則有 {{ui:prop.outerDiameter}}、{{ui:prop.innerDiameter}}（用於已知軸徑的襯套）與壁厚：任意兩個值可得出第三個，輸入順序不拘。設定外徑時內孔保持不變、壁厚隨之改變；設定內徑時外徑保持不變、壁厚隨之改變；內孔比管更寬時，外徑會按壁厚增大。管的長度就是它的高度。被拉過一邊、不再是圓形的管，會以長度與寬度兩個值取代原本的單一外徑；在那裡改變寬度時壁厚保持不變。齒輪有齒數，彈簧有圈數。離開預設值的數值，名稱旁會出現一個小箭頭：點擊它只還原該數值，無論你之後還做了什麼，這點與復原不同。按兩下滑桿也一樣，這裡以及工作區設定中的滑桿都是如此。用滑鼠拖曳時，長度滑桿會吸附到吸附步距，因此高度會落在整數公釐（格線關閉時與短滑桿上不會）；輸入的值與滑桿上的方向鍵仍保持精確。底部的 {{ui:inspector.saveDefaults}} 會把目前的值設為這類形狀的起始值（等同設定中的 {{ui:workspace.shapeDefaults}}），{{ui:inspector.resetDefaults}} 則還原為應用程式自己的預設值。 開啟{{ui:prop.tubeBoreHole}}後，管子群組時其孔算作空洞：它也會切開與管子群組在一起的物體的壁，於是T形相接的兩根管子彼此貫通。
- **{{ui:inspector.makeEllipse}}：** 僅適用於圓柱。圓柱一律是圓的：只有一個直徑，每個控制點都會同時改變兩側。想要橢圓，點擊這個選項，它就會變成 {{ui:shape.ellipse}}——同一個實體，之後你可以分別設定長度與寬度。帶有倒角、圓角或壁的圓柱，以及轉過或群組過的圓柱，不能這樣轉換；這些情況請一開始就選用 {{ui:shape.ellipse}}。
- **{{ui:inspector.taper}}：** 頂部與底部尺寸不同，例如做斜面或漏斗。
- **{{ui:inspector.twist}}：** 讓頂部相對底部扭轉，或往側邊偏移。這樣就能做出扭轉的柱子與傾斜的高塔。
- **{{ui:inspector.slope}}：** 讓頂部朝一端傾斜下降。{{ui:prop.slopeSide}} 選擇哪一端，{{ui:prop.slopeEnd}} 或 {{ui:prop.slopeAngle}} 決定降多低，{{ui:prop.slopeCurve}} 決定頂部是直的（0）、向上鼓起（大於 0）還是下凹（小於 0）。另一端保持物體的高度；低端頂部的橘色圓點可拖曳調整其高度。適合沿長度方向降低的屋頂、坡道或斜切的管端。可用於：{{ui:shape.box}}、{{ui:shape.roundedBox}}、{{ui:shape.cylinder}}、{{ui:shape.ellipse}}、{{ui:shape.polygon}}、{{ui:shape.tube}}、環、{{ui:shape.wedge}}、{{ui:shape.roundRoof}}。物體仍是精確實體，可倒角、圓角並匯出 STEP。
- **{{ui:inspector.narrow}}：** 從上方看，讓兩條長邊均勻地朝一端收攏。{{ui:prop.narrowSide}} 選擇哪一端，{{ui:prop.narrowEnd}} 設定該端寬度（0 為尖端），{{ui:prop.narrowStart}} 設定收窄從哪裡開始（寬端為 0 %，中間為 50 %），{{ui:prop.slopeCurve}} 決定兩側是直的（0）、像船頭一樣向外鼓（大於 0）還是向內收（小於 0）。窄端側面的橘色圓點可拖曳調整其寬度。可用於除管和環以外的相同形狀。保持精確的有：{{ui:shape.box}}、{{ui:shape.wedge}}、{{ui:shape.roundRoof}}；其餘以網格顯示。

![一個由橘色方塊、藍色銷釘和孔組成的群組，被挖成單一實體。開啟多色後，銷釘保持藍色、方塊保持橘色，孔壁則採用方塊的顏色。](shot:group-multicolor)

錐度與扭曲幾乎適用於每個形狀。只有齒輪、螺紋、彈簧、Gridfinity、鉸鏈、角錐、彎管、淚滴孔、螺絲頭刀具與標尺不支援：它們有自己固定的尺寸，或者像角錐那樣本來就有自己的頂部。

![一個改過頂部半徑與高度的圓錐：每個數值旁的小箭頭可把該值還原，底部的兩個按鈕則儲存或重設這個形狀的預設值。](shot:property-reset)

{{ui:inspector.saveDefaults}} 會把你在這個形狀上的改動存成同類型每個新形狀的起點：尺寸、形狀的設定與顏色。把一個圓柱塗成綠色，按下按鈕，之後新增的每個圓柱都是綠色；其他類型則各自保留自己的顏色。{{ui:inspector.resetDefaults}} 會把該類型還原成應用程式最初的設定。有自己預設值的類型，會在設定中的 {{ui:workspace.shapeDefaults}} 下標出。從起始頁新建的設計也會以這些預設值開始；數值儲存在這個瀏覽器中。

錐形或傾斜的長方體、圓柱、橢圓、多邊形、管或圓環都會保持精確形狀；膠囊、星形、心形、月牙、燕尾、頂部與底部邊緣未倒圓的圓角長方體，以及直式或圓式滾花（其倒角端也會跟著收窄）同樣如此：倒角與圓角可以像在一般形狀上一樣套用，STEP 匯出也會寫出它。扭曲的形狀也一樣：它的斷面隨高度精確旋轉，側面從底部到頂部均勻盤繞。

輸入比拖曳更精確。所有數字欄位都接受公釐，也接受百分比：在 40 mm 的寬度欄位輸入「50 %」，就會得到 20 mm。它們也會計算：「15*3」、「120-2*4」或「(40+2)/2」分別得到 45、112 和 21；也可以用 x 代替 *。欄位會記住算式，屬性面板與選取實體周圍尺寸框中的欄位都是如此：之後再次點入，只要數值仍與算式吻合，那裡顯示的就是算式而不是數字，你可以就地修改，把「(140+2)/2」改成「(40+6)/2」。用手把拖曳實體或縮放之後，算式不再吻合，欄位就只顯示數字。 在點擊過的數字欄中，滑鼠滾輪和 [[↑]]、[[↓]] 鍵會依一步改變數值，按住 [[Shift]] 步長較大，按住 [[Alt]] 步長較細。在尺寸或位置欄位中，[[Shift]] 改為依格線步長變化；格線關閉時依十個步長。

### 選擇顏色

點擊實體屬性中的 {{ui:inspector.solid}} 會開啟顏色卡片，標題為 {{ui:inspector.shapeColor}}。最上方顯示實體目前顏色的十六進位值。下方是色盤中的現成顏色；點擊其中一種就會為實體上色並關閉卡片。

{{ui:inspector.custom}} 會開啟瀏覽器的選色器，讓你選自訂顏色。它提供什麼取決於瀏覽器：在 Chrome 與 Edge 中，它有顏色欄位、色相滑桿、可從螢幕任何位置取色的滴管，以及可切換為 HEX、RGB 或 HSL 的色值（用旁邊的箭頭切換）。關閉選色器或在它外面點擊時，顏色才會生效。

你在那裡調出的自訂顏色之後會留在 {{ui:inspector.recentColors}} 下，最多最近八個。{{ui:inspector.keptColors}} 那一列的圖釘可永久保留你選的顏色：它獨佔一列，較新的顏色永遠不會把它擠掉，再按同一枚圖釘即可取消保留；這個瀏覽器最多保留 21 種顏色。圖釘是給自訂顏色用的，色盤中的顏色則一直都在。選取了多種顏色，或選取的是孔時，沒有單一顏色可保留。

設定中工作區的顏色有自己較簡單的選色器，包含顏色欄位、一排現成顏色與十六進位值欄位；見[設定](chapter:view-and-workplane)。

## 圓有多圓？邊數

圓柱、圓錐、管、橢圓或內孔等圓形形狀，屬性中有 {{ui:prop.sidesFollowSize}} 開關與 {{ui:prop.sides}} 滑桿。{{ui:shape.torus}} 有兩個滑桿：沿圓環的 {{ui:prop.torusSides}} 與沿管身的 {{ui:prop.torusSteps}}。它們在那裡也會跟著尺寸變動，直到你手動固定，因此大型圓環不會出現切面。原因在於：在檢視以及 STL、3MF 與 OBJ 中，layerling 把圓畫成由許多小邊組成的多邊形。邊越多越平滑，佔用的三角形也越多。

{{ui:prop.torusTube}}設定從上方看時管有多粗。高度只會壓扁或拉伸管，所以扁平的圓環會保留中間的孔；當管粗達到外徑的一半時孔會閉合。拖曳控點時，管會隨形狀一起縮放。只有管粗等於圓環高度的圓環，才會在倒角、圓角與 STEP 中保持為精確實體。

**邊數在哪些地方重要**

- **匯出給切片軟體時**（STL、3MF、OBJ）。邊數少的圓柱到了那裡就是多邊形。
- **合併實體與孔時。** 由邊數少的孔挖出的內孔，在成品中會帶有稜角。螺絲孔也包括在內。
- **在檢視中。** 大量非常精細的形狀會拖慢編輯器。

**邊數在哪些地方不重要**

- **匯出 STEP 時。** 它寫出的是圓形，而不是多邊形。
- **套用倒角與圓角時**（{{ui:editor.tool.chamfer}}、{{ui:editor.tool.fillet}}），只要形狀保持圓形。未設定邊數、邊數不少於該形狀的預設值，或多邊形與圓的偏差最多 {{value:EXACT_ROUND_TOLERANCE}} mm 時，就是這種情況。預設值為 {{value:ROUND_FROM_SIDES}} 邊（圓柱、橢圓、管與圓錐）、{{value:ROUND_FROM_ROOF_SIDES}} 邊的 {{ui:shape.roundRoof}}、{{value:ROUND_FROM_SPHERE_STEPS}} 段的 {{ui:shape.sphere}}、{{value:ROUND_FROM_HALF_SPHERE_STEPS}} 段的 {{ui:shape.halfSphere}} 與 {{ui:shape.paraboloid}}、{{value:ROUND_FROM_TORUS_SIDES}} 邊與 {{value:ROUND_FROM_TORUS_STEPS}} 段的 {{ui:shape.torus}}，以及 {{ui:prop.quality}} 為 {{value:ROUND_FROM_BENT_TUBE_QUALITY}} 的圓形 {{ui:shape.bentTube}}。
- **螺紋、彈簧、斜齒輪或人字齒輪。** 邊緣工具與 STEP 匯出採用它的精確實體；{{ui:prop.quality}} 只決定繪製得多精細。

**邊數又變得重要的情況**

- **在邊數少的形狀上套用倒角與圓角時。** 如果把邊數設得低於預設值，邊緣工具會按形狀繪製出來的樣子處理：6 邊的圓柱仍是六角柱，圓角會沿它的六條邊延伸。這樣你就能做出例如帶圓角的螺帽槽。圓形形狀請保持 {{ui:prop.sidesFollowSize}} 開啟。

**如何使用**

- **保持 {{ui:prop.sidesFollowSize}} 開啟。** 這樣 layerling 會依直徑選擇邊數，使多邊形與真實圓的偏差最多 {{value:ROUND_DEVIATION_TOLERANCE}} mm，遠低於印表機解析得到的程度。小形狀至少有 {{value:MIN_AUTOMATIC_SIDES}} 邊，大形狀則更多。
- **減少邊數**：只在你刻意想要多邊形時（不過那種情況有 {{ui:shape.polygon}}），或是編輯器因大量圓形形狀而變慢時。
- **增加邊數**：幾乎不需要。只有在非常大的圓形零件上、在 STL 中看到稜邊時才需要。
- **對於只用邊緣工具處理，或以 STEP 交付的零件，** 邊數無關緊要。

## 使用控制點

除了設定之外，形狀本身也有控制點：

- **角與邊**可把形狀放大或縮小。把其中一個拖過對面，形狀會在那條邊的另一側繼續增大。頂端的箭頭在底面下方做同樣的事。拖曳角時按住 [[Shift]] 可同時縮放寬度、深度與高度並保持比例；按住 [[Alt]] 則從中心縮放，而不是從對角縮放。沒有鍵盤，或不想一直按著鍵時，可開啟屬性面板頂端的 {{ui:inspector.keepProportions}}：此後拖曳角一律保持比例，輸入寬度、深度或高度其中之一，另外兩項會按相同比例縮放。這項設定會被記住。
- 形狀**上方的黑色箭頭**抬高或降低形狀；從一開始按住 [[Alt]]，會在放開處產生一個副本，方便疊放。**頂面上的白色控制點**改變高度。
- **弧形箭頭**旋轉它。
- **形狀旁的數字**顯示尺寸。點擊其中一個會開啟欄位，讓你輸入想要的數字。按 [[Enter]] 時，形狀從該數字對面的邊開始增大，跟拖曳時一樣；按 [[Alt]]+[[Enter]] 則繞著自己的中心增大，因此先前與其他形狀對齊過的形狀仍保持對齊。這適用於寬度與長度；高度一律從底面往上增大。右側屬性面板中的欄位不需按鍵就會保持中心。[[Tab]] 保留數字並開啟下一個欄位（寬度、深度、高度）；[[Shift]]+[[Tab]] 返回上一個。在屬性面板中已點入的欄位，滑鼠滾輪也能改變數值：每一格一個單位，按住 [[Shift]] 為十倍，[[Ctrl]] 為十分之一，[[Alt]] 為百分之一。沒點入的欄位則把滾輪留給面板捲動。
- **點擊一個角**（不拖曳）會同時開啟寬度與深度。輸入第一個，按 [[Tab]] 切到第二個，再按 [[Enter]] 套用兩者。[[Esc]] 取消。

形狀一旦轉過直角，例如用 {{ui:editor.tool.layFlat}} 側放，屬性面板中的欄位就會按每項尺寸目前的方向命名：{{ui:prop.height}} 是往上的尺寸，{{ui:prop.width}} 沿 X 方向，{{ui:prop.length}} 沿 Y 方向。因此對躺下的形狀輸入高度，改的是垂直方向的尺寸，而它的底面仍留在平台上。以其他角度傾斜的形狀，欄位中顯示的是它自己的尺寸，下方會有備註說明。

不用滑鼠時，可以用鍵盤：方向鍵把選取項移動一個吸附步距（格線關閉時為 0.01 mm），按住 [[Shift]] 為五個，若把 {{ui:workspace.gridMajorEvery}} 設為 {{ui:workspace.gridMajorSteps|10}}（在設定中的 {{ui:workspace.appearance}} 下），則為十個：移動到下一條較深的格線，跟 Tinkercad 一樣。方向鍵跟隨檢視：[[→]] 往螢幕右側，[[↑]] 遠離你，即使轉過平台也一樣。把形狀推出畫面，檢視也會跟著移動。[[Ctrl]]+[[↑]] 與 [[Ctrl]]+[[↓]] 升高與降低它。連續按方向鍵在歷史記錄中算一步：只要下一次按鍵在 1.5 秒內接上，復原就會收回整串操作，而不是一次一下。[[R]] 旋轉 45°，[[Shift]]+[[R]] 旋轉 22.5°。[[D]] 把選取項放到工作平面上。

控制點可把形狀拉到和你的平台一樣大，寬與深至少 220 mm。在屬性面板輸入數字則可超過，而這樣放大的形狀再次抓取時不會縮回。在設定中的 {{ui:workspace.shapeDefaults}} 下，可用 {{ui:workspace.customLimit}} 為每種形狀設定自己的上限。

吸附步距位於編輯器右下角，隨時可以更改。

## 複製與重複

{{ui:editor.tool.copy}}、{{ui:editor.tool.paste}} 與 {{ui:editor.tool.duplicate}} 位於功能區（{{ui:editor.group.clipboard}}）。[[Ctrl]]+[[D]] 會重複選取項。layerling 會記住你上次如何移動或旋轉副本，並在下次重複時再套用相同的方式。這樣幾個按鍵就能做出一排孔或一排階梯。規則排列還可以使用陣列，說明見[選取與排列](chapter:select-and-arrange)。 如果你也調整了副本的大小，之後的每個副本都會再按相同比例縮放，和 Tinkercad 一樣。

> **提示：** 如果某個形狀不肯接受你想要的尺寸，通常是新形狀的限制所致。在設定中的 {{ui:workspace.shapeDefaults}} 下，你可以決定每種形狀如何開始，以及最大能有多大。

## 自訂形狀

需要反覆使用的支架、握把或底板，可以放進 {{ui:myShapes.title}}。它們位於形狀庫最上方、{{ui:myShapes.basicShapes}} 之上，可用箭頭收起。

1. 選取一個或多個實體、孔、群組，也可以包含匯入的模型。
2. 開啟形狀庫並點擊 {{ui:myShapes.saveSelection}}。輸入名稱，再按 {{ui:common.save}} 確認。
3. 在任何設計中，點擊圖磚即可插入該形狀，跟其他形狀一樣。你也可以把圖磚拖到工作平面；它會在你鬆手的位置落下。接著形狀會跟著指標，和其他形狀一樣：它跟著指標移動，經過其他實體的面時也一樣，點擊即可放下；[[Esc]] 把它收走。

多個實體會一起回來，保持彼此原本的相對位置，而且仍可逐一選取。釘在已儲存實體上的[備註](chapter:measuring-and-notes)會一起存下，插入時以收合狀態回來、仍釘在插入的實體上；自由備註與參考點則留在設計中。圖磚上的鉛筆可重新命名，垃圾桶會先詢問再刪除。已插入設計中的形狀則保持原樣。

{{ui:myShapes.title}} 儲存在這個瀏覽器中，與設計分開，下次啟動時仍然存在。起始頁的 {{ui:dashboard.backupAll}} 會把它們和設計一起備份，開啟備份就會把兩者一起還原。若只想把形狀帶到另一個瀏覽器，{{ui:myShapes.backup}}（向下的箭頭）會把它們儲存成 ZIP 檔案，{{ui:myShapes.load}}（向上的箭頭）再把它們帶回那裡。{{ui:myShapes.load}} 也接受單一的 `.lyl` 設計；每一個都會變成一個形狀。已存在的形狀不會重複新增。

### 資料夾

自訂形狀一多，用資料夾分類會更清楚。{{ui:myShapes.newFolder}}（帶加號的資料夾，位於 {{ui:myShapes.saveSelection}} 旁）會要求輸入名稱，並在最上層建立資料夾；資料夾上的加號 {{ui:myShapes.newSubfolder}} 則會在其中建立子資料夾。資料夾最多三層：第三層的資料夾可以放形狀，但不能再放資料夾。資料夾依名稱順序排在未歸類的形狀上方，可用箭頭展開與收起；資料夾上的數字統計它本身及內部資料夾中的形狀數量。儲存時，在名稱旁的清單中選擇資料夾；{{ui:myShapes.noFolder}} 會把形狀留在最上層。

圖磚上帶箭頭的資料夾可把該形狀移到另一個資料夾，或用 {{ui:myShapes.noFolder}} 移回最上層。資料夾上的鉛筆可重新命名，垃圾桶會先詢問再刪除它連同其中的資料夾與形狀。資料夾本身不能移動：在想要的位置新建一個，再把形狀移過去。備份會保留資料夾，載入後形狀會回到相同的位置。

### 伺服器上的自訂形狀

開啟[共用伺服器儲存](chapter:files-and-saving)後，這一區會顯示兩組：{{ui:myShapes.onServer}} 與 {{ui:myShapes.inBrowser}}。儲存時你可以選擇形狀要放在哪裡；預設選取伺服器。在那裡，它以獨立的 `.lyl` 檔案（附有圖片）存放在 `Custom shapes` 資料夾中，任何能連上伺服器的裝置都能使用；它的資料夾就是 `Custom shapes` 內的資料夾。兩邊各有自己的資料夾，形狀只會在所屬那一邊的資料夾之間移動。瀏覽器圖磚上的雲端圖示會把該形狀放到伺服器；之後它就不再保留兩份。

`Custom shapes` 資料夾也會顯示在起始頁上。在那裡像設計一樣開啟形狀、修改後，它會像伺服器上的任何設計一樣自動儲存；下次插入時用的就是新版本。由於伺服器儲存沒有登入機制，所有能連上伺服器的人看到的都是相同的形狀。

## 包覆到圓柱

想把圖案、標誌或文字放到杯子、罐子或管子上嗎？先把它平放在平台上，例如匯入的 SVG 或文字，並按照從上方看應有的樣子擺好。然後在形狀設定中的 {{ui:inspector.wrapCylinder}} 下把它包覆到圓柱：

1. 開啟 {{ui:inspector.wrapCylinder}}，輸入圓柱壁的 {{ui:inspector.wrapDiameter}}，例如杯子的外徑。也可以精確到小數一位，例如 63.5。
2. 點擊 {{ui:inspector.wrapApply}}。原本由左往右延伸的內容現在繞著圓柱延伸，後緣變成頂部，厚度則從壁面往外突出。
3. 選取包覆後的形狀與圓柱，讓兩者在左右與前後方向都置中。包覆後形狀的中線就是圓柱的軸線，因此它會正好貼在壁上。

若要雕刻，請開啟 {{ui:inspector.wrapInward}}：厚度此時會陷入壁內。把形狀設為孔、置中，然後與圓柱群組。

已經包覆過的形狀是包覆後物件的網格，不能再次包覆：復原這次包覆，或用另一個直徑重新包覆原來的平面形狀。

結果像匯入的模型一樣是網格。復原會把形狀重新攤平；想換直徑，先復原再重新包覆。包覆範圍不能超過圓柱一圈；超過時 layerling 會指出能夠容納的最小直徑。

## 表面紋理

在實體上加凹槽、滾花、蜂巢或凸點，讓它更好握或更好看：在形狀設定中開啟 {{ui:inspector.surfaceTexture}}。上方 {{ui:editor.group.modify}} 群組裡的 {{ui:inspector.surfaceTexture}} 按鈕作用相同：它為選取的實體開啟或關閉這張卡片，卡片開啟時按鈕保持亮起。

1. 選擇 {{ui:inspector.surfacePattern}}、它的 {{ui:inspector.surfaceSpacing}} 和 {{ui:inspector.surfaceDepth}}。{{ui:inspector.surfaceDirection}} 決定紋理是壓進實體還是凸出實體。對於 {{ui:surfaceTexture.bumps}}，{{ui:inspector.surfaceBumpShape}} 可在 {{ui:surfaceTexture.bumpDome}}、{{ui:surfaceTexture.bumpCone}}、{{ui:surfaceTexture.bumpSoft}} 和 {{ui:surfaceTexture.bumpFlat}} 之間選擇。在 {{ui:inspector.surfaceBumpGrid}} 下，它們可以 {{ui:surfaceTexture.bumpGridStaggered}}（每隔一列錯開半個間距），或排成 {{ui:surfaceTexture.bumpGridStraight}}。
2. 在 {{ui:inspector.surfaceProjection}} 下，杯子、旋鈕或把手等圓形實體選 {{ui:surfaceTexture.cylinder}}。圖案繞 {{ui:inspector.surfaceAxis}} 一圈，間距會略作取整，使一圈正好是整數個凹槽或單元：圖案閉合，沒有接縫。{{ui:surfaceTexture.allRound}} 適合不是圓形的實體，{{ui:surfaceTexture.flatProjection}} 適合從上方看的蓋子或平板。保持 {{ui:surfaceTexture.auto}}，Layerling 會替你選擇：圓形實體以及像盒子這樣直立的稜角實體用 {{ui:surfaceTexture.cylinder}}（圖案沿外輪廓走，無接縫地繞過稜邊，凸起的圖案會順著稜邊彎過去），其他稜角實體用 {{ui:surfaceTexture.allRound}}。
3. 點擊 {{ui:inspector.surfaceApply}}。大的實體需要幾秒鐘，期間可以繼續工作。

如果只想給部分面加圖案，例如只給盒子的頂面，點擊 {{ui:inspector.surfaceFacesPick}}，再在檢視中點擊這些面：頂面、底面或某個側面。一個面一直延伸到實體的銳利稜邊；圓柱的側面是一個面，頂面和底面各是一個面。選取的面會亮起，再點擊一次可以取消，{{ui:inspector.surfaceFacesClear}} 讓圖案重新覆蓋整個實體。只有選取的面得到圖案，其他面保持原樣，三角形也很少。在頂面或底面上圖案是平鋪的；在圓形頂面上，凹槽、繩紋和針織紋繞中心排成一圈圈，像樹的年輪。{{ui:inspector.surfaceFaceTurn}} 轉動頂面和底面上的圖案：0° 時各列沿前緣，90° 時沿側緣。{{ui:inspector.surfaceCapStyle}} 讓那裡的凹槽、繩紋和針織紋在列與環之間切換；在稜角實體上，環會沿外輪廓走。{{ui:inspector.surfaceCapEdge}} 決定側面與帶圖案的頂面或底面之間的稜邊怎麼處理：{{ui:surfaceTexture.edgeSharp}} 讓兩者都止於稜邊。選 {{ui:surfaceTexture.edgeOver}} 時，側面的圖案繞過稜邊鋪滿整個頂面：繩紋、針織紋和水平凹槽的各列以環的形式延續，垂直和斜向的凹槽則作為射線幾乎延伸到中心。{{ui:surfaceTexture.edgeFold}} 效果相同，但只作為一圈邊；裡面是頂面自己的圖案，依 {{ui:inspector.surfaceCapStyle}} 的設定。{{ui:surfaceTexture.edgeBead}} 為任何圖案在稜邊加一圈飾邊：一條繩、一道收針鏈或一道圓珠邊。較窄的圓角也會結束一個面：杯緣有圓角的杯子，其外側、圓角、杯緣、內側和杯底各自是獨立的面，所以點擊外側只會選到外側。較寬的圓角（約占實體四分之一或更多）屬於該面，就像球是一個面。選了面時，{{ui:inspector.surfaceOutside}} 和 {{ui:inspector.surfaceInside}} 不起作用。

在 {{ui:inspector.more}} 下選擇圖案鋪在哪裡：外壁和內壁，底部和頂部各留多少光滑（光滑的底部讓實體平穩地放在熱床上），高度上的一條帶，以及銳利稜邊是否保持光滑。在所有保持光滑的地方旁邊，圖案會柔和地過渡出現；{{ui:inspector.surfaceFade}} 設定過渡的毫米數。數值越小，圖案越靠近稜邊；凸起的圖案會一直延伸到稜邊。在立方體這類稜角實體的平面上，圖案則在這個距離處以一條直邊結束：凹槽和菱形以一小段壁收尾，只保留完整的凸點。{{ui:inspector.surfaceProfile}} 決定凹槽或接縫的截面：尖形和平形是精確的，圓形則依 {{ui:inspector.surfaceDetail}} 給出的級數分段。

除了 {{ui:surfaceTexture.grooves}}、{{ui:surfaceTexture.knurl}}、{{ui:surfaceTexture.honeycomb}} 和 {{ui:surfaceTexture.bumps}}，還有更多圖案。{{ui:surfaceTexture.cells}} 是像鋪路石或乾裂泥土那樣的不規則單元；接縫像蜂巢一樣切得乾淨，換一個 {{ui:inspector.surfaceSeed}} 就重新排布。{{ui:surfaceTexture.knit}}、{{ui:surfaceTexture.rope}} 和 {{ui:surfaceTexture.weave}} 模仿針織線圈、纏繞的繩子以及由立條和編條編成的籃子；它們預設凸起、圓潤，大小與原物相當。{{ui:surfaceTexture.grain}} 讓表面變得細微粗糙，像噴砂過一樣；顆粒分布在空間中，沒有接縫，也不會拉伸。{{ui:surfaceTexture.image}} 把一張灰階圖當作高度圖：可用現成的木紋、地形或磨石子，也可用 {{ui:inspector.surfaceImageLoad}} 載入自己的圖。亮處成為完整深度；{{ui:inspector.surfaceSpacingImage}} 設定一塊拼貼的寬度，在 {{ui:inspector.surfaceImageTiling}} 下，拼貼可以重複、鏡像或錯位。

{{ui:surfaceTexture.carbon}} 在實體上鋪斜紋編織的碳纖維：直向帶和橫向帶互相上下穿插，每條帶錯開一條帶的位置，於是出現熟悉的斜紋。{{ui:inspector.surfaceCarbonWeave}} 可選 {{ui:surfaceTexture.carbonTwill22}}（大多數碳纖維件的均勻編織），或 {{ui:surfaceTexture.carbonTwill21}} 和 {{ui:surfaceTexture.carbonTwill31}}，後兩者直向帶顯得長、橫向帶顯得短。{{ui:inspector.surfaceSpacingCarbon}} 設定直向帶的寬度；{{ui:inspector.surfaceCarbonCross}} 讓橫向帶更寬或更窄，得到不均勻的編織（0：一樣寬）。繞實體一圈時，帶寬會略作取整，使編織無接縫地閉合。單根纖維對列印來說太細了：看得見的是帶和它們的交叉。

{{ui:surfaceTexture.bricks}} 在實體上鋪一面磚牆，接縫像砂漿一樣凹下。{{ui:inspector.surfaceBrickBond}} 選擇磚的砌法：大多數牆用的 {{ui:surfaceTexture.bondRunning}}、{{ui:surfaceTexture.bondStack}}，或在長磚之間夾短磚（{{ui:surfaceTexture.bondEnglish}}、{{ui:surfaceTexture.bondEnglishCross}}、{{ui:surfaceTexture.bondFlemish}}）。{{ui:inspector.surfaceSpacingBricks}} 和 {{ui:inspector.surfaceBrickHeight}} 從接縫量到接縫，並略作取整，使整塊磚正好排下：繞杯子一圈、盒子側面從稜到稜、從底到頂；{{ui:inspector.surfaceBrickJoint}} 設定接縫寬度。在 {{ui:inspector.more}} 下，{{ui:inspector.surfaceBrickVary}} 讓每塊磚凹得深淺略有不同，像舊牆一樣。

{{ui:surfaceTexture.cracks}} 圖案讓裂紋像金繕那樣在表面蔓延，帶有轉折、分岔，寬度往末端逐漸變細。{{ui:inspector.surfaceCrackStart}} 決定裂紋從哪裡開始：花瓶或杯子的上緣、底部、從盤子邊緣往中心，或任意位置；在 {{ui:inspector.surfaceCrackStyle}} 下它們會變成閃電。選 {{ui:inspector.surfaceCrackGold}} 時，凹痕由一個獨立的金色零件填滿，可用第二種線材列印；更改或移除紋理時它會一起變化。在 {{ui:inspector.more}} 下設定分岔、鋸齒和崩邊，換一個 {{ui:inspector.surfaceCrackSeed}} 就重新產生裂紋。

{{ui:surfaceTexture.bark}} 在原木上包一層樹皮：{{ui:surfaceTexture.barkOak}}、{{ui:surfaceTexture.barkPine}}、{{ui:surfaceTexture.barkSpruce}}、{{ui:surfaceTexture.barkBirch}} 或 {{ui:surfaceTexture.barkBeech}}，各有自己的大小和深度。{{ui:surfaceTexture.wood}} 把實體變成一塊木頭：在 {{ui:inspector.surfaceWoodType}} 下選橡木、白蠟木、山毛櫸、松木或胡桃木，在 {{ui:inspector.surfaceWoodCut}} 下選去皮原木或木板，弦切帶拱形花紋，徑切則是直紋。{{ui:inspector.surfaceRingWidth}} 讓木紋細或粗。選 {{ui:inspector.surfaceEndRings}} 時，原木兩端顯示年輪，並與側面的木紋對得上：年輪像真木頭一樣貫穿整個實體。在 {{ui:inspector.more}} 下加入 {{ui:inspector.surfaceWoodKnots}}，年輪會繞著它們彎曲。

用 {{ui:surfaceTexture.text}} 圖案可以像壓貼標籤一樣把文字貼到實體上：表面在該位置周圍展開，所以字母在花瓶的鼓肚上、在斜壁上或跨過盒子的稜邊時都保持大小。「環繞」（0° 是正面，90° 是右側）和沿軸的「高度」（%）決定位置；軸設在 X 或 Y 時，0° 是頂部，這樣文字就落在平板上。{{ui:inspector.surfaceDirection}} 讓文字刻入或凸起。遇到真正的尖角時，它會像貼紙一樣撕開；狀態列會提示。{{ui:prop.textVertical}} 在這裡同樣讓字母由上往下排列。

要讓實體的一部分保持光滑，或只給一部分加紋理，請用輔助實體：把盒子、圓柱或球放到相應位置，選取它，在 {{ui:inspector.surfaceMask}} 下選 {{ui:surfaceTexture.maskExclude}} 或 {{ui:surfaceTexture.maskOnly}}。它會變成透明，在另一個實體產生紋理時起作用，隱藏時也一樣。列印前請隱藏或刪除它。

結果是一個網格，就像匯入的模型一樣，並保留產生它時所用的實體。之後再選取它（儲存後也可以），卡片會顯示產生時的設定：修改後點擊 {{ui:inspector.surfaceChange}}，紋理會在該實體上重新產生，位置和大小與紋理實體現在的一致。{{ui:inspector.surfaceRemove}} 恢復光滑的實體。更改紋理時遮罩實體會再次起作用：如果之後可能還要改，請隱藏而不是刪除它們。復原同樣可以撤回其中每一步。

## 花瓶

{{ui:shape.vase}} 是專為花瓶、花盆和燈罩準備的實體。它的尺寸在 {{ui:inspector.properties}} 中，形狀和圖案在 {{ui:inspector.vaseForm}} 卡片上；所有設定隨時都能更改，儲存後也可以：

- {{ui:prop.vaseProfile}}：瓶形、鼓肚、帶頸的碗、桶形、圓柱或漏斗。高度和最大直徑是該形狀自己的尺寸：拖曳控制點，或輸入 {{ui:prop.vaseDiameter}} 和 {{ui:prop.height}}。
- {{ui:prop.vaseSection}}：圓、圓角多邊形或波浪（柔和、尖形、拱形或鰭形）。{{ui:prop.vaseTwist}} 讓截面沿高度旋轉，{{ui:prop.vaseSway}} 讓它來回擺動。
- {{ui:prop.vaseBody}}：{{ui:vase.bodySolid}} 用於切片軟體的花瓶模式（也叫螺旋化）：切片軟體以螺旋方式只列印一層壁，省去頂部和填充，因此實體畫成實心。{{ui:vase.bodyHollow}} 為一般列印產生真正的壁和底。
- {{ui:prop.vaseEffect}}：新花瓶是光面的。可選外側的凹槽、條紋、Voronoi 單元或切面（低多邊形），也可只放在高度上的一條帶裡；它們屬於花瓶，隨花瓶一起保持可編輯。

{{ui:prop.vaseSection2}} 讓截面沿高度過渡到第二種截面，例如從底部的圓過渡到頂部的六邊形。

花瓶設定上方的 {{ui:inspector.vaseDraw}} 會在工作區上方開啟一個獨立的大視窗：在裡面以真實毫米親手繪製花瓶。拖曳標題列可移動視窗，拖曳角落可放大；檢視中的花瓶會跟隨每一次更改。{{ui:vaseDraw.tabProfile}} 從側面顯示花瓶：拖曳各點，最上面的點決定高度，最寬的點決定直徑；{{ui:vaseDraw.handle}} 給點一個角度，{{ui:vaseDraw.corner}} 讓它成為折角。{{ui:vaseDraw.tabSection}} 從上方顯示截面，{{ui:prop.vaseDrawSymmetry}} 會鏡像或重複你畫的內容。{{ui:vaseDraw.tabTwist}} 把旋轉畫成一條沿高度的曲線。繪圖軟體的 SVG 檔案可以成為截面或瓶身形狀，樣品花瓶的網格（STL、3MF、OBJ）可以成為瓶身形狀。可以把花瓶照片放在繪圖後面描摹，或用 {{ui:vaseDraw.takeOutline}} 擷取它的輪廓。滑鼠拖曳一次就是一步復原；拖曳時，檢視會粗略顯示花瓶。

{{ui:inspector.vaseFloor}} 卡片收納實體在形狀之外還需要的東西。空心花瓶上：帶有朝向排水孔坡度的排水孔、空心底腳、鏤空的壁（{{ui:prop.vaseCutout}}：Voronoi、蜂巢、菱形或圓形，適合燈籠和籃子），以及 {{ui:prop.vaseLamp}}：吊掛、裝在燈座上或罩在 LED 燈片上。實心花瓶上，{{ui:prop.vaseReinforce}} 會切出細縫，切片軟體在花瓶模式下藉此一次列印出內部加強肋或雙層壁。橡膠腳墊的凹槽兩種都可用。{{ui:prop.vaseWatertight}} 把空心花瓶的壁和底加厚到至少 1.6 mm。

在 {{ui:inspector.vaseParts}} 卡片上為花瓶加入配件。{{ui:prop.vaseLegs}} 可以一體成型（成為花瓶的一部分），也可以做成插接式，在底部留插座；支架從下面托住花瓶。{{ui:prop.vaseSaucer}} 接住水，或藏在底腳裡。空心花瓶可以放 {{ui:prop.vaseInsert}}：植物內膽、帶儲水層的自動澆水內膽、花莖或試管架。{{ui:prop.vaseLid}} 可以蓋在瓶口上、卡進凹槽，或旋在壁內的螺紋上。{{ui:inspector.vasePartsMake}} 把這些零件作為獨立物件擺在花瓶旁邊，可直接列印，倒過來列印較好的會倒放。花瓶上已經有插座、凹槽或螺紋。更改設定後請重新擺放：之前的零件會被取代。如果某個零件不適合這個花瓶，編輯器會提示，例如內膽穿不過窄瓶頸時。

{{ui:inspector.vasePrint}} 卡片告訴你列印這個花瓶需要什麼：以所選 {{ui:prop.vaseMaterial}} 計的重量和線材長度；實心花瓶依切片軟體的花瓶模式計算，即沿壁的一條線。下方是列印提示：超過 45° 的懸垂及其位置、太薄的壁、蓋子、燈具或支腳需要什麼，以及加強肋和雙層壁的切片設定。

{{ui:prop.vaseQuality}} 決定花瓶劃分三角形的精細程度：越細看起來越平滑，但大花瓶會讓編輯器變慢。
