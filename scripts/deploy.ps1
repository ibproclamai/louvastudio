# ============================================
#  Script de DEPLOY - Louva.Studio
#  Prepara um ZIP pronto para subir no GitHub
# ============================================

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    LOUVA.STUDIO - Preparar Deploy" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "package.json")) {
  Write-Host "  ERRO: package.json nao encontrado. Rode este script da pasta louva." -ForegroundColor Red
  pause
  exit 1
}

$deployDir = Join-Path $projectRoot "deploy-temp"
$zipPath = Join-Path $projectRoot "louva-studio-pronto-para-deploy.zip"

if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

New-Item -ItemType Directory -Path $deployDir | Out-Null

Write-Host "  [1/4] Copiando arquivos do projeto..." -ForegroundColor Yellow
$exclude = @('node_modules', '.env', '.env.deploy', 'credentials.json', 'deploy-temp', '*.zip', '*.log')
Get-ChildItem -Path $projectRoot -Force | Where-Object {
  $name = $_.Name
  -not ($exclude | Where-Object { $name -like $_ })
} | ForEach-Object {
  if ($_.PSIsContainer) {
    $dest = Join-Path $deployDir $_.Name
    Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
  } else {
    Copy-Item -Path $_.FullName -Destination $deployDir -Force
  }
}

Write-Host "  [2/4] Verificando arquivos sensiveis (NAO devem estar no ZIP)..." -ForegroundColor Yellow
$sensitiveFiles = @('.env', 'credentials.json', '.env.deploy')
$allGood = $true
foreach ($f in $sensitiveFiles) {
  $path = Join-Path $deployDir $f
  if (Test-Path $path) {
    Write-Host "    [AVISO] $f foi incluido por engano!" -ForegroundColor Red
    Remove-Item $path -Force
    $allGood = $false
  }
}
if ($allGood) {
  Write-Host "    OK - nenhum arquivo sensivel no ZIP" -ForegroundColor Green
}

Write-Host "  [3/4] Gerando .env.deploy com suas credenciais..." -ForegroundColor Yellow
if (Test-Path "credentials.json") {
  & node scripts/gerar-env-deploy.js | Out-Null
  Write-Host "    Arquivo .env.deploy gerado" -ForegroundColor Green
} else {
  Write-Host "    AVISO: credentials.json nao encontrado - gere manualmente depois" -ForegroundColor Red
}

Write-Host "  [4/4] Compactando ZIP..." -ForegroundColor Yellow
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($deployDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item $deployDir -Recurse -Force

$zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "    PRONTO!" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Arquivo criado: $zipPath ($zipSize MB)" -ForegroundColor White
Write-Host ""
Write-Host "  PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Va em https://github.com e crie uma conta (se nao tem)" -ForegroundColor White
Write-Host "  2. Crie um repositorio publico chamado: louva-studio" -ForegroundColor White
Write-Host "  3. Na pagina do repo, clique 'Add file' > 'Upload files'" -ForegroundColor White
Write-Host "  4. Arraste o ZIP e descompacte antes (ou extraia e arraste a pasta)" -ForegroundColor White
Write-Host "  5. Va em https://render.com e conecte com GitHub" -ForegroundColor White
Write-Host "  6. New + > Web Service > selecione louva-studio" -ForegroundColor White
Write-Host "  7. Adicione as 3 variaveis de ambiente (veja .env.deploy)" -ForegroundColor White
Write-Host "  8. Create Web Service - AGUARDE 5 MINUTOS" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANTE: delete o arquivo louva-studio-pronto-para-deploy.zip" -ForegroundColor Yellow
Write-Host "  e o .env.deploy apos subir tudo (contem segredos)!" -ForegroundColor Yellow
Write-Host ""
pause
