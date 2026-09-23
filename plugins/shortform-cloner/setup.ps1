# Run from PowerShell: powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Use setup.command on macOS.' }
function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') + ';' + (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links')
}
function Find-Python {
    foreach ($candidate in @('python3','py','python')) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            $probe = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("import sys; print('SHORTFORM_PY3' if sys.version_info >= (3,9) else 'OLD')"))
            $arguments = @('-c', "exec(__import__('base64').b64decode('$probe'))")
            if ($candidate -eq 'py') { $arguments = @('-3') + $arguments }
            try {
                $answer = & $candidate @arguments 2>$null
                if ($LASTEXITCODE -eq 0 -and $answer -eq 'SHORTFORM_PY3') { return $candidate }
            } catch { }
        }
    }
    return $null
}
function Install-Package([string] $package) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'Install Microsoft App Installer (WinGet), then run setup again.' }
    & winget install --id $package --exact --source winget --accept-source-agreements --accept-package-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) { throw "Could not install $package. Resolve the installer error and run setup again." }
    Refresh-Path
}
Refresh-Path
$pythonLauncher = Find-Python
if (-not $pythonLauncher) { Install-Package 'Python.Python.3.12'; $pythonLauncher = Find-Python }
if (-not $pythonLauncher) { throw 'Python was installed but is not visible yet. Open a new PowerShell window and run setup again.' }
if (-not (Get-Command yt-dlp -ErrorAction SilentlyContinue)) { Install-Package 'yt-dlp.yt-dlp' }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue) -or -not (Get-Command ffprobe -ErrorAction SilentlyContinue)) { Install-Package 'Gyan.FFmpeg' }
$verifyArgs = @((Join-Path $PSScriptRoot 'verify_runtime.py'))
if ($pythonLauncher -eq 'py') { $verifyArgs = @('-3') + $verifyArgs }
& $pythonLauncher @verifyArgs
if ($LASTEXITCODE -ne 0) { throw 'Runtime verification failed. Resolve the error above before installing.' }
$panelRoot = $env:SELECTS_USER_PANELS_ROOT
if (-not $panelRoot) { $panelRoot = Join-Path $env:USERPROFILE '.selects\panels' }
$destination = Join-Path $panelRoot 'shortform-cloner'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$panelFile = Join-Path $destination 'panel.tsx'
if (Test-Path $panelFile) {
    $backup = Join-Path $env:USERPROFILE '.selects\plugin-data\shortform-cloner\backups'
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    Copy-Item $panelFile (Join-Path $backup ('panel-before-setup-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + '.tsx'))
}
Copy-Item (Join-Path $PSScriptRoot 'panel.tsx') $panelFile -Force
Write-Host 'Installed. Restart Selects and open Plugin > Selects Clips.'
