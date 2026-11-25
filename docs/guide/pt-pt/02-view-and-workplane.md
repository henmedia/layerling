---
title: Vista e plano de trabalho
summary: Navegar pela cena, observar de frente e colocar novas formas em qualquer superfície.
---

## Navegar pela cena

Com o rato:

| Ação | Resultado |
| --- | --- |
| arrastar com o botão direito | roda a vista |
| clicar com o botão direito | sobre um sólido, abre um menu com os comandos mais usados: duplicar, forma de corte ou sólido, agrupar, ocultar, bloquear, eliminar e outros; num espaço vazio, permite colar e selecionar tudo |
| arrastar com o botão do meio | desloca a vista |
| rodar a roda do rato | aproxima ou afasta a vista |
| manter [[Ctrl]] / [[Cmd]] premido e arrastar com o botão esquerdo | também desloca a vista (num trackpad de MacBook: manter [[Cmd]] premido, pressionar e arrastar); num Mac, manter Control premido roda a vista, pois Control + clique equivale ao botão direito do rato |
| fazer duplo clique numa zona vazia do plano de trabalho ou ao lado da base | centra a vista nesse ponto; a vista passa a rodar em torno dele |

A velocidade de zoom da roda é definida com {{ui:workspace.zoomSpeed}}, nas definições, em {{ui:workspace.controls}}: um controlo deslizante de 1 a 14, com o valor inicial de 5. Esta definição aplica-se apenas à roda e ao trackpad: os botões e as teclas [[+]] e [[−]] alteram sempre o zoom nos mesmos pequenos incrementos. Cada passo da roda do rato produz o mesmo zoom em todos os navegadores; no trackpad, o zoom depende da distância percorrida pelo dedo. Logo abaixo, {{ui:workspace.panSpeed}} define a velocidade com que a vista acompanha o rato ao deslocá-la, num controlo deslizante de 1 a 9: com o valor inicial de 5, o ponto que agarras mantém-se sob o cursor.

**Botões do rato como no teu programa de preparação da impressão.** Se estás habituado ao Bambu Studio ou ao OrcaSlicer, escolhe {{ui:workspace.mouseSchemeSlicer}} em {{ui:workspace.mouseScheme}}, nas definições, em {{ui:workspace.controls}}. Assim, arrastar com o botão esquerdo num espaço vazio roda a vista, o botão direito desloca-a tal como o botão do meio e manter Shift premido enquanto arrastas com o botão esquerdo desenha a caixa de seleção. Arrastar um sólido continua a movê-lo e um clique breve com o botão direito continua a abrir o menu. Num esboço, o botão direito também desloca a vista.

**Rato 3D.** Um SpaceMouse ou outro rato 3D permite rodar, deslocar e alterar o zoom da vista 3D: empurra o manípulo para a frente para aproximar, desloca-o lateralmente para mover a vista, inclina-o para inclinar a vista e roda-o sobre si próprio para rodar a vista. Nas definições, em {{ui:workspace.controls}}, clica em {{ui:workspace.spaceMouseConnect}} e escolhe o dispositivo na janela aberta pelo navegador; a escolha fica memorizada, pelo que só é necessário fazê-lo uma vez. Esta funcionalidade funciona no Chrome e no Edge, que conseguem aceder a estes dispositivos; o Firefox e o Safari não conseguem. Se algum movimento parecer invertido, assinala a respetiva opção por baixo do botão: deslocamento lateral, deslocamento vertical, zoom, inclinação ou rotação. Alguns ratos 3D também são reconhecidos pelo navegador como comandos de jogo; nesse caso, o layerling deteta-os automaticamente assim que moves o manípulo, sem ser necessário clicar em {{ui:workspace.spaceMouseConnect}} após reiniciar. Um rato usado como comando de jogo guarda as direções marcadas à parte das que valem depois de {{ui:workspace.spaceMouseConnect}}, porque alguns dispositivos funcionam aí ao contrário; uma linha por baixo das caixas indica quando o rato é lido desse modo.

Num tablet ou telemóvel, usa dois dedos para aproximar ou afastar a vista (afastando-os ou juntando-os) e para a deslocar (deslizando-os em conjunto). Um dedo num espaço vazio roda a vista e um toque nesse espaço limpa a seleção; sobre uma forma ou um controlo, atua no projeto, tal como o botão esquerdo do rato. Para rodar a vista mesmo quando o movimento do dedo começa sobre uma forma, ativa {{ui:camera.touchRotate}} na barra de vistas. Esta opção aparece nos dispositivos com ecrã tátil.

Uma mesa digitalizadora com caneta funciona como um rato: a ponta corresponde ao botão esquerdo e o botão lateral da caneta ao direito, permitindo rodar a vista e abrir o menu. Os botões de atalho da mesa podem ser configurados no respetivo controlador para os [atalhos de teclado](chapter:shortcuts) do layerling.

**Num tablet, usa uma caneta digital se possível.** A ponta é muito mais fina do que a de um dedo e não tapa aquilo em que pretendes tocar. Assim, consegues selecionar com precisão pontos pequenos, linhas finas e controlos num esboço, bem como pontos de medição e arestas, e trabalhar durante mais tempo com menos esforço. O layerling já permite selecionar pontos, linhas, controlos e arestas com o dedo a uma distância ligeiramente maior do que com o ponteiro do rato, mas uma caneta digital continua a ser mais precisa. Isto aplica-se às canetas que o tablet reconhece como tal, como a S Pen ou o Apple Pencil. Uma caneta simples com ponta de borracha é reconhecida pelo ecrã como um dedo e não oferece maior precisão.

Num tablet não existe botão direito do rato: mantém um dedo imóvel sobre uma forma ou num espaço vazio durante meio segundo para abrir o mesmo menu, que inclui {{ui:contextMenu.selectAll}} quando aberto num espaço vazio. A opção {{ui:contextMenu.selectMultiple}}, no mesmo menu, substitui a tecla Shift num tablet: cada toque num sólido acrescenta-o à seleção ou retira-o dela, até tocares num espaço vazio ou premires [[Esc]]; arrastar um dedo num espaço vazio continua a rodar a vista. Os controlos à volta de uma forma selecionada podem ser agarrados com o dedo mesmo tocando ligeiramente ao lado deles.

### O cubo de vistas

O cubo no canto superior esquerdo indica a direção de observação. Clicar numa das suas faces muda diretamente para a vista de cima, de baixo, de frente, de trás, da esquerda ou da direita. Clicar num vértice do cubo mostra o modelo na diagonal a partir desse vértice; clicar junto a uma aresta mostra-o a partir dessa aresta, entre duas faces. A zona fica realçada enquanto o ponteiro está sobre ela. As teclas numéricas [[1]] a [[6]] também permitem aceder às vistas alinhadas com as faces. Se mantiveres [[Shift]] premido ao usá-las, a vista também enquadra a seleção, tal como [[Shift]]+[[F]].

