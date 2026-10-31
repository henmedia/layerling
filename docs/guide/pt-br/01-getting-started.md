---
title: Primeiros passos
summary: Da folha em branco à sua primeira peça para a impressora 3D, em cinco minutos, sem conta e sem instalar nada.
---

layerling é um programa de modelagem para impressão 3D que roda direto no seu navegador. Você monta uma peça a partir de formas simples, abre furos nela, arredonda as arestas e manda para o seu fatiador. Não há nada para instalar nem cadastro para fazer. O que você cria fica no seu computador.

![A página inicial do layerling: "Criar novo projeto 3D" no topo, seus projetos e o guia rápido abaixo.](shot:start-page)

## Criando um projeto

Abra [layerling.com](https://layerling.com/). Na página inicial, clique em {{ui:dashboard.createDesign}}. O editor abre com um plano de trabalho vazio, a grade sobre a qual tudo toma forma.

Se você já tem um arquivo para continuar, use {{ui:dashboard.importGeometry}}. Isso funciona tanto para projetos do layerling (`.lyl`) quanto para arquivos STL, OBJ, 3MF, STEP ou SVG.

Depois, todos os seus projetos aparecem na página inicial com uma miniatura. Eles ficam guardados no seu navegador e são salvos automaticamente a cada alteração, por isso não há botão de salvar. **layerling não se responsabiliza pelos projetos guardados no navegador.** Um navegador pode falhar, ou uma atualização pode causar problemas, então faça backup dos seus projetos de vez em quando com {{ui:dashboard.backupAll}} na página inicial, ou salve-os como arquivos. Para restaurar um backup, use {{ui:dashboard.restoreBackup}}. Como juntar projetos num arquivo e passá-los adiante está em [Arquivos e salvamento](chapter:files-and-saving). Se quiser um lembrete, ative {{ui:workspace.confirmTabClose}} nas configurações (a engrenagem na barra de opções): o navegador pergunta antes de fechar ou recarregar uma aba com um projeto aberto.

## Conhecendo o editor

![O editor com duas formas no plano de trabalho. A barra de opções no topo, os controles da câmera à esquerda, as configurações da forma selecionada à direita.](shot:editor-overview)

- **No topo** fica a barra de opções. Ela é organizada por tarefa: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}} e {{ui:editor.group.manage}}; {{ui:editor.group.help}} fica acima dela, na barra de título, e a casinha ao lado das abas leva de volta à página inicial. Quando a janela é estreita demais para todos os grupos, os menos usados se recolhem num botão com o nome deles: aponte para o botão ou toque nele, e as ferramentas do grupo se abrem logo abaixo. Se preferir, a tachinha no canto superior direito, à esquerda da lupa, mantém todos os grupos abertos. Passe o mouse sobre um ícone, mesmo que esteja acinzentado, para ver o nome dele. Com a {{ui:interactiveHelp.title}} (o ponto de interrogação na área {{ui:editor.group.help}}, ou Shift+F1), você pode clicar em qualquer ícone para saber o que ele faz e acessar a seção correspondente deste guia. O pequeno ponto de interrogação, por exemplo nas configurações de uma forma, na biblioteca de formas ou nos painéis de ferramentas, leva direto ao capítulo correspondente deste guia.
- **No centro** fica o plano de trabalho. É aqui que você posiciona as formas, dá forma a elas e vê o resultado.
- **À direita** fica o **painel de propriedades**, com as configurações da forma selecionada: cor, dimensões, posição e tudo o mais que compõe a forma. Digitar números é mais exato do que arrastar.
- **À esquerda** ficam os controles da câmera, com o cubo de visualização acima deles. Eles levam você pela cena; mais em [Vista e plano de trabalho](chapter:view-and-workplane).
- **Bem no topo** você alterna entre {{ui:editor.modeGeometry}} e {{ui:editor.modeSketch}}, renomeia o projeto e escolhe o idioma e o tema de cores.

## Os botões em volta da área de trabalho

Passe o mouse sobre um botão para ver o nome dele. Se não tiver certeza do que um botão faz, clique em {{ui:interactiveHelp.title}} na área {{ui:editor.group.help}} ([[Shift]]+[[F1]]) e depois no botão. Estes são os botões que mais geram perguntas.

### Colar

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) adiciona ao projeto o que você copiou com {{ui:editor.tool.copy}}. {{ui:common.duplicate}} copia e cola num só passo. Ao colar, cada peça fica um pouco ao lado de onde estava. Peças que vêm de outro programa podem cair longe da mesa; para elas existe {{ui:workspace.pasteCentered}} nas configurações, em {{ui:workspace.appearance}}: ao colar, as peças vão juntas para o meio do plano de trabalho e baixam até ele.

### Excluir

{{ui:common.delete}} ([[Delete]]) exclui as formas selecionadas. {{ui:editor.tool.undo}} as traz de volta.

### Desagrupar

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) desfaz o grupo de união selecionado, separando as formas que o compõem.

### Configurações da área de trabalho

{{ui:editor.workspaceSettings}} abre as configurações da área de trabalho: unidade, tamanho da mesa, impressora, grade, cores, luz e mais. Mais em [Vista e plano de trabalho](chapter:view-and-workplane).

### Tema

{{ui:common.theme}}, bem no topo, escolhe a aparência do layerling: igual ao sistema, claro, escuro ou grafite.

