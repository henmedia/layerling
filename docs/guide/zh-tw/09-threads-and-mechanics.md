---
title: 螺紋、齒輪與其他零件
summary: 能相互配合的螺絲、螺帽與螺紋孔，以及齒輪、彈簧、彎管、燕尾、淚滴孔、沉頭孔與錐形沉頭孔。
---

除了基本形狀，形狀庫裡還有一些自己拼起來會很麻煩的零件。這些零件之後都可以在設定中修改。

## 螺紋

在形狀庫中選擇 {{ui:shape.thread}}。在 {{ui:inspector.threadRole}} 下決定它的類型：

- **{{ui:thread.rod}}：** 帶螺紋的圓柱，例如沒有頭的螺絲。
- **{{ui:thread.screw}}：** 帶頭部。頭部形狀在 {{ui:inspector.threadHead}} 選擇：{{ui:thread.headCylinder}}、{{ui:thread.headCountersunk}} 或 {{ui:thread.headHex}}。
  再往下可以設定{{ui:prop.headDiameter}}(六角頭為{{ui:prop.headAcrossFlats}};沉頭的直徑隨高度而定)以及頭部端面的{{ui:inspector.threadDrive}}:{{ui:thread.driveHex}}、{{ui:thread.driveTorx}}、{{ui:thread.drivePhillips}}、{{ui:thread.driveSlot}}、{{ui:thread.driveRobertson}},或用手或扳手轉的螺絲選{{ui:thread.driveNone}}。{{ui:prop.driveSize}}是內六角的對邊寬度、星型的外徑或十字的跨度;{{ui:prop.driveDepth}}是它的深度,最多為頭部的十分之九,0 表示不要。只要不改動,這些值就隨尺寸變化;六角頭預設沒有驅動。驅動屬於精確實體,因此也會出現在 STEP 匯出中。選擇{{ui:thread.driveSlot}}時，{{ui:prop.driveSize}}是槽的長度，寬度為長度的五分之一，一字起子或硬幣都能轉；初始長度為頭部允許的最大值。 {{ui:thread.driveRobertson}}是加拿大常見的方頭驅動：{{ui:prop.driveSize}}是方孔的對邊寬度，預設取與規格相配的起子頭，M4 和 M5 為 2 號（2.84 公釐）。
- **{{ui:thread.nut}}：** 對應的螺帽。配套的墊圈是一個{{ui:shape.tube}}：在{{ui:prop.washerSize}}中選擇螺絲規格，外徑、內徑和厚度即依 ISO 7089 設定。
- **{{ui:thread.bore}}：** 螺紋孔。它是一個孔。把它拖進零件、將兩者群組，零件就有內螺紋。 要做鎖螺栓的孔，請一律使用{{ui:thread.bore}}：{{ui:thread.rod}}或{{ui:thread.screw}}作為孔時是螺栓的完整尺寸，沒有間隙，會太緊。如果仍把它設為孔，layerling 會提示你，點選{{ui:inspector.threadMakeTappedHole}}即可改為{{ui:thread.bore}}。

![帶圓柱頭的螺絲。右側：類型與頭部形狀，往下是規格、螺距與牙型。](shot:thread-screw)

在 {{ui:prop.threadSize}} 下從清單選擇規格：公制 M2 到 M24，英吋規格 UNC 與 UNF 從 No. 4 到 1 英吋，以及管螺紋 G1/16 到 G4。若選擇 {{ui:thread.customSize}}，則自行設定 {{ui:prop.diameter}} 與 {{ui:prop.pitch}}。英吋或 G 規格時，欄位要求的是 {{ui:prop.threadsPerInch}}，而不是以公釐計的螺距。

清單依系列分組，欄位下方會標出所選規格所屬的系列，並附上日常生活中熟悉的例子：

- **M，公制粗牙：** 符合 ISO 261 的 ISO 公制粗牙螺紋，標準螺絲與螺帽即採用此規格。
- **UNC，美制英吋粗牙：** 相機與三腳架螺絲為 1/4"-20 UNC（ISO 1222），較大的三腳架雲台使用 3/8"-16 UNC。
- **UNF，美制英吋細牙：** 與 UNC 相同直徑，但螺距更細（ASME B1.1）。
- **G，管螺紋：** 淋浴軟管以 G1/2 連接，洗衣機進水管為 G3/4。花園水龍頭末端為 G3/4，較小的水龍頭為 G1/2；快接軟管系統的水龍頭接頭就鎖在這裡。

G 規格是符合 ISO 228-1 的平行惠氏管螺紋，常見於水、瓦斯、液壓與氣動接頭。規格指的是管子，不是螺紋：G1 在螺紋處量得 33.249 mm。選擇 G 規格會把牙型設為 {{ui:thread.profileWhitworth}}，選擇公制或英吋規格則設回 {{ui:thread.profileV}}。自己選的 {{ui:thread.profileTrapezoidal}} 或 {{ui:thread.profileRound}} 牙型會保留。標準只定義螺紋，因此 G 規格的螺絲頭與螺帽，比例和自行設定直徑時相同。錐形管螺紋 R、Rc 與 Rp 未包含在內。

清單中的最後一個系列 {{ui:thread.group.bottle}} 包含 PCO 1881：大多數水瓶和汽水瓶的 28 mm 瓶口，螺紋外徑 27.4 mm，螺距 2.7 mm。它的螺紋牙頂寬而平，所以選擇它時牙型會切換為 {{ui:thread.profileCustom}}，{{ui:prop.threadDepth}} 為 1.6 mm，{{ui:prop.threadFlankAngle}} 為 30°；之後選擇的其他規格會恢復各自的牙型。瓶口用 {{ui:thread.rod}} 製作，瓶蓋用 {{ui:thread.nut}}，或者從圓柱體中減去一個 {{ui:thread.bore}}。尺寸依照 OpenSCAD 函式庫 BOSL2 所載的標準圖面；列印整個瓶蓋之前先列印一個試件。油桶和洗碗精瓶沒有統一標準：請測量你手上的瓶口，並在 {{ui:thread.customSize}} 中輸入數值。

更多設定：