Arrasta o cubo para rodar a vista, tal como ao arrastar com o botão direito do rato. Quando não há nada selecionado, as teclas de seta também rodam a vista: 15° por toque ou 90° com [[Shift]]. Rodam o modelo na direção que indicam: [[→]] vira a frente do modelo para a direita e [[↑]] inclina-a para cima. Com [[Ctrl]] premido, as setas deslocam a vista ao longo do ecrã: um décimo da dimensão da vista por toque, ou metade se também mantiveres [[Shift]] premido. O modelo desloca-se na direção indicada. Se houver algo selecionado, as setas movem a seleção; clica primeiro num espaço vazio para rodar a vista. Num ecrã tátil, podes arrastar o cubo com um dedo sem ativar {{ui:camera.touchRotate}}.

### A barra de vistas

Na margem esquerda existe uma barra estreita. De cima para baixo:

- {{ui:camera.home}} volta a enquadrar toda a cena. O atalho é [[Home]]; [[F]] faz o mesmo quando não há nada selecionado.
- {{ui:camera.focusSelection}} enquadra a seleção ([[F]] ou [[Shift]]+[[F]]); sem nada selecionado, enquadra toda a cena, tal como [[F]].
- {{ui:camera.zoomIn}} e {{ui:camera.zoomOut}} aproximam e afastam a vista por incrementos, tal como as teclas [[+]] e [[−]].
- {{ui:camera.orthographic}} ativa uma vista sem perspetiva, na qual as arestas paralelas permanecem paralelas. Esta vista facilita frequentemente a medição e o alinhamento de arestas. [[O]] alterna entre os dois modos; voltar a clicar no botão também regressa ao modo anterior.
- {{ui:camera.secondView}} abre uma segunda vista do projeto numa janela própria, descrita abaixo. Voltar a clicar fecha-a.
- {{ui:camera.showScrollbars}} apresenta uma barra de deslocamento na parte inferior da vista e outra na margem direita. Arrasta uma barra para deslocar suavemente a vista, clica numa seta numa das extremidades para a deslocar um pouco (mantém premido para continuar) ou clica ao lado do indicador da barra para avançar quase uma vista completa. A vista não roda e, ao contrário das teclas de seta, as barras funcionam mesmo com uma peça selecionada — útil ao trabalhar de perto em pequenos detalhes. Voltar a clicar oculta-as; {{ui:workspace.startWithScrollbars}}, nas definições, determina se os projetos abrem com as barras visíveis. O navegador também memoriza esta opção.
- {{ui:camera.hideWorkplane}} (o olho sobre uma grelha) oculta a base e a respetiva grelha, permitindo observar o projeto por baixo. Apenas a vista muda: as novas formas continuam a ser colocadas no plano de trabalho. Voltar a clicar mostra a base novamente. Quando o plano de trabalho está numa face, o botão passa a chamar-se {{ui:camera.hideBuildPlate}} e oculta apenas a base de impressão: o plano de trabalho na face permanece visível e tem o seu próprio botão com um olho, {{ui:camera.hideFaceWorkplane}}.
- {{ui:camera.placeWorkplane}}, a fita métrica e o esquadro são ferramentas próprias, descritas abaixo e em [Medição e notas](chapter:measuring-and-notes).

A pequena seta no topo da barra permite ocultá-la se estiver a atrapalhar. Arrastar esse mesmo botão move a barra para qualquer local do editor, incluindo no modo de esboço; um duplo clique repõe a posição original. A pré-visualização 3D de um esboço de revolução pode ser movida da mesma forma, arrastando o respetivo título.

Um projeto abre tal como o deixaste: o ângulo, o zoom e a posição da vista são guardados com ele neste navegador, permitindo continuar de onde paraste, mesmo depois de regressares à página inicial ou fechares a página. Um ficheiro guardado (.lyl) também inclui a vista, pelo que o projeto abre da mesma forma noutro local. A vista não faz parte do histórico de ações que podem ser anuladas.

Também podes guardar quatro vistas próprias em cada projeto. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] ou [[Shift]]+[[0]] guarda a vista exatamente como está — ângulo, posição, zoom e modo ortográfico ou de perspetiva — nessa tecla. Premir apenas a tecla ([[7]], [[8]], [[9]] ou [[0]]) recupera a vista. Uma mensagem na parte inferior confirma que foi guardada; voltar a guardar na mesma tecla substitui a vista anterior. Tal como a vista descrita acima, as vistas guardadas permanecem associadas ao projeto neste navegador, acompanham o ficheiro guardado (.lyl) e não fazem parte do histórico de ações que podem ser anuladas.

### Nível de detalhe

{{ui:detail.title}}, na barra de vistas, abre um controlo deslizante para o que é desenhado à volta do modelo, de {{ui:detail.level5}} a {{ui:detail.level1}}. {{ui:detail.level4}} retira as notas e as etiquetas da base, {{ui:detail.level3}} também os pontos de referência e as distâncias ao mover e até à origem, {{ui:detail.level2}} também as medidas da seleção, as linhas de ajuste e as setas dos eixos, e {{ui:detail.level1}} também a grelha.

Por baixo, cada um destes elementos tem o seu próprio interruptor; se mudar um, o nível chama-se {{ui:detail.own}}. {{ui:detail.handles}}, os quadrados e as setas da seleção, ficam em todos os níveis até os desativar aqui. O que desativar nas definições fica desativado em todos os níveis. Manter [[V]] premida mostra tudo por um momento, também o que [[Q]] e [[Shift+Q]] ocultaram. Um campo em que clique entretanto fica aberto depois de soltar. Só a vista muda: o ajuste e a medição continuam, as medições da fita métrica ficam sempre visíveis, e nem o projeto nem uma exportação mudam. O esboço tem o seu próprio controlo, para notas, arestas de outras peças, medidas e grelha, e este navegador memoriza ambos.

### Uma segunda vista numa janela própria

{{ui:camera.secondView}} abre uma janela que mostra o mesmo projeto através de uma câmara independente, permitindo observá-lo de dois lados ao mesmo tempo — por exemplo, de frente enquanto trabalhas na vista de cima. Todas as alterações feitas no editor aparecem imediatamente nessa janela; o projeto só pode ser alterado na janela principal, onde também permanecem os controlos de edição.

Na segunda janela, o rato e o cubo de vistas controlam a vista tal como na janela principal. Os atalhos também funcionam: [[1]] a [[6]], [[F]], [[Home]], [[O]], [[+]] e [[−]], as teclas de seta para rodar e [[Ctrl]] com as setas para deslocar. Nessa janela, [[F]] enquadra o que estiver selecionado no editor.

As quatro vistas guardadas do projeto também estão disponíveis: [[7]], [[8]], [[9]] e [[0]] recuperam-nas, e [[Shift]] com uma dessas teclas guarda a vista dessa janela na tecla correspondente, ficando disponível em ambas as janelas.

