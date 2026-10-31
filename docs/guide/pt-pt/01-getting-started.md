---
title: Primeiros passos
summary: Do plano de trabalho vazio à tua primeira peça para impressão 3D, em cinco minutos, sem conta e sem instalar nada.
---

O layerling é um programa de modelação para impressão 3D que funciona diretamente no teu navegador. Crias uma peça a partir de formas simples, abres furos, arredondas as arestas e envias o modelo para o programa de preparação da impressão (slicer). Não precisas de instalar nada nem de criar uma conta. Tudo o que criares fica no teu computador.

![A página inicial do layerling: a opção para criar um novo projeto 3D no topo, com os teus projetos e o guia rápido por baixo.](shot:start-page)

## Criar um projeto

Abre [layerling.com](https://layerling.com/). Na página inicial, clica em {{ui:dashboard.createDesign}}. O editor abre com um plano de trabalho vazio: a grelha onde tudo ganha forma.

Se já tiveres um ficheiro para continuar a trabalhar, usa {{ui:dashboard.importGeometry}}. Esta opção permite abrir projetos do layerling (`.lyl`) e ficheiros STL, OBJ, 3MF, STEP ou SVG.

Todos os teus projetos aparecem depois na página inicial com uma imagem de pré-visualização. Ficam guardados no armazenamento do navegador e são gravados automaticamente após cada alteração, pelo que não existe um botão para guardar. **O layerling não se responsabiliza pelos projetos guardados no navegador.** O navegador pode falhar ou uma atualização pode causar problemas. Por isso, cria cópias de segurança regularmente através de {{ui:dashboard.backupAll}} na página inicial ou guarda os projetos como ficheiros. Para recuperar uma cópia de segurança, usa {{ui:dashboard.restoreBackup}}. O capítulo [Ficheiros e gravação](chapter:files-and-saving) explica como guardar projetos num ficheiro e partilhá-los. Se quiseres um aviso, ativa {{ui:workspace.confirmTabClose}} nas definições (a roda dentada no friso): o navegador passa a pedir confirmação antes de fechar ou recarregar um separador com um projeto aberto.

## Visão geral do editor

![O editor com duas formas no plano de trabalho. O friso no topo, os controlos da câmara à esquerda e as definições da forma selecionada à direita.](shot:editor-overview)

- **No topo** está o friso, organizado por tarefa: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}}, {{ui:editor.group.file}} e {{ui:editor.group.help}}. Passa o ponteiro sobre um ícone para veres o respetivo nome. Sempre que encontrares um pequeno ponto de interrogação, por exemplo nas definições de uma forma, na biblioteca de formas ou nos painéis de ferramentas, podes usá-lo para abrir diretamente o capítulo correspondente deste guia.
- **Ao centro** está o plano de trabalho. É aqui que colocas as formas, as ajustas e observas o resultado.
- **À direita** aparecem as definições da forma selecionada: cor, dimensões, posição e outras propriedades da forma. Introduzir valores numéricos é mais preciso do que arrastar.
- **À esquerda** estão os controlos da câmara, com o cubo de vista por cima. Permitem navegar pela cena. Mais informações em [Vista e plano de trabalho](chapter:view-and-workplane).
- **Na barra superior** podes alternar entre {{ui:editor.modeGeometry}} e {{ui:editor.modeSketch}}, mudar o nome do projeto e escolher o idioma e o esquema de cores.

## Os botões à volta da área de trabalho

Passa o ponteiro sobre um botão para veres o respetivo nome. Se não souberes o que faz, clica em {{ui:interactiveHelp.title}}, na área {{ui:editor.group.help}} ([[Shift]]+[[F1]]), e depois no botão. Seguem-se os que suscitam mais dúvidas.

### Colar

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) adiciona ao projeto o que copiaste com {{ui:editor.tool.copy}}. A opção {{ui:common.duplicate}} copia e cola num único passo.

### Eliminar

{{ui:common.delete}} ([[Delete]]) elimina as formas selecionadas. A opção {{ui:editor.tool.undo}} recupera-as.

### Desagrupar

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) volta a separar o grupo selecionado nas formas que o constituem.

### Definições da área de trabalho

{{ui:editor.workspaceSettings}} abre as definições da área de trabalho: unidade, dimensões da base, impressora, grelha, cores, luz e outras opções. Mais informações em [Vista e plano de trabalho](chapter:view-and-workplane).

### Tema

{{ui:common.theme}}, na barra superior, permite escolher o aspeto do layerling: igual ao do sistema, claro, escuro ou grafite.

### Mudar o nome do projeto

{{ui:editor.renameProject}}: o lápis junto do nome, na barra superior. Introduz o novo nome e prime [[Enter]].

### Nome do projeto

O nome do projeto ({{ui:confirm.projectName}}) aparece na barra superior. Clica nele, escreve o nome e prime [[Enter]] para o guardar.

### Opções de visibilidade

