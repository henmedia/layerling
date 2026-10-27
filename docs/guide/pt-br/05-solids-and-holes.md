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

Selecione os sólidos e o(s) orifício(s) e clique em {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Agora os orifícios tiram o material dos sólidos em que tocam. O que sobra é uma única forma nova.

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
- Os orifícios não cortam nada. Quando você agrupa o conjunto com outras peças, os orifícios dele cortam essas peças, mas continuam sem cortar os sólidos do próprio conjunto, como no Tinkercad. Assim, por exemplo, um pino com o seu orifício ao lado pode ser usado de novo e de novo como conjunto.
- Ao exportar em STL, 3MF ou OBJ, cada peça é um sólido separado; em 3MF e OBJ, com a sua cor.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) desfaz um conjunto, e [[E]] o abre para edição, como um grupo de união. Chanfro, arredondamento e vazar não funcionam num conjunto, porque ele não é um único sólido: para isso, agrupe-o ou trabalhe nas peças uma por uma. Se um orifício do conjunto também deve cortar os sólidos do próprio conjunto, desfaça o conjunto e agrupe as peças ([[Ctrl]]+[[G]]).

## Interseção

{{ui:editor.tool.intersect}} mantém só o que dois ou mais sólidos têm em comum. Coloque duas formas uma sobre a outra, sobrepostas, selecione as duas e clique em {{ui:editor.tool.intersect}}. Assim um cilindro e uma caixa viram uma peça com um lado redondo e um lado reto. Um grupo de união entra na interseção do jeito que aparece, com os orifícios já recortados. Se um orifício também estiver selecionado, o que sobra é o que todos os sólidos têm em comum com todos os orifícios. Se as formas não têm nada em comum, uma mensagem informa que nada foi alterado. Ao lado de {{ui:editor.tool.intersect}}, o botão {{ui:editor.tool.intersectPreview}} exibe a parte em comum antes de você aplicá-la: as formas selecionadas ficam transparentes, e o que elas têm em comum aparece em verde. Selecione e mova cada forma separadamente, e a parte verde acompanha; {{ui:editor.tool.intersect}} aplica, [[Esc]] fecha a prévia.

{{ui:editor.tool.hull}} envolve as formas selecionadas em um único sólido convexo, como se fossem embaladas a vácuo: o menor sólido sem reentrâncias que contém todas elas. Uma meia esfera sobre um cilindro vira uma cúpula sem degrau, quatro cilindros nos cantos viram uma caixa de cantos arredondados, e duas esferas, uma cápsula. Os orifícios da seleção são recortados da envoltória depois. A envoltória guarda as peças: {{ui:group.edit}} a abre como um grupo de união, e se você mover uma peça ali e clicar em {{ui:group.done}}, a envoltória é reconstruída. A envoltória é uma malha, então formas redondas mostram facetas, e as ferramentas de aresta funcionam nela como em qualquer malha.

## Recortando um sólido de outro

Para peças que precisam encaixar, um eixo em uma bucha ou um parafuso em uma caixa, você faz uma peça e a recorta da outra. Selecione os dois sólidos e clique em {{ui:editor.tool.cutOut}} na área {{ui:editor.group.combine}}, ou clique com o botão direito e escolha lá. O painel nomeia a peça que é mantida e o sólido que recebe a cavidade; layerling toma o menor como peça, e {{ui:cutOut.swap}} inverte. {{ui:cutOut.clearance}} deixa a cavidade maior que a peça nessa medida, de cada lado: com 0, o encaixe é exato; 0,2 mm é uma folga comum para um encaixe impresso. {{ui:cutOut.apply}} recorta uma cópia da peça do outro sólido e deixa a própria peça onde está. O resultado é um grupo de união: {{ui:editor.tool.ungroup}} separa o recorte de novo. Uma folga exige que a peça seja um sólido exato, como na ferramenta {{ui:editor.tool.offset}}, que o recorte usa para isso.

## Editando um grupo de união

Se um furo ficou pequeno demais, você não precisa desfazer o grupo de união e montar tudo de novo. Selecione o grupo de união e clique em {{ui:group.edit}} no painel de propriedades, no ícone de pasta na lista de objetos, ou pressione [[E]]. Um clique duplo no grupo de união faz o mesmo, como no Tinkercad, e num conjunto também; se preferir que não, desligue {{ui:workspace.doubleClickOpensGroup}} nas configurações. Uma peça só começa a se mover depois que o ponteiro foi arrastado alguns pixels, então um clique ou clique duplo tremido não a desloca. As peças agora ficam separadas, e você as altera com qualquer ferramenta: aumentar um orifício, mover um sólido, adicionar um orifício.

![O grupo de união em edição: a barra embaixo tem Cancelar e Concluído, e a lista de objetos mostra as peças.](shot:open-group)

Uma barra aparece na parte de baixo da área de trabalho. {{ui:group.done}} reconstrói o grupo de união, com o nome, a cor e o estado de sólido ou orifício. {{ui:common.cancel}} o devolve sem alterações.