A segunda janela tem a sua própria barra de vistas, com {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} e {{ui:camera.hideWorkplane}}, que atuam apenas nessa janela. A janela abre na posição e com o tamanho que tinha quando a fechaste e fecha-se juntamente com o editor. O botão não aparece em telemóveis nem tablets.

## Observar o interior: a vista em corte

{{ui:camera.sectionView}}, o último botão da barra (a ferramenta de corte), abre visualmente o modelo ao longo de um plano para poderes verificar paredes, cavidades e peças que encaixam umas nas outras. Não é feito nenhum corte real: o projeto, os respetivos ficheiros e todas as exportações permanecem inteiros. Onde o plano atravessa um sólido, a secção é preenchida com uma tonalidade ligeiramente mais escura da cor desse sólido; as cavidades permanecem vazias, permitindo distinguir o material do espaço oco. O preenchimento aparece um instante depois de o plano parar de se mover.

Em {{ui:camera.sectionCutFace}}, escolhes o aspeto da secção: {{ui:camera.sectionCutFaceHatch}}, a opção inicial, aplica uma trama como num desenho técnico; um sólido situado dentro de outro recebe uma trama na direção oposta, para os distinguir. {{ui:camera.sectionCutFaceFill}} aplica um preenchimento uniforme. {{ui:camera.sectionCutFaceOpen}} deixa a secção aberta, permitindo observar o interior da superfície do sólido. A escolha aplica-se a todos os projetos.

- Escolhe o eixo ao qual o plano fica perpendicular: X (largura), Y (profundidade) ou Z (altura), tal como nos campos de posição. Inicialmente, o plano fica a meio do projeto.
- {{ui:camera.sectionOrientation}} define a orientação destes eixos. {{ui:camera.sectionOrientationWorld}} usa os eixos do projeto. {{ui:camera.sectionOrientationWorkplane}} usa os eixos do plano de trabalho: Z produz um corte paralelo ao plano, X e Y produzem cortes perpendiculares e a posição é medida a partir da sua origem. Com o plano de trabalho numa face inclinada, podes cortar paralelamente a essa face, e o corte acompanha o plano de trabalho quando o moves. {{ui:camera.sectionOrientationView}} orienta o plano de frente para o ecrã: oculta o que está à frente e o controlo deslizante faz o corte avançar pelo projeto na direção de observação, por exemplo para alcançar e selecionar uma peça no interior. Depois de rodares a vista, volta a clicar nesta opção para alinhar o corte com a nova vista.
- {{ui:camera.sectionCoarse}} desloca o plano ao longo de todo o projeto; {{ui:camera.sectionFine}} permite pequenos ajustes para ambos os lados da posição atual, na ordem das décimas de milímetro. Também podes introduzir a posição diretamente.
- O botão junto aos eixos mostra o outro lado do corte, {{ui:camera.sectionReset}} repõe o plano no centro e {{ui:camera.sectionShowPlane}} permite ocultar o plano azul.
- Podes clicar e selecionar o que o corte deixa visível, incluindo as paredes interiores.
- {{ui:camera.sectionWorkplane}} coloca o plano de trabalho sobre o corte. Fica no plano da secção e orientado para fora da parte do sólido que permanece visível, como a face deixada por um corte real. Se mudares depois para o modo de esboço, começas exatamente nesse local, e um contorno ténue mostra a secção, permitindo desenhar ao longo dela e ajustar os pontos ao contorno. Assim podes, por exemplo, desenhar uma tampa que encaixe na cavidade revelada pelo corte. O botão junto aos eixos escolhe o lado que permanece visível e, consequentemente, a orientação do plano de trabalho. Podes repor o plano de trabalho na base da forma habitual.
- {{ui:camera.sectionSketch}} inicia um novo esboço diretamente no corte, já com os contornos da secção representados por linhas: um furo aparece como um círculo exato e um canto arredondado como um arco. Altera essas linhas, elimina o que não precisas, acrescenta o que faltar e conclui: o sólido desenvolve-se a partir do corte na direção do lado ocultado. Assim, uma peça que tenha de encaixar noutra, como uma tampa, um inserto ou uma junta de vedação, parte do contorno da própria peça onde vai encaixar. O botão junto aos eixos escolhe esse lado. Tal como no SVG, só são considerados os sólidos visíveis e as formas de corte já estão subtraídas.
- {{ui:camera.sectionMeasure}} permite medir diretamente no corte: o contorno aparece a azul e dois cliques sobre ele indicam a distância e as respetivas componentes segundo os dois eixos do plano. Ambos os pontos se ajustam ao contorno, com prioridade para os cantos. Quando o segundo clique é feito na parede oposta, o ponto ajusta-se à posição perpendicular ao primeiro — permitindo medir espessuras de parede, intervalos e folgas sem ter de apontar com precisão. Um terceiro clique inicia uma nova medição e [[Esc]] termina a medição. Mover o plano limpa a medição. Num contorno circular, como a secção de um cilindro ou de um furo, uma pequena cruz assinala o centro, ao qual os pontos também se podem ajustar. Clica num ponto da circunferência e aproxima o ponteiro do ponto do lado oposto: o segundo clique fica exatamente do outro lado do centro e o valor é apresentado com Ø, indicando o diâmetro. Do centro até um ponto da circunferência, obténs R, o raio.
- {{ui:camera.sectionExportSvg}} guarda os contornos no plano de corte como um SVG à escala 1:1, para corte a laser, um plotter, um molde ou uma junta de vedação. Um corte em X é visto da direita, um corte em Y de frente e um corte em Z de cima. Tal como na exportação, só são incluídos os sólidos visíveis, as formas de corte já estão subtraídas e os sólidos da mesma cor são unidos num único contorno. Cada cor mantém um traçado próprio, sem preenchimento, permitindo ao programa de corte a laser distingui-las como camadas.

A janela da ferramenta fica inicialmente junto ao respetivo botão. Se tapar alguma coisa, arrasta-a pela barra de título para qualquer local do plano de trabalho; da próxima vez, abre nessa posição. Faz duplo clique na barra de título ou larga a janela sobre o botão para a repor na posição original.

O X e [[Esc]] fecham a janela da ferramenta; se houver uma medição em curso, [[Esc]] termina-a primeiro. O corte mantém-se até o desativares com {{ui:camera.sectionActive}}, clicares no respetivo botão na barra enquanto a janela está aberta ou regressares à vista geral dos projetos. Enquanto estiver ativo, o botão permanece realçado. Tudo o que colocares no lado ocultado pelo corte só aparece quando o desativares.

Como um tablet não tem a tecla [[Esc]], a janela da ferramenta apresenta mais dois botões: {{ui:camera.sectionBack}} termina a medição em curso ou, se não houver nenhuma, fecha a janela; {{ui:camera.sectionConfirm}} fecha a janela diretamente. Estes botões não aparecem num computador.

## O plano de trabalho