- **{{ui:prop.threadHand}}：** {{ui:thread.right}} 或 {{ui:thread.left}}。
- **{{ui:prop.threadProfile}}：** {{ui:thread.profileV}} 是公制與英吋螺紋的標準牙型，{{ui:thread.profileWhitworth}} 則是 G 管螺紋的牙型：55°，牙頂與牙底為圓角。{{ui:thread.profileTrapezoidal}} 與 {{ui:thread.profileRound}} 的牙頂與牙底是平的。這種牙型通常列印更可靠，因為不會留下細薄的牙尖。
- **{{ui:thread.profileCustom}}：** 自行塑造的梯形，牙頂與牙底同寬且平整。{{ui:prop.threadFlankAngle}} 是一顆螺牙兩側牙面之間的夾角：60° 是尖銳的 V 形螺紋，30° 是梯形螺紋；90° 以下時，牙面都不會比 45° 更平，因此螺紋不需支撐即可列印。{{ui:prop.threadDepth}} 與 {{ui:prop.threadCoreDiameter}} 是同一個尺寸的兩種說法：芯徑等於直徑減去兩倍深度，改動其中一個就會改變另一個。新的自訂牙型從 60° 的 V 形螺紋深度開始。深度受角度與螺距限制：不得淺於螺距的十分之一、不得深於直徑的 40%，也不能深到兩側牙面佔去超過十分之九的螺距。改變螺距時，深度按比例跟著變；縮放螺紋時，深度也一樣。間隙與倒角的作用與其他牙型相同。透過 MCP 橋接時，牙型為 `custom`，並帶 `threadFlankAngle` 與 `threadDepth`。
- **{{ui:prop.clearance}}：** 對螺帽與螺紋孔而言，是確保列印出來的成對零件真的能轉動的餘裕。印表機越粗，這對零件需要的間隙越大。它是整個直徑上的額外空間，而 V 形螺紋牙面之間的縫隙大約只有它的一半，所以列印件需要比你想像更大的值：新螺帽從 0.4 mm 起，0.3 偏緊、0.5 偏鬆。先列印一對測試件。螺桿與螺絲在這裡有自己的間隙，會讓螺栓的直徑相應變細。它預設為 0。多出來的空間給哪一側，取決於你怎麼配對：
  - **列印螺絲配列印螺帽：** 螺絲保持 0，把空間給螺帽（它一開始的 0.4 mm）。
  - **真實螺絲配列印螺帽或螺紋孔：** 列印的一側承擔全部，所以螺帽保留 0.4 mm。如果螺絲會晃，值得試試更緊的 0.3 mm。
  - **列印螺絲配真實螺帽：** 真實螺帽沒有間隙，所以螺絲必須更細：這裡用 0.3 到 0.4 mm，相當於列印螺帽原本會有的量。
- **{{ui:prop.axialClearance}}：** 對螺帽與螺紋孔而言，是在 {{ui:prop.clearance}} 之外沿軸向的間隙。螺帽的每顆螺牙都會變薄這麼多，直徑維持不變。原因在於：{{ui:prop.clearance}} 只作用在直徑上，會把 V 形螺紋的牙面撐開到其數值的約 0.58 倍。想在牙面之間留出空隙，就得把直徑開得更大，代價是左右晃動。沿軸向的間隙把兩者分開。它預設為 0，所以已儲存的螺紋不會改變；最大可到螺距的五分之一，因為再大螺帽的螺牙就不剩什麼了。這個欄位只存在於螺帽與螺紋孔；螺桿與螺絲保有自己的間隙。更多內容見下文「3D 列印用的螺紋」。
- **{{ui:prop.threadChamferTop}}、{{ui:prop.threadChamferBottom}}、{{ui:prop.headChamfer}} 與 {{ui:prop.rimChamfer}}：** 兩端的倒角，讓螺紋起牙乾淨、頭部沒有銳邊。螺桿、螺帽或螺紋孔的每一端都有自己的倒角，所以頂端可以長、底端可以短或不做。螺絲只在尖端有一個，標示為 {{ui:prop.chamfer}}。在螺帽或螺紋孔上，倒角是孔口超出外徑的擴口量；錐面以 45 度一路延伸到螺紋芯部，因此外徑處不會留下台階。

在 {{ui:thread.rod}} 與 {{ui:thread.bore}} 之間切換螺紋會保留其長度。螺帽與螺絲則從各自的標準尺寸開始。
- **{{ui:prop.quality}}：** 螺紋計算的精細程度。越高越精確，但越慢。

列印螺紋是另一個主題。列印大零件之前，先做一對螺絲與螺帽當測試，並依你的印表機調整間隙。

## 3D 列印用的螺紋

列印出來的螺紋需要在兩處留出空間，而兩者的作用不同：

- **直徑上的間隙（{{ui:prop.clearance}}）：** 讓螺帽變寬。螺絲兩側各有該值一半的空間，0.4 mm 時每側 0.2 mm。螺紋轉起來輕鬆，但螺絲會左右晃動。
- **沿軸向的間隙（{{ui:prop.axialClearance}}）：** 讓螺帽的螺牙變薄。螺絲未鎖緊時可以沿軸向前後移動這個量。它不會增加側向的空間。

兩者合起來形成牙面之間的縫隙：約為直徑間隙的 0.58 倍加上沿軸向的間隙。以 0.3 mm 的縫隙為例：以前得在直徑上留 0.5 mm，也就是每側 0.25 mm 的空間。現在直徑 0.2 mm（每側 0.1 mm）加上軸向 0.2 mm 就夠了，縫隙為 0.32 mm。

**需要知道的影響**

- **螺絲沿軸向有間隙。** 沒有負載時可以前後移動這個量。對扣件、蓋子與外殼無所謂；對需要精確定位的導螺桿就有影響，那裡要留小或設為 0。
- **螺帽的螺牙會變薄。** 螺距 1.75 mm 下取 0.3 mm，每顆螺牙在中段幾乎薄了三分之一，強度明顯下降。重載零件請改用較粗的螺紋。
- **計算量更大。** 螺牙形狀會多出額外的點，螺紋的三角形更多，計算稍久。
- **惠氏牙型在 STEP 匯出中沒有真正的圓弧。** 帶軸向間隙的 {{ui:thread.profileWhitworth}} 螺紋，在邊緣工具與 STEP 匯出中會變成由直線段拼成的螺牙形狀，而不是真正的圓弧。設為 0 時一切維持原樣。

**提示**

