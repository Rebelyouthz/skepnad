# Skapar en genvag "Skepnad" med appikonen pa skrivbordet.
# Kor: hogerklicka -> "Kor med PowerShell"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path $desktop 'Skepnad.lnk'))
$lnk.TargetPath = Join-Path $here 'Starta Skepnad.cmd'
$lnk.WorkingDirectory = $env:USERPROFILE
$lnk.IconLocation = (Join-Path $here 'public\skepnad.ico')
$lnk.Description = 'Skepnad - live-avatar och roststudio'
$lnk.WindowStyle = 7
$lnk.Save()
Write-Host 'Klart! Genvagen "Skepnad" finns nu pa skrivbordet.'