As novas formas ficam alinhadas com o plano de trabalho. Inicialmente, este coincide com a base com grelha. Mas podes colocá-lo em qualquer superfície para acrescentar algo numa face lateral ou inclinada.

1. Prime [[W]] ou clica em {{ui:camera.placeWorkplane}}.
2. Move o ponteiro do rato sobre uma face de um sólido. A face fica realçada.
3. Clica para colocar o plano de trabalho nessa face. Tudo o que acrescentares a partir desse momento fica assente nela.

Se clicares numa zona vazia da base, o plano de trabalho fica horizontal no ponto em que clicaste, ajustado à grelha. As novas formas e os esboços concluídos, incluindo os de revolução, passam a aparecer nesse local em vez de no centro da base. Quando o plano de trabalho está assim sobre a base, esta mostra apenas o contorno: duas grelhas no mesmo plano produziriam um efeito de cintilação.

Numa face, a origem do plano de trabalho ajusta-se normalmente à grelha. Se clicares perto de um vértice da face, a origem fica exatamente nesse vértice. Perto de uma aresta, fica sobre ela e a grelha alinha-se com essa aresta, permitindo escolher deliberadamente a orientação da grelha. Sem um vértice ou uma aresta como referência, a grelha numa face horizontal fica alinhada com o sólido; numa caixa rodada, por exemplo, acompanha a sua rotação.

Clicar fora da base ou premir [[Esc]] repõe o plano de trabalho na base. Uma opção ainda mais rápida é {{ui:camera.resetWorkplane}}: o botão com a seta para baixo aparece na barra de vistas, por baixo do olho, enquanto o plano de trabalho está numa face. [[Shift]]+[[W]] coloca-o diretamente na face atualmente selecionada. [[Alt]]+[[W]] repõe-no na base a qualquer momento, com ou sem seleção. Se mantiveres [[Shift]] premido ao clicar para colocar o plano, este fica orientado no sentido oposto.

Enquanto o plano de trabalho está numa face, aparece um olho junto a {{ui:camera.placeWorkplane}}. Este botão oculta o plano sem o desativar, permitindo observar melhor o projeto: as novas formas continuam a ser colocadas nessa face e as rotações continuam a usar esse plano como referência. Clicar novamente no olho volta a mostrá-lo, tal como definir um novo plano de trabalho.

Os controlos de dimensões de uma caixa também acompanham um plano de trabalho colocado numa das suas faces laterais: os controlos dos cantos e das arestas ficam nessa face, e cada um altera a largura, o comprimento ou a altura da própria caixa que se estende nessa direção. O controlo no centro da face altera a dimensão perpendicular a ela.

Para olhar de frente para o plano de trabalho, prime [[P]] ou clica em {{ui:camera.lookOntoWorkplane}}, junto a {{ui:camera.placeWorkplane}} na barra de vistas. A vista roda até mostrar o plano perpendicularmente à direção de observação, a partir do lado para onde crescem as novas formas, com a origem ao centro. Na base, isto corresponde à vista de cima.

## Bases de impressão

Quando um projeto contém mais peças do que cabem numa única base de impressão — por exemplo, uma caixa com tampa e insertos — podes usar várias bases. Clica em {{ui:editor.tool.buildPlates}}, no grupo {{ui:editor.group.arrange}}, ou escolhe {{ui:plates.moveTo}} no menu aberto com o botão direito sobre um sólido. Aparece uma barra na parte inferior da vista, com um botão por base; o número indica quantos sólidos estão em cada uma.

- Todas as bases têm as dimensões do plano de trabalho e ficam lado a lado, à direita da primeira, separadas por 20 mm. Um sólido pertence à base sobre a qual se encontra o centro da sua projeção horizontal; arrastá-lo para outra base muda-o para essa base. Um projeto pode ter até 12 bases.
- Clicar numa base na barra enquadra-a na vista; as novas formas e os ficheiros importados passam a ser colocados nessa base. {{ui:plates.showAll}} enquadra todas as bases. Um duplo clique numa base, ou {{ui:plates.rename}}, permite dar-lhe um nome, como «Tampa», que aparece escrito na base.
- Um novo esboço sobre a base também começa na base ativa: a área de esboço mostra essa base e os sólidos que contém, e o sólido concluído fica colocado nela.
- {{ui:plates.moveLeft}} e {{ui:plates.moveRight}} alteram a ordem das bases, levando os respetivos sólidos consigo. {{ui:plates.remove}} remove a base ativa; os seus sólidos passam para a primeira base, mantendo a posição relativa.
- {{ui:plates.arrange}} distribui os sólidos selecionados, ou todos os sólidos, por filas nas bases, começando pelos maiores e deixando 5 mm entre eles. Acrescenta bases conforme necessário. Um sólido maior do que uma base permanece onde está.
- {{ui:plates.export}} grava a base ativa como 3MF com um clique, com o nome da base e seja qual for a seleção. [[Shift]] e um clique abre a janela de exportação com essa base escolhida, para outro formato.
- Com uma impressora selecionada, cada sólido é verificado em relação à sua própria base, e a altura de impressão é medida a partir do sólido mais baixo dessa base. Uma base com um sólido que não cabe apresenta o respetivo número a vermelho.
- Nas propriedades, a coordenada X é medida a partir do centro da base a que o sólido pertence.

A janela de exportação passa a disponibilizar {{ui:export.plates}}: todas as bases num único ficheiro, lado a lado como no projeto; um ficheiro por base, reunidos num ZIP (STL, 3MF e OBJ); ou uma única base, colocada na posição da primeira. Um programa de preparação da impressão abre cada ficheiro como uma única base. Por isso, para imprimir as bases uma após outra, escolhe um ficheiro por base. Mover sólidos entre bases e organizá-los são ações que podem ser anuladas; adicionar, nomear, reordenar e remover bases são alterações guardadas com o projeto, mas não podem ser anuladas.

## Grelha e ajuste

A grelha mostra as dimensões da base. No canto inferior direito encontra-se o **passo de ajuste**: ao mover ou redimensionar formas, os valores avançam em incrementos dessa dimensão, por exemplo 1 mm. Reduz o passo para trabalho de precisão e aumenta-o para organizar as peças de forma mais rápida. {{ui:editor.tool.snapToGrid}}, na faixa de ferramentas, permite ajustar posteriormente as formas selecionadas à interseção mais próxima da grelha. Durante o movimento, as formas também se ajustam a outras formas; consulta [Selecionar e organizar](chapter:select-and-arrange).

Sem usar o rato: [[Alt]]+[[1]] a [[Alt]]+[[0]] escolhem a entrada correspondente do menu ([[Alt]]+[[1]] desativa o ajuste), e [[,]] e [[.]] selecionam, respetivamente, um passo mais fino ou mais largo. Estes atalhos também funcionam num esboço.

Um clique breve com o botão do meio, sem mover o rato, abre o menu do passo de ajuste junto ao ponteiro, incluindo num esboço; manter esse botão premido e arrastar continua a deslocar a vista.

