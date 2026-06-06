@echo off
chcp 65001 >nul
cd /d "%~dp0"

:menu
cls
echo.
echo  ============================================
echo       LOUVA.STUDIO - Ministerio de Louvor
echo  ============================================
echo.
echo   [1] Instalar dependencias (primeira vez)
echo   [2] Configurar arquivo .env
echo   [3] Iniciar o servidor
echo   [4] Gerar variaveis para deploy online
echo   [5] Preparar pacote para deploy (ZIP pronto)
echo   [0] Sair
echo.
set /p op="  Escolha uma opcao: "

if "%op%"=="1" goto install
if "%op%"=="2" goto config
if "%op%"=="3" goto start
if "%op%"=="4" goto genenv
if "%op%"=="5" goto zip
if "%op%"=="0" exit /b

goto menu

:install
cls
echo.
echo  Instalando dependencias do Node.js...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo  ERRO: Nao foi possivel instalar.
  echo  Verifique se o Node.js esta instalado: node -v
)
echo.
pause
goto menu

:config
cls
echo.
if not exist .env (
  echo  Criando arquivo .env...
  (
    echo PORT=3000
    echo JWT_SECRET=troque-esta-chave-secreta-por-uma-longa-e-aleatoria
    echo GOOGLE_SHEET_ID=cole-aqui-o-id-da-sua-planilha-do-google
    echo GOOGLE_CREDENTIALS_PATH=./credentials.json
  ) > .env
)
echo  Abrindo o arquivo .env no Bloco de Notas...
echo  Preencha os valores e salve o arquivo.
echo.
echo  GOOGLE_SHEET_ID = o ID esta na URL da planilha
echo                    exemplo: docs.google.com/spreadsheets/d/ESSE_ID/edit
echo.
echo  JWT_SECRET = gere uma frase aleatoria longa em randomkeygen.com
echo.
timeout /t 3 >nul
start notepad.exe .env
echo.
echo  Apos salvar o .env, voce pode iniciar o servidor (opcao 3).
echo.
pause
goto menu

:start
cls
echo.
echo  Iniciando o servidor Louva.Studio...
echo  Para parar, pressione Ctrl+C nesta janela.
echo.
call npm start
echo.
pause
goto menu

:deploy
cls
echo.
if not exist credentials.json (
  echo  ERRO: arquivo credentials.json nao encontrado nesta pasta.
  echo  Coloque o arquivo credentials.json na raiz do projeto primeiro.
  echo.
  pause
  goto menu
)
echo  Gerando arquivo .env.deploy com suas credenciais...
echo.
call node scripts/gerar-env-deploy.js
echo.
echo  Agora abra o arquivo .env.deploy, copie TODO o conteudo
echo  e cole nas variaveis de ambiente do seu host (Glitch, Render, etc).
echo.
echo  IMPORTANTE: delete o arquivo .env.deploy apos copiar!
echo.
pause
goto menu

:zip
cls
echo.
echo  Preparando pacote para deploy online (GitHub + Render)...
echo.
powershell -ExecutionPolicy Bypass -File "scripts\deploy.ps1"
goto menu