1. **先做一對測試件。** 一個螺絲加一個螺帽，各只有 4 到 6 mm 高，幾分鐘就能印完。並排列印三對間隙不同的零件，挑出轉得順又不晃的那一對。
2. **從常用數值開始。** 直徑間隙 0.2 到 0.3 mm、軸向間隙 0.2 mm。螺絲左右晃就降低直徑間隙；卡住就加大軸向間隙。如果不想用軸向間隙，就照舊在直徑上取 0.4 mm。
3. **軸向間隙至少應為一個層高。** 低於一層的量，印表機無法解析。層高 0.2 mm 時，0.2 mm 是不錯的起點；層高 0.1 mm 時，少一些就夠。
4. **螺絲與螺帽直立列印。** 軸線朝上，每一圈都落在完整的層裡，牙面才會漂亮。平放時牙面會下垂。
5. **細螺距很難印。** 螺距低於約 1 mm 時，螺紋圈常常黏在一起。較粗的螺紋，或牙頂平整的 {{ui:thread.profileTrapezoidal}} 牙型，比細 V 形螺紋更可靠。
6. **避開細薄牙尖。** V 形螺紋的牙尖很窄，印表機的噴嘴寬度幾乎蓋不到。{{ui:thread.profileTrapezoidal}} 與 {{ui:thread.profileRound}} 牙型的螺牙較平。
7. **去毛邊並磨合。** 最初幾圈常常很澀，因為列印殘留的小凸起卡在牙面上。來回轉幾次就會順。起牙處的倒角有助於鎖入。
8. **換印表機或線材。** 間隙取決於印表機、材料與噴嘴。更換任一項後請重新列印測試件。

邊緣工具會把螺紋當作精確實體。你可以在螺紋已就位的情況下，對承載它的零件倒角或倒圓，也可以處理螺絲頭的邊緣，參見[邊的修整與實體抽殼](chapter:edges-and-hollowing)。計算螺紋的邊需要一些時間：M6 幾秒鐘，G1/2 管螺紋約半分鐘。要斷開螺絲頭邊緣，最快的方法仍然是屬性裡的頭部倒角。

## 齒輪

{{ui:shape.gear}} 有 {{ui:gear.spur}}、{{ui:gear.helical}}、{{ui:gear.herringbone}} 與 {{ui:gear.bevel}}，以及 {{ui:gear.internal}} 與 {{ui:gear.rack}}（見下文）。新齒輪在 {{ui:prop.gearProfile}} 下為 {{ui:gear.profileInvolute}}：齒面為漸開線的齒，與齒輪產生器及工程上的用法一致。這種齒能平順地互相滾動。你設定 {{ui:prop.teeth}} 的齒數（6 到 500）與 {{ui:prop.gearModule}}，尺寸隨之決定：外徑為模數 ×（齒數 + 2），節圓為模數 × 齒數。新齒輪從模數 2 開始。兩個齒輪要嚙合，必須模數相同、{{ui:prop.gearPressureAngle}} 相同（通常為 20°），且中心距為（齒數 + 齒數）× 模數 / 2。同時選取兩個齒輪，屬性面板會給出該中心距以及目前實際的中心距。如果齒輪應該留在原位，它也會給出讓它們在該處嚙合的模數，{{ui:inspector.gearPairFitApply}} 一步就能讓兩個齒輪都採用該模數；各自的齒數、高度與中心孔維持不變。如果此時齒對齒而不是齒對齒槽，就把其中一個齒輪轉半個齒，也就是 180° 除以它的齒數。{{ui:prop.gearBacklash}} 會從齒上削去一點，避免列印出來的成對齒輪卡死。這個值針對整對齒輪，每個齒輪承擔一半；0.2 mm 是不錯的起點，0 則是精確的齒輪。基圓以下，齒面筆直向下延伸到齒根，不像刀具加工那樣有根切。這適合列印，但齒數低於約 17 的極小齒輪可能會在齒根處輕微摩擦。

斜齒輪多了 {{ui:prop.helixAngle}}。使用漸開線齒時，它是節圓上的真實螺旋角：兩個斜齒輪要嚙合，必須模數相同、角度相同，一個為正、一個為負。{{ui:gear.herringbone}} 是兩半旋向相反的斜齒輪：齒以同一方向上升到一半高度，再折返回來，像箭頭一樣。這對 3D 列印有兩個好處：齒輪會在軸上自行對正，而且沒有軸向推力，因為兩半的力相互抵消。相對地，斜齒輪會沿軸線向側面推。你像設定斜齒輪那樣設定 {{ui:prop.helixAngle}} 與 {{ui:prop.helixQuality}}；角度對每一半都適用。兩個人字齒輪要嚙合，必須模數相同、角度相同但符號相反，一個為正、一個為負。中間沒有銑削人字齒輪那樣的退刀槽：兩半無階差地相接。

傘齒輪採用漸開線齒，並讓齒往頂端逐漸變小。這是近似做法，不是精確計算出的傘齒輪對。

{{ui:gear.profileRound}} 是由圓弧構成的圓齒，類似 Tinkercad 的 Useful gear：齒頂與齒槽無稜角地相接。小齒輪這樣列印更寬容、轉動也更輕鬆，裝在旋鈕上時齒還帶來舒適的握感。圓齒同樣由 {{ui:prop.teeth}}、{{ui:prop.gearModule}} 與 {{ui:prop.gearBacklash}} 設定；它們沒有壓力角。圓齒比漸開線齒矮，所以外徑為模數 ×（齒數 + 1.2）。相同模數的圓齒輪可以嚙合，中心距與漸開線齒輪相同；但與漸開線齒輪配不起來。

{{ui:gear.profileSimple}} 是目前所有齒輪都用的直齒。在那裡手動設定 {{ui:prop.toothSize}} 與 {{ui:prop.toothWidth}}。舊設計會一直保留直齒，直到你更改齒形。三種齒形都有 {{ui:prop.centerHole}}。