Se uma das peças for ela mesma um grupo de união, você pode editá-la do mesmo jeito, e assim por diante, até onde o seu projeto for. A barra mostra onde você está, por exemplo "Suporte › Ressalto do parafuso". {{ui:group.done}} e {{ui:common.cancel}} sempre concluem o grupo de união mais interno e levam você um nível para fora. Enquanto você está dentro de um grupo de união, só os grupos entre as peças dele podem ser editados; para editar outro, conclua primeiro.

Ao contrário de {{ui:editor.tool.ungroup}}, que desfaz um grupo de união de vez, editar mantém o grupo: o nome e as configurações ficam, e você sempre pode voltar com {{ui:common.cancel}}.

Uma observação: arredondamentos e chanfros que você aplicou no grupo de união **inteiro** se perdem na reconstrução. A barra mostra esse aviso.

## Dividindo

{{ui:editor.tool.split}}, na área {{ui:editor.group.modify}}, corta a seleção em duas com um plano, por exemplo uma peça grande demais para a mesa de impressão, ou uma cujo interior você quer ver. Selecione um ou mais sólidos ou orifícios e clique em {{ui:editor.tool.split}}. Um plano translúcido mostra exatamente onde o corte vai passar, e uma linha branca o marca nos próprios sólidos, onde o plano os encontra; nada muda até você aplicar.

- {{ui:split.orientation}}: **X** faz um corte vertical entre esquerda e direita, **Y** entre frente e trás, **Z** um corte horizontal entre cima e baixo. Os eixos têm os mesmos nomes do cartão Posição, com Z para cima. O plano começa paralelo ao plano de trabalho, então na mesa com Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} deita o plano paralelo ao plano de trabalho, {{ui:split.workplaneAcrossX}} e {{ui:split.workplaneAcrossY}} o deixam em pé, perpendicular a ele, atravessando a direção X ou Y dele. Onde a origem do plano de trabalho cruza a seleção, o plano passa por ela; senão, pelo meio. Assim você coloca o plano de trabalho numa face inclinada com [[W]] e corta bem ali, sem mexer nos controles deslizantes.
- {{ui:split.position}}: onde o plano cruza, pelo controle deslizante ou digitando o valor. Ele começa no meio. Você também pode arrastar a ponta da seta no plano; o plano se move ao longo da seta em passos de 0,1 mm.
- {{ui:split.pickFace}}, o botão ao lado da posição, deita o plano sobre uma face: clique nele e depois na face. Orientação, as duas rotações e a posição são ajustadas para combinar. Enquanto você escolhe, um plano azul sob o ponteiro mostra a face que ele vai usar. Uma face de um sólido que não está selecionado também serve, para alinhar o corte com ela, mas o plano fica dentro da seleção. [[Esc]] para a escolha e deixa o plano onde estava.
- Os dois controles deslizantes de rotação abaixo giram o plano em torno dos outros dois eixos, até 180° para cada lado, para um corte em ângulo. Eles podem ser combinados.

{{ui:split.apply}} ou [[Enter]] faz o corte, [[Esc]] cancela (enquanto você escolhe uma face, o primeiro [[Esc]] só para a escolha). Cada objeto que o plano cruza vira dois sólidos fechados, com o nome do seu lado, por exemplo "Caixa (Z+)" e "Caixa (Z-)"; os objetos que ele não cruza ficam como estão. Um orifício vira dois orifícios, e um sólido vazado mantém o seu espaço interno. As duas metades ficam onde estavam; para imprimir, deite cada uma sobre a face cortada com {{ui:editor.tool.layFlat}}.

As metades são malhas simples: configurações como os lados de um cilindro ou as letras de um texto se perdem, então ajuste isso antes. [[Ctrl]]+[[Z]] traz o original de volta num só passo. Objetos bloqueados e ocultos não podem ser divididos.

Uma malha importada precisa de uma superfície fechada para ser dividida, agrupada ou recortada. Se ela tiver aberturas, como os olhos de uma figura deixados abertos ou uma rachadura num escaneamento, layerling as fecha antes com uma tampa plana e diz quantas fechou. Ele fecha qualquer abertura pequena e qualquer abertura plana, seja do tamanho que for; uma abertura grande cuja borda não está toda no mesmo plano fica por sua conta, e a mensagem avisa. Feche-a no programa de onde o modelo veio, ou com uma ferramenta de reparo de malha, e importe de novo.

## Separando peças

Se uma forma é composta de vários pedaços separados, como um texto feito de letras soltas, {{ui:inspector.separateParts}} a divide em formas independentes. A opção também está no menu que aparece com um clique direito na forma.

> **Dica:** Faça os orifícios sempre um pouco mais compridos que a peça que eles devem atravessar. Se o orifício termina exatamente rente à face, às vezes sobra uma película finíssima. Um milímetro a mais garante o corte.
