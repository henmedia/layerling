---
title: Atalhos de teclado
summary: Todas as teclas num só lugar, tiradas direto do programa, então a lista está sempre certa.
---

Os atalhos funcionam enquanto o plano de trabalho estiver em foco. Enquanto você digita num campo, eles não atrapalham. No Mac, [[Cmd]] vale sempre que aqui aparece [[Ctrl]].

No editor, {{ui:editor.keyboardShortcuts}} na área {{ui:editor.group.help}} abre a mesma lista numa janela. O botão de impressora na janela ({{ui:shortcuts.print}}) imprime só a lista, em preto sobre branco, a lista inteira em um lado de uma folha A4 ou Carta, em três colunas, para deixar à mão como referência rápida. Na janela de impressão do navegador, você também pode salvar como PDF.

A caixa no alto da janela pesquisa a lista: ela mantém só os atalhos cuja frase, grupo ou teclas contêm todas as palavras digitadas, então "arredondamento" ou "ctrl+z" deixa só essas linhas. Maiúsculas e acentos não importam, e uma única letra ou dígito encontra essa tecla e as palavras que começam com ela. O X no fim da caixa a esvazia; com a caixa vazia, a lista inteira volta. O botão de impressora imprime o que a janela mostra, então depois de uma pesquisa imprime só os atalhos encontrados.

![A janela de atalhos de teclado no editor.](shot:shortcuts)

## Pesquisa de comandos

Não acha uma ferramenta? Pressione [[Ctrl]]+[[K]] ou clique na lupa na área {{ui:editor.group.help}} e digite o que você procura: uma ferramenta ("arredondamento", "espelhar"), uma forma ("cilindro") ou um comando ("exportar", "desfazer"). Navegue com as setas e pressione [[Enter]], ou clique na entrada.

- A pesquisa entende a palavra em português, em inglês e em alemão, e ignora maiúsculas e acentos: "aushoehlen" encontra {{ui:editor.tool.hollow}}.
- Cada entrada mostra as teclas que fazem o mesmo e a área da barra de opções onde ela fica, para você aprender onde está.
- Entradas em cinza não podem ser executadas agora, na maioria das vezes porque nada está selecionado. Elas continuam na lista para que a pesquisa ainda mostre onde a ferramenta fica.

O guia que você está lendo também tem uma caixa de pesquisa, no topo de cada página: digite uma ou duas palavras e ela lista as seções que contêm todas elas, com as palavras encontradas destacadas. Clique numa delas, ou pressione [[Enter]] para a primeira, para ir direto até lá.
- O nome de uma forma adiciona essa forma ao plano de trabalho, como clicar nela no menu de formas.
- Com o campo vazio, a pesquisa de comandos lista no topo os comandos que você usou por último.
- O nome de um sólido do seu projeto encontra esse sólido e o seleciona, o que ajuda num projeto com muitas peças. Os sólidos só aparecem depois que você digita.
- A pesquisa de comandos também funciona no modo de esboço, com as ferramentas de esboço.

## Ajuda interativa

Não acha onde ler sobre um botão ou um campo? Deixe o programa levar você até lá. Clique no ponto de interrogação na área {{ui:editor.group.help}}, ou pressione [[Shift]]+[[F1]]. O ponteiro vira um ponto de interrogação, e o que estiver embaixo dele fica contornado.

- Clique num botão, num campo, numa chave, numa alça, numa área da barra de opções ou na barra de título de uma janela. O elemento **não** faz o que normalmente faz. Em vez disso, abre uma pequena janela com o nome do elemento, um resumo curto da parte deste guia que fala dele, até dois outros lugares que o mencionam e o botão {{ui:interactiveHelp.open}}.
- A ajuda é sobre o elemento que você apontou, não sobre a janela inteira em volta dele. Um elemento sem nome próprio usa o mais próximo em volta dele; dentro de uma janela, ele recorre ao ponto de interrogação dessa janela.
- {{ui:interactiveHelp.open}} abre o guia nessa seção numa nova aba. Na nova aba, a seção fica com um contorno colorido, do título até o fim, para você ver onde ela começa e termina.
- Se o guia não fala nada sobre o elemento, a janela diz isso e oferece {{ui:interactiveHelp.search}}.
- [[Esc]], ou o ponto de interrogação de novo, sai do modo. Numa tela sensível ao toque não existe passar o mouse por cima: um toque num elemento abre a janela na hora.

A janela se move pela barra de título, como as outras janelas. O programa encontra a seção pelo nome do elemento (o texto de um botão, o nome de um campo), porque este guia usa os nomes dos botões exatamente como aparecem no programa. Ele procura na mesma pesquisa da caixa no topo de cada página do guia, no idioma que você está usando, e roda inteiramente no seu navegador.

{{shortcuts}}