{{ui:gear.internal}} 的齒朝內：一個讓較小齒輪在裡面運轉的齒圈，就像行星齒輪組的外環。它像漸開線或圓齒輪那樣，用 {{ui:prop.teeth}}、{{ui:prop.gearModule}} 與 {{ui:prop.gearBacklash}} 設定，另外還有 {{ui:prop.gearRim}}，即齒外側的輪緣。外徑為模數 ×（齒數 + 2.5）加上兩倍輪緣；圓齒則為模數 ×（齒數 + 1.7）。相同模數的齒輪要在其中運轉，中心必須位於距齒圈中心（齒圈齒數 − 其齒數）× 模數 / 2 處；同時選取兩者，屬性面板會給出該距離。行星齒輪組中，齒圈齒數 = 太陽齒輪齒數 + 2 × 行星齒輪齒數，例如 30 = 12 + 2 × 9。齒圈沒有中心孔，它本身就是環。齒數介於 26 到 33 時，齒頂最多短四分之一模數，因為否則基圓處會形成極小的邊；嚙合不受影響。

{{ui:gear.rack}} 是半徑無窮大的齒輪：一根單側帶齒的條，使用漸開線齒時齒面是壓力角下的直線。寬度（沿 X）為齒數 × 齒距，齒距為 π × 模數，所以同模數的齒條可以首尾相接，每一端都落在齒槽中。長度（沿 Y）是齒條的厚度，可自由設定，只要齒與半公釐的條身放得下。齒朝前，即朝向主視圖的觀察者；視需要轉動齒條。相同模數的齒輪要在其上滾動，中心必須位於節線前方齒數 × 模數 / 2 處；節線在齒頂後方一個模數處，圓齒則為 0.6 個模數。齒圈與齒條有漸開線齒與圓齒兩種，沒有簡單齒；切換齒輪類型會保留模數。

邊緣工具與 STEP 匯出會把每個齒輪當作精確實體，漸開線齒面為平滑曲線。橢圓形輪廓上的斜齒輪仍是三角形網格，從約 31 齒起的漸開線斜齒輪也一樣。人字齒輪在這兩種情況下同樣仍是三角形網格。小齒限制了邊能倒圓的程度：簡單齒的齒輪直徑 30 mm、12 齒時，兩齒之間齒根處的平面只有約 0.65 mm 寬，所以全邊倒圓最多約 0.5 mm；傘齒輪頂端更小，最多約 0.4 mm。斜齒輪和人字齒輪的齒是傾斜的，會讓那個平面在斜邊上變窄：螺旋角相對齒輪高度越大，能容納的圓角越小。兩個平端面的邊可以倒圓，但只對這些邊倒角會在 CAD 核心中失敗；請改為倒圓，或以較小尺寸（例如 0.2 mm）對所有邊一起倒角。漸開線齒、螺旋角約 15 度以上（預設即如此）的人字齒輪不能一次對所有邊倒圓或倒角；請分別對兩端或兩半相接處的邊倒圓。

## 彈簧

{{ui:shape.spring}} 有 {{ui:prop.turns}} 與 {{ui:prop.wire}}。它們連同高度一起決定彈簧的軟硬。{{ui:prop.springHand}} 決定線材的旋向：{{ui:spring.right}} 就像常見的壓縮彈簧，或 {{ui:spring.left}}。

邊緣工具與 STEP 匯出會把彈簧當作精確實體：沿螺旋線的圓線材，兩端切平。例如你可以對這兩個線材端頭倒圓或倒角。

在{{ui:prop.springForm}}中可把彈簧改為{{ui:spring.flat}}：一條在底板上呈波浪延伸、在自身平面內彈性變形的帶子，平放列印。{{ui:prop.springPattern}}可選{{ui:spring.round}}、{{ui:spring.zigzag}}或{{ui:spring.square}}，{{ui:prop.springEnds}}可選帶孔的{{ui:spring.eye}}、橫跨帶子的{{ui:spring.tab}}或{{ui:spring.none}}。{{ui:prop.bends}}和{{ui:prop.band}}決定它有多軟；長度是彈簧的長度，寬度是波浪的幅度，高度是列印厚度。扁平彈簧同樣是精確實體。

## 彎管

一個 {{ui:shape.bentTube}} 最多由十二段組成：一段直管，接著一個彎。每一段你設定 {{ui:prop.bentTubeSegmentLength}}、{{ui:prop.bentTubeBendAngle}}、{{ui:prop.bentTubeBendRadius}} 與 {{ui:prop.bentTubeRoll}}。正在編輯的那一段會以橘色亮起，方便你掌握順序。滾轉角為 0° 時在工作平面內彎曲，90° 時管子向上彎。輪廓可以是圓形、方形、六邊形或八邊形，內部同樣如此，也可以完全實心。如果管子撞到自己，layerling 會警告你。

## 放樣

{{ui:shape.loft}} 把底部的一個輪廓接到頂部的另一個輪廓，就像 Fusion 的放樣：從一種直徑接到另一種直徑的軟管接頭、把方形風扇接到圓管上、向上逐漸變圓的支架。每一端你選擇 {{ui:prop.loftBottomOutline}} 與 {{ui:prop.loftTopOutline}}：{{ui:loft.round}}、帶 {{ui:prop.loftBottomCorner}} 的 {{ui:loft.rectangle}}，或帶角數的 {{ui:loft.polygon}}，再加上每一端的寬度、長度與高度。{{ui:prop.loftOffsetX}} 與 {{ui:prop.loftOffsetZ}} 把頂端向側面移動，做出傾斜過渡；底端留在原處。

{{ui:prop.loftWall}} 把實體變成上下開口的管。兩端開口的橫向尺寸都比外形小一個壁厚；壁面傾斜處會略薄一些。把框架拖大，兩端也跟著變大，而圓角半徑與壁厚維持不變。

{{ui:prop.loftSmooth}} 讓過渡變得平滑。為 0 時，側面從底部到頂部筆直延伸，像圓錐一樣。為 100 時，兩端先筆直向上，再以 S 曲線在中間改變尺寸：軟管接頭從窄管平滑地擴張到寬管，而不是像漏斗那樣斜張。中間的數值在兩者之間混合。平滑過渡可與 {{ui:prop.loftWall}}、扭轉、傾斜及側向偏移一起使用；帶壁的管兩端仍保持開口。它和直邊放樣一樣是精確實體，因此邊可以倒角與倒圓，但它由多個斷面構成，計算會稍久。

{{ui:prop.loftTwist}} 在上升過程中讓斷面繞垂直軸均勻旋轉，任一方向最多 360°；側面於是盤旋而上。{{ui:prop.loftTiltX}} 與 {{ui:prop.loftTiltZ}} 讓頂端傾斜，最多 45°：正值會抬高其前緣或右側。中間的斷面依比例傾斜，所以壁面平順地接到斜面上。最高點維持在設定高度。如果之後高度變得太小，傾斜端會伸到平台下方，傾斜就會退讓到剛好放得下。沿路徑彎曲（例如管彎頭）不是放樣能做到的。