> **Dica:** Ao encaixar peças com precisão, evita continuar a rodar a vista. Usa as teclas numéricas para mudar para a vista de cima ou de frente e prime [[O]] para ativar a vista ortográfica. Assim, consegues perceber imediatamente se duas arestas estão realmente alinhadas.

### A janela de definições

A roda dentada na barra de título ({{ui:editor.workspaceSettings}}) abre as definições. À esquerda existem nove áreas: {{ui:workspace.appearance}}, {{ui:workspace.controls}}, {{ui:workspace.output}}, {{ui:workspace.ribbon}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}}, {{ui:workspace.history}} e {{ui:backups.settingsTitle}}. As alterações têm efeito imediato.

{{ui:workspace.makeDefault}}, na parte inferior, guarda as definições atuais como predefinições para novos projetos. Um ficheiro que abras traz as suas próprias definições; {{ui:workspace.useMyDefault}}, ao lado, aplica as cores, a grelha e as restantes definições que guardaste ao projeto aberto, mantendo as unidades desse projeto. Se as tuas predefinições incluírem uma impressora, esta também é aplicada, juntamente com as dimensões da respetiva base; caso contrário, o projeto mantém a base e a impressora atuais. {{ui:workspace.close}}, no canto superior direito, fecha a janela. As secções seguintes explicam cada uma das definições.

{{ui:workspace.exportSettings}} guarda as definições da janela num ficheiro (layerling-settings-<date>.json): cores, grelha, sombras, câmara e predefinições das formas, juntamente com o tema, o tamanho da faixa de ferramentas, o canto do cubo de vistas, as cores das formas e a folga de cada impressora. Noutro computador, ou depois de o navegador perder os dados, {{ui:workspace.importSettings}} permite recuperar o ficheiro: as definições passam a ser usadas nos novos projetos e são aplicadas ao projeto aberto da mesma forma que {{ui:workspace.useMyDefault}}. Os atalhos de teclado personalizados também são incluídos.

{{ui:workspace.search}}, acima das secções, encontra uma definição sem ser preciso saber em que secção está. Escreva **zoom** e à direita aparecem todas as definições relacionadas, de todas as secções, e pode alterá-las logo ali. A pesquisa abrange os nomes, as explicações e as opções dos menus. O número ao lado de uma secção indica quantas definições foram encontradas; um clique na secção abre-a por inteiro, com essas definições assinaladas. [[Esc]] ou a cruz limpa a pesquisa.

### Aspeto: tema e cubo de vistas

{{ui:workspace.theme}} define o esquema de cores de todo o programa: {{ui:workspace.themeSystem}} acompanha a definição do computador; as restantes opções são {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} e {{ui:workspace.themeGraphite}}. Também podes alterá-lo no canto superior direito do editor.

{{ui:workspace.shapeColors}} apresenta as imagens da biblioteca de formas com a cor inicial de cada forma: a cor do respetivo tipo ou a que guardaste com {{ui:inspector.saveDefaults}}. Desativa esta opção se preferires imagens cinzentas; o navegador memoriza a escolha.

{{ui:workspace.viewCubePosition}} coloca o cubo de vistas noutro canto do plano de trabalho: {{ui:workspace.viewCubePositionTopLeft}} (a posição habitual), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} ou {{ui:workspace.viewCubePositionBottomRight}}. Quando o cubo não está no canto superior esquerdo, a barra de vistas sobe para o espaço que este deixou livre. No canto inferior direito, o cubo fica imediatamente acima do controlo {{ui:inspector.snapGrid}}. Quando as propriedades de uma forma estão abertas à direita, um cubo colocado desse lado desloca-se para a esquerda do painel. A posição é guardada neste navegador e aplica-se a todos os projetos. Numa janela estreita, como num telemóvel, esta definição fica oculta e o cubo permanece no canto superior esquerdo.

### Faixa de ferramentas: tamanho e botões

{{ui:workspace.toolbarSize}} permite reduzir ou aumentar os botões da faixa de ferramentas superior, o respetivo menu de formas, a barra de vistas à esquerda e o painel de propriedades à direita: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (o tamanho habitual) ou {{ui:workspace.toolbarSizeLarge}}. O tamanho pequeno deixa mais espaço para o plano de trabalho num portátil; o grande facilita a utilização num ecrã grande ou com o dedo. Com botões grandes, os grupos da faixa de ferramentas passam para uma segunda linha quando a janela é demasiado estreita. Esta definição encontra-se no separador {{ui:workspace.ribbon}}, é guardada neste navegador e aplica-se a todos os projetos.

{{ui:workspace.ribbonButtons}} permite retirar da faixa de ferramentas os grupos e botões que nunca usas. Clica num grupo para abrir a respetiva lista: {{ui:workspace.ribbonGroupShown}} permite ocultar o grupo inteiro; a caixa de seleção junto a cada botão permite ocultar apenas esse botão. {{ui:workspace.ribbonShowAll}} volta a mostrar tudo. Um grupo sem botões visíveis desaparece e os restantes ocupam o espaço livre, permitindo apresentar mais grupos numa única linha.

Os comandos retirados continuam disponíveis na pesquisa de comandos ([[Ctrl]]+[[K]]) e através dos respetivos atalhos de teclado. As setas junto a um grupo movem-no para cima ou para baixo na lista, alterando a sua posição na faixa de ferramentas; {{ui:workspace.ribbonResetOrder}} repõe a ordem inicial. As setas junto a um botão alteram a sua posição dentro do grupo da mesma forma. O grupo de ajuda permanece sempre disponível. O grupo de formas pode ser movido e ocultado como qualquer outro; o respetivo painel continua a poder ser aberto pela pesquisa de comandos. Estas escolhas são guardadas neste navegador e incluídas no ficheiro de {{ui:workspace.exportSettings}}. Aplicam-se ao editor 3D; o modo de esboço tem a sua própria barra.

{{ui:workspace.ribbonFold}}, por baixo de {{ui:workspace.ribbonGroupShown}} na lista de um grupo, define o comportamento desse grupo quando não há espaço na janela para apresentar todos. {{ui:workspace.ribbonFoldAuto}} é a opção inicial: os grupos menos usados recolhem primeiro. {{ui:workspace.ribbonFoldAlways}} mantém o grupo recolhido num único botão, mesmo numa janela larga, para ocupar pouco espaço e continuar acessível. {{ui:workspace.ribbonFoldKeep}} só permite que o grupo recolha depois de todos os outros. {{ui:workspace.ribbonResetOrder}} também repõe esta escolha. {{ui:editor.section.mirrorPattern}}, {{ui:editor.section.splitShape}}, {{ui:editor.section.edgesWalls}} e {{ui:editor.section.surface}} são quatro grupos independentes: cada um pode ser movido, recolhido ou ocultado individualmente.

### Aspeto: modo rápido

