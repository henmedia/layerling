---
title: Preparação para a impressão 3D
summary: Como escolher a sua impressora, ser avisado quando algo não cabe e deitar a peça do jeito certo.
---

## Escolhendo a sua impressora

Abra as configurações (a engrenagem na linha do título, {{ui:editor.workspaceSettings}}) e vá para a área {{ui:workspace.workplane}}. Em {{ui:workspace.printer}} você escolhe a sua impressora numa lista de mais de 230 modelos comuns, entre eles Bambu Lab, Prusa, Creality, Anycubic, Elegoo e muitos outros.

![As configurações do plano de trabalho com uma impressora escolhida. A mesa de impressão e a altura máxima de impressão vêm do perfil do fatiador.](shot:settings-workplane)

Três coisas acontecem:

- O plano de trabalho assume o tamanho da mesa de impressão.
- No canto do plano de trabalho aparecem o nome da impressora e o volume de impressão dela. Se o texto atrapalhar, desligue-o com {{ui:workspace.showPlateLabels}} em {{ui:workspace.workplane}}; isso vale também para o nome do projeto, na frente à esquerda.
- layerling **avisa** quando algo não cabe.

Os perfis de impressora vêm do OrcaSlicer, então são os mesmos que o seu fatiador conhece. Se preferir trabalhar sem impressora, escolha {{ui:workspace.printerNone}}. Você também pode definir o tamanho do plano de trabalho à mão.

Impressoras delta, como as da FLSun ou da SeeMeCNC ou a Anycubic Predator, imprimem sobre uma mesa redonda. Com uma delas, o plano de trabalho também fica redondo e tão largo quanto a mesa, e um sólido é grande demais assim que passa da borda. Um sólido redondo é medido pelo próprio contorno, não pela caixa em volta dele, então cabe até um cilindro quase tão largo quanto a mesa.

## Quando algo não cabe

Um sólido que passa da borda da mesa de impressão fica marcado. Uma mensagem diz quais lados passam e quanto. O mesmo vale se a peça for **alta demais**: a altura conta a partir do sólido mais baixo, do mesmo jeito que o fatiador apoia o modelo na mesa.

![A caixa é mais larga que a mesa de impressão da Bambu Lab A1 mini. A mensagem embaixo diz quanto ela passa.](shot:printer-overhang)

O aviso não impede você de continuar trabalhando. É uma dica, para você não descobrir só no fatiador que a peça é grande demais. Uma peça grande demais muitas vezes pode ser dividida: corte-a em duas com {{ui:editor.tool.split}} e imprima as duas metades separadamente.

Se você deixa peças ao lado da mesa de propósito, clique no pequeno X da mensagem. O aviso então some só para esses sólidos. Se um deles voltar a caber e depois você o tirar da mesa de novo, ou se outro sólido passar da borda, a mensagem volta. Sólidos ocultos nunca contam, então ocultar as peças deixadas ao lado também funciona.

## Deitando a peça do jeito certo

O jeito como a peça fica na mesa decide a resistência e a aparência dela. Duas ferramentas na área {{ui:editor.group.arrange}} ajudam:

- {{ui:editor.tool.layFlat}}: clique numa face e a peça fica com esse lado para baixo. A melhor direção de impressão em um clique.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): apoia a peça no plano de trabalho quando ela está flutuando em algum lugar no ar.

Algumas regras práticas para a direção de impressão:

- Faces grandes e planas para baixo. Elas aderem melhor.
- Deite peças compridas que sofrem esforço de modo que as camadas não fiquem perpendiculares à carga. É entre as camadas que a peça é mais fraca.
- Evite saliências mais inclinadas que 45°, ou adicione suportes a elas no fatiador.

## Encontrando saliências

No menu ao lado do olho ({{ui:editor.group.visibility}}), **Mostrar saliências** liga a exibição das saliências. Toda face que aponta para baixo com inclinação maior que 45° fica então hachurada em vermelho e branco: é ali que a impressora precisaria de suportes. O que está apoiado na mesa fica sem marcação. Assim você vê, enquanto modela, se uma esfera, um arco ou um furo horizontal imprime sem suportes; o [furo em gota](chapter:threads-and-mechanics) foi feito exatamente para isso. Gire a peça ou deite-a sobre outra face com {{ui:editor.tool.layFlat}}, e a hachura acompanha na hora.

A inclinação que a sua impressora aguenta é definida nas configurações, em {{ui:workspace.appearance}}: de 30° (cuidadoso) a 70° (para impressoras com boa refrigeração da peça). Uma face apoiada em outro sólido continua marcada: layerling só olha para a própria face.

## Nervuras de suporte para uma peça inclinada