放樣是精確實體，扭轉與傾斜後也是：邊可以倒角與倒圓，STEP 匯出也會保留。照常加上帶螺絲孔的法蘭再群組。

## Gridfinity

{{ui:shape.gridfinity}} 形狀用來製作 Zack Freedman 的開放式收納系統零件：42 mm 網格上的收納盒，可放在底板裡，也能彼此堆疊。尺寸遵循公開的 Gridfinity 規格，所以 layerling 做的收納盒能裝進其他產生器做的底板，反之亦然。在 {{ui:prop.gridfinityType}} 下選擇：

- **{{ui:gridfinity.bin}}：** 每個網格單元下方都有支腳的收納盒。{{ui:prop.gridfinityUnitsX}} 與 {{ui:prop.gridfinityUnitsZ}} 以 42 mm 的網格單元計數（收納盒小 0.5 mm，一個單元為 41.5 mm）；{{ui:prop.gridfinityUnitsY}} 以 7 mm 的高度單元計數，最多 20。壁頂的 {{ui:prop.gridfinityLip}} 托住下一個收納盒的支腳，並使收納盒增高 4.4 mm：3 單元帶唇緣的收納盒高 25.4 mm。啟用 {{ui:prop.gridfinityMagnets}} 後，每個支腳的每個角都會有一個 6 × 2 mm 磁鐵孔。
- **{{ui:gridfinity.baseplate}}：** 收納盒所站的底板，高 5 mm，每個網格單元有一個插槽。它是沒有底面、沒有磁鐵孔的開放框架。
- **{{ui:gridfinity.tray}}：** 任意尺寸的平底托盤，用於桌遊收納與不需要網格的零件。{{ui:prop.length}}、{{ui:prop.width}} 與 {{ui:prop.height}} 可以自由設定（mm）：長寬 10 到 252 mm，高 3 到 140 mm。它沒有底腳、堆疊唇緣與磁鐵孔，因此不能放進底板，也不能堆疊；它的四角與收納盒一樣，按 3.75 mm 半徑倒圓。下文關於收納盒內部的內容同樣適用於托盤：底面厚 1.2 mm，可以設定；隔板與標籤台一直延伸到頂端；它們與取物口在任何留有空間的高度都可以使用；隔間數量以每個至少 6 mm 寬為限，每邊最多 24 個，總共最多 40 個。收納盒改為托盤時保持尺寸，底板改為托盤時高 20 mm，托盤改回收納盒或底板時取整到整網格單元；在 {{ui:workspace.title}} 的 {{ui:workspace.shapeDefaults}} 中把類型設為 {{ui:gridfinity.tray}} 時，新托盤起始為寬 80 mm、長 40 mm、高 20 mm。

收納盒與底板的尺寸一律是整數網格單元（或下文半尺寸網格的 21 mm 格），最大 6 × 6（252 mm，可放進 256 mm 的列印平台）；拖曳把手會吸附到最近的單元。壁厚（0.95 mm）、底面（1.2 mm）與磁鐵孔深度（2.4 mm）不在規格內；孔深固定，壁厚可以設定，底面則可以抬高（見下文）。規格中的 M3 螺絲孔不會做出。唇緣頂端是尖的，與規格的畫法一致；如果你的印表機打出來有毛邊，用邊緣工具倒圓或倒角。收納盒、底板與托盤是精確實體，所以倒圓、倒角與 STEP 匯出都能用。要分隔收納盒，可把薄長方體當作隔牆群組進去：讓它們立在底面上，即高 5.95 mm 處（或抬高的底面上）；帶唇緣的收納盒，頂端至少保持在每個高度單元 7 mm 下方 0.5 mm，從收納盒底面量起（3 單元為 20.5 mm），因為下一個收納盒的支腳會向下伸入收納盒 0.35 mm。列印收納盒與底板時不需支撐，依它們在列印平台上的姿態直立列印。

收納盒也可以做在半尺寸網格上：開啟 {{ui:prop.gridfinityHalfGrid}}，此時 {{ui:prop.gridfinityUnitsX}} 與 {{ui:prop.gridfinityUnitsZ}} 以 21 mm 的格計數，最多 12（與 6 單元相同的 251.5 mm）。每個格都有自己的支腳，頂部寬 20.5 mm，帶有規格中的階梯，四個這樣的支腳站在普通底板的一個插槽裡，所以 1½ 或 2½ 單元的收納盒能與整數單元的並排使用。開啟 {{ui:prop.gridfinityHalfGrid}} 時，收納盒保持其輪廓（2 單元變成 4 格）；關閉時，奇數格會向上取整為整數單元。唇緣照舊跟隨收納盒的輪廓。啟用 {{ui:prop.gridfinityMagnets}} 後，每個支腳得到一個孔，從其中點朝位於 42 mm 網格上的那個格子角落，兩個方向各偏移 2.5 mm，從收納盒左後角算起：當這個角位於網格角上時，這些孔會與其他產生器所做、帶磁鐵的底板孔對齊；奇數格的收納盒還可以轉 180°，讓這個角位於右前方的網格角上。底板仍維持 42 mm 網格。半尺寸網格不屬於規格。

高度 3 單元以上的收納盒，可以沿內壁設定標籤架：以任意組合開啟 {{ui:prop.gridfinityLabelBack}}、{{ui:prop.gridfinityLabelFront}}、{{ui:prop.gridfinityLabelLeft}} 或 {{ui:prop.gridfinityLabelRight}}。每個開啟的標籤架都有自己的 {{ui:prop.gridfinityLabelWidth}}、{{ui:prop.gridfinityLabelLength}}，較短的標籤架還有 {{ui:prop.gridfinityLabelOffset}}；下方的角落設定套用於全部。標籤架頂面平整可貼標籤，前緣有 1.2 mm 的下垂條，底面以 36 度上升。其頂端在每個高度單元 7 mm 下方 0.85 mm，從收納盒底面量起（3 單元為 20.15 mm），所以疊在唇緣上的收納盒支腳會與它保持 0.5 mm 的間隙。低於 3 單元的收納盒不顯示標籤架；回到 3 單元時會回復。標籤架不屬於規格。