### Renomear projeto

{{ui:editor.renameProject}}: o lápis ao lado do nome, bem no topo. Digite o novo nome e pressione [[Enter]].

### Nome do projeto

O nome do projeto ({{ui:confirm.projectName}}) fica bem no topo. Clique nele, digite o novo nome e pressione [[Enter]] para confirmar.

### Opções de visibilidade

Em {{ui:editor.visibilityOptions}}, na seta ao lado do ícone de olho, você encontra o que pode mostrar ou ocultar: a lista de objetos, tudo o que você ocultou, as anotações e as saliências da impressão. Mais em [Selecionar e organizar](chapter:select-and-arrange).

### Ocultar selecionados

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) oculta as formas selecionadas. Elas continuam no projeto e na lista de objetos; {{ui:editor.visibilityOptions}} as mostram de novo.

### Pesquisar comandos

{{ui:palette.open}}: digite o que você procura, uma ferramenta, uma forma ou uma configuração, e clique no resultado.

### Ocultar controles da câmera

{{ui:camera.hide}} recolhe os controles da câmera à esquerda e dá mais espaço à área de trabalho; {{ui:camera.show}} os traz de volta.

### Grade de encaixe

{{ui:inspector.snapGrid}}, no fim do painel de propriedades, define o incremento usado ao mover e redimensionar as formas. Ao lado, a pequena chave **mm | in** troca a unidade. Mais em [Vista e plano de trabalho](chapter:view-and-workplane).

### Unidade: milímetros ou polegadas

A chave **mm | in** ao lado de {{ui:inspector.snapGrid}} troca a unidade, a grade da mesa e o incremento de encaixe, para este projeto.

### Rodapé

No rodapé você encontra: {{ui:dashboard.sponsor}}, que leva à página onde você pode apoiar o projeto; {{ui:dashboard.userGuide}}, que abre este guia; {{ui:dashboard.forum}}, o lugar para perguntas, ideias e relatos de erros (as discussões no GitHub; em alemão, o fórum do drucktipps3d); {{ui:editor.bugReport}}, que cria um ZIP para um relato de erro; {{ui:dashboard.projectOnGitHub}}, que leva ao projeto no GitHub; e o número da versão, que abre as notas da versão. Os links para as informações legais e a política de privacidade são de quem mantém a cópia do layerling que você usa.

## Sua primeira peça

Por exemplo, vamos montar um cubo com um furo.

1. Clique em {{ui:editor.addShape}} na barra de opções e escolha {{ui:shape.box}}. A forma agora fica presa ao ponteiro do mouse. Um clique no plano de trabalho a coloca ali.
2. No painel de propriedades, defina as dimensões, por exemplo 40 mm de comprimento, 40 mm de largura e 20 mm de altura.
3. Coloque um {{ui:shape.cylinder}} no centro do mesmo jeito, com 14 mm de diâmetro e 30 mm de altura. Ele deve ser mais alto que o cubo, para atravessá-lo de ponta a ponta.
4. Selecione o cilindro e clique em {{ui:inspector.hole}} no painel de propriedades. Ele fica transparente: o sólido virou uma ferramenta que tira material.
5. Selecione as duas formas e clique em {{ui:editor.tool.group}}. Agora o cubo tem um furo.

![O cilindro é um orifício e sai pelo topo do cubo.](shot:hole-before)

![Depois do agrupamento, o cubo tem um furo.](shot:hole-after)

É assim que se fazem furos, rasgos e cavidades. O capítulo [Sólidos e orifícios](chapter:solids-and-holes) explica isso em detalhes.

## Novidades desde a sua última visita

Quando você abre o layerling de novo depois de uma atualização, um cartão na página inicial lista o que foi adicionado desde a sua última visita: cada versão desde então, a mais nova primeiro. Depois de muito tempo sem abrir o layerling, você rola a lista dentro do cartão. Abaixo da lista, {{ui:whatsNew.earlier}} acrescenta também as versões de antes da sua última visita. Feche o cartão com {{ui:whatsNew.dismiss}} e ele não aparece mais até a próxima atualização. {{ui:whatsNew.footerLink}}, no rodapé da página inicial, mostra as últimas novidades de novo a qualquer momento. O navegador lembra a última versão que você viu, e nada sobre você sai dele.

Numa cópia do layerling no seu próprio computador ou servidor, o aviso "Atualização disponível" tem um botão, {{ui:update.previewShow}}, que lista o que a atualização traz antes de você instalá-la. A lista só é buscada no GitHub quando você clica no botão.

## Do projeto à impressão

Quando a peça estiver pronta, clique em {{ui:editor.export}}, escolha STL ou 3MF e baixe o arquivo. Abra-o no seu fatiador, por exemplo Bambu Studio, PrusaSlicer, OrcaSlicer ou Cura. Se você escolher sua impressora nas configurações, dá para ver enquanto modela se a peça cabe na mesa de impressão. Mais em [Impressão](chapter:printing).

> **Dica:** Se você vem do Tinkercad, vai se achar rapidinho: a mesa, as formas, sólido e orifício, agrupar, alinhar e espelhar funcionam quase igual. As novidades são principalmente chanfro e arredondamento, vazar, roscas e esboços. Seus próprios projetos do Tinkercad também podem vir junto, veja [Arquivos e salvamento](chapter:files-and-saving).
