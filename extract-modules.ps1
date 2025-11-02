# Extract modules from worker file back to src/ folder

param(
    [string]$WorkerFile = "worker_kv.js"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Extract Modules from Worker" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Read worker file line by line
$lines = Get-Content $WorkerFile -Encoding UTF8

# Create backup before extraction
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup\before_extract_$timestamp"
if (!(Test-Path "backup")) {
    New-Item -ItemType Directory -Path "backup" | Out-Null
}
New-Item -ItemType Directory -Path $backupDir | Out-Null

if (Test-Path "src") {
    Write-Host "Backing up current src/ to $backupDir..." -ForegroundColor Yellow
    Copy-Item -Path "src\*" -Destination $backupDir -Recurse -Force
}

# Ensure src directory exists
if (!(Test-Path "src")) {
    New-Item -ItemType Directory -Path "src" | Out-Null
}

# Module names in order
$moduleNames = @(
    "constants.js",
    "utils.js",
    "kv-storage.js",
    "model-fetcher.js",
    "pool-manager.js",
    "routing.js",
    "streaming.js",
    "gemini-forward.js",
    "session.js",
    "admin-ui-new.js",
    "pool-create-ui.js",
    "pool-manage-ui.js",
    "pool-detail-ui.js",
    "api-handlers.js"
)

# Find all module start markers
$moduleStarts = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^// ==================== 模块: (.+?) ====================") {
        $moduleStarts += @{Line = $i; Name = $Matches[1]}
    }
}

# Find the main entry marker
$mainEntryLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^// ==================== 主入口函数 ====================") {
        $mainEntryLine = $i
        break
    }
}

# Extract each module
for ($i = 0; $i -lt $moduleStarts.Count; $i++) {
    $moduleName = $moduleStarts[$i].Name
    $startLine = $moduleStarts[$i].Line
    
    # Determine end line (start of next module or main entry)
    if ($i -lt $moduleStarts.Count - 1) {
        $endLine = $moduleStarts[$i + 1].Line - 1
    } else {
        $endLine = $mainEntryLine - 1
    }
    
    Write-Host "Extracting $moduleName..." -ForegroundColor Green
    Write-Host "  Lines: $($startLine + 1) to $endLine" -ForegroundColor Gray
    
    # Extract lines (skip the module marker line itself)
    $moduleLines = $lines[($startLine + 1)..$endLine]
    
    # Remove empty lines at start and end
    while ($moduleLines.Count -gt 0 -and [string]::IsNullOrWhiteSpace($moduleLines[0])) {
        $moduleLines = $moduleLines[1..($moduleLines.Count - 1)]
    }
    while ($moduleLines.Count -gt 0 -and [string]::IsNullOrWhiteSpace($moduleLines[-1])) {
        $moduleLines = $moduleLines[0..($moduleLines.Count - 2)]
    }
    
    # Save to file
    $outputPath = "src\$moduleName"
    $moduleLines | Out-File -FilePath $outputPath -Encoding UTF8 -Force
    
    Write-Host "  ✓ Extracted $($moduleLines.Count) lines" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Extraction Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Backup location: $backupDir" -ForegroundColor Yellow
Write-Host "Modules extracted to: src\" -ForegroundColor Yellow