{{ui:editor.visibilityOptions}}, a seta junto do ícone do olho, reúne as opções para mostrar ou ocultar a lista de objetos, os elementos que ocultaste, as notas e as zonas em balanço da impressão. Mais informações em [Selecionar e organizar](chapter:select-and-arrange).

### Ocultar seleção

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) oculta as formas selecionadas. Estas mantêm-se no projeto e na lista de objetos; podes voltar a mostrá-las através de {{ui:editor.visibilityOptions}}.

### Pesquisar comandos

{{ui:palette.open}}: escreve o que procuras, seja uma ferramenta, uma forma ou uma definição, e clica no resultado.

### Ocultar controlos da câmara

{{ui:camera.hide}} recolhe os controlos da câmara à esquerda, libertando espaço na área de trabalho; {{ui:camera.show}} volta a mostrá-los.

### Grelha de ajuste

{{ui:inspector.snapGrid}}, na parte inferior das propriedades, define o incremento ao qual se ajustam os movimentos e o redimensionamento. Ao lado, o pequeno seletor **mm | in** permite mudar a unidade. Mais informações em [Vista e plano de trabalho](chapter:view-and-workplane).

### Unidade: milímetros ou polegadas

O seletor **mm | in**, junto de {{ui:inspector.snapGrid}}, altera a unidade, a grelha da base e o incremento de ajuste deste projeto.

### O rodapé

No fundo da janela: {{ui:dashboard.sponsor}} abre a página onde podes apoiar o projeto; {{ui:dashboard.userGuide}} abre este guia; {{ui:dashboard.forum}} leva ao espaço para perguntas, ideias e comunicação de erros (as discussões no GitHub ou, em alemão, o fórum do drucktipps3d); {{ui:editor.bugReport}} cria um ZIP para comunicar um erro; {{ui:dashboard.projectOnGitHub}} abre o projeto no GitHub; e o número da versão abre as notas da versão. As ligações para as informações legais e a política de privacidade dizem respeito à entidade responsável pela cópia do layerling que utilizas.

## A tua primeira peça

Como exemplo, vamos criar um bloco com um furo.

1. Clica em {{ui:editor.addShape}} no friso e escolhe {{ui:shape.box}}. A forma passa a acompanhar o ponteiro do rato. Clica no plano de trabalho para a colocar.
2. À direita, define as dimensões, por exemplo 40 mm de comprimento, 40 mm de largura e 20 mm de altura.
3. Coloca um {{ui:shape.cylinder}} ao centro da mesma forma, com 14 mm de diâmetro e 30 mm de altura. Deve ser mais alto do que o bloco para o atravessar completamente.
4. Seleciona o cilindro e clica em {{ui:inspector.hole}}, à direita. Fica transparente: o sólido transformou-se numa ferramenta que remove material.
5. Seleciona as duas formas e clica em {{ui:editor.tool.group}}. O bloco passa a ter um furo.

![O cilindro é uma forma de corte e sobressai pela face superior do bloco.](shot:hole-before)

![Depois de agrupar, o bloco tem um furo.](shot:hole-after)

É assim que se criam furos, ranhuras e cavidades. O capítulo [Sólidos e formas de corte](chapter:solids-and-holes) explica o processo em detalhe.

## Novidades desde a tua última visita

Quando voltas a abrir o layerling após uma atualização, um cartão na página inicial apresenta as novidades desde a tua última visita: todas as versões entretanto publicadas, começando pela mais recente. Após uma ausência prolongada, podes percorrer a lista dentro do cartão. Por baixo, {{ui:whatsNew.earlier}} acrescenta também as versões anteriores à tua última visita. Fecha o cartão com {{ui:whatsNew.dismiss}} e este só volta a aparecer na próxima atualização. A opção {{ui:whatsNew.footerLink}}, no rodapé da página inicial, permite voltar a consultar as novidades mais recentes a qualquer momento. O navegador memoriza a última versão que viste, sem enviar para fora qualquer informação sobre ti.

Numa cópia do layerling instalada no teu computador ou servidor, o aviso de atualização disponível inclui o botão {{ui:update.previewShow}}, que apresenta as novidades antes de instalares a atualização. A lista só é obtida do GitHub quando primes o botão.

## Do projeto à impressão

Quando a peça estiver concluída, clica em {{ui:editor.export}}, escolhe STL ou 3MF e descarrega o ficheiro. Abre-o no teu programa de preparação da impressão, por exemplo Bambu Studio, PrusaSlicer, OrcaSlicer ou Cura. Se selecionares a tua impressora nas definições, podes verificar durante a modelação se a peça cabe na base de impressão. Mais informações em [Impressão](chapter:printing).

> **Dica:** Se já usas o Tinkercad, vais perceber rapidamente como funciona: a base, as formas, os sólidos e as formas de corte, o agrupamento, o alinhamento e o espelhamento funcionam de forma muito semelhante. As principais novidades são os chanfros e arredondamentos, a criação de cavidades, as roscas e os esboços. Também podes trazer os teus projetos do Tinkercad; consulta [Ficheiros, gravação e partilha](chapter:files-and-saving).