{{ui:prop.gridfinityLabelWidth}} 是標籤架伸入收納盒的深度：14 mm，3 單元的收納盒最多 17.2 mm（抬高底面時更少）；1 單元深、2 mm 圓角的收納盒中，兩個相對的標籤架為 16.8 mm。{{ui:prop.gridfinityLabelLength}} 為 0 時，標籤架從一面牆延伸到另一面牆。較短的標籤架至少 10 mm，會顯示 {{ui:prop.gridfinityLabelOffset}}，把它從所在牆的中央移開：在主視圖所示的前牆與後牆上向右移，在側牆上向前移。如果一端距牆在 1 mm 以內（帶堆疊唇緣時為 1.8 mm，因為唇緣的支撐在那裡向內傾斜），或停在該牆的標籤架上，就會繼續延伸進去；兩個在角落相遇的標籤架會合而為一。當標籤架與牆或另一個標籤架相接且空間足夠時，角落會倒圓或倒角：在 {{ui:prop.gridfinityLabelCorner}} 下選擇 {{ui:gridfinity.labelRound}} 或 {{ui:gridfinity.labelChamfer}}，並用 {{ui:prop.gridfinityLabelCornerSize}} 設定尺寸（2 mm；0 保持尖銳）。選擇 {{ui:gridfinity.labelRound}} 時，較短標籤架的自由端前角也會倒圓，尺寸相同，但最多為標籤架寬度的一半。

收納盒也可以沿任一內壁設定取物口，讓小零件能沿曲面被推出來，而不必在底面與牆相接處摳出來：以任意組合開啟 {{ui:prop.gridfinityScoopBack}}、{{ui:prop.gridfinityScoopFront}}、{{ui:prop.gridfinityScoopLeft}} 或 {{ui:prop.gridfinityScoopRight}}。底面沿四分之一圓升入牆內，從一面牆延伸到另一面牆，相鄰牆上的兩個取物口在角落相接。帶取物口的收納盒，每條底面邊也會按 2.8 mm（內角半徑）倒圓，取物口就是所在牆上這處圓角的放大。一旦開啟取物口，開關下方會出現 {{ui:prop.gridfinityScoopRadius}}，並套用於所有取物口：在你設定之前，它的值是從底面到唇緣支撐離開牆面處這段高度的一半（該處位於每個高度單元 7 mm 下方 1.65 mm，從收納盒底面量起）；沒有唇緣的收納盒則以頂部為上限（帶唇緣的 3 單元收納盒為 6.7 mm，抬高底面時更少）。它至少為 3.5 mm，並至少比該高度小 0.5 mm；在收納盒橫向至少留下 2 mm 的底面，不論是兩個相對的取物口之間，或取物口與其對面的牆之間。1 單元高的收納盒沒有空間做取物口，也不顯示相關開關；到 2 單元時會回復。取物口同樣不屬於規格。

收納盒也可以有抬高的底面，當作可切出形狀的實心坯料：{{ui:prop.gridfinityFloorHeight}} 設定底面的高度，從收納盒底面量起（在你設定之前為 5.95 mm，即支腳上的 1.2 mm 底面），收納盒到該高度為止都是實心。帶唇緣時，它最多升到唇緣支撐離開牆面處，即每個高度單元 7 mm 下方 1.65 mm（3 單元為 19.35 mm），這樣唇緣保持完整，疊在其上的收納盒支腳也保有 1.3 mm 的間隙；沒有唇緣時可升到頂部，收納盒成為實心塊。把工具形狀的孔群組進去，深度依需要而定。取物口從抬高的底面開始，標籤架伸入收納盒的深度會減少，使其底面仍止於底面之上；一旦底面讓它們沒有空間，相關開關就會消失（帶唇緣的 3 單元收納盒中，取物口高於 15.35 mm 時消失，標籤架高於 15.54 mm 時消失），降低底面後又會回復。帶唇緣、壁厚不超過 1.6 mm 的 1 單元高收納盒沒有空間抬高底面，也不顯示該欄位。抬高底面同樣不屬於規格。

收納盒也可以分隔成隔間，而不必把隔牆群組進去：在 {{ui:inspector.gridfinityCompartments}} 下，就在 {{ui:inspector.properties}} 下方，{{ui:prop.gridfinityCompartmentsX}} 與 {{ui:prop.gridfinityCompartmentsZ}} 設定數量，每個方向每個網格單元最多 4 個（半尺寸網格的每格 2 個），總共最多 40 個。隔板貫穿整個高度，從底面（或抬高的底面）一直到每個高度單元 7 mm 下方 0.85 mm 處，標籤架也止於那裡，所以疊在唇緣上的收納盒照常安放。隔板要求收納盒至少有 2 個高度單元，且底面至少低於其頂部 3 mm；空間不足時，收納盒會在不做隔板的情況下建構，等又有空間時再回復。{{ui:prop.gridfinityDividerThickness}} 在設定前為 1.2 mm，範圍 0.8 到 3 mm。隔板初始均勻分布。要移動某一塊，在 {{ui:prop.gridfinityDividerAcross}} 或 {{ui:prop.gridfinityDividerDeep}} 下選取它（從左或從後計數），並設定其 {{ui:prop.gridfinityDividerPosition}}，從左牆或後牆內側量到隔板中央；每個隔間至少保持 6 mm 寬。一旦移動過隔板，調整收納盒尺寸時，該方向的隔板會以公釐為單位保持位置；重新設定隔間數量會讓該方向的隔板再次均勻分布。每個隔間都有收納盒的內角，按 2.8 mm 倒圓，其底面邊也按 2.8 mm 倒圓，無論有沒有取物口。取物口會在每個隔間重複：後牆有取物口時，每個隔間的後側都有一個，靠著牆或隔板。在狹窄的隔間裡，半徑會縮小，以留下 2 mm 平的底面；若隔間窄到連 3.5 mm 都放不下，該方向的取物口就會消失；{{ui:prop.gridfinityScoopRadius}} 下方的說明會指出這一點。隔板同樣不屬於規格。