Uma peça impressa inclinada sobre uma aresta, a 45° por exemplo, muitas vezes não precisa de suportes: as faces são íngremes o bastante. Mas ela se apoia numa aresta fina e pode tombar. A {{ui:supportRib.title}} a segura: uma nervura fina fica sob a face inferior a uma pequena distância, sobre um pé oval, e pontes minúsculas prendem a peça. Gire primeiro a peça sobre a aresta e deixe-a apoiada na mesa.

1. Selecione a peça e clique em {{ui:supportRib.title}} no grupo {{ui:editor.group.modify}} da faixa, clique com o botão direito na peça ou encontre-a com [[Ctrl]]+[[K]].
2. Clique na face inferior onde a nervura deve ficar. A face precisa estar voltada para baixo, inclinada entre 15° e 75° e chegar até a mesa; a nervura desce reta pela face a partir do seu clique.
3. Ajuste {{ui:supportRib.nozzle}}, {{ui:supportRib.layerHeight}} e {{ui:supportRib.firstLayer}} como no seu fatiador. A nervura tem duas linhas de bico de espessura e a folga até a peça meia linha; cada ponte tem uma linha de largura e exatamente uma camada de altura e fica sobre uma camada da impressão, para que o fatiador a imprima como uma única linha fina que se quebra de forma limpa. {{ui:supportRib.height}} diz até onde a nervura sobe pela face (até a metade no início) e {{ui:supportRib.bridgeSpacing}} a distância entre as pontes, em camadas inteiras.
4. Em {{ui:supportRib.more}} dá para ajustar à mão a espessura, a folga, a largura das pontes e a espessura do pé (até lá eles seguem o bico e as camadas), além da largura do pé e dos arredondamentos no pé e em cima.
5. {{ui:supportRib.apply}} adiciona a nervura. Com {{ui:supportRib.bundle}} (ligado no início) nervura e peça ficam agrupadas: movem-se juntas e vão para o fatiador como dois sólidos lado a lado, unidos pelas pontes na impressão.

A nervura é um sólido de malha: para mudá-la, apague-a e faça de novo. Cada clique faz uma nervura; para mais, clique em {{ui:supportRib.repick}} ou repita-a com {{ui:editor.tool.array}}. A nervura não pode entrar na peça em lugar nenhum, e a peça precisa estar sobre a mesa - senão a janela diz por quê. Seus ajustes ficam guardados neste navegador para a próxima nervura.

{{ui:clearance.title}} e {{ui:printCheck.title}} conhecem a nervura: que suas pontes entrem na peça e que a nervura e as pontes sejam finas e fiquem a uma camada de altura sobre a folga é proposital e não é avisado. Uma nervura feita no layerling 1.148.0 ainda não tem essa marca; faça-a de novo e as verificações a deixam de fora.

## Espessura de parede, folga e chanfros

- As paredes devem ter pelo menos a largura de duas linhas de extrusão, ou seja, 0,8 mm com um bico de 0,4 mm. Peças resistentes precisam de 1,2 a 2 mm.
- Onde duas peças se encaixam uma na outra, é preciso folga: normalmente de 0,2 a 0,4 mm, dependendo da impressora. Faça um pequeno par de teste antes de imprimir a peça grande.
- Muita gente faz um chanfro leve na aresta de baixo, a que fica sobre a mesa. Isso evita que a primeira camada se espalhe ("pé de elefante").

## A folga da sua impressora: o teste de encaixe

Toda impressora imprime furos um pouco menores e pinos um pouco mais grossos do que foram desenhados, cada uma na sua medida, então a folga de que duas peças impressas precisam é, no início, um palpite. Meça-a uma vez. Nas configurações, em {{ui:workspace.workplane}}, {{ui:workspace.fitTestMake}} coloca um teste de encaixe na mesa: uma placa de 60 × 20 × 4 mm com sete furos para um único pino de 5 mm, cada um desenhado com 5 mm mais duas vezes 0,05, 0,10, 0,15, 0,20, 0,25, 0,30 ou 0,40 mm, com o valor em relevo ao lado, e o próprio pino de 5 mm, em pé ao lado da placa, com um pequeno chanfro em cima. É feito de formas comuns, então imprime junto com o resto da mesa, sem suportes.

Imprima-o como está e depois empurre o pino, com a ponta chanfrada primeiro, nos furos, começando pelo mais apertado. **O furo mais justo em que o pino ainda gira** dá a folga da sua impressora. Digite o número dele em {{ui:workspace.printerPlay}} ou clique nele entre os valores abaixo do campo. A folga é por lado, em milímetros, e o navegador a guarda para todos os projetos; um campo vazio significa que ainda não foi medida.
Com várias impressoras, escolha primeiro em {{ui:workspace.printer}} aquela em que você imprime: cada impressora guarda sua própria folga, e os novos usos partem da folga da impressora definida para o projeto. Uma impressora sem folga própria usa a folga definida quando nenhuma impressora estava escolhida.