{{ui:workspace.fastMode}} destina-se a computadores mais lentos. Desativa as sombras, as linhas de aresta em todos os sólidos e a inércia da câmara, e limita a resolução de apresentação à resolução do ecrã. As tuas definições são conservadas para utilização posterior, e as opções temporariamente desativadas apresentam {{ui:workspace.offInFastMode}} enquanto este modo está ativo. Encontras mais sugestões na secção «Quando o layerling parece lento», abaixo.

### Aspeto: cores da área de trabalho e do esboço

As cores da área de trabalho são definidas em {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} e {{ui:workspace.surfaceColor}} aplicam-se ao tema claro (os temas escuros mantêm as suas próprias cores). A cor da grelha encontra-se em {{ui:workspace.workplane}}. Cada cor é representada por um botão com essa cor. Clicar abre uma pequena janela com o campo de seleção de cor, uma fila de cores predefinidas, um campo para o valor hexadecimal e uma seta que repõe a cor inicial do layerling. Prime [[Enter]] ou clica fora da janela para aplicar um valor hexadecimal introduzido.

A vista de esboço tem as suas próprias cores: {{ui:workspace.sketchBackground}} para o fundo à volta da folha, {{ui:workspace.sketchPlateColor}} para a folha sob a grelha e {{ui:workspace.sketchGridColor}} para a grelha, todas aplicáveis ao tema claro. {{ui:workspace.sketchMatch}} aplica as três cores da área de trabalho com um só clique. A janela de definições também abre enquanto desenha um esboço, onde vê logo as novas cores.

{{ui:workspace.classicLook}} configura a área de trabalho com o aspeto do Tinkercad: base branca, grelha milimétrica azul-clara com uma linha mais escura a cada centímetro, linhas de aresta pretas e iluminação superior com sombras suaves. Depois, podes continuar a alterar cada valor individualmente. Os valores iniciais correspondem ao aspeto habitual do layerling; a combinação mais adequada depende do teu monitor.

![As definições de aspeto: cores do fundo e do plano de trabalho para o tema claro e opção de linhas de aresta em todos os sólidos.](shot:settings-appearance)

![O editor com o esquema de cores escuro. O esquema de cores é escolhido no canto superior direito: sistema, claro, escuro ou grafite.](shot:editor-dark)

### Aspeto: setas dos eixos e linhas de aresta

{{ui:workspace.showAxes}}, ativo por predefinição, apresenta três setas no canto posterior esquerdo da base: **X** a vermelho para a direita, **Y** a verde para trás e **Z** a azul para cima, de acordo com os campos de posição. É a convenção da regra da mão direita, também usada pelo Tinkercad, pelos programas CAD e pelos programas de preparação da impressão. Quando o plano de trabalho está numa face, as setas acompanham-no. Podes desativá-las aqui se atrapalharem. Enquanto estão visíveis, a cruz central da grelha também usa as respetivas cores: a linha de X a vermelho e a de Y a verde, permitindo identificar imediatamente a direção de cada eixo ao trabalhar numa peça pequena.

{{ui:workspace.edgeLines}} desenha as arestas de cada sólido com a cor definida em {{ui:workspace.edgeColor}} (inicialmente preto, como no Tinkercad). Isto ajuda a distinguir sólidos de cores escuras que, de outro modo, se confundiriam. Está desativado por predefinição e não se aplica a malhas importadas muito grandes.

![Três sólidos escuros com as linhas de aresta ativadas: os contornos permitem distingui-los.](shot:edge-lines)

{{ui:workspace.strongHoles}} apresenta as formas de corte num cinzento mais escuro, com menos transparência e uma linha escura no contorno. Ajuda a localizar uma forma de corte entre sólidos transparentes. Ao contrário das linhas de aresta, esta opção mantém-se ativa no modo rápido.

{{ui:workspace.holeOpacity}}, logo abaixo, define a opacidade das formas de corte entre 10 e 90 por cento. Um valor mais baixo permite ver melhor onde uma forma de corte interseta um sólido. Inicialmente, o valor é automático: 52 por cento, ou 72 com {{ui:workspace.strongHoles}} ativo. Um duplo clique no controlo deslizante repõe o modo automático.

### Aspeto: iluminação e sombras

{{ui:workspace.showShadows}} ativa ou desativa as sombras projetadas. Dois controlos deslizantes definem a iluminação dos sólidos. {{ui:workspace.shadowStrength}} determina a intensidade das sombras projetadas, e {{ui:workspace.shadeContrast}} transfere iluminação da luz ambiente uniforme para a luz principal: na direção de maior contraste, os lados à sombra ficam mais escuros e as sombras tornam-se mais evidentes; na direção mais suave, a iluminação fica mais uniforme. No extremo superior, o contraste é muito forte e tanto as faces à sombra como as sombras projetadas ficam bastante escuras.

{{ui:workspace.shadowSoftness}} suaviza os contornos das sombras. {{ui:workspace.lightAzimuth}} faz a luz principal rodar em torno da base (0° corresponde à frente e 90° à direita), e {{ui:workspace.lightElevation}} define a sua altura angular. A 90°, a luz fica diretamente por cima da base, como no Tinkercad, e as sombras caem por baixo dos sólidos.

{{ui:workspace.softLighting}} faz com que a maior parte da luz venha da direção de observação e acompanhe a vista: nenhuma face fica às escuras, e uma face escura virada para cima deixa de aparecer esbranquiçada pelo excesso de luz. A luz principal mantém alguma intensidade para produzir sombras, e o controlo de contraste continua a funcionar. Se ainda aparecer um reflexo intenso com a luz numa posição baixa, aumenta {{ui:workspace.lightElevation}} para 90°: o resultado aproxima-se do aspeto do Tinkercad. {{ui:workspace.lightReset}} repõe todas as definições iniciais de iluminação.

### Aspeto: medidas no plano de trabalho

{{ui:workspace.showMoveDimensions}} mostra a distância percorrida ao arrastar ou ao usar as teclas de seta; {{ui:workspace.showOriginDimensions}} mostra as distâncias da seleção à origem da base, incluindo quando estão selecionados vários sólidos. Com {{ui:workspace.dimensionsAlwaysVisible}}, estas medidas permanecem visíveis, em vez de aparecerem apenas durante o movimento. Quando um sólido rodado está selecionado, os respetivos ângulos aparecem por baixo dele no plano de trabalho; {{ui:workspace.showRotationAngles}} permite ocultá-los. Consulta [Medição e notas](chapter:measuring-and-notes).

### Controlos: selecionar e mover

{{ui:workspace.selectBeforeMoving}} exige que um sólido seja selecionado antes de poder ser movido; só o arrastamento seguinte o desloca. Ajuda a evitar movimentos involuntários, por exemplo quando crianças tocam nos sólidos, quando se trabalha à pressa ou num ecrã tátil.

