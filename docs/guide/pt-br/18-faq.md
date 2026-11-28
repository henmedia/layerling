---
title: Perguntas frequentes
summary: Respostas curtas para o que mais se pergunta, sobre salvamento, modelos grandes, arredondamentos, IA e impressão, cada uma com o caminho até a explicação completa.
contents: questions
---

Cada resposta é curta e termina indicando o lugar deste guia que explica tudo por completo. A caixa de busca no topo encontra uma pergunta por qualquer palavra dela.

## Salvamento e backups

### Onde ficam guardados os meus projetos? Existe uma nuvem?

No navegador do seu próprio computador. Não há conta nem nuvem, e nada é enviado; cada alteração é salva sozinha. Quem roda o layerling no próprio servidor também pode guardar lá os projetos em uma pasta compartilhada.

Saiba mais: [Onde ficam os seus projetos](chapter:files-and-saving#where-your-designs-live)

### Meus projetos sumiram. O que aconteceu?

Os projetos ficam em um único navegador de um único computador. Eles somem quando os dados que o navegador guardava da página são apagados, e não aparecem em outro navegador nem em outro computador. O Safari no Mac, no iPhone e no iPad apaga os dados de uma página depois de sete dias sem visita, a menos que o layerling esteja instalado como app. Se você tiver um backup, {{ui:dashboard.restoreBackup}} na página inicial traz os projetos de volta, com as pastas e as imagens.

Saiba mais: [Seus projetos, seu backup](chapter:files-and-saving#your-designs-your-backup)

### Como faço backup de tudo, inclusive automaticamente em uma pasta?

{{ui:dashboard.backupAll}} na página inicial junta todos os projetos em um único arquivo ZIP. Além disso, o layerling guarda sozinho versões anteriores de cada projeto e, no Chrome e no Edge, pode gravar cada uma delas como arquivo .lyl em uma pasta que você escolher. As versões guardadas no navegador se perdem quando os dados do navegador se perdem, então elas não substituem o ZIP nem a pasta.

Saiba mais: [Versões anteriores](chapter:files-and-saving#earlier-versions)

### Como levo um projeto para outro computador ou navegador?

Salve-o como arquivo .lyl pela janela de exportação e abra esse arquivo no outro computador pela página inicial. Para todos os projetos de uma vez, use {{ui:dashboard.backupAll}} aqui e {{ui:dashboard.restoreBackup}} lá; os projetos que já existem não são adicionados duas vezes.

Saiba mais: [Fazer backup e compartilhar](chapter:files-and-saving#backing-up-and-passing-on)

### O que acontece quando limpo os dados do navegador?

Os projetos guardados naquele navegador são excluídos, assim como as versões anteriores que o layerling guardava lá. Um ZIP feito com {{ui:dashboard.backupAll}}, os seus arquivos .lyl e uma pasta de backup no seu disco não são afetados. Primeiro faça o backup, depois limpe.

Saiba mais: [Seus projetos, seu backup](chapter:files-and-saving#your-designs-your-backup)

### Como volto a um estado anterior?

Desfazer volta passo a passo. A visualização do histórico mostra cada passo com um controle deslizante sem alterar o projeto, e pode criar um projeto novo a partir de qualquer um deles. Para um estado de mais cedo no mesmo dia ou da semana passada, a lista de versões anteriores abre uma versão antiga como projeto novo e deixa o atual como está.

Saiba mais: [Olhando para trás: a visualização do histórico](chapter:select-and-arrange#looking-back-the-history-view) e [Versões anteriores](chapter:files-and-saving#earlier-versions)

### O STL e o 3MF podem ir direto para a pasta do meu projeto? E como volto a ter um download?

No Chrome e no Edge, a primeira exportação de um projeto pergunta onde salvar, e as exportações seguintes gravam no mesmo arquivo sem perguntar. O Firefox e o Safari sempre fazem download. Se você quiser um download toda vez, ative {{ui:workspace.stlAsDownload}} nas configurações.

Saiba mais: [Exportando](chapter:files-and-saving#exporting)

### A janela de salvamento fechou e não há arquivo nenhum. Por quê?

O navegador informa uma janela que não conseguiu usar do mesmo jeito que uma que você cancelou, e um arquivo que um antivírus bloqueia também não pode ser gravado. A mensagem no topo então oferece {{ui:status.saveAsDownload}}, que coloca o arquivo nos seus downloads. Para pular a janela de vez, ative {{ui:workspace.lylAsDownload}} e {{ui:workspace.stlAsDownload}} nas configurações.

Saiba mais: [Fazer backup e compartilhar](chapter:files-and-saving#backing-up-and-passing-on)

## Instalação e atualizações

### Existe um app para baixar?

O layerling se instala pelo navegador: ele passa a ter ícone e janela próprios e abre sem rede. Não há instalador para baixar, e o original fica somente em layerling.com. **Não baixe nem execute um instalador "layerling" de nenhum outro site:** ele não vem do layerling e pode conter malware. Para rodar a sua própria cópia, há um início rápido para Windows e uma imagem Docker.

Saiba mais: [Instalando como app](chapter:offline-and-install#instalando-como-app) e [Rodando por conta própria](chapter:offline-and-install#rodando-por-conta-propria)

### O layerling funciona sem internet?

Sim, depois da primeira visita ele abre sem rede, de preferência instalado como app. Só uma coisa é carregada apenas quando é necessária pela primeira vez: o núcleo CAD para a primeira exportação STEP, cerca de 22 MB.

Saiba mais: [Instalando como app](chapter:offline-and-install#instalando-como-app)

### Como recebo uma atualização?

Ela chega sozinha. Uma página aberta percebe uma versão nova e mostra um cartão com as novidades; {{ui:newVersion.reload}} primeiro salva o projeto aberto e depois carrega a versão nova. A página inicial também mostra quando há uma versão mais nova.

Saiba mais: [Atualizações](chapter:offline-and-install#atualizacoes)

### Quais navegadores e tablets funcionam?

Chrome, Edge, Firefox e Safari, em um computador, um tablet ou um celular; a vista 3D precisa de WebGL. Algumas coisas só o Chrome e o Edge conseguem fazer: gravar nos seus próprios arquivos e pastas, usar a pasta de backup e abrir arquivos .lyl com um clique duplo. Em um tablet, um dedo faz o que o botão esquerdo do mouse faz.

Saiba mais: [Dedos e caneta](chapter:tablet-and-touch#fingers-and-a-stylus)

## IA

### Qual é o jeito mais fácil de configurar uma IA?

Dê a uma IA que possa trabalhar no seu computador o endereço `https://github.com/henmedia/layerling` e peça para ela configurar para você o layerling com o servidor MCP dele. Ela precisa de um programa como a aba Code do app Claude, o Claude Code, o Codex, o Antigravity ou o Gemini CLI. Para Windows e Mac, o guia também traz os passos um por um.

Saiba mais: [Passo a passo para iniciantes](chapter:ai-with-mcp#step-by-step-for-beginners)

### Por que a IA não consegue acessar layerling.com?

A ponte entre a IA e o editor só existe em uma cópia do layerling que roda no seu próprio computador. Em layerling.com ela está sempre desligada, e um chat no navegador não consegue instalar nada. Por isso a IA precisa de um layerling iniciado localmente e de um programa que fale MCP.

Saiba mais: [Configuração](chapter:ai-with-mcp#setting-up)

### Qual IA funciona, e quanto custa?

Qualquer programa que fale MCP; o guia descreve Claude, Codex, Gemini e Antigravity. O layerling em si não custa nada. O custo da IA depende do fornecedor dela: a aba Code do app Claude, por exemplo, faz parte dos planos pagos do Claude.

Saiba mais: [Configuração](chapter:ai-with-mcp#setting-up)

### Que dados vão para o fornecedor da IA?

O que a IA lê: os objetos do projeto aberto e as imagens que ela captura da vista. Isso vai para o fornecedor do seu programa de IA como qualquer outra coisa que você digita nele. A ponte em si roda no seu computador, e sem uma IA nada sai dele.

Saiba mais: [O que a IA pode fazer](chapter:ai-with-mcp#what-the-ai-can-do)

## Memória, velocidade e histórico

### Por que o layerling fica lento com o meu STL?

Um STL é uma malha de triângulos, e uma malha muito grande deixa o editor mais lento, ocupa muita memória e torna o salvamento demorado. O layerling avisa depois da importação a partir de 400.000 triângulos em uma malha, ou um milhão no projeto inteiro. Simplifique a malha primeiro, importe só as partes de que precisa ou construa a peça com as formas do próprio layerling.

Saiba mais: [Malhas grandes](chapter:files-and-saving#large-meshes)

### Por que faltam passos no meu histórico?

Duas coisas o encurtam. A configuração {{ui:workspace.savedHistory}} mantém 100 passos por projeto, a menos que você a altere, e os mais antigos são descartados. E quando um projeto é grande demais para ser salvo com o histórico inteiro, o layerling o salva com metade dos passos, depois com metade de novo, e avisa você. O projeto em si é sempre salvo por inteiro.

Saiba mais: [Histórico salvo](chapter:view-and-workplane#saved-history)

### O que faço quando o armazenamento do navegador está cheio?

Não feche nem recarregue a aba: as suas alterações mais recentes só estão ali. Primeiro guarde uma cópia exportando como .lyl. Depois libere espaço: exclua passos na visualização do histórico, remova projetos de que não precisa mais, ou faça backup deles e exclua.

Saiba mais: [Seus projetos, seu backup](chapter:files-and-saving#your-designs-your-backup)

### Meu projeto está grande demais para salvar. E agora?

O histórico e as malhas dele ocupam juntos espaço demais. Antes de avisar, o layerling já tentou com menos passos no histórico. Exclua o histórico na visualização do histórico, simplifique as malhas importadas mais pesadas ou salve um .lyl só com o estado atual.

Saiba mais: [Fazer backup e compartilhar](chapter:files-and-saving#backing-up-and-passing-on) e [Simplificando uma malha importada](chapter:files-and-saving#simplifying-an-imported-mesh)

### O navegador ficou sem memória. O que ajuda?

Isso acontece com malhas de milhões de triângulos, em que um único passo precisa de mais memória do que uma aba do navegador recebe. Reduza os triângulos das malhas importadas com {{ui:editor.tool.simplify}}, feche outras abas e tente de novo. Quando acontece ao salvar, um histórico mais curto também ajuda.

Saiba mais: [Malhas grandes](chapter:files-and-saving#large-meshes)

### Um projeto abre muito devagar ou não abre. O que posso fazer?

Quase sempre o histórico de passos para desfazer ficou muito grande. {{ui:dashboard.openWithoutHistory}}, no menu do projeto na página inicial, lê apenas o estado atual; os passos anteriores são excluídos para sempre, então faça antes um backup do projeto se quiser mantê-los. Uma versão anterior vinda dos backups abre como um projeto novo.

Saiba mais: [Fazer backup e compartilhar](chapter:files-and-saving#backing-up-and-passing-on)

### O layerling está engasgando. Que configurações ajudam?

{{ui:workspace.fastMode}}, nas configurações, desliga as sombras, as linhas de aresta em todos os sólidos e a inércia da câmera, e desenha a vista apenas na resolução da tela. Verifique se o navegador usa a placa de vídeo: em `chrome://gpu` ou `edge://gpu`, ao lado de WebGL deve aparecer "Hardware accelerated". A outra causa comum são malhas importadas grandes.

Saiba mais: [Quando o layerling parece lento](chapter:view-and-workplane#when-layerling-feels-slow)

### O editor fica parado ou calcula por muito tempo. Espero ou recarrego?

Primeiro espere. Cortes, grupos e o trabalho nas arestas são calculados em segundo plano, e enquanto isso aparece {{ui:status.computing}}; tarefas longas, como a de vazar um sólido, param sozinhas com uma mensagem e não mudam nada. Se o núcleo CAD precisou ser reiniciado, a mensagem informa isso e não é preciso recarregar. Recarregar é seguro, porque cada alteração é salva sozinha, com uma exceção: enquanto o aviso vermelho {{ui:notice.designNotSavedTitle}} estiver visível, exporte antes um .lyl.

Saiba mais: [Quando o layerling parece lento](chapter:view-and-workplane#when-layerling-feels-slow)

### A vista 3D fica vazia, ou uma mensagem diz que ela não pôde ser iniciada. E agora?

O navegador não conseguiu iniciar o WebGL, que desenha a vista 3D. A causa está no navegador ou no driver de vídeo, não no seu projeto, e os seus projetos guardados não são excluídos. Feche outras abas com conteúdo 3D e reinicie o navegador, ative a aceleração de hardware, permita o WebGL se uma configuração de privacidade ou uma extensão o bloquear, e atualize o navegador e o driver de vídeo. Testar outro navegador é um teste rápido.

Saiba mais: [Quando o layerling parece lento](chapter:view-and-workplane#when-layerling-feels-slow)

## Modelos importados

### "Simplificar malha" ou "Make exact": qual usar?

{{ui:editor.tool.simplify}} mantém uma parte dos triângulos, então um modelo pesado fica mais leve; ele continua sendo uma malha. {{ui:editor.tool.makeExact}} reconstrói um modelo feito de planos, cilindros, cones e esferas como um sólido CAD de verdade, para que arredondamentos e chanfros sigam arestas limpas e uma exportação STEP leve faces reais. Aceita até 400.000 triângulos; uma figura ou um escaneamento continua sendo uma malha. Para uma peça técnica grande: primeiro simplifique, com {{ui:simplify.keepEdges}} ativado, e depois torne-a exata.

Saiba mais: [Simplificando uma malha importada](chapter:files-and-saving#simplifying-an-imported-mesh) e [Tornando exata uma malha importada](chapter:files-and-saving#making-an-imported-mesh-exact)

### Por que um corte falha, ou por que a minha malha "não é fechada"?

Um sólido só pode ser cortado quando a superfície dele é fechada. Se uma malha importada tem frestas, o layerling informa o nome da peça e o número de arestas abertas e a deixa de fora. Os buracos pequenos ele mesmo fecha; os maiores precisam ser reparados no programa de onde veio o modelo ou em uma ferramenta de reparo de malhas. A verificação de impressão mostra qual sólido está aberto.

Saiba mais: [Verificar a impressão](chapter:printing#verificar-a-impressao)

### Como importo um SVG do jeito certo?

Um SVG entra como um sólido de esboço, com 4 mm de altura, e os pontos dele podem ser alterados no modo de esboço. Digite a largura em milímetros na janela de importação antes de importar; sem um número, ele mantém o próprio tamanho. Contornos que cruzam a si mesmos não podem virar um sólido; eles ficam de fora e são contados: una os pedaços sobrepostos e feche os contornos no programa de desenho, depois importe de novo.

Saiba mais: [Importando](chapter:files-and-saving#importing)

## Arredondamentos e chanfros

### Por que não é possível aplicar um arredondamento?

Quase sempre ele é grande demais para o lugar: invadiria as faces vizinhas, ou a aresta faz uma curva mais fechada que o raio. Muitas vezes um ou dois milímetros a menos resolvem, e em ângulos agudos um arredondamento precisa de mais espaço do que o raio sugere. Se não for possível arredondar as arestas juntas, pegue menos de cada vez; a aresta que atrapalha é desenhada em vermelho. {{ui:edge.findLargest}} procura o tamanho para você.

Saiba mais: [Chanfrando e arredondando arestas](chapter:edges-and-hollowing#chamfering-and-filleting-edges)

### Por que os meus arredondamentos sumiram depois que alterei o esboço?

Depois de {{ui:inspector.editSketch}}, o sólido é construído de novo e tem arestas novas. O layerling reaplica arredondamentos e chanfros nas arestas que ficam onde ficavam as antigas, desde que o sólido tenha a mesma quantidade de arestas de antes. Com um canto a mais ou a menos, eles ficam de fora, e a mensagem diz quantos. Desfazer traz tudo de volta.

Saiba mais: [Criando um sólido a partir dele](chapter:sketches#making-a-body-from-it)

### Por que não consigo selecionar algumas arestas de um modelo importado?

STL, OBJ e 3MF trazem apenas triângulos, e as ferramentas de aresta funcionam em malhas de até 4.000 triângulos. {{ui:editor.tool.makeExact}} transforma uma peça técnica em um sólido CAD de verdade, no qual um furo tem uma única borda redonda que um arredondamento pode seguir. Um arquivo STEP traz geometria exata desde o começo.

Saiba mais: [Tornando exata uma malha importada](chapter:files-and-saving#making-an-imported-mesh-exact)

## Grupos, furos e medidas

### Por que os furos ficam ovais quando estico um grupo?

Um grupo redimensionado estica tudo o que está dentro dele, como se estivesse desenhado em borracha. Nas configurações do grupo, escolha {{ui:inspector.groupResizeKeepParts}} em {{ui:inspector.groupResize}}: as peças que atravessam o grupo se esticam, e os furos e as peças pequenas mantêm o tamanho e a distância até o lado mais próximo.

Saiba mais: [Redimensionando um grupo de união: mantendo furos e peças pequenas](chapter:solids-and-holes#redimensionando-um-grupo-de-uniao-mantendo-furos-e-pecas-pequenas)

### Por que o agrupamento falha, ou por que o resultado tem frestas?

Ou uma peça não está fechada, e a mensagem diz qual, ou duas peças quase se encontram sem se tocar de verdade. Desagrupe, alinhe as peças com exatidão ou mude um pouco um tamanho ou uma posição, e agrupe de novo. Malhas muito densas acima do limite para cortar malhas importadas não são unidas de forma alguma.

Saiba mais: [Agrupando](chapter:solids-and-holes#agrupando)

### Como altero uma peça dentro de um grupo?

Selecione o grupo e pressione [[E]], ou dê um clique duplo nele. As peças então ficam separadas e podem ser alteradas; ao concluir, o grupo é construído de novo. Os arredondamentos e chanfros aplicados no grupo inteiro se perdem quando ele é reconstruído.

Saiba mais: [Editando um grupo de união](chapter:solids-and-holes#editando-um-grupo-de-uniao)

### Como recupero uma peça de um estado anterior?

Abra a visualização do histórico, leve o controle deslizante até o estado que ainda tinha a peça, clique nela e escolha {{ui:historyView.bringBack}}. Uma cópia entra no projeto atual, do jeito que era e onde estava, com o horário no nome.

Saiba mais: [Olhando para trás: a visualização do histórico](chapter:select-and-arrange#looking-back-the-history-view)

## Impressão e exportação

### STL, 3MF, OBJ ou STEP: qual usar?

Para a impressora, 3MF ou STL. O 3MF mantém cada sólido como uma peça com nome e cor; o STL é uma única malha de uma só cor. O OBJ também leva cores. O STEP é para outros programas CAD: ele contém a geometria exata, com arredondamentos e chanfros.

Saiba mais: [Exportando](chapter:files-and-saving#exporting)

### Como as minhas cores chegam ao fatiador?

Exporte em 3MF. Cada sólido mantém a sua cor, e um sólido pintado com várias cores leva a pintura nas faces. Ao abrir, o Bambu Studio e o OrcaSlicer perguntam como as cores correspondem aos seus filamentos.

Saiba mais: [Pintando com várias cores](chapter:shapes#painting-in-several-colours)

### Minhas peças não encaixam uma na outra. De quanta folga elas precisam?

Normalmente de 0,2 a 0,4 mm, dependendo da impressora. O teste de encaixe mede isso: imprima a plaquinha com sete furos, encontre o furo mais apertado em que o pino ainda gira e informe esse valor como a folga da sua impressora. A partir daí, novas tampas, encaixes rabo de andorinha e roscas partem dele.

Saiba mais: [A folga da sua impressora: o teste de encaixe](chapter:printing#a-folga-da-sua-impressora-o-teste-de-encaixe)

### Por que o layerling diz que uma peça não cabe na impressora?

A peça passa da borda da mesa de impressão ou é mais alta do que a impressora escolhida consegue construir. É só uma dica e pode ser fechada. Escolha a sua impressora nas configurações, ou corte uma peça grande demais com {{ui:editor.tool.split}}.

Saiba mais: [Quando algo não cabe](chapter:printing#quando-algo-nao-cabe)

## Sobre o layerling

### O layerling é gratuito? Posso vender o que eu projeto com ele?

O layerling é software livre sob a licença AGPL-3.0, sem conta. A licença trata do programa: quem altera o layerling e o oferece a outras pessoas por uma rede precisa oferecer também o código-fonte. Ela não impõe condições aos modelos que você cria. Fontes e modelos que você importa mantêm as próprias licenças. Se você quiser apoiar o projeto, uma [pequena doação](https://layerling.com/support.html?lang=pt-br) ajuda com os custos de servidor e de desenvolvimento. Ela é voluntária, e nada no layerling depende dela.

Saiba mais: [Rodando por conta própria](chapter:offline-and-install#rodando-por-conta-propria)

### Como relato um erro ou peço alguma coisa?

{{ui:editor.bugReport}}, no rodapé, salva um ZIP com o projeto e um texto curto sobre a versão e o navegador; não há nada pessoal nele. Anexe-o no fórum ou nas discussões do GitHub. Perguntas e pedidos são bem-vindos nos dois lugares.

Saiba mais: [Relatando um erro](chapter:files-and-saving#reporting-a-bug) e [Ajuda e feedback](chapter:offline-and-install#ajuda-e-feedback)
