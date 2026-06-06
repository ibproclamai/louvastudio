# Roteiro de Video Tutorial - Louva.Studio

> Roteiro completo, pronto para gravar tela + microfone.
> Duracao estimada: **18 minutos** (versao completa) ou **5 minutos** (versao curta).
> Software sugerido para gravar: **OBS Studio** (gratis) ou **Loom** (facil, online).

---

## Pre-producao (antes de gravar)

### Softwares necessarios
- [ ] **OBS Studio** instalado ([obsproject.com](https://obsproject.com))
- [ ] **Node.js 18+** instalado e funcionando
- [ ] **Google Chrome** aberto
- [ ] **VSCode** ou Bloco de Notas (para mostrar arquivos)
- [ ] **Uma planilha Google** nova e vazia pronta
- [ ] Microfone testado
- [ ] Area de trabalho limpa (sem icones desnecessarios)

### Configuracao do OBS
- Cenas:
  - **Cena 1**: Tela cheia (1080p)
  - **Cena 2**: Tela + Webcam no canto inferior direito
- Fonte de audio: Microfone padrao
- Atalho para iniciar/parar gravacao: `Ctrl + F9`

### O que NAO esquecer de mostrar
- [ ] Criar projeto no Google Cloud
- [ ] Ativar Google Sheets API
- [ ] Criar Service Account e baixar JSON
- [ ] Renomear para `credentials.json`
- [ ] Compartilhar planilha com o email do Service Account
- [ ] Rodar `iniciar.bat` opcao 1, 2, 3
- [ ] Cadastrar primeiro usuario
- [ ] Adicionar membro de exemplo
- [ ] Adicionar musica de exemplo
- [ ] Criar escala de exemplo

---

## ABERTURA (0:00 - 0:30)

**[Tela: logo do Louva.Studio em fundo escuro gradiente]**

**NARRACAO:**
> "Ola! Neste tutorial voce vai aprender a instalar e configurar o Louva.Studio, um sistema completo e gratuito para gerenciar o ministerio de louvor da sua igreja. Em menos de 20 minutos voce tera tudo funcionando, tanto no seu computador quanto online, acessivel pelo celular. Vamos comecar?"

**[Tela: estrutura geral do sistema - dashboard com cards de membros, musicas, escalas]**

> "O Louva.Studio permite cadastrar membros, organizar o catalogo de musicas, montar escalas, receber confirmacoes dos membros, e ainda oferece o sistema VS - Virtual Sound - para cada musica ter playbacks, stems e metronomos. Tudo isso usando o Google Sheets como banco de dados, entao voce nao precisa de servidor de banco, tudo gratis."

---

## PARTE 1 - INSTALACAO LOCAL (0:30 - 5:00)

### Capitulo 1.1 - Baixar e descompactar (0:30 - 1:00)

**[Tela: pasta vazia `C:\Users\SeuNome\Desktop\louva`]**

**NARRACAO:**
> "Primeiro, baixe o projeto Louva.Studio. Voce vai receber uma pasta zipada. Descompacte em um local facil, como a area de trabalho. Renomeie a pasta para 'louva' - tudo em minusculo, sem espaco."

**[Acao: descompactar e renomear a pasta]**

> "A pasta deve ter esta estrutura: package.json, server.js, iniciar.bat, e duas pastas - public e src."

### Capitulo 1.2 - Instalar Node.js (1:00 - 1:30)

**[Tela: site nodejs.org]**

> "Se voce ainda nao tem o Node.js instalado, va em nodejs.org e baixe a versao LTS - a recomendada para a maioria dos usuarios. Execute o instalador e clique em 'Next' ate o final. A instalacao padrao ja funciona."

### Capitulo 1.3 - Instalar dependencias (1:30 - 2:30)

**[Tela: duplo clique em `iniciar.bat`]**

> "Agora, dentro da pasta louva, de duplo clique no arquivo 'iniciar.bat'. Ele abrira um menu simples com 4 opcoes."

**[Tela: menu do iniciar.bat]**

> "A primeira coisa e instalar as dependencias. Digite 1 e pressione Enter. Esse processo baixa todos os pacotes que o sistema precisa - leva 1 a 2 minutos dependendo da sua internet."

**[Acao: digitar 1, pressionar Enter, mostrar instalacao]**

> "Quando aparecer 'Instalacao concluida' ou voltar ao menu, pronto, as dependencias estao instaladas."

### Capitulo 1.4 - Configurar Google Cloud (2:30 - 4:00)

**[Tela: console.cloud.google.com]**

> "Agora vem a parte mais demorada, mas e so uma vez. Vamos criar as credenciais do Google. Abra o navegador e va em console.cloudgoogle.com. Faca login com sua conta Google."

> "Primeiro, crie um novo projeto. Clique no seletor de projetos no topo, e em 'Novo Projeto'. De o nome de 'Louva Studio' e clique em 'Criar'."

**[Acao: criar projeto]**

> "Com o projeto selecionado, va no menu lateral em 'APIs e Servicos' > 'Biblioteca'. Pesquise por 'Google Sheets API' e clique em 'Ativar'."

**[Acao: ativar a API]**

> "Agora va em 'APIs e Servicos' > 'Credenciais'. Clique em 'Criar Credenciais' e escolha 'Conta de Servico'. De um nome como 'louva-sheets', clique em 'Concluir' - pode pular a parte de permissoes opcionais."

**[Acao: criar service account]**

> "Na lista de contas de servico, clique na que voce acabou de criar. Va na aba 'Chaves'. Clique em 'Adicionar Chave' > 'Criar Nova Chave'. Escolha o formato JSON e clique em 'Criar'. O arquivo sera baixado automaticamente."

**[Acao: baixar chave JSON]**

> "Renomeie o arquivo baixado para 'credentials.json' - tudo minusculo, sem espaco. Mova esse arquivo para dentro da pasta 'louva', junto com o server.js."

**[Tela: arquivo credentials.json na pasta louva]**

> "MUITO IMPORTANTE: abra o arquivo credentials.json com o Bloco de Notas. Procure o campo 'client_email'. Ele sera algo como louva-sheets@seu-projeto.iam.gserviceaccount.com. Copie esse email - vamos usar ja ja."

### Capitulo 1.5 - Criar a planilha (4:00 - 5:00)

**[Tela: sheets.new]**

> "Agora va em sheets.new para criar uma planilha nova vazia. De um nome a ela, como 'Louva - Ministerio de Louvor'."

> "Olhe para a URL no navegador. Ela vai estar assim: docs.google.com/spreadsheets/d/ESSE-CODIGO-LONGOOOO/edit. Esse codigo grande no meio e o ID da sua planilha. Copie ele."

**[Acao: copiar ID da URL]**

> "Clique no botao 'Compartilhar' no canto superior direito. Cole o email do Service Account que voce copiou do credentials.json. Mude a permissao para 'Editor' e desmarque 'Notificar pessoas'. Clique em 'Enviar'."

**[Acao: compartilhar com service account]**

---

## PARTE 2 - CONFIGURACAO DO APP (5:00 - 7:30)

### Capitulo 2.1 - Configurar o .env (5:00 - 6:00)

**[Tela: voltar a pasta louva, duplo clique em iniciar.bat]**

**NARRACAO:**
> "Volte a pasta louva e abra o iniciar.bat novamente. Escolha a opcao 2 - Configurar arquivo .env. Ele abrira o Bloco de Notas com o arquivo .env."

**[Tela: bloco de notas com .env aberto]**

> "Aqui temos 4 linhas. A primeira, PORT, deixe 3000 mesmo. A segunda, JWT_SECRET, voce precisa gerar uma senha longa e aleatoria. Va em randomkeygen.com e copie uma chave de 64 caracteres. Cole aqui."

**[Acao: gerar chave e colar]**

> "A terceira linha, GOOGLE_SHEET_ID, cole o ID da planilha que voce copiou. A quarta, GOOGLE_CREDENTIALS_PATH, deixe ./credentials.json mesmo. Salve o arquivo e feche o Bloco de Notas."

### Capitulo 2.2 - Iniciar o servidor (6:00 - 7:00)

**[Tela: voltar ao menu do iniciar.bat, escolher opcao 3]**

**NARRACAO:**
> "Volte ao menu e escolha a opcao 3 - Iniciar o servidor. Ele abrira o servidor e mostrara no console 'Louva.Studio rodando em http://localhost:3000'. Pronto, o sistema esta no ar!"

### Capitulo 2.3 - Configuracao automatica via wizard (7:00 - 7:30)

**[Tela: navegador em http://localhost:3000]**

**NARRACAO:**
> "Abra o navegador em localhost:3000. Como e a primeira vez, o sistema abre o assistente de configuracao. Ele vai automaticamente verificar se a planilha esta acessivel e criar todas as abas necessarias. Clique em 'Executar Teste'. Se aparecer 'Conexao OK', esta tudo certo!"

**[Acao: clicar em executar teste]**

> "Agora clique em 'Ir para o Login' e cadastre o primeiro usuario. Este sera o administrador."

---

## PARTE 3 - USANDO O SISTEMA (7:30 - 14:00)

### Capitulo 3.1 - Cadastrar membros (7:30 - 9:00)

**[Tela: tela de cadastro/login]**

**NARRACAO:**
> "Tela de cadastro. Coloque seu nome, email e senha. O primeiro usuario vira automaticamente o admin - administrador do sistema. Clique em 'Criar conta'."

**[Acao: cadastrar admin]**

> "Apos o login, voce cai no Dashboard. Por enquanto esta vazio. Vamos comecar cadastrando os membros. Clique em 'Membros' no menu."

**[Tela: members.html]**

> "Para adicionar um membro, clique em 'Novo Membro'. Preencha o nome, a funcao - pode ser vocalista, guitarrista, baixista, tecladista, baterista, ou 'outro' - o telefone, email, e a disponibilidade. Clique em 'Salvar'."

**[Acao: adicionar 3-4 membros de exemplo]**

> "Adicione pelo menos 4 ou 5 membros para podermos montar escalas depois. Note que cada membro tem um botao de excluir e editar."

### Capitulo 3.2 - Cadastrar musicas (9:00 - 11:00)

**[Tela: songs.html]**

**NARRACAO:**
> "Agora vamos para Musicas. Aqui fica o catalogo de todas as musicas do repertorio. Clique em 'Nova Musica'."

> "Preencha o titulo, o artista, o tom - a tonalidade em que a igreja toca, o BPM - andamento, e opcionalmente links de cifra e video do YouTube. Clique em 'Salvar'."

**[Acao: cadastrar 3-4 musicas]**

> "Cada musica tem o botao 'VS' - Virtual Sound. Clicando ali voce pode adicionar arquivos de audio para essa musica especifica. Pode ser o playback completo, stems isolados, metronomo, click de ensaio, ou guia de referencia."

**[Acao: adicionar 1 VS a uma musica]**

> "Quando voce adiciona um VS, aparece um player de audio dentro do card. Os membros podem ouvir diretamente pelo celular."

### Capitulo 3.3 - Montar uma escala (11:00 - 13:00)

**[Tela: schedules.html]**

**NARRACAO:**
> "Chegou a hora da parte principal: montar uma escala. Va em 'Escalas' e clique em 'Nova Escala'."

> "Primeiro escolha a data do culto, o tipo - pode ser 'Culto Dominical', 'Culto de Oracao', 'Culto Jovem', ou 'Evento Especial' - e o local. Clique em 'Criar'."

**[Acao: criar escala]**

> "A escala aparece com status 'Rascunho'. Agora vamos adicionar membros. Clique em 'Adicionar Membro', escolha o membro e a funcao que ele vai exercer nesse culto. Pode adicionar o mesmo membro em funcoes diferentes - por exemplo, um vocalista que tambem toca violao."

**[Acao: adicionar 3-4 membros]**

> "Agora adicione as musicas. Clique em 'Adicionar Musica', escolha a musica e a ordem. Para cada musica, voce pode escolher qual VS os membros devem usar. Quando terminar, clique em 'Publicar'. O status muda para 'Publicada' e os membros recebem a notificacao."

### Capitulo 3.4 - Confirmacao pelo membro (13:00 - 14:00)

**[Tela: my-schedule.html - simular login de outro membro]**

**NARRACAO:**
> "Agora vamos ver como o membro recebe a escala. Ele acessa o sistema com o email e senha dele, e vai em 'Minhas Escalas'. Ele ve todas as escalas que esta participando."

> "Para cada escala, ele pode clicar em 'Confirmar' ou 'Recusar'. Quando confirma, voce - como admin - ve no Dashboard quantas pessoas ja confirmaram."

**[Acao: confirmar 1-2 escalas]**

---

## PARTE 4 - PUBLICAR ONLINE (14:00 - 18:00)

### Capitulo 4.1 - Preparar credenciais (14:00 - 15:00)

**[Tela: pasta louva, iniciar.bat opcao 4]**

**NARRACAO:**
> "Voce testou tudo localmente, agora vamos colocar online para os membros acessarem pelo celular, de qualquer lugar. Vou usar o Glitch - que e gratuito e nao precisa de cartao de credito."

> "Mas antes, vamos preparar as credenciais de forma segura. No iniciar.bat, escolha a opcao 4 - Gerar variaveis para deploy online."

**[Acao: executar opcao 4]**

> "Ele gera um arquivo .env.deploy com suas credenciais. Abra esse arquivo - ele tem tres variaveis: GOOGLE_CREDENTIALS_JSON - e a string JSON inteira em uma linha, GOOGLE_SHEET_ID, e JWT_SECRET. Mantenha esse arquivo aberto."

### Capitulo 4.2 - Criar projeto no Glitch (15:00 - 17:00)

**[Tela: glitch.com]**

**NARRACAO:**
> "Va em glitch.com e crie uma conta gratuita. Apos logado, clique em 'New Project' e escolha 'Import from GitHub' se voce subiu o codigo, ou 'glitch-hello-node' para criar do zero e colar os arquivos."

> "Para este tutorial vou usar o metodo mais simples: apague os arquivos padrao do projeto e cole a estrutura do Louva.Studio."

**[Acao: criar projeto e apagar arquivos default]**

> "A maneira mais facil: clique no terminal do Glitch e use git para clonar o repositorio, ou copie arquivo por arquivo da sua pasta local. Vamos copiar a pasta public primeiro."

> "Depois copie o server.js, package.json, e a pasta src."

> "Agora, o mais importante: nao copie o credentials.json! Em vez disso, vamos usar as variaveis de ambiente."

> "No painel lateral do Glitch, clique em '.env'. Cole as tres linhas que voce copiou do .env.deploy local. Salve."

**[Acao: colar vars no .env do Glitch]**

> "O Glitch vai detectar o package.json e instalar as dependencias sozinho em alguns segundos. Quando aparecer 'Louva.Studio rodando' no log, esta pronto!"

> "Clique em 'Show' no topo, depois 'In a New Window'. Essa e a URL publica do seu sistema! Compartilhe com os membros."

**[Tela: URL publica do Glitch]**

### Capitulo 4.3 - Instalar como app no celular (17:00 - 18:00)

**[Tela: celular mostrando a URL do Glitch no Chrome]**

**NARRACAO:**
> "Agora a parte legal: instalar como app no celular. Abra a URL do Glitch no Chrome do celular. O sistema ja e responsivo e otimizado para mobile."

> "No Android, aparece um banner embaixo dizendo 'Adicionar a tela inicial'. Clique nele, e o sistema instala como um app normal, com icone proprio, abre em tela cheia, e funciona offline para consultar escalas ja carregadas."

> "No iPhone, toque no botao de compartilhar e escolha 'Adicionar a Tela de Inicio'."

> "Pronto! Agora cada membro pode instalar o app no celular e acessar as escalas de qualquer lugar, mesmo sem internet para consultar escalas ja carregadas."

**[Tela: celular com icone do Louva na home screen]**

---

## ENCERRAMENTO (18:00 - 18:30)

**[Tela: dashboard do sistema, com cards de estatisticas]**

**NARRACAO:**
> "E isso ai! Voce tem agora um sistema completo de gestao do ministerio de louvor, gratuito, funcionando local e online, e com app no celular. O codigo e aberto - voce pode personalizar como quiser."

> "Se este tutorial te ajudou, compartilha com outros ministros de louvor. E se tiver duvidas, deixa nos comentarios. Deus abencoe!"

**[Tela: logo do Louva.Studio + "Gestao para o Ministerio de Louvor"]**

---

## CHECKLIST POS-GRAVACAO

- [ ] Cortar trechos com erros/demoras
- [ ] Adicionar timestamps na descricao do YouTube
- [ ] Criar thumbnail atrativa (use Canva)
- [ ] Escrever descricao com links uteis
- [ ] Adicionar legendas automaticas (YouTube tem)
- [ ] Publicar em: YouTube, Vimeo, e linkar no README

---

## SUGESTOES DE THUMBNAIL

Texto principal: **"Louva.Studio"** (fonte bold branca)
Subtexto: **"Ministerio de Louvor - GRÁTIS"** (amarelo)
Imagem de fundo: Screenshot do dashboard desfocado + icone de nota musical
Cores: gradiente roxo/azul (igual ao app)

---

## IDEIAS DE VIDEOS CURTOS (Shorts/Reels/TikTok)

1. **"Criei um app para minha igreja"** (60s mostrando o resultado)
2. **"3 features matadoras para o ministerio de louvor"** (90s)
3. **"Como organizar escalas em 5 minutos"** (5min tutorial rapido)
4. **"Adicionando playback de musica no app"** (2min)
5. **"App no celular - passo a passo"** (3min)
6. **"Por que uso Google Sheets como banco de dados"** (60s tech talk)