{{ui:workspace.frameByDirection}} faz com que uma caixa de seleção arrastada para a direita selecione apenas o que fica completamente no seu interior; arrastada para a esquerda, seleciona tudo em que toca, sendo apresentada a tracejado, como no SketchUp.

{{ui:workspace.doubleClickOpensSketch}} determina se um duplo clique num esboço extrudido volta a abrir o esboço, como no Tinkercad. {{ui:workspace.doubleClickOpensGroup}} determina se um duplo clique num grupo ou conjunto o abre para edição. {{ui:workspace.doubleClickCentersView}} determina se um duplo clique numa zona vazia do plano de trabalho centra a vista nesse ponto.

{{ui:workspace.objectSnap}} permite que as arestas e o centro de uma forma se ajustem a outras formas durante o arrastamento; o menu da grelha, no canto inferior direito, tem a mesma opção. {{ui:workspace.cruise}} faz com que uma nova forma acompanhe o ponteiro do rato e assente na face por baixo dele, como a função Cruise do Tinkercad; com esta opção desativada, a nova forma aparece no centro da base. Consulta [Selecionar e organizar](chapter:select-and-arrange).

### Controlos: rato e câmara

{{ui:workspace.zoomSpeed}} define, de lento a rápido, a velocidade de zoom da roda e do trackpad; os botões e as teclas de zoom mantêm os seus próprios pequenos incrementos. {{ui:workspace.panSpeed}} também varia de lento a rápido e define a velocidade com que a vista acompanha o rato ao deslocá-la; na posição intermédia, o ponto que agarras mantém-se sob o cursor. Com {{ui:workspace.cameraInertia}} ativo, a vista continua a rodar ou a deslocar-se por um instante depois de largares o rato, abrandando suavemente. Quando desativado, a vista para imediatamente, como no Tinkercad e no Fusion 360.

### Aspeto: a vista

{{ui:workspace.startInPerspective}} faz com que o editor abra em perspetiva, em vez de na vista ortográfica.

{{ui:workspace.startWithScrollbars}} faz com que os projetos abram com as barras de deslocamento da vista visíveis. Esta opção é guardada com o projeto e com {{ui:workspace.makeDefault}}.

{{ui:workspace.showViewBar}}: desligado, a barra de vistas não aparece no editor 3D; o esboço mantém a sua. As ferramentas de medição desaparecem com ela, a menos que {{ui:workspace.measureBar}} esteja ligado: ficam então numa barra própria, que se move arrastando a seta e se recolhe com um clique. Ambos ficam guardados neste navegador, não no projeto.

{{ui:workspace.viewBarOpensOnHover}} abre uma barra de vistas recolhida enquanto o ponteiro está sobre a respetiva seta. A barra volta a recolher pouco depois de o ponteiro sair, exceto se uma das suas ferramentas estiver em utilização. Clicar na seta enquanto a barra está aberta desta forma mantém-na aberta. Este comportamento aplica-se apenas ao rato; num ecrã tátil, um toque abre a barra da forma habitual.

{{ui:workspace.showStepNotices}} apresenta, após um passo como uma união, uma mensagem breve junto ao cubo de vistas que indica a ação realizada e disponibiliza {{ui:shortcuts.undo}}. Se desativares esta opção, estas mensagens deixam de aparecer; as que pedem uma ação ou indicam um problema continuam a ser apresentadas. {{ui:editor.tool.undo}}, na faixa de ferramentas, continua a indicar o nome do passo ao passares o ponteiro sobre o botão.

{{ui:workspace.viewCubeKeepsTurn}}: um clique em Cima ou Baixo do cubo de vista, ou as teclas 5 e 6, olha a direito para baixo ou para cima e mantém a vista rodada como está, arredondada ao quarto de volta mais próximo. Se olhavas para a base pela direita, o lado direito fica em baixo. Desligado, como ao início, a frente fica sempre em baixo.

{{ui:workspace.startView}} define o ângulo usado ao abrir um novo projeto e ao clicar em {{ui:camera.home}}. Roda a vista e ajusta o zoom como preferires e, depois, clica em {{ui:workspace.startViewUseCurrent}}. {{ui:workspace.startViewStandard}} repõe a vista habitual a partir da frente e da direita. Esta definição aplica-se a todos os projetos neste navegador. Um projeto reaberto continua a usar a vista em que o deixaste.

{{ui:workspace.overhangAngle}} define o ângulo a partir do qual uma face é considerada uma saliência que pode precisar de suporte, quando ativas a apresentação de saliências no menu de visibilidade. Essas faces são assinaladas com uma trama vermelha e branca. 30° é uma escolha conservadora; 70° pressupõe um bom arrefecimento durante a impressão; 45° é o valor inicial habitual. Enquanto as saliências estão visíveis, uma linha por baixo da vista indica a inclinação da saliência mais acentuada e quantos cm² precisam de suportes.

{{ui:workspace.booleanTriangleLimit}} limita o número de triângulos que uma malha importada pode ter para ser cortada, unida ou intersetada, uma vez que estes cálculos são feitos no navegador. Uma malha acima do limite não é processada: simplifica-a primeiro ou aumenta o limite se o computador tiver capacidade. Um limite mais elevado pode bloquear temporariamente o editor durante alguns segundos.

### Medição: unidades, escala e passos de ajuste

Em {{ui:workspace.measurement}}, defines {{ui:workspace.units}}, a unidade em que as medidas são apresentadas ({{ui:workspace.scale}}: milímetros, centímetros ou metros no sistema métrico; polegadas ou pés no imperial), o número de casas decimais ({{ui:workspace.accuracy}}), o passo de {{ui:workspace.snapGrid}} usado ao mover e redimensionar e os teus próprios passos em {{ui:workspace.customSnapGrids}}.

Em {{ui:workspace.measurement}}, nas definições, escolhes {{ui:workspace.units}}. Com {{ui:units.imperial}}, o layerling apresenta todas as medidas em polegadas: na forma, no painel de propriedades, na fita métrica e na régua. A grelha de ajuste passa a disponibilizar passos entre 1/64 e 1 polegada, e a grelha da base é apresentada em polegadas, com espaçamentos entre 1/8 e 1 polegada (1/4 de polegada por predefinição) e uma linha mais forte a cada polegada inteira.

Em {{ui:workspace.inchFormat}}, escolhes se as polegadas aparecem como frações, tal como no Tinkercad (1 5/8, arredondadas a 1/64 de polegada), ou como valores decimais (1.625), com o número de casas definido em {{ui:workspace.accuracy}}. Podes introduzir qualquer um dos formatos, incluindo «1 5/8».

Uma forma rápida de alternar entre milímetros e polegadas é o pequeno seletor **mm | in**, junto a {{ui:inspector.snapGrid}}, na parte inferior da janela de propriedades: altera a unidade, a grelha da base e o passo de ajuste para este projeto, tal como as definições.

