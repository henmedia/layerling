---
title: Preparação para a impressão 3D
summary: Como escolher a sua impressora, ser avisado quando algo não cabe e deitar a peça do jeito certo.
---

## Escolhendo a sua impressora

Abra as configurações (a engrenagem na área {{ui:editor.group.manage}} da barra de opções, {{ui:editor.workspaceSettings}}) e vá para a área {{ui:workspace.workplane}}. Em {{ui:workspace.printer}} você escolhe a sua impressora numa lista de mais de 220 modelos comuns, entre eles Bambu Lab, Prusa, Creality, Anycubic, Elegoo e muitos outros.

![As configurações do plano de trabalho com uma impressora escolhida. A mesa de impressão e a altura máxima de impressão vêm do perfil do fatiador.](shot:settings-workplane)

Três coisas acontecem:

- O plano de trabalho assume o tamanho da mesa de impressão.
- No canto do plano de trabalho aparecem o nome da impressora e o volume de impressão dela. Se o texto atrapalhar, desligue-o com {{ui:workspace.showPlateLabels}} em {{ui:workspace.workplane}}; isso vale também para o nome do projeto, na frente à esquerda.
- layerling **avisa** quando algo não cabe.

Os perfis de impressora vêm do OrcaSlicer, então são os mesmos que o seu fatiador conhece. Se preferir trabalhar sem impressora, escolha {{ui:workspace.printerNone}}. Você também pode definir o tamanho do plano de trabalho à mão.

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

## Espessura de parede, folga e chanfros

- As paredes devem ter pelo menos a largura de duas linhas de extrusão, ou seja, 0,8 mm com um bico de 0,4 mm. Peças resistentes precisam de 1,2 a 2 mm.
- Onde duas peças se encaixam uma na outra, é preciso folga: normalmente de 0,2 a 0,4 mm, dependendo da impressora. Faça um pequeno par de teste antes de imprimir a peça grande.
- Muita gente faz um chanfro leve na aresta de baixo, a que fica sobre a mesa. Isso evita que a primeira camada se espalhe ("pé de elefante").

## Quando estiver pronto

Escolha {{ui:editor.export}} e depois **STL** ou **3MF**. STL é o formato mais simples. 3MF guarda os nomes e as cores de cada sólido e por isso é prático quando você imprime em várias cores. A janela de exportação também mostra quantos gramas e metros de filamento a peça gastaria impressa maciça. Mais em [Arquivos e salvamento](chapter:files-and-saving).
