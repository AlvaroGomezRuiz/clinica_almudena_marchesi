Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info([string]$msg) {
  Write-Host $msg
}

function Ensure-Venv([string]$venvPath) {
  if (Test-Path -LiteralPath $venvPath) { return }
  Write-Info "Creando venv en $venvPath ..."
  python -m venv $venvPath
}

function Pip-Install([string]$venvPath, [string]$requirementsPath) {
  $py = Join-Path $venvPath 'Scripts\python.exe'
  $pip = Join-Path $venvPath 'Scripts\pip.exe'
  if (!(Test-Path -LiteralPath $py)) { throw "python no encontrado en $py" }
  if (!(Test-Path -LiteralPath $pip)) { throw "pip no encontrado en $pip" }
  & $py -m pip install --upgrade pip | Out-Null
  & $pip install -r $requirementsPath | Out-Null
}

function Invoke-GeoAudit([string]$venvPath, [string]$targetUrl, [string]$reportsDir) {
  $geo = Join-Path $venvPath 'Scripts\geo.exe'
  if (!(Test-Path -LiteralPath $geo)) { throw "geo no encontrado en $geo" }

  $ts = Get-Date -Format 'yyyyMMdd-HHmmss'
  $safe = ($targetUrl -replace 'https?://', '') -replace '[^a-zA-Z0-9\.\-_/]', '_'
  $safe = $safe -replace '[/_]+', '_'

  $htmlPath = Join-Path $reportsDir "geo-$ts-$safe.html"
  $jsonPath = Join-Path $reportsDir "geo-$ts-$safe.json"

  $isSitemap = $targetUrl.ToLowerInvariant().EndsWith('/sitemap.xml') -or $targetUrl.ToLowerInvariant().Contains('sitemap.xml')

  Write-Info "Audit GEO: $targetUrl"
  Write-Info "HTML: $htmlPath"
  Write-Info "JSON: $jsonPath"

  if ($isSitemap) {
    & $geo audit --sitemap $targetUrl --max-urls 25 --format html | Out-File -FilePath $htmlPath -Encoding utf8
    & $geo audit --sitemap $targetUrl --max-urls 25 --format json | Out-File -FilePath $jsonPath -Encoding utf8
  } else {
    & $geo audit --url $targetUrl --format html | Out-File -FilePath $htmlPath -Encoding utf8
    & $geo audit --url $targetUrl --format json | Out-File -FilePath $jsonPath -Encoding utf8
  }

  Write-Info "OK"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$venvPath = Join-Path $scriptDir '.venv'
$requirementsPath = Join-Path $scriptDir 'requirements.txt'
$reportsDir = Join-Path $scriptDir 'reports'

if (!(Get-Command python -ErrorAction SilentlyContinue)) {
  throw 'Python no está disponible en PATH. Instala Python 3.9+ y reinicia la terminal.'
}

Ensure-Venv -venvPath $venvPath
Pip-Install -venvPath $venvPath -requirementsPath $requirementsPath

if (!(Test-Path -LiteralPath $reportsDir)) {
  New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

$url = Read-Host 'URL a auditar (página o sitemap.xml)'
if ([string]::IsNullOrWhiteSpace($url)) { throw 'URL vacía' }

Invoke-GeoAudit -venvPath $venvPath -targetUrl $url.Trim() -reportsDir $reportsDir