Em {{ui:workspace.customSnapGrids}}, na mesma área, podes acrescentar passos de ajuste personalizados, indicando um nome e uma dimensão em milímetros. Por exemplo, «Passo dos pinos 2,54 mm» para o espaçamento entre pinos de circuitos integrados DIP, conectores de pinos e furos de placas perfuradas, ou «Unidade de tecla MX», com 19,05 mm, para o espaçamento entre teclas de um teclado.

O menu do passo de ajuste passa a disponibilizar essa dimensão inteira, metade e um quarto (1 ×, ½ × e ¼ ×), permitindo mover as formas um passo, meio passo ou um quarto de passo. Se quiseres apenas a dimensão inteira, desmarca {{ui:workspace.customSnapGridParts}} ao lado; o menu passa a apresentar apenas esse passo. Os passos personalizados são guardados com o projeto e incluídos em {{ui:workspace.makeDefault}}.

{{ui:workspace.startWithCornerRuler}} faz com que cada novo projeto neste navegador comece com um esquadro na origem; consulta [Medição e notas](chapter:measuring-and-notes). Os projetos existentes mantêm-se como estão, e um esquadro que tenhas removido de um projeto não volta a aparecer. Por baixo, {{ui:workspace.startCornerRulerPlace}} oferece {{ui:workspace.startCornerRulerPlace.origin}} ou {{ui:workspace.startCornerRulerPlace.plateCorner}}: o esquadro cobre então a base da impressora escolhida nas definições, com o canto à frente, à esquerda.

### Plano de trabalho: base e impressora

{{ui:workspace.printer}} adapta as dimensões do plano de trabalho à base de impressão da tua impressora e assinala os sólidos que ultrapassam os seus limites; consulta [Impressão](chapter:printing). {{ui:workspace.showPlateLabels}} apresenta o nome do projeto na base e, quando está selecionada uma impressora, também o nome desta e o respetivo volume de impressão.

{{ui:workspace.printerPlay}} corresponde à folga por lado de que um pino impresso precisa para rodar num furo impresso na tua impressora. {{ui:workspace.fitTestMake}} coloca na base o teste de encaixe que permite medir essa folga. As novas tampas, os encaixes em cauda de andorinha, os encaixes por pressão, as porcas e a verificação de folgas passam a usar esse valor como referência; consulta [Impressão](chapter:printing). Este valor é guardado no navegador, não no projeto.

{{ui:workspace.size}} permite definir dimensões próprias para a base, através de {{ui:workspace.width}} e {{ui:workspace.length}}, em milímetros ou na unidade escolhida. A grelha passa sempre pela origem, pelo que as linhas mais fortes ficam sobre os eixos, independentemente das dimensões da base.

### Plano de trabalho: grelha

{{ui:workspace.showGrid}} mostra ou oculta a grelha na base. {{ui:workspace.gridBlockSize}} define o espaçamento entre as linhas e {{ui:workspace.gridMajorEvery}} determina se aparece uma linha mais escura a cada 5 ou 10 intervalos da grelha. {{ui:workspace.gridMajorColor}} permite atribuir uma cor própria a essa linha; a cruz central e o contorno da base também usam essa cor. {{ui:workspace.gridColor}} define a cor das linhas normais.

As linhas da grelha tornam-se mais espessas à medida que aproximas a vista, tal como no Tinkercad, e permanecem visíveis quando a afastas. Se preferires linhas mais finas, desativa {{ui:workspace.gridLinesGrow}}: passam a ter sempre um píxel de espessura, independentemente do zoom, tal como no esboço.

Se a grelha tiver desaparecido, por exemplo porque lhe foi atribuída a mesma cor da base, {{ui:workspace.resetGrid}}, no final da área {{ui:workspace.workplane}}, repõe a visibilidade, as cores, o espaçamento e a espessura das linhas nos valores iniciais. Esta reposição aplica-se tanto ao projeto atual como às predefinições guardadas com {{ui:workspace.makeDefault}}.

### Predefinições das formas

Em {{ui:workspace.shapeDefaults}}, escolhes uma forma através de {{ui:workspace.shape}} e defines as dimensões com que é criada: largura, comprimento e altura. {{ui:workspace.useAppDefaults}} repõe os valores iniciais da aplicação para essa forma. As formas com definições específicas apresentam-nas em {{ui:workspace.shapeDetails}}.

Os valores aplicam-se às novas formas, não às que já estão na base. {{ui:workspace.customLimit}} permite definir um limite máximo personalizado para as dimensões que os controlos e as propriedades podem atribuir à forma; se o campo ficar vazio, mantêm-se os limites habituais.

### Histórico guardado

Em {{ui:workspace.history}}, o controlo deslizante {{ui:workspace.savedHistory}} define quantas ações concluídas continuam disponíveis para anular depois de guardares ou reabrires um projeto. O valor predefinido é de 100 ações por projeto. Reduzir o limite elimina permanentemente os passos mais antigos do histórico desse projeto.

## Quando o layerling parece lento

O layerling faz todos os cálculos e apresenta toda a imagem no navegador. Por isso, num computador mais antigo, com uma placa gráfica pouco potente ou com vários ecrãs grandes, a vista pode responder mais lentamente. Estas medidas podem ajudar:

- **{{ui:workspace.fastMode}}**, em {{ui:workspace.appearance}}, desativa de uma só vez os efeitos mais exigentes para a apresentação da vista: sombras, linhas de aresta em todos os sólidos e inércia da câmara. Também limita a resolução de apresentação à resolução do ecrã, o que, em ecrãs de alta resolução, pode reduzir o número de píxeis para um quarto. As tuas definições são conservadas e voltam a aplicar-se assim que desativas este modo.
- **A vista continua a rodar:** depois de largares o rato, a vista continua a rodar por um instante e abranda suavemente. É um comportamento intencional. Se estás habituado ao Tinkercad ou ao Fusion 360, desativa {{ui:workspace.cameraInertia}}, em {{ui:workspace.controls}}, para a vista parar imediatamente.
- **Desativar efeitos individualmente:** mesmo sem usar o modo rápido, podes desativar apenas {{ui:workspace.showShadows}} ou {{ui:workspace.edgeLines}}.
- **Usar a placa gráfica:** no Chrome, abre `chrome://gpu` (no Edge, `edge://gpu`). Junto a «WebGL» deve aparecer «Hardware accelerated». Se aparecer «Software only», a aceleração por hardware está desativada nas definições do navegador. No Windows, também podes escolher «Alto desempenho» para o navegador, em Definições → Sistema → Ecrã → Gráficos, para que use a placa gráfica dedicada em vez da placa menos potente integrada no processador.
- **Simplificar malhas importadas grandes:** um modelo com centenas de milhares de triângulos torna qualquer vista mais lenta. O capítulo sobre ficheiros explica como reduzir esse número, na secção sobre simplificação de malhas importadas.
- **Fechar outros separadores:** todos os separadores abertos do layerling e todas as outras páginas com conteúdo 3D partilham a mesma placa gráfica.
