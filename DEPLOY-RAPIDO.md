# 🚀 Deploy Louva.Studio - Guia Rápido (5 passos)

> **Você só precisa clicar. Eu preparei TUDO que dá pra automatizar.**

---

## PASSO 1 - Preparar o pacote (1 clique seu)

Na pasta `louva`, dê duplo clique em **`iniciar.bat`** e escolha a opção **5**.

Ele vai criar um arquivo chamado **`louva-studio-pronto-para-deploy.zip`** na mesma pasta.

✅ Pronto, agora é só subir esse ZIP no GitHub.

---

## PASSO 2 - Criar conta no GitHub (2 min)

1. Abra **https://github.com** no navegador
2. Clique em **"Sign up"** (canto superior direito)
3. Coloque seu email, crie uma senha, escolha um nome de usuário
4. Confirme pelo email

> 💡 Use o mesmo email do Google se tiver, é mais rápido.

---

## PASSO 3 - Criar o repositório (30s)

1. Logado no GitHub, clique no **"+"** (canto superior direito) > **"New repository"**
2. Configure:
   - **Repository name**: `louva-studio`
   - **Description**: `Sistema de gestão do ministério de louvor`
   - Marque **"Public"**
   - **NÃO** marque "Add README"
3. Clique no botão verde **"Create repository"**

---

## PASSO 4 - Subir o ZIP (2 min)

1. Na tela seguinte, procure e clique no link **"uploading an existing file"**
2. **Antes de subir**, você precisa descompactar o ZIP:
   - Vá na pasta `louva`
   - Clique com botão direito no `louva-studio-pronto-para-deploy.zip`
   - **"Extrair tudo"** ou **"Extract Here"**
   - Vai criar uma pasta `deploy-temp` com os arquivos
3. **Abra essa pasta `deploy-temp`** e arraste **TUDO** que está dentro dela para a área cinza do GitHub
4. Espere carregar a barra de progresso
5. Clique em **"Commit changes"** (botão verde embaixo)

> ⚠️ Não arraste a pasta `deploy-temp` em si, arraste o **conteúdo** dela (os arquivos e pastas soltos dentro).

---

## PASSO 5 - Deploy no Render (5 min)

### 5.1 - Criar conta
1. Abra **https://render.com**
2. Clique em **"Get Started for Free"**
3. Clique em **"Sign in with GitHub"** (botão verde)
4. Autorize o Render

### 5.2 - Criar Web Service
1. No painel do Render, clique no **"New +"** > **"Web Service"**
2. Encontre `louva-studio` na lista e clique em **"Connect"**

### 5.3 - Configurar
Preencha EXATAMENTE assim:

| Campo | Valor |
|---|---|
| Name | `louva-studio` |
| Region | `Oregon` ou `Frankfurt` |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Instance Type | **Free** |

### 5.4 - Variáveis de ambiente
Role a página até **"Environment Variables"**. Adicione estas 3:

**1ª variável:**
- Key: `GOOGLE_CREDENTIALS_JSON`
- Value: *(conteúdo do seu credentials.json em UMA linha)*

**2ª variável:**
- Key: `GOOGLE_SHEET_ID`
- Value: `1HIBhZ6hDrq1ShA8170EgRBGlnEJha1Em5wFXjyryj20`

**3ª variável:**
- Key: `JWT_SECRET`
- Value: *(uma frase aleatória de 64 caracteres - gere em randomkeygen.com)*

### 5.5 - Criar
Clique em **"Create Web Service"** no final da página.

### 5.6 - Aguardar (3-5 min)
Você vai ver os logs do build em tempo real. Quando aparecer **"Live"** com bolinha verde 🟢, está no ar!

Sua URL: `https://louva-studio.onrender.com`

---

## 🎉 PRONTO! Agora é só:

1. Abrir a URL no navegador
2. Cadastrar o primeiro admin
3. Instalar no celular (Chrome > "Adicionar à tela inicial")

---

## 🧹 Limpeza importante (depois que tudo funcionar)

1. **Delete o arquivo `.env.deploy`** da pasta `louva` (tem suas senhas)
2. **Delete o ZIP** `louva-studio-pronto-para-deploy.zip`
3. **Delete a pasta** `deploy-temp` se ainda existir

---

## 🆘 Problemas comuns

| Erro | Solução |
|---|---|
| "Build failed" no Render | Veja o log, geralmente é erro no `npm install` |
| "GOOGLE_CREDENTIALS_JSON invalid" | O JSON tem que estar em UMA linha só, sem quebras |
| "Application failed to respond" | Espere 1 minuto e tente de novo (servidor acordando) |
| "Cannot find module" | Render não instalou as deps - confira o Build Command |

---

## 📞 Se travar em algum passo

Me chama de novo e me diz em qual **PASSO + NÚMERO** você travou. Eu te ajudo.
