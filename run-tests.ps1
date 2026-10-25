# Dev-only checker: injects __tests.js into a copy of index.html, runs it in
# headless Chrome (or Edge) and prints the pass/fail summary.
# Usage:  powershell -ExecutionPolicy Bypass -File .\run-tests.ps1

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$browser = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) { throw 'No Chrome or Edge found for headless testing.' }

$html = Get-Content (Join-Path $here 'index.html') -Raw
$js = Get-Content (Join-Path $here '__tests.js') -Raw
$probe = '<script>window.addEventListener("error",function(e){document.documentElement.setAttribute("data-err",(e.message||"err")+" @line "+(e.lineno||0));});window.addEventListener("unhandledrejection",function(e){document.documentElement.setAttribute("data-rej",String((e.reason&&e.reason.message)||e.reason));});</script>'
$html = $html.Replace('<body>', '<body>' + $probe)
$html = $html.Replace('</body>', '<script>' + $js + '</script></body>')

$harness = Join-Path $here '__test.html'
Set-Content -Path $harness -Value $html -Encoding UTF8

$domFile = Join-Path $env:TEMP 'golfstats-test-dom.html'
$errFile = Join-Path $env:TEMP 'golfstats-test-err.txt'
$profile = Join-Path $env:TEMP ('golfstats-profile-' + (Get-Random))
$url = 'file:///' + ($harness -replace '\\', '/')

Start-Process -FilePath $browser -NoNewWindow -Wait `
  -ArgumentList @('--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    "--user-data-dir=$profile", '--virtual-time-budget=12000', '--dump-dom', $url) `
  -RedirectStandardOutput $domFile -RedirectStandardError $errFile | Out-Null

$dom = Get-Content $domFile -Raw
function Get-Attr($name) {
  $m = [regex]::Match($dom, 'data-' + $name + '="([^"]*)"')
  if ($m.Success) { $m.Groups[1].Value } else { '(not reported)' }
}

"checks : " + (Get-Attr 'test')
"fails  : " + (Get-Attr 'fails')
"error  : " + (Get-Attr 'err')
"reject : " + (Get-Attr 'rej')

Remove-Item $harness -ErrorAction SilentlyContinue
