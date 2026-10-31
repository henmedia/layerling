---
title: Sólidos e orifícios
summary: Como formas simples viram furos, rasgos e cavidades, e como alterar um grupo de união depois.
---

Esta é a ideia mais importante do layerling, e ela se aprende rápido: **toda forma é um sólido ou um orifício.** Um sólido fica. Um orifício é uma ferramenta que tira material.

## Sólido ou orifício

Selecione uma forma e clique em {{ui:inspector.solid}} ou {{ui:inspector.hole}} no painel de propriedades. Pelo teclado é mais rápido: [[H]] transforma a seleção em orifício, [[S]] a transforma de novo em sólido. As duas opções também estão no menu que aparece com um clique direito no sólido. Um orifício aparece transparente, para você ver onde ele está. [[T]] deixa um sólido transparente, por exemplo para olhar dentro de uma carcaça; pressione [[T]] de novo para deixá-lo opaco. Com vários sólidos selecionados, [[T]] vale para todos: se pelo menos um já estiver transparente, todos ficam opacos; se nenhum estiver, todos ficam transparentes.

Enquanto nada estiver agrupado, um orifício não faz nada. Ele só fica ali e mostra onde algo vai sumir depois.

![O cilindro é um orifício. Ele sai pelo topo do cubo, para atravessá-lo de ponta a ponta.](shot:hole-before)

## Agrupando

Selecione os sólidos e os orifícios e clique em {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Agora os orifícios tiram o material dos sólidos em que tocam. O que sobra é uma única forma nova.

![O resultado: um cubo com um furo.](shot:hole-after)

É assim que se fazem:

- **Furos:** um cilindro como orifício atravessando um sólido.
- **Rasgos:** uma caixa alongada como orifício na borda.
- **Cavidades:** um orifício que não atravessa até o outro lado.
- **Roscas numa peça:** um furo roscado como orifício, veja [Roscas e mecânica](chapter:threads-and-mechanics).

Se houver vários sólidos no grupo de união, eles se juntam. Dois sólidos que se tocam viram uma única peça.

Com malhas grandes, como um STL importado com centenas de milhares de triângulos, o corte leva alguns segundos. layerling então trabalha em segundo plano e mostra "{{ui:status.computing}}"; enquanto isso, você pode girar a vista e usar a interface. Se você alterar o modelo nesse meio-tempo, o resultado é descartado e layerling avisa. O mesmo vale para {{ui:editor.tool.split}}.

Um grupo de união pode ser tratado como uma forma: mover, girar, mudar a cor, agrupar de novo. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) desfaz o grupo de união, e as peças voltam a ficar separadas.

### Transformando um grupo de união em orifício

Um grupo de união inteiro também pode ser um sólido ou um orifício. Vale uma regra simples:

- Se o grupo de união tem só sólidos (ou só orifícios), você o troca por inteiro e as peças acompanham.
- Se tem os dois, por exemplo um cubo com um furo, cada peça mantém o seu próprio estado. O grupo de união inteiro vira então uma ferramenta, mas o furo continua sendo um furo.

## Criando conjuntos

Às vezes as peças só devem ficar juntas, sem virar uma só, por exemplo um logotipo branco sobre uma placa preta para uma impressão multicolorida. É para isso que serve {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), como no Tinkercad. Um conjunto se move, gira e muda de tamanho como uma forma, mas nada é fundido:

- Cada peça mantém a sua cor e continua sendo um sólido ou um orifício. No painel de propriedades, o conjunto tem os mesmos cartões de um grupo de união: {{ui:inspector.solid}} e {{ui:inspector.hole}} para o conjunto inteiro (que mantêm as cores das peças), {{ui:inspector.transparent}} ([[T]]) e {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); com {{ui:inspector.multicolor}} desligado, o conjunto aparece e é exportado numa cor só. {{ui:inspector.separateParts}} desfaz o conjunto, como [[Ctrl]]+[[Shift]]+[[G]].
- Os orifícios não cortam nada. Quando você agrupa o conjunto com outras peças, os orifícios dele cortam essas peças, mas continuam sem cortar os sólidos do próprio conjunto, como no Tinkercad. Assim, por exemplo, um pino com o seu orifício ao lado pode ser reaproveitado várias vezes como conjunto.
- Ao exportar em STL, 3MF ou OBJ, cada peça é um sólido separado; em 3MF e OBJ, com a sua cor.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) desfaz um conjunto, e [[E]] o abre para edição, como um grupo de união. Chanfro, arredondamento e vazar não funcionam num conjunto, porque ele não é um único sólido: para isso, agrupe-o ou trabalhe nas peças uma por uma. Se um orifício do conjunto também deve cortar os sólidos do próprio conjunto, desfaça o conjunto e agrupe as peças ([[Ctrl]]+[[G]]).

## Interseção

{{ui:editor.tool.intersect}} mantém só o que dois ou mais sólidos têm em comum. Coloque duas formas uma sobre a outra, sobrepostas, selecione as duas e clique em {{ui:editor.tool.intersect}}. Assim um cilindro e uma caixa viram uma peça com um lado redondo e um lado reto. Um grupo de união entra na interseção do jeito que aparece, com os orifícios já recortados. Se um orifício também estiver selecionado, o que sobra é o que todos os sólidos têm em comum com todos os orifícios. Se as formas não têm nada em comum, uma mensagem informa que nada foi alterado. Ao lado de {{ui:editor.tool.intersect}}, o botão {{ui:editor.tool.intersectPreview}} exibe a parte em comum antes de você aplicá-la: as formas selecionadas ficam transparentes, e o que elas têm em comum aparece em verde. Selecione e mova cada forma separadamente, e a parte verde acompanha; {{ui:editor.tool.intersect}} aplica, [[Esc]] fecha a prévia.

{{ui:editor.tool.hull}} envolve as formas selecionadas em um único sólido convexo, como se fossem embaladas a vácuo: o menor sólido sem reentrâncias que contém todas elas. Uma meia esfera sobre um cilindro vira uma cúpula sem degrau, quatro cilindros nos cantos viram uma caixa de cantos arredondados, e duas esferas, uma cápsula. Os orifícios da seleção são recortados da envoltória depois. A envoltória guarda as peças: {{ui:group.edit}} a abre como um grupo de união, e se você mover uma peça dentro dela e clicar em {{ui:group.done}}, a envoltória é reconstruída. A envoltória é uma malha, então formas redondas mostram facetas, e as ferramentas de aresta funcionam nela como em qualquer malha. Quando só furos estão selecionados, a envoltória é ela mesma um furo: dois furos cilíndricos cortam um rasgo oblongo.

