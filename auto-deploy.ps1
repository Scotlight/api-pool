$ErrorActionPreference = "Stop"

# 检查 wrangler.toml 路径
$tomlPath = Join-Path $PSScriptRoot "wrangler.toml"
if (-not (Test-Path $tomlPath)) {
    Write-Error "错误: 找不到 wrangler.toml"
    exit 1
}

$content = Get-Content $tomlPath -Raw
$placeholder = "YOUR_D1_DATABASE_ID_HERE"

# 1. 检查是否需要配置数据库 ID
if ($content.Contains($placeholder)) {
    Write-Host "正在检查 Cloudflare D1 数据库..." -ForegroundColor Cyan
    
    # 尝试获取 D1 列表
    try {
        $listJson = npx wrangler d1 list --json | Out-String
    } catch {
        Write-Error "无法连接到 Cloudflare。请先运行 'npx wrangler login' 登录。"
        exit 1
    }
    
    # 解析 JSON
    try {
        $dbs = $listJson | ConvertFrom-Json
    } catch {
        Write-Warning "无法解析 D1 列表，可能未登录或输出格式错误。"
        $dbs = @()
    }
    
    $targetDbName = "gemini-pool-db"
    $targetDb = $dbs | Where-Object { $_.name -eq $targetDbName }
    $dbId = $null
    
    if ($targetDb) {
        $dbId = $targetDb.uuid
        Write-Host "✅ 找到现有的数据库: $targetDbName ($dbId)" -ForegroundColor Green
    } else {
        Write-Host "创建新数据库: $targetDbName ..." -ForegroundColor Yellow
        npx wrangler d1 create $targetDbName
        
        # 重新获取列表以确认 ID
        $listJson = npx wrangler d1 list --json | Out-String
        $dbs = $listJson | ConvertFrom-Json
        $targetDb = $dbs | Where-Object { $_.name -eq $targetDbName }
        
        if ($targetDb) { 
            $dbId = $targetDb.uuid
            Write-Host "✅ 数据库创建成功: $dbId" -ForegroundColor Green
        }
    }
    
    # 更新配置
    if ($dbId) {
        $content = $content.Replace($placeholder, $dbId)
        Set-Content $tomlPath $content
        Write-Host "✅ 已更新 wrangler.toml 配置" -ForegroundColor Green
    } else {
        Write-Error "❌ 无法自动获取数据库 ID。请手动创建并更新 wrangler.toml。"
        exit 1
    }
} else {
    Write-Host "配置检查通过 (已存在 Database ID)" -ForegroundColor Green
}

# 2. 执行部署
Write-Host "`n🚀 开始部署..." -ForegroundColor Cyan
npx wrangler deploy

Write-Host "`n✅ 部署完成！" -ForegroundColor Green
