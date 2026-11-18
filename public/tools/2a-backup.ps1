<#
  2A Construction - weekly database backup to this PC (Windows PowerShell 5.1 or later).

  Set up once (it asks for the backup key and where to save):
      powershell -ExecutionPolicy Bypass -File .\2a-backup.ps1 -Install
  Back up now:
      powershell -ExecutionPolicy Bypass -File .\2a-backup.ps1
  Stop the weekly backup:
      powershell -ExecutionPolicy Bypass -File .\2a-backup.ps1 -Uninstall

  Every Sunday at 19:00 (or the next time the PC is on) it saves 2A-backup-YYYY-MM-DD.zip with every table
  as JSON, and keeps the newest 12. Read-only: it never changes anything in the database.
  The backup key is stored encrypted for your Windows user only (Windows DPAPI).
#>
param([switch]$Install, [switch]$Uninstall, [string]$Site = "https://2aconstruction.co.uk")

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$TaskName = "2A Construction weekly backup"
$ConfigDir = Join-Path $env:LOCALAPPDATA "2A-backup"
$ConfigFile = Join-Path $ConfigDir "config.json"
$Utf8 = New-Object System.Text.UTF8Encoding $false

function Write-Log($text) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $text
  Write-Host $line
  if (Test-Path $ConfigDir) { Add-Content -Path (Join-Path $ConfigDir "backup.log") -Value $line -Encoding UTF8 }
}

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Weekly backup removed. Your saved backups are untouched."
  exit 0
}

if ($Install) {
  New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
  $site = Read-Host "Website address [$Site]"; if (-not $site) { $site = $Site }
  $secure = Read-Host "Backup key (the BACKUP_SECRET value from Vercel)" -AsSecureString
  $defaultFolder = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "2A Backups"
  $folder = Read-Host "Save backups in [$defaultFolder]"; if (-not $folder) { $folder = $defaultFolder }
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  $cfg = @{ site = $site.TrimEnd("/"); key = (ConvertFrom-SecureString $secure); folder = $folder; keep = 12 }
  [IO.File]::WriteAllText($ConfigFile, ($cfg | ConvertTo-Json), $Utf8)
  $self = Join-Path $ConfigDir "2a-backup.ps1"
  Copy-Item -Path $PSCommandPath -Destination $self -Force
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$self`""
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 7pm
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Saves a copy of the 2A Construction database every week." -Force | Out-Null
  Write-Host "Set up. Backups go to $folder every Sunday at 19:00 (or when the PC is next on). Making the first one now..."
}

if (-not (Test-Path $ConfigFile)) { Write-Host "Not set up yet. Run:  powershell -ExecutionPolicy Bypass -File .\2a-backup.ps1 -Install"; exit 1 }
$cfg = Get-Content $ConfigFile -Raw | ConvertFrom-Json
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((ConvertTo-SecureString $cfg.key)))
$headers = @{ Authorization = "Bearer $plain" }

function Get-Text($url) {
  for ($try = 1; $try -le 3; $try++) {
    try {
      $r = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 120
      return [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
    } catch {
      if ($try -eq 3) { throw }
      Start-Sleep -Seconds (5 * $try)
    }
  }
}

try {
  $stamp = Get-Date -Format "yyyy-MM-dd"
  $work = Join-Path $env:TEMP "2A-backup-$stamp-$PID"
  New-Item -ItemType Directory -Force -Path $work | Out-Null
  $manifestText = Get-Text "$($cfg.site)/api/backup/tables"
  $manifest = $manifestText | ConvertFrom-Json
  [IO.File]::WriteAllText((Join-Path $work "_tables.json"), $manifestText, $Utf8)
  $total = 0
  foreach ($t in $manifest.tables) {
    $parts = New-Object System.Collections.Generic.List[string]
    $offset = 0
    while ($true) {
      $text = Get-Text ("{0}/api/backup/chunk?table={1}&offset={2}" -f $cfg.site, [Uri]::EscapeDataString($t.name), $offset)
      $i = $text.IndexOf('"rows":[')
      $head = $text.Substring(0, $i)
      $rows = $text.Substring($i + 8, $text.Length - $i - 8 - 2)   # between "rows":[ and the closing ]}
      if ($rows.Trim().Length -gt 0) { $parts.Add($rows) }
      $m = [regex]::Match($head, '"count":(\d+),"next":(null|\d+)')
      $total += [int]$m.Groups[1].Value
      if ($m.Groups[2].Value -eq "null") { break }
      $offset = [int]$m.Groups[2].Value
    }
    [IO.File]::WriteAllText((Join-Path $work "$($t.name).json"), "[" + ($parts -join ",") + "]", $Utf8)
  }
  $zip = Join-Path $cfg.folder "2A-backup-$stamp.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path (Join-Path $work "*") -DestinationPath $zip -CompressionLevel Optimal
  Remove-Item $work -Recurse -Force
  Get-ChildItem -Path $cfg.folder -Filter "2A-backup-*.zip" | Sort-Object Name -Descending | Select-Object -Skip ([int]$cfg.keep) | Remove-Item -Force
  Write-Log ("Backup saved: {0} ({1} tables, {2} rows)" -f $zip, $manifest.tables.Count, $total)
} catch {
  Write-Log ("Backup FAILED: " + $_.Exception.Message)
  exit 1
}