{{ui:editor.tool.cookieCutter}} transforma a seleção num cortador de biscoito: uma parede fina de 15 mm de altura ao longo do contorno e uma aba plana de 2 mm em volta da base, para o cortador se apoiar na aba e você ter onde apertar com o polegar. Se você selecionar um único SVG importado ou um único sólido de esboço, a ferramenta usa o contorno dele. No caso de um texto deitado, o contorno segue as curvas das próprias letras. Nas outras formas (uma forma montada, uma malha importada ou várias peças), o contorno vem do corte feito pelo plano de trabalho. Por isso, coloque a forma primeiro sobre o plano de trabalho. Peças que se sobrepõem geram um único contorno em volta de todas, como se estivessem agrupadas; peças separadas geram um cortador para cada uma, todos no mesmo conjunto. O contorno é espelhado da esquerda para a direita: o cortador é impresso apoiado na aba e depois virado de cabeça para baixo para cortar. Assim, o texto ou o logotipo fica na orientação certa na massa. O topo da parede afina até um fio de corte de 0,4 mm de largura. Os espaços internos do contorno, como o miolo de um e ou de um a, ganham paredes próprias, então também são recortados do biscoito. Essas paredes internas formam um sólido à parte no conjunto, chamado {{ui:cookieCutter.part.innerWalls}}: para só marcar um texto ou um padrão na massa, em vez de recortá-lo, diminua a altura delas no painel de propriedades. Com uma parede de 15 mm e uma massa de 5 mm de espessura, paredes internas de 12 mm deixam uma marca de 2 mm de profundidade. Paredes internas mais baixas que a parede externa têm o topo plano em vez do fio de corte: elas só marcam, e um fio deixaria pontas finas que quebram e sulcos que prendem massa. Se quiser um fio nelas, ajuste no painel de propriedades. Duas pontes do lado da aba, onde a mão aperta, prendem cada parede interna à parede que a cerca. As pontes ficam distribuídas em volta da parede interna e têm 4 mm de largura e 3 mm de altura. Cada ponte se apoia nas paredes com toda a sua largura, no meio de um trecho que acompanha o contorno, sem atravessar outra peça. Peças lado a lado, como as letras de um nome, também são ligadas entre si, começando pelas mais próximas, de modo que as pontes formam uma rede por todas elas e até uma letra no meio de uma palavra fica presa. Um clique na ferramenta abre uma pequena janela, onde você pode escolher uma {{ui:cookieCutter.support.plate}} em vez das pontes: ela preenche todo o contorno do lado em que você aperta, é mais firme e adere melhor à mesa de impressão, mas impede que você solte a massa empurrando por trás. Com {{ui:cookieCutter.fillet}}, você cria pequenas inclinações de 45° onde as paredes se apoiam na aba, nas pontes ou na placa, para que partes finas, como o pingo de um i, não quebrem; essas inclinações formam um sólido à parte no conjunto. Na mesma janela você também define quanto reduzir a altura das paredes internas e se quer espelhar o contorno; os valores ficam guardados para o próximo cortador. Você ajusta a altura das paredes internas e da aba no painel de propriedades. O cortador substitui a seleção por um conjunto de sólidos de esboço. Use {{ui:group.edit}} para abri-lo. A parede, as paredes internas e a aba usam os modos de preenchimento de esboço, com um traço por fora da silhueta: no painel de propriedades, você muda a espessura, a altura ou a cor de cada parte e ajusta o {{ui:prop.sketchCuttingEdge}} da parede (0 deixa o topo plano). Onde uma curva muito fechada não deixa espaço para chanfrar os dois lados, a parede é chanfrada só por fora, até o mesmo fio de corte. Onde um contorno não pode ser chanfrado de jeito nenhum (um logotipo com pontas agudas, um contorno obtido dos triângulos de um sólido), o fio de corte é feito em degraus finos de 0,1 mm, que não se distinguem da inclinação numa impressão com camadas de 0,2 mm; uma parede assim é uma malha de triângulos, e não um sólido exato. Para manter o contorno como foi desenhado, espelhe o cortador de volta com {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Uma imagem PNG ou JPG também serve: ao ser importada, ela é contornada e vira um sólido de esboço, e o cortador segue esse contorno.

{{ui:editor.tool.loftSketches}} une dois sólidos de esboço ou SVGs importados em um único sólido, com o contorno do sólido de baixo na base, o do sólido de cima no topo e paredes retas entre eles. Assim você faz um funil, uma peça de transição de quadrado para redondo ou uma moldura que afunila para cima. Coloque os dois sólidos um acima do outro, na posição desejada (deslocados e girados, se quiser), selecione os dois e clique na ferramenta. A transição vai da base do sólido inferior ao topo do superior.

Cada um dos dois precisa de exatamente um contorno. Se um deles tiver vãos, o outro precisa ter a mesma quantidade. A transição também liga esses vãos: dois anéis, por exemplo, formam uma peça oca. Um esboço feito como traço (traço externo, interno ou centralizado no painel de propriedades) conta como um anel desses. Um SVG importado chega preenchido; para transformá-lo em anel, escolha um dos modos de traço no painel de propriedades. Os dois sólidos precisam estar deitados; a ferramenta não aceita sólidos inclinados.

A transição é um sólido CAD exato; as ferramentas de aresta e a exportação STEP a tratam como tal. Os dois esboços ficam guardados dentro dela. Use {{ui:group.edit}} para editá-los como um grupo de união. Se você mover ou alterar um dos sólidos, ou editar seu esboço, a transição é reconstruída ao clicar em {{ui:group.done}}. {{ui:editor.tool.ungroup}} separa os dois esboços de novo. Para dois retângulos, círculos ou polígonos, você também pode usar a forma Transição e definir suas extremidades com números.

## Recortando um sólido de outro

Para peças que precisam encaixar, um eixo em uma bucha ou um parafuso em uma caixa, você faz uma peça e a recorta da outra. Selecione os dois sólidos e clique em {{ui:editor.tool.cutOut}} na área {{ui:editor.group.combine}}, ou dê um clique direito e escolha {{ui:editor.tool.cutOut}} no menu. O painel nomeia a peça que é mantida e o sólido que recebe a cavidade; layerling escolhe o menor como peça, e {{ui:cutOut.swap}} inverte. {{ui:cutOut.clearance}} deixa a cavidade maior que a peça nessa medida, de cada lado: com 0, o encaixe é exato; 0,2 mm é uma folga comum para um encaixe impresso. {{ui:cutOut.apply}} recorta uma cópia da peça do outro sólido e deixa a própria peça onde está. O resultado é um grupo de união: {{ui:editor.tool.ungroup}} separa o recorte de novo. Uma folga exige que a peça seja um sólido exato, como na ferramenta {{ui:editor.tool.offset}}, que o recorte usa para isso.

## Editando um grupo de união

Se um furo ficou pequeno demais, você não precisa desfazer o grupo de união e montar tudo de novo. Selecione o grupo de união e clique em {{ui:group.edit}} no painel de propriedades, no ícone de pasta na lista de objetos, ou pressione [[E]]. Um clique duplo no grupo de união faz o mesmo, como no Tinkercad, e num conjunto também; se preferir que não, desligue {{ui:workspace.doubleClickOpensGroup}} nas configurações. Uma peça só começa a se mover depois que o ponteiro foi arrastado alguns pixels, então um clique ou clique duplo tremido não a desloca. As peças agora ficam separadas, e você as altera com qualquer ferramenta: aumentar um orifício, mover um sólido, adicionar um orifício.

![O grupo de união em edição: a barra embaixo tem Cancelar e Concluído, e a lista de objetos mostra as peças.](shot:open-group)

Uma barra aparece na parte de baixo da área de trabalho. {{ui:group.done}} reconstrói o grupo de união, com o nome, a cor e o estado de sólido ou orifício. {{ui:common.cancel}} o devolve sem alterações.

Se uma das peças for ela mesma um grupo de união, você pode editá-la do mesmo jeito, e assim por diante, até onde o seu projeto for. A barra mostra onde você está, por exemplo "Suporte › Ressalto do parafuso". {{ui:group.done}} e {{ui:common.cancel}} sempre concluem o grupo de união mais interno e levam você um nível para fora. Enquanto você está dentro de um grupo de união, só os grupos de união entre as peças dele podem ser editados; para editar outro, conclua primeiro.

Ao contrário de {{ui:editor.tool.ungroup}}, que desfaz um grupo de união de vez, editar mantém o grupo: o nome e as configurações ficam, e você sempre pode voltar com {{ui:common.cancel}}.

Uma observação: arredondamentos e chanfros que você aplicou no grupo de união **inteiro** se perdem na reconstrução. A barra mostra esse aviso.

## Dividindo

{{ui:editor.tool.split}}, na área {{ui:editor.group.modify}}, corta a seleção em duas com um plano, por exemplo uma peça grande demais para a mesa de impressão, ou uma cujo interior você quer ver. Selecione um ou mais sólidos ou orifícios e clique em {{ui:editor.tool.split}}. Um plano translúcido mostra exatamente onde o corte vai passar, e uma linha branca o marca nos próprios sólidos, onde o plano os encontra; nada muda até você aplicar.

- {{ui:split.orientation}}: **X** faz um corte vertical entre esquerda e direita, **Y** entre frente e trás, **Z** um corte horizontal entre cima e baixo. Os eixos têm os mesmos nomes do cartão Posição, com Z para cima. O plano começa paralelo ao plano de trabalho, então na mesa com Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} deita o plano paralelo ao plano de trabalho, {{ui:split.workplaneAcrossX}} e {{ui:split.workplaneAcrossY}} o deixam em pé, perpendicular a ele, atravessando a direção X ou Y dele. Onde a origem do plano de trabalho cruza a seleção, o plano passa por essa origem; senão, pelo meio. Assim você coloca o plano de trabalho numa face inclinada com [[W]] e corta bem ali, sem mexer nos controles deslizantes.
- {{ui:split.position}}: onde o plano cruza, pelo controle deslizante ou digitando o valor. Ele começa no meio. Você também pode arrastar a ponta da seta no plano; o plano se move ao longo da seta em incrementos de 0,1 mm.
- {{ui:split.pickFace}}, o botão ao lado da posição, deita o plano sobre uma face: clique nele e depois na face. Orientação, as duas rotações e a posição são ajustadas para combinar. Enquanto você escolhe, um plano azul sob o ponteiro mostra a face que será usada. Uma face de um sólido que não está selecionado também serve, para alinhar o corte com ela, mas o plano fica dentro da seleção. [[Esc]] interrompe a escolha e deixa o plano onde estava.
- Os dois controles deslizantes de rotação abaixo giram o plano em torno dos outros dois eixos, até 180° para cada lado, para um corte em ângulo. Eles podem ser combinados.