帶隔板的收納盒可以在每個隔間裡設定標籤架，而不是沿牆的標籤架：沿牆的標籤架是給沒有隔間的收納盒用的，當收納盒回到單一隔間時，那些開關會回復。在高度 3 單元以上的收納盒中，用 {{ui:prop.gridfinityCompartmentRow}} 與 {{ui:prop.gridfinityCompartmentColumn}} 選擇隔間（各在隔間數多於一個時顯示），並在 {{ui:prop.gridfinityCompartmentLabel}} 下選擇標籤架所靠的一側，即收納盒的牆或某塊隔板；只有當該側的標籤架仍能讓隔間保持開口時，才會提供這一側。{{ui:prop.gridfinityCompartmentLabelLength}} 的範圍是 10 到 100；若標籤架會短於 4 mm 就不做，並在其下方加註說明。較短的標籤架會顯示 {{ui:prop.gridfinityLabelOffset}}：在後側或前側時為 {{ui:gridfinity.alignLeft}}、{{ui:gridfinity.alignMiddle}} 或 {{ui:gridfinity.alignRight}}；在左側或右側時為 {{ui:gridfinity.alignBack}}、{{ui:gridfinity.alignMiddle}} 或 {{ui:gridfinity.alignFront}}。{{ui:prop.gridfinityLabelWidth}} 在設定前為 14 mm，狹窄隔間中更小；標籤架絕不會伸到把隔間封死：前方至少保持 6 mm 開口。這些標籤架的斷面與沿牆的標籤架相同，{{ui:inspector.properties}} 下的 {{ui:prop.gridfinityLabelCorner}} 與 {{ui:prop.gridfinityLabelCornerSize}} 也套用於它們。

## 鉸鏈

{{ui:shape.hinge}} 一次列印成型，之後可以活動（列印即組裝）：兩片葉片平攤在平台上，中間沿同一軸線交替排列鉸鏈節。銷屬於後片，並帶間隙穿過前片的鉸鏈節。你設定 {{ui:prop.hingeLength}}、{{ui:prop.hingeOpenWidth}} 與 {{ui:prop.hingeKnuckleDiameter}}，還有 {{ui:prop.hingeKnuckles}} 的數量（奇數，讓銷兩端都被固定）、{{ui:prop.hingePinDiameter}} 與 {{ui:prop.hingeLeafThickness}}。

{{ui:prop.hingeClearance}} 是活動零件之間的間隙：銷周圍、鉸鏈節之間，以及葉片前方。0.4 mm 時，調校良好的印表機通常輕輕一扭就能鬆開；如果零件黏在一起就加大，晃得太厲害就減小。依平台上呈現的姿態平放列印鉸鏈，不要支撐。如果你偏好用自己的銷，例如一段線材或鐵絲，在小鉸鏈上它比列印的銷更光滑，就開啟 {{ui:prop.hingePinless}}：列印的銷會被略去，孔徑等於銷直徑加間隙，貫穿每個鉸鏈節，包括兩端。用 {{ui:prop.hingeAngle}} 讓第二片繞銷折起，把鉸鏈擺成設計中的姿態：0° 平躺如列印時，180° 為閉合。鉸鏈節維持原位，鉸鏈仍是一體；就地列印前記得設回 0°。你可以給葉片加孔，或把它們群組進更大的零件，例如蓋子。

鉸鏈也可以做成{{ui:hinge.styleCone}}（在{{ui:prop.hingeStyle}}下）：每隔一個關節的兩端是圓錐，嵌入相鄰關節的錐形凹坑。沒有銷，也沒有可能下垂的長懸空橋，所以可以平放列印；圓錐為 45°。和其他樣式一樣，它是精確實體，因此倒角和圓角對它有效，STEP 匯出包含它真正的圓錐；關節對圓錐來說太短時，會做得更少。除了關節數量，也可以指定{{ui:prop.hingeKnuckleWidth}}：關節不會比它更寬，數量由長度決定；輸入關節數量會取消寬度。

{{ui:prop.hingeStyle}}有三個選項：{{ui:hinge.stylePin}}、{{ui:prop.hingePinless}}（為自備銷留的孔）和{{ui:hinge.styleCone}}。選圓錐時，{{ui:prop.hingeConeSize}}決定圓錐從關節長出處的大小；圓錐越大越牢固，預設取能放下的最大值。帶圓錐的鉸鏈沒有銷也沒有孔，所以它的翼板可以和整個關節一樣厚：把{{ui:prop.hingeLeafThickness}}設為關節直徑，翼板就與關節齊平；這樣的鉸鏈最多開啟約 90°，因為厚翼板會相碰。

## 彈性關節（Flexi）

{{ui:editor.tool.flexi}} 把一個扁平的實體變成可以活動的小玩偶，例如魚、蛇或龍，一次列印成型（print-in-place）。實體由你自己畫或搭建，例如用草圖或擠出的 SVG。工具沿實體長度橫向把它切成若干節，並在每個切口處加一個關節：一節帶著一根直立的軸，中間比上下兩端粗，下一節帶間隙地把它包住。這樣關節既能卡住又不會黏連，所有斜面都是 45°，不需支撐即可列印。各節之間留出一道楔形缺口，寬度對應各節向兩側擺動的角度。

選取實體（多個部件會合併，其中的孔會被減去），按下 {{ui:editor.tool.flexi}}。在視窗中設定沿哪一邊切分（{{ui:flexi.axis.auto}} 取較長的一邊）、{{ui:flexi.joints}} 的數量、{{ui:flexi.clearance}}（一般 0.4 mm 即可）以及 {{ui:flexi.swing}} 的角度。關節大小會依實體自動決定；取消 {{ui:flexi.autoSize}} 後可自己填寫 {{ui:flexi.size}}。取消 {{ui:flexi.evenLinks}} 後可以設定第一個關節離起點、最後一個離終點的距離，例如讓頭部保持為一整塊。關節所在處，實體至少應約 6 mm 高、12 mm 寬；放不下時，視窗會告訴你是哪一個。

結果是一組關節節段（網格）的組合，照擺放的樣子直接列印。如果不滿意切分，復原後換別的數值再試。先用兩三個關節試印一次，就能看出間隙是否適合你的印表機。

## 滾花

