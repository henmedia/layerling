---
title: Instalação como app, uso offline e hospedagem própria
summary: Como abrir o layerling como um programa comum, mesmo sem rede, e como rodá-lo no seu próprio computador.
---

## Instalando como app

layerling pode ser instalado como um programa comum. Ele ganha então um ícone e uma janela próprios, sem barra de endereços. Depois da primeira visita, ele abre mesmo **sem internet**. Seus projetos continuam no seu computador. Vale a pena instalar: o app abre mais rápido (porque não precisa ser carregado de novo toda vez), funciona sem internet e alivia o servidor. Você não perde nada, já que o layerling continua avisando quando sai uma versão nova. Isso também protege os seus projetos: o Safari no Mac, no iPhone e no iPad apaga os dados guardados de um site que não é visitado há sete dias, mas não os de um app instalado.

Se o seu navegador permitir, aparece na página inicial uma dica com {{ui:installHint.install}}. Caso contrário:

- **Chrome e Edge:** clique no ícone de instalação à direita da barra de endereços, ou escolha "Instalar como app" no menu do navegador.
- **Safari no Mac:** menu "Arquivo", depois "Adicionar ao Dock".
- **Safari no iPhone e no iPad:** ícone de compartilhar, depois "Adicionar à Tela de Início".
- **Firefox:** não instala apps. Mesmo assim, o layerling abre offline numa aba.

Você pode fechar a dica na página inicial com {{ui:installHint.dismiss}}. No Chrome ou no Edge, abrir o app instalado uma segunda vez traz a janela já aberta para a frente, em vez de abrir outra.

No computador, o layerling instalado no Chrome ou no Edge também se registra como programa para arquivos `.lyl`: no gerenciador de arquivos, um clique duplo num projeto abre o projeto no layerling, e [[Ctrl]]+[[S]] salva de volta nesse arquivo. No Android isso não funciona, porque lá o navegador não associa arquivos a web apps instalados; abra o projeto com {{ui:dashboard.importGeometry}} na página inicial.

## Atualizações

Quando existe uma versão mais nova, o layerling mostra isso na página inicial. Em {{ui:dashboard.updateBannerLink}} você lê o que mudou. O número da versão fica no canto inferior direito. Depois de recarregar a página, você está na versão nova.

No layerling.com e em outros servidores web, uma página aberta percebe sozinha que há uma atualização. De tempos em tempos, sempre que você volta para a aba e logo que a página não encontra um arquivo do programa de que precisa, ela pergunta ao servidor qual é a versão. Se algo novo foi instalado nesse meio-tempo, um cartão no canto inferior direito avisa e lista as novidades. {{ui:newVersion.reload}} primeiro grava no navegador o projeto que está aberto e depois carrega a página de novo; o projeto volta do jeito que você deixou. {{ui:newVersion.later}} adia o cartão por 15 minutos. Recarregue logo: uma página que fica na versão antiga pode carregar partes da nova que não combinam com ela.

O mesmo cartão aparece quando isso já aconteceu: os módulos de cálculo de CAD, que só carregam quando você precisa deles pela primeira vez, informam de qual versão são. Se não for a da própria página (depois de uma atualização, ou com uma cópia guardada de uma versão antiga), o cartão pede que você recarregue antes que os dois deixem de se entender.

Quando o layerling está aberto em várias abas, elas cuidam umas das outras: se outra aba já roda uma versão mais nova, na parte de baixo da aba antiga, um aviso pede que você a recarregue. E se o mesmo projeto estiver aberto em duas abas, as duas avisam, porque salvam automaticamente e uma sobrescreveria a outra. Se você abrir o layerling em mais uma aba enquanto já há uma aberta, a nova aba sugere continuar na antiga e se oferece para fechar. Se você quiser duas abas de propósito, por exemplo para dois projetos lado a lado, clique em {{ui:tabs.keepHere}} na nova aba. Este guia também abre numa aba própria: enquanto o layerling estiver aberto ao lado, o botão do guia, no canto superior direito, diz "Voltar ao editor" e fecha o guia, em vez de abrir o editor uma segunda vez.

## Idioma e aparência

Você escolhe o idioma no canto superior direito, na lista de idiomas. O esquema de cores ao lado oferece {{ui:theme.short.system}} (segue o sistema operacional), {{ui:theme.short.light}}, {{ui:theme.short.dark}} e {{ui:theme.short.graphite}}, um cinza-escuro neutro.

## Rodando por conta própria

layerling é software livre (AGPL-3.0) e pode rodar no seu próprio computador ou servidor, por exemplo numa oficina, num clube ou numa escola. Há várias formas, descritas no [README no GitHub](https://github.com/henmedia/layerling/blob/main/README.md#getting-started):

- **O início rápido no Windows:** uma única linha no PowerShell instala tudo e põe um atalho na área de trabalho. Se o layerling já estiver rodando, outro clique duplo não inicia um segundo servidor, só abre a página.
- **Docker:** para NAS (dispositivos de armazenamento em rede) e servidores domésticos, sem precisar instalar o Node.js. Cada versão sai como uma imagem pronta `henmedia/layerling` no Docker Hub (também `ghcr.io/henmedia/layerling`) para amd64 e arm64; `docker run -d -p 3000:3000 -v layerling-thumbnails:/app/.codex/project-thumbnails henmedia/layerling:latest` inicia o layerling, e num NAS você procura a imagem no registro do gerenciador de contêineres. O volume `layerling-thumbnails` mantém as miniaturas da página inicial quando você atualiza; sem ele, elas somem toda vez que o contêiner é criado de novo, até você abrir o projeto.
- **Exportação estática:** o resultado são arquivos simples que qualquer servidor web consegue servir. Eles precisam ficar na raiz de um endereço (`https://layerling.example.com/` ou `http://192.168.0.5:8080/`), não numa subpasta nem abertos direto do disco; o README traz o passo a passo. Se o servidor tiver PHP e houver uma pasta `store` gravável ao lado do `index.html`, a exportação também passa a ser o armazenamento compartilhado de projetos.

A ponte MCP para assistentes de IA só existe no servidor de desenvolvimento; veja [Construindo com uma IA](chapter:ai-with-mcp).

## Ajuda e feedback

- No editor, a área {{ui:editor.group.help}} tem o {{ui:editor.guide}}, com as principais ações, e a visão geral dos [atalhos de teclado](chapter:shortcuts). Cada seção do guia rápido tem um ponto de interrogação que leva ao capítulo correspondente deste guia.

![O guia rápido no editor. Vídeos de outras pessoas aparecem no topo, e cada seção tem um ponto de interrogação.](shot:quick-guide)

- Perguntas, sugestões e relatos de bugs são bem-vindos no [fórum](https://forum.drucktipps3d.de/forum/board/127-layerling/) e no [GitHub](https://github.com/henmedia/layerling/discussions).
- O que mudou em cada versão está nas notas da versão, que você encontra no rodapé da página inicial e do editor.