A partir daí, os novos usos partem da folga em vez do valor embutido: {{ui:lid.gap}} e {{ui:lid.hingePinPlay}} na ferramenta {{ui:editor.tool.lid}}, a folga de um novo {{ui:shape.dovetail}} e {{ui:shape.snapFit}}, {{ui:prop.clearance}} de uma nova porca ou furo roscado - o dobro da folga, porque essa é a folga em todo o diâmetro - e {{ui:clearance.threshold}} em {{ui:editor.tool.clearance}}. O mesmo vale para {{ui:split.connectorClearance}} dos pinos soltos e fixos e dos rabos de andorinha em {{ui:editor.tool.split}}. Enquanto um desses campos ainda tiver esse valor, "{{ui:printerPlay.fromFitTest}}" ao lado dele diz de onde vem o número. Uma dobradiça impressa no lugar e as articulações da ferramenta {{ui:editor.tool.flexi}} mantêm os seus 0,4 mm: impressas numa peça só, as suas folgas também precisam ficar abertas entre as camadas, o que um pino impresso à parte não mede. A folga para encaixar um ímã ou uma chave Gridfinity, e a folga para um soquete ou uma placa comprados, também mantêm os seus próprios valores. Os sólidos que já estão num projeto nunca mudam, nem um projeto que você abre.

## Verificar a impressão

{{ui:editor.tool.printCheck}}, ao lado de {{ui:editor.tool.clearance}} em {{ui:editor.group.combine}}, examina os objetos selecionados, ou todos os visíveis quando nada está selecionado, e diz numa janela o que daria errado na impressão. Cada uma das cinco linhas fica verde quando não encontrou nada, e laranja com o quê e onde quando encontrou:

- **{{ui:printCheck.thin.title}}**: lugares mais finos que duas linhas do bico - 0,8 mm com um bico de 0,4 mm. O fatiador omite uma parede assim ou a imprime como uma única linha fraca. No alto da janela você escolhe o seu bico em {{ui:printCheck.nozzle}} (de 0,2 a 0,8 com um clique, qualquer outro no campo). Os lugares finos são pintados de vermelho com uma grade clara sobre os corpos, e a linha diz o lugar mais fino e quanta superfície está fina demais. Lugares com menos de 1 mm² e arestas vivas, como a de uma cunha, ficam de fora.
- **{{ui:printCheck.floating.title}}**: um corpo, ou uma parte separada de um corpo, que não toca nem a mesa nem outra peça (com margem de 0,05 mm). Ele seria impresso no ar. Uma peça apoiada numa peça que está de pé não é problema.
- **{{ui:printCheck.contact.title}}**: uma peça na mesa cuja primeira camada é muito pequena para a sua altura, como uma esfera ou um cone sobre a ponta. Ela pode se soltar durante a impressão. O aviso aparece abaixo de 0,5 mm² de apoio, medido 0,1 mm acima da mesa, por milímetro de altura: uma esfera sempre fica abaixo disso, um cubo de 10 mm tem 10.
- **{{ui:printCheck.overhang.title}}**: os mesmos números de **Mostrar saliências**, com o ângulo ajustado lá.
- **{{ui:printCheck.openMesh.title}}**: uma malha importada com arestas abertas, ou arestas compartilhadas por três faces ou mais. O fatiador precisa então adivinhar onde fica o interior.

![Uma bandeja cuja parede direita tem só 0,6 mm: Verificar impressão a pinta de vermelho e a aponta na janela.](shot:print-check)

{{ui:printCheck.show}} numa linha leva a câmera até lá; seleciona as peças flutuantes, as que se apoiam em pouco e as malhas abertas, e nas saliências liga **Mostrar saliências**. Corpos que se sobrepõem são verificados unidos, como o fatiador os une. Se você mudar o desenho com a janela aberta, aparece {{ui:printCheck.stale}}; clique ali ou em {{ui:printCheck.checkAgain}}. [[Esc]] fecha a janela. Nada no desenho muda. Uma IA faz a mesma verificação com `layerling_check_print`.

## Quando estiver pronto

Escolha {{ui:editor.export}} e depois **STL** ou **3MF**. STL é o formato mais simples. 3MF guarda os nomes e as cores de cada sólido e por isso é prático quando você imprime em várias cores. A janela de exportação também mostra quantos gramas e metros de filamento a peça gastaria impressa maciça. Mais em [Arquivos e salvamento](chapter:files-and-saving).