{{ui:shape.knurl}} 是四周佈滿溝槽的圓形握持面，用於旋鈕、撥輪與工具握把。在 {{ui:prop.knurlPattern}} 下選擇 {{ui:knurl.straight}}（沿軸線的溝槽，像控制旋鈕）、{{ui:knurl.diamond}}（兩排斜向溝槽交叉成小菱形），或 {{ui:knurl.round}}（沿軸線的溝槽與凸脊形成柔和的圓弧波浪，握感舒適而沒有銳利稜線）。圓弧溝槽保持淺於半個節距，否則凸脊會在根部鼓起；深度過大會自動退讓。你設定 {{ui:prop.diameter}} 與 {{ui:prop.height}}、{{ui:prop.knurlCount}} 的數量與 {{ui:prop.knurlDepth}}；交叉滾花還要設定相對軸線的 {{ui:prop.knurlAngle}}。{{ui:prop.knurlChamfer}} 以 45 度切開兩端，像車削的旋鈕；0 則保持尖銳。

直紋與圓弧滾花是精確實體，所以邊可以斷開與倒圓。交叉滾花仍是網格，因為當作精確實體時，30 條溝槽要計算將近一分鐘。要給軸上的旋鈕用，把滾花與一個孔群組，例如設為螺紋孔的 {{ui:shape.thread}}。淺於 0.4 mm 的溝槽幾乎沒有印表機能乾淨印出，而且 layerling 不會讓它們沿握持面間隔小於 0.8 mm：細的握持面得到的溝槽更少。

## 燕尾

{{ui:shape.dovetail}} 是一種兩個零件相互扣住、只能從側面滑入的接頭。你設定寬端的寬度、{{ui:prop.dovetailNeckWidth}} 與燕尾的長度。為另一側複製燕尾，並把副本設為孔：{{ui:prop.dovetailClearance}} 就會給出一點間隙，讓接頭列印後不會卡死。

> **提示：** 群組時，螺紋孔會切入與它重疊的零件。所以把它稍微放進材料裡，而不是只貼著表面。

## 淚滴孔

側放的孔列印時頂部會形成橋接，而橋接會下垂。因此 {{ui:shape.teardrop}} 頂部有一個尖點：每一層都支撐在下一層上，孔不需支撐就能印得夠圓。把 {{ui:prop.teardropDiameter}} 設為孔的尺寸，M3 螺絲約 3.4 mm，並讓 {{ui:prop.teardropLength}} 長到足以穿透零件。{{ui:prop.teardropTipAngle}} 為 90°，所以兩側在 45° 相接。大多數印表機都能乾淨處理；尖端越平需要越多高度，越陡則越省高度。

把淚滴孔設為孔，並與零件群組。其長度沿深度方向，尖端朝上。要在另一個方向開孔，就讓它繞垂直軸旋轉 90°。

側放的**螺紋孔**同樣會在頂部下垂。給它配一個自己的淚滴孔：新增一個 {{ui:shape.teardrop}} 孔，其 {{ui:prop.teardropDiameter}} 為螺紋芯部，即螺牙讓出的直徑（M10 約 8.4 mm），長度與螺紋孔相同，然後同時選取兩者。點擊 {{ui:editor.tool.align}}，讓它們在中央對齊——淚滴孔的中心是其圓部的中心，而不是含尖端外框的中心，所以兩個圓彼此重合——再把兩者與零件群組。螺紋照常切出，尖端打開孔的頂部，因此不需支撐即可列印。

## 接頭開孔

電子產品外殼需要為線材留開孔。{{ui:shape.port}} 就是這種開孔：一個橫放、帶圓角的挖空體。在 {{ui:prop.portPreset}} 中選擇接頭（{{ui:port.usbC}}、{{ui:port.microUsb}} 或 {{ui:port.usbA}}），它就會取得該接頭的尺寸，並在每邊多留約 0.25 mm 間隙。{{ui:port.usbCPlug}} 用於裝在壁後方的接頭，插頭外殼需要伸進來。寬度、高度和 {{ui:prop.portCorner}} 都可以手動修改，此時清單會顯示 {{ui:port.custom}}。{{ui:port.hdmi}}、{{ui:port.miniHdmi}}、{{ui:port.displayPort}} 和 {{ui:port.miniDisplayPort}} 像接頭本身一樣把下方的角斜切掉，DisplayPort 只切左下角；{{ui:port.rj45}} 適用於網路接頭。這些尺寸來自廠商建議的面板開孔和 VESA 圖紙。

它預設為挖空體，朝向前方。把 {{ui:prop.portDepth}} 設得比壁厚稍大，移到電路板上接頭所在的位置，再與外殼組合。用於側壁時，繞垂直軸旋轉 90°。

## 沉頭孔與錐形沉頭孔

螺絲頭常常不該凸出。{{ui:shape.counterbore}} 為內六角螺絲（DIN 912）切出圓形沉頭孔，{{ui:shape.countersink}} 為沉頭螺絲（DIN 7991）切出錐形沉頭孔。兩者都以頭部一端朝上：{{ui:prop.screwHoleHead}} 是沉頭孔或錐面的直徑，{{ui:prop.screwHoleShaft}} 是其下方的孔，{{ui:prop.screwHoleLength}} 是總長度。沉頭孔上你設定 {{ui:prop.screwHoleHeadDepth}}，錐形沉頭孔上設定 {{ui:prop.screwHoleAngle}}（90° 適合沉頭螺絲）。預設值適合 M3 螺絲。

{{ui:shape.doubleCountersink}} 是兩面都倒角的孔，用於正面與背面都要整潔的板件。它在形狀庫裡沒有獨立項目：取用 {{ui:shape.countersink}}，並在其屬性中開啟 {{ui:prop.screwHoleBothSides}}（本身就是雙面錐形沉頭孔的實體已顯示該開關開啟）：兩端各有一個錐面張開到 {{ui:prop.screwHoleHead}}，中間是 {{ui:prop.screwHoleShaft}}。你照舊設定 {{ui:prop.screwHoleAngle}} 與 {{ui:prop.screwHoleLength}}。如果孔太短，容不下兩個完整的錐面，它們會以該角度在中央相接，桿部會比你設定的更寬：10 mm 的頭部、6 mm 的桿部、90° 與 2 mm 的長度，會形成兩個從 10 mm 收窄到 8 mm 的錐面。作為孔，它像其他孔一樣被推穿零件。

把形狀設為孔，並與零件群組。讓它的頂端略高於頭部應貼合的表面，使沉頭孔開口乾淨。要為六角螺帽做沉頭孔，就用六邊的 {{ui:shape.polygon}} 當作孔。