{{ui:split.apply}} ou [[Enter]] faz o corte, [[Esc]] cancela (enquanto você escolhe uma face, o primeiro [[Esc]] só interrompe a escolha). Cada objeto que o plano cruza vira dois sólidos fechados, com o nome do seu lado, por exemplo "Caixa (Z+)" e "Caixa (Z-)"; os objetos que ele não cruza ficam como estão. Um orifício vira dois orifícios, e um sólido vazado mantém o seu espaço interno. As duas metades ficam onde estavam; para imprimir, deite cada uma sobre a face cortada com {{ui:editor.tool.layFlat}}.

As metades são malhas simples: configurações como os lados de um cilindro ou as letras de um texto se perdem, então ajuste isso antes. [[Ctrl]]+[[Z]] traz o original de volta num só passo. Objetos bloqueados e ocultos não podem ser divididos.

Uma malha importada precisa de uma superfície fechada para ser dividida, agrupada ou recortada. Se ela tiver aberturas, como os olhos de uma figura deixados abertos ou uma rachadura num escaneamento, layerling as fecha antes com uma tampa plana e diz quantas fechou. Ele fecha qualquer abertura pequena e qualquer abertura plana, seja do tamanho que for; uma abertura grande cuja borda não está toda no mesmo plano fica por sua conta, e a mensagem avisa. Feche-a no programa de onde o modelo veio, ou com uma ferramenta de reparo de malha, e importe de novo.

## Separando peças

Se uma forma é composta de vários pedaços separados, como um texto feito de letras soltas, {{ui:inspector.separateParts}} a divide em formas independentes. A opção também está no menu que aparece com um clique direito na forma.

> **Dica:** Faça os orifícios sempre um pouco mais compridos que a peça que eles devem atravessar. Se o orifício termina exatamente rente à face, às vezes sobra uma película finíssima. Um milímetro a mais garante o corte.
