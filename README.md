# Louva.Studio

> Sistema completo de gestao para o ministerio de louvor da sua igreja.
> Musicas, escalas, membros, confirmacoes, VS (Virtual Sound) e configuracoes da igreja - tudo em um so lugar.

---

## O que o sistema faz

- **Membros**: cadastro com funcoes (vocalista, instrumentista, etc), telefones, observacoes
- **Musicas**: catalogo com tom, BPM, categoria, links de cifras, letras e videos
- **Escalas**: montagem de escalas por data, publicacao e confirmacao
- **Confirmacoes**: cada membro confirma (ou recusa) sua participacao na escala
- **VS (Virtual Sound)**: cada musica pode ter varios VS - playback, stems, metronomo, click, guia
- **Estudio**: painel administrativo com usuarios, configuracoes da igreja e VS
- **Mobile-first PWA**: instala no celular como se fosse um app

---

## Rodar localmente (Windows)

### Pre-requisitos
- Node.js 18+ ([nodejs.org](https://nodejs.org/))
- Conta Google com Google Sheets
- ~15 minutos

### Passo a passo

1. **Baixe e descompacte** o projeto em uma pasta (ex: `C:\Users\SeuNome\Desktop\louva`)

2. **Duplo clique em `iniciar.bat`** - escolha opcao 1 para instalar

3. **Crie o arquivo `credentials.json`** (credenciais do Google Service Account):
   - Acesse [console.cloud.google.com](https://console.cloud.google.com)
   - Crie um projeto, ative a **Google Sheets API**
   - Crie uma **Service Account** e baixe a chave JSON
   - Renomeie para `credentials.json` e coloque na raiz do projeto

4. **Crie uma Google Planilha** vazia e copie o ID da URL
   - Ex: `https://docs.google.com/spreadsheets/d/ESSE_E_O_ID/edit`

5. **Compartilhe a planilha** com o email do Service Account (esta no `credentials.json` em `client_email`) com permissao de **Editor**

6. **Configure o arquivo `.env`** - duplo clique em `iniciar.bat`, escolha opcao 2

7. **Inicie o servidor** - duplo clique em `iniciar.bat`, escolha opcao 3

8. **Acesse** `http://localhost:3000` no navegador

9. **Cadastre o primeiro usuario** - este sera automaticamente o **admin**

---

## Publicar online (gratis)

> **Guia visual rapido em 1 pagina**: veja [`DEPLOY-RAPIDO.md`](./DEPLOY-RAPIDO.md)

### Preparacao automatica

Na pasta do projeto, duplo clique em `iniciar.bat` e escolha a opcao **5** - ele gera um ZIP pronto para subir.

### Opcao A: Render (RECOMENDADO - mais facil, gratis, 24h)

1. Va em [github.com](https://github.com) e crie uma conta
2. Crie um repositorio publico chamado `louva-studio`
3. Faca upload dos arquivos (use o ZIP gerado pela opcao 5 do iniciar.bat)
4. Va em [render.com](https://render.com) e conecte com GitHub
5. **New + > Web Service** > selecione `louva-studio`
6. Configure:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: **Free**
7. Em **Environment Variables**, adicione as 3 variaveis (veja `DEPLOY-RAPIDO.md`)
8. Clique em **Create Web Service** - 5 min depois estara online

### Opcao B: Cloudflare Tunnel (mais rapido - 2 min, mas PC precisa ficar ligado)

1. Baixe `cloudflared.exe` em [github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases/latest)
2. Coloque na pasta `louva`
3. Rode: `.\cloudflared.exe tunnel --url http://localhost:3000`
4. Aparece a URL publica no terminal - compartilhe com quem quiser

> **Nota**: o Glitch encerrou o servico de hospedagem em julho/2025, entao nao use mais.

---

## Estrutura do projeto

```
louva/
  iniciar.bat              # Menu Windows (Instalar / Configurar / Iniciar)
  package.json
  server.js                # Servidor Express principal
  credentials.json         # (NAO versionar) Google Service Account
  .env                     # (NAO versionar) configuracoes locais
  public/                  # Frontend estatico
    index.html             # Login / Cadastro
    dashboard.html
    members.html
    songs.html
    schedules.html
    my-schedule.html
    studio.html            # Admin
    setup.html             # Wizard de configuracao inicial
    manifest.json          # PWA
    sw.js                  # Service Worker
    icon.svg
    css/
      style.css            # Design system principal
      setup.css
      studio.css
    js/
      api.js               # API client + toast + nav helpers
      auth.js
      ...
  src/
    config/
      sheets.js            # Google Sheets client
    routes/
      auth.js              # Login, cadastro, gestao de usuarios
      members.js           # CRUD membros
      songs.js             # CRUD musicas
      schedules.js         # Escalas + publicacao
      confirmations.js     # Confirmacoes dos membros
      vs.js                # Virtual Sound (playback, stems, etc)
      config.js            # Configuracoes da igreja
  scripts/
    gerar-env-deploy.js    # Converte credentials.json em env var
```

---

## Tipos de VS (Virtual Sound)

| Tipo | Uso |
|---|---|
| **playback** | Audio completo da musica |
| **stem** | Faixa isolada (voz, violao, bateria) |
| **metronomo** | Click do BPM |
| **click** | Click de ensaio |
| **ensaio** | Audio para estudo |
| **guia** | Guia de referencia |
| **outro** | Outros materiais |

---

## Solucao de problemas

### "Acesso negado" ao testar conexao
- Verifique se compartilhou a planilha com o email do Service Account
- Email esta em `credentials.json` > `client_email`

### "GOOGLE_SHEET_ID nao definido"
- Abra o `.env` (opcao 2 do `iniciar.bat`) e preencha o ID

### Cadastro nao funciona
- Verifique se o navegador esta acessando `http://localhost:3000` e nao `file:///...`
- Abra o Console do navegador (F12) e veja os erros

### Como gerar uma chave JWT_SECRET segura
- Acesse [randomkeygen.com](https://randomkeygen.com) e copie uma chave de 64 caracteres

---

## Licenca

MIT - Faca o que quiser com o codigo. Use para a gloria de Deus.
