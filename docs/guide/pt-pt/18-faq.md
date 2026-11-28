---
title: Perguntas frequentes
summary: Respostas curtas ao que mais se pergunta, sobre guardar, modelos grandes, arredondamentos, IA e impressão, cada uma com o caminho para a explicação completa.
contents: questions
---

Cada resposta é curta e termina com o local deste guia que explica tudo ao pormenor. A caixa de pesquisa no topo encontra uma pergunta por qualquer palavra que contenha.

## Guardar e cópias de segurança

### Onde ficam guardados os meus projetos? Existe uma nuvem?

No navegador do teu próprio computador. Não há conta nem nuvem, e nada é carregado para a Internet; cada alteração é guardada automaticamente. Quem executa o layerling num servidor próprio também pode guardar aí os projetos numa pasta partilhada.

Mais informações: [Onde ficam os teus projetos](chapter:files-and-saving#where-your-designs-live)

### Os meus projetos desapareceram. O que aconteceu?

Os projetos ficam num único navegador de um único computador. Desaparecem quando os dados que o navegador guardava da página são apagados, e não aparecem noutro navegador nem noutro computador. O Safari no Mac, no iPhone e no iPad elimina os dados de uma página ao fim de sete dias sem visitas, a não ser que o layerling esteja instalado como aplicação. Se tiveres uma cópia de segurança, {{ui:dashboard.restoreBackup}} na página inicial recupera os projetos, com as respetivas pastas e imagens.

Mais informações: [Os teus projetos, a tua cópia de segurança](chapter:files-and-saving#your-designs-your-backup)

### Como faço uma cópia de segurança de tudo, também automaticamente para uma pasta?

{{ui:dashboard.backupAll}} na página inicial reúne todos os projetos num único ficheiro ZIP. Além disso, o layerling guarda por si próprio versões anteriores de cada projeto e, no Chrome e no Edge, pode gravar cada uma delas como ficheiro .lyl numa pasta à tua escolha. As versões guardadas no navegador perdem-se quando se perdem os dados do navegador, por isso não substituem o ZIP nem a pasta.

Mais informações: [Versões anteriores](chapter:files-and-saving#earlier-versions)

### Como levo um projeto para outro computador ou navegador?

Guarda-o como ficheiro .lyl a partir da janela de exportação e abre esse ficheiro no outro computador a partir da página inicial. Para todos os projetos de uma vez, usa {{ui:dashboard.backupAll}} aqui e {{ui:dashboard.restoreBackup}} lá; os projetos que já existam não são adicionados duas vezes.

Mais informações: [Fazer cópias de segurança e partilhar](chapter:files-and-saving#backing-up-and-passing-on)

### O que acontece quando limpo os dados do navegador?

Os projetos guardados nesse navegador são eliminados, tal como as versões anteriores que o layerling aí guardava. Um ZIP criado com {{ui:dashboard.backupAll}}, os teus ficheiros .lyl e uma pasta de cópias de segurança no teu disco não são afetados. Faz primeiro a cópia de segurança e só depois limpa.

Mais informações: [Os teus projetos, a tua cópia de segurança](chapter:files-and-saving#your-designs-your-backup)

### Como volto a um estado anterior?

Anular recua passo a passo. A vista do histórico mostra cada passo com um controlo deslizante sem alterar o projeto, e pode criar um projeto novo a partir de qualquer um deles. Para um estado de há umas horas ou da semana passada, a lista de versões anteriores abre uma versão antiga como projeto novo e deixa o atual como está.

Mais informações: [Olhar para trás: a vista do histórico](chapter:select-and-arrange#looking-back-the-history-view) e [Versões anteriores](chapter:files-and-saving#earlier-versions)

### O STL e o 3MF podem ir diretamente para a pasta do meu projeto? E como volto a ter uma transferência?

No Chrome e no Edge, a primeira exportação de um projeto pergunta onde guardar, e as exportações seguintes gravam no mesmo ficheiro sem perguntar. O Firefox e o Safari fazem sempre uma transferência. Se quiseres uma transferência de cada vez, ativa {{ui:workspace.stlAsDownload}} nas definições.

Mais informações: [Exportar](chapter:files-and-saving#exporting)

### A janela de gravação fechou-se e não há nenhum ficheiro. Porquê?

O navegador comunica uma janela que não conseguiu usar da mesma forma que uma que cancelaste, e um ficheiro que um antivírus bloqueie também não pode ser gravado. A mensagem no topo propõe então {{ui:status.saveAsDownload}}, que coloca o ficheiro nas tuas transferências. Para dispensar a janela de vez, ativa {{ui:workspace.lylAsDownload}} e {{ui:workspace.stlAsDownload}} nas definições.

Mais informações: [Fazer cópias de segurança e partilhar](chapter:files-and-saving#backing-up-and-passing-on)

## Instalação e atualizações

### Existe uma aplicação para transferir?

O layerling instala-se a partir do navegador: fica então com um ícone e uma janela próprios e arranca sem rede. Não há nenhum instalador para transferir, e o original está apenas em layerling.com. **Não transfiras nem executes um instalador "layerling" de nenhum outro site:** não vem do layerling e pode conter software malicioso. Para executares a tua própria cópia, há um arranque rápido para Windows e uma imagem Docker.

Mais informações: [Instalar como aplicação](chapter:offline-and-install#installing-as-an-app) e [Executar por conta própria](chapter:offline-and-install#running-it-yourself)

### O layerling funciona sem Internet?

Sim, depois da primeira visita arranca sem rede, de preferência instalado como aplicação. Há uma única coisa que só é carregada quando é precisa pela primeira vez: o núcleo CAD para a primeira exportação STEP, cerca de 22 MB.

Mais informações: [Instalar como aplicação](chapter:offline-and-install#installing-as-an-app)

### Como obtenho uma atualização?

Chega por si. Uma página aberta deteta uma versão nova e mostra um cartão com as novidades; {{ui:newVersion.reload}} guarda primeiro o projeto aberto e depois carrega a versão nova. A página inicial também indica quando há uma versão mais recente.

Mais informações: [Atualizações](chapter:offline-and-install#updates)

### Que navegadores e tablets funcionam?

Chrome, Edge, Firefox e Safari, num computador, num tablet ou num telemóvel; a vista 3D precisa de WebGL. Há algumas coisas que só o Chrome e o Edge conseguem fazer: gravar nos teus próprios ficheiros e pastas, usar a pasta de cópias de segurança e abrir ficheiros .lyl com um duplo clique. Num tablet, um dedo faz o que faz o botão esquerdo do rato.

Mais informações: [Dedos e caneta](chapter:tablet-and-touch#fingers-and-a-stylus)

## IA

### Qual é a forma mais fácil de configurar uma IA?

Dá a uma IA que possa trabalhar no teu computador o endereço `https://github.com/henmedia/layerling` e pede-lhe que configure por ti o layerling com o respetivo servidor MCP. Precisa de um programa como o separador Code da aplicação Claude, o Claude Code, o Codex, o Antigravity ou o Gemini CLI. Para Windows e Mac, o guia também apresenta os passos um a um.

Mais informações: [Passo a passo para principiantes](chapter:ai-with-mcp#step-by-step-for-beginners)

### Porque é que a IA não consegue aceder a layerling.com?

A ponte entre a IA e o editor só existe numa cópia do layerling executada no teu próprio computador. Em layerling.com está sempre desligada, e uma conversa no navegador não consegue instalar nada. Por isso, a IA precisa de um layerling iniciado localmente e de um programa que fale MCP.

Mais informações: [Configuração](chapter:ai-with-mcp#setting-up)

### Que IA funciona, e quanto custa?

Qualquer programa que fale MCP; o guia descreve o Claude, o Codex, o Gemini e o Antigravity. O layerling em si não custa nada. O custo da IA depende do respetivo fornecedor: o separador Code da aplicação Claude, por exemplo, faz parte dos planos pagos do Claude.

Mais informações: [Configuração](chapter:ai-with-mcp#setting-up)

### Que dados vão para o fornecedor da IA?

O que a IA lê: os objetos do projeto aberto e as imagens da vista que ela capta. Isso vai para o fornecedor do teu programa de IA como qualquer outra coisa que lá escrevas. A ponte em si é executada no teu computador, e sem uma IA nada sai dele.

Mais informações: [O que a IA pode fazer](chapter:ai-with-mcp#what-the-ai-can-do)

## Memória, velocidade e histórico

### Porque é que o layerling fica lento com o meu STL?

Um STL é uma malha de triângulos, e uma malha muito grande torna o editor mais lento, ocupa muita memória e torna a gravação demorada. O layerling avisa depois da importação a partir de 400 000 triângulos numa malha, ou de um milhão no projeto inteiro. Simplifica primeiro a malha, importa apenas as partes de que precisas ou constrói a peça com as formas do próprio layerling.

Mais informações: [Malhas grandes](chapter:files-and-saving#large-meshes)

### Porque faltam passos no meu histórico?

Há duas coisas que o encurtam. A definição {{ui:workspace.savedHistory}} mantém 100 passos por projeto, a não ser que a alteres, e os mais antigos são descartados. E quando um projeto é demasiado grande para ser guardado com o histórico completo, o layerling guarda-o com metade dos passos, depois novamente com metade, e avisa-te. O projeto em si é sempre guardado por inteiro.

Mais informações: [Histórico guardado](chapter:view-and-workplane#historico-guardado)

### O que faço quando o armazenamento do navegador está cheio?

Não feches nem recarregues o separador: as tuas alterações mais recentes só estão ali. Guarda primeiro uma cópia, exportando como .lyl. Depois liberta espaço: elimina passos na vista do histórico, remove projetos de que já não precises, ou faz uma cópia de segurança deles e elimina-os.

Mais informações: [Os teus projetos, a tua cópia de segurança](chapter:files-and-saving#your-designs-your-backup)

### O meu projeto é demasiado grande para ser guardado. E agora?

O histórico e as malhas dele ocupam em conjunto demasiado espaço. Antes de te avisar, o layerling já tentou com menos passos de histórico. Elimina o histórico na vista do histórico, simplifica as malhas importadas mais pesadas ou guarda um .lyl apenas com o estado atual.

Mais informações: [Fazer cópias de segurança e partilhar](chapter:files-and-saving#backing-up-and-passing-on) e [Simplificar uma malha importada](chapter:files-and-saving#simplifying-an-imported-mesh)

### O navegador ficou sem memória. O que ajuda?

Isto acontece com malhas de milhões de triângulos, em que um único passo precisa de mais memória do que a que um separador do navegador recebe. Reduz os triângulos das malhas importadas com {{ui:editor.tool.simplify}}, fecha outros separadores e tenta novamente. Quando acontece ao guardar, um histórico mais curto também ajuda.

Mais informações: [Malhas grandes](chapter:files-and-saving#large-meshes)

### Um projeto abre muito devagar ou não abre. O que posso fazer?

Na maioria dos casos, o histórico de passos para anular ficou muito grande. {{ui:dashboard.openWithoutHistory}}, no menu do projeto na página inicial, lê apenas o estado atual; os passos anteriores são eliminados definitivamente, por isso faz primeiro uma cópia de segurança do projeto se os quiseres manter. Uma versão anterior das cópias de segurança abre como um projeto novo.

Mais informações: [Fazer cópias de segurança e partilhar](chapter:files-and-saving#backing-up-and-passing-on)

### O layerling está aos soluços. Que definições ajudam?

{{ui:workspace.fastMode}}, nas definições, desativa as sombras, as linhas de aresta em todos os sólidos e a inércia da câmara, e desenha a vista apenas à resolução do ecrã. Verifica se o navegador usa a placa gráfica: em `chrome://gpu` ou `edge://gpu` deve aparecer «Hardware accelerated» junto a WebGL. A outra causa frequente são as malhas importadas grandes.

Mais informações: [Quando o layerling parece lento](chapter:view-and-workplane#quando-o-layerling-parece-lento)

### O editor fica parado ou calcula durante muito tempo. Espero ou recarrego?

Primeiro espera. Os cortes, os grupos e o trabalho nas arestas são calculados em segundo plano, e entretanto aparece {{ui:status.computing}}; as tarefas longas, como tornar um sólido oco, param por si com uma mensagem e não alteram nada. Se foi preciso reiniciar o núcleo CAD, a mensagem di-lo e não é necessário recarregar. Recarregar é seguro, porque cada alteração é guardada automaticamente, com uma exceção: enquanto o aviso vermelho {{ui:notice.designNotSavedTitle}} estiver visível, exporta primeiro um .lyl.

Mais informações: [Quando o layerling parece lento](chapter:view-and-workplane#quando-o-layerling-parece-lento)

### A vista 3D fica vazia, ou uma mensagem diz que não foi possível iniciá-la. E agora?

O navegador não conseguiu iniciar o WebGL, que desenha a vista 3D. A causa está no navegador ou no controlador gráfico, não no teu projeto, e os teus projetos guardados não são eliminados. Fecha outros separadores com conteúdo 3D e reinicia o navegador, ativa a aceleração por hardware, permite o WebGL se uma definição de privacidade ou uma extensão o bloquear, e atualiza o navegador e o controlador gráfico. Experimentar outro navegador é um teste rápido.

Mais informações: [Quando o layerling parece lento](chapter:view-and-workplane#quando-o-layerling-parece-lento)

## Modelos importados

### «Simplificar malha» ou «Converter em sólido exato»: qual escolho?

{{ui:editor.tool.simplify}} mantém uma parte dos triângulos, pelo que um modelo pesado fica mais leve; continua a ser uma malha. {{ui:editor.tool.makeExact}} reconstrói um modelo feito de planos, cilindros, cones e esferas como um verdadeiro sólido CAD, para que os arredondamentos e os chanfros sigam arestas limpas e uma exportação STEP leve faces reais. Aceita até 400 000 triângulos; uma figura ou uma digitalização continua a ser uma malha. Para uma peça técnica grande: simplifica primeiro, com {{ui:simplify.keepEdges}} ativado, e depois converte-a em sólido exato.

Mais informações: [Simplificar uma malha importada](chapter:files-and-saving#simplifying-an-imported-mesh) e [Converter uma malha importada em sólido exato](chapter:files-and-saving#making-an-imported-mesh-exact)

### Porque é que um corte falha, ou porque é que a minha malha «não é estanque»?

Um sólido só pode ser cortado quando a sua superfície é fechada. Se uma malha importada tiver falhas, o layerling indica o nome da peça e o número de arestas abertas e deixa-a de fora. Os buracos pequenos são fechados por ele próprio; os maiores têm de ser reparados no programa de onde veio o modelo ou numa ferramenta de reparação de malhas. A verificação de impressão mostra que sólido está aberto.

Mais informações: [Verificar a impressão](chapter:printing#checking-the-print)

### Como importo corretamente um SVG?

Um SVG entra como um sólido de esboço, com 4 mm de altura, e os seus pontos podem ser alterados no modo de esboço. Escreve a largura em milímetros na janela de importação antes de importar; sem um número, mantém o seu próprio tamanho. Os contornos que se cruzam consigo próprios não podem tornar-se um sólido; ficam de fora e são contados: junta as partes sobrepostas e fecha os contornos no programa de desenho e importa novamente.

Mais informações: [Importar](chapter:files-and-saving#importing)

## Arredondamentos e chanfros

### Porque não é possível aplicar um arredondamento?

Na maioria dos casos é demasiado grande para o local: entraria nas faces vizinhas, ou a aresta curva mais apertado do que o raio. Muitas vezes bastam um ou dois milímetros a menos, e em ângulos agudos um arredondamento precisa de mais espaço do que o raio faz supor. Se não for possível arredondar as arestas em conjunto, escolhe menos de cada vez; a aresta que está a impedir é desenhada a vermelho. {{ui:edge.findLargest}} procura a medida por ti.

Mais informações: [Chanfrar e arredondar arestas](chapter:edges-and-hollowing#chamfering-and-filleting-edges)

### Porque desapareceram os meus arredondamentos depois de alterar o esboço?

Depois de {{ui:inspector.editSketch}}, o sólido é construído de novo e tem arestas novas. O layerling volta a aplicar os arredondamentos e os chanfros nas arestas que ficam onde estavam as antigas, desde que o sólido tenha tantas arestas como antes. Com um canto a mais ou a menos, ficam de fora, e a mensagem diz quantos. Anular repõe tudo.

Mais informações: [Criar um sólido a partir dele](chapter:sketches#making-a-body-from-it)

### Porque não consigo selecionar algumas arestas de um modelo importado?

O STL, o OBJ e o 3MF trazem apenas triângulos, e as ferramentas de arestas funcionam em malhas com um máximo de 4000 triângulos. {{ui:editor.tool.makeExact}} transforma uma peça técnica num verdadeiro sólido CAD, no qual um furo tem um único rebordo redondo que um arredondamento pode seguir. Um ficheiro STEP traz geometria exata desde o início.

Mais informações: [Converter uma malha importada em sólido exato](chapter:files-and-saving#making-an-imported-mesh-exact)

## Grupos, furos e medidas

### Porque é que os furos ficam ovais quando estico um grupo?

Um grupo redimensionado estica tudo o que contém, como se estivesse desenhado em borracha. Nas definições do grupo, escolhe {{ui:inspector.groupResizeKeepParts}} em {{ui:inspector.groupResize}}: as peças que atravessam o grupo esticam, e os furos e as peças pequenas mantêm o tamanho e a distância ao lado mais próximo.

Mais informações: [Redimensionar um grupo: manter furos e peças pequenas](chapter:solids-and-holes#resizing-a-group-keeping-holes-and-small-parts)

### Porque é que o agrupamento falha, ou porque é que o resultado tem falhas?

Ou uma peça não está fechada, e a mensagem diz qual, ou duas peças quase se encontram sem se tocarem realmente. Desagrupa, alinha as peças com exatidão ou altera um pouco um tamanho ou uma posição, e volta a agrupar. As malhas muito densas acima do limite para cortar malhas importadas não são unidas de todo.

Mais informações: [Agrupar](chapter:solids-and-holes#grouping)

### Como altero uma peça dentro de um grupo?

Seleciona o grupo e prime [[E]], ou faz duplo clique nele. As peças ficam então separadas e podem ser alteradas; ao concluíres, o grupo é construído de novo. Os arredondamentos e os chanfros aplicados ao grupo inteiro perdem-se quando este é reconstruído.

Mais informações: [Editar um grupo](chapter:solids-and-holes#editing-a-group)

### Como recupero uma peça de um estado anterior?

Abre a vista do histórico, move o controlo deslizante para o estado que ainda tinha a peça, clica na peça e escolhe {{ui:historyView.bringBack}}. É colocada no projeto atual uma cópia, tal como era e onde estava, com a hora no nome.

Mais informações: [Olhar para trás: a vista do histórico](chapter:select-and-arrange#looking-back-the-history-view)

## Impressão e exportação

### STL, 3MF, OBJ ou STEP: qual escolho?

Para a impressora, 3MF ou STL. O 3MF mantém cada sólido como uma peça com nome e cor; o STL é uma única malha de uma só cor. O OBJ também leva cores. O STEP destina-se a outros programas CAD: contém a geometria exata, com arredondamentos e chanfros.

Mais informações: [Exportar](chapter:files-and-saving#exporting)

### Como passam as minhas cores para o fatiador?

Exporta em 3MF. Cada sólido mantém a sua cor, e um sólido pintado com várias cores leva a pintura nas faces. Ao abrir, o Bambu Studio e o OrcaSlicer perguntam como as cores correspondem aos teus filamentos.

Mais informações: [Pintar com várias cores](chapter:shapes#painting-in-several-colours)

### As minhas peças não encaixam umas nas outras. De quanta folga precisam?

Normalmente 0,2 a 0,4 mm, conforme a impressora. O teste de encaixe mede-a: imprime a pequena placa com sete furos, encontra o furo mais apertado em que o pino ainda roda e introduz esse valor como folga da tua impressora. As novas tampas, os encaixes em cauda de andorinha e as roscas passam então a partir dele.

Mais informações: [A folga da tua impressora: o teste de encaixe](chapter:printing#your-printer-s-play-the-fit-test)

### Porque é que o layerling diz que uma peça não cabe na impressora?

A peça ultrapassa a borda da base de impressão ou é mais alta do que a impressora escolhida consegue construir. É apenas um aviso e pode ser fechado. Escolhe a tua impressora nas definições, ou corta uma peça demasiado grande com {{ui:editor.tool.split}}.

Mais informações: [Quando algo não cabe](chapter:printing#when-something-does-not-fit)

## Sobre o layerling

### O layerling é gratuito? Posso vender o que desenho com ele?

O layerling é software livre sob a licença AGPL-3.0, sem conta. A licença diz respeito ao programa: quem alterar o layerling e o disponibilizar a outros através de uma rede tem de disponibilizar também o código-fonte. Não impõe condições aos modelos que crias. Os tipos de letra e os modelos que importas mantêm as suas próprias licenças. Se quiseres apoiar o projeto, um [pequeno donativo](https://layerling.com/support.html?lang=pt-pt) ajuda nos custos de servidor e de desenvolvimento. É voluntário, e nada no layerling depende dele.

Mais informações: [Executar por conta própria](chapter:offline-and-install#running-it-yourself)

### Como comunico um erro ou faço um pedido?

{{ui:editor.bugReport}}, no rodapé, guarda um ZIP com o projeto e um texto curto sobre a versão e o navegador; não contém nada de pessoal. Anexa-o no fórum ou nas discussões no GitHub. As perguntas e os pedidos são bem-vindos em ambos os locais.

Mais informações: [Comunicar um erro](chapter:files-and-saving#reporting-a-bug) e [Ajuda e feedback](chapter:offline-and-install#help-and-feedback)
