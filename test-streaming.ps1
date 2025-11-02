# 测试流式响应修复效果
# 使用方法: .\test-streaming.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "流式响应测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置参数
$WORKER_URL = Read-Host "请输入您的 Worker URL (例如: https://your-worker.workers.dev)"
$AUTH_KEY = Read-Host "请输入您的 Auth Key (sk-pool-xxxxx)"

if (-not $WORKER_URL -or -not $AUTH_KEY) {
    Write-Host "错误: Worker URL 和 Auth Key 都是必需的" -ForegroundColor Red
    exit 1
}

$API_URL = "$WORKER_URL/v1/chat/completions"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "测试 1: 非流式短文本响应" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$body1 = @{
    model = "gemini-2.0-flash-exp"
    messages = @(
        @{
            role = "user"
            content = "你好，请用一句话介绍你自己"
        }
    )
    stream = $false
} | ConvertTo-Json -Depth 10

Write-Host "正在发送请求..." -ForegroundColor Yellow

try {
    $response1 = Invoke-RestMethod -Uri $API_URL -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $AUTH_KEY"
    } -Body $body1
    
    Write-Host "✓ 响应成功！" -ForegroundColor Green
    Write-Host "模型: $($response1.model)" -ForegroundColor Cyan
    Write-Host "内容: $($response1.choices[0].message.content)" -ForegroundColor White
    Write-Host "Token使用: Prompt=$($response1.usage.prompt_tokens), Completion=$($response1.usage.completion_tokens), Total=$($response1.usage.total_tokens)" -ForegroundColor Gray
} catch {
    Write-Host "✗ 请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "测试 2: 流式短文本响应" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$body2 = @{
    model = "gemini-2.0-flash-exp"
    messages = @(
        @{
            role = "user"
            content = "用50字介绍一下人工智能"
        }
    )
    stream = $true
} | ConvertTo-Json -Depth 10

Write-Host "正在发送流式请求..." -ForegroundColor Yellow
Write-Host "流式输出: " -ForegroundColor Cyan -NoNewline

try {
    # PowerShell 7+ 支持流式响应
    $result = Invoke-WebRequest -Uri $API_URL -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $AUTH_KEY"
    } -Body $body2
    
    # 简单解析SSE响应
    $lines = $result.Content -split "`n"
    $fullContent = ""
    
    foreach ($line in $lines) {
        if ($line -match '^data: (.+)$') {
            $data = $matches[1]
            if ($data -ne "[DONE]") {
                try {
                    $chunk = $data | ConvertFrom-Json
                    if ($chunk.choices[0].delta.content) {
                        $content = $chunk.choices[0].delta.content
                        Write-Host $content -NoNewline -ForegroundColor White
                        $fullContent += $content
                    }
                } catch {
                    # 忽略解析错误
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host ""
    Write-Host "✓ 流式响应完成！共接收 $($fullContent.Length) 个字符" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "✗ 流式请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "测试 3: 流式长文本响应（截断测试）" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$body3 = @{
    model = "gemini-2.0-flash-exp"
    messages = @(
        @{
            role = "user"
            content = "请详细介绍一下量子计算的原理和应用，至少500字"
        }
    )
    stream = $true
} | ConvertTo-Json -Depth 10

Write-Host "正在发送长文本流式请求..." -ForegroundColor Yellow
Write-Host "流式输出: " -ForegroundColor Cyan
Write-Host ""

try {
    $result = Invoke-WebRequest -Uri $API_URL -Method Post -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $AUTH_KEY"
    } -Body $body3
    
    $lines = $result.Content -split "`n"
    $fullContent = ""
    $chunkCount = 0
    
    foreach ($line in $lines) {
        if ($line -match '^data: (.+)$') {
            $data = $matches[1]
            if ($data -ne "[DONE]") {
                try {
                    $chunk = $data | ConvertFrom-Json
                    if ($chunk.choices[0].delta.content) {
                        $content = $chunk.choices[0].delta.content
                        Write-Host $content -NoNewline -ForegroundColor White
                        $fullContent += $content
                        $chunkCount++
                    }
                } catch {
                    # 忽略解析错误
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host ""
    Write-Host "✓ 长文本流式响应完成！" -ForegroundColor Green
    Write-Host "  - 共接收 $chunkCount 个数据块" -ForegroundColor Gray
    Write-Host "  - 总字符数: $($fullContent.Length)" -ForegroundColor Gray
    Write-Host "  - 总字节数: $([System.Text.Encoding]::UTF8.GetByteCount($fullContent))" -ForegroundColor Gray
    
    if ($fullContent.Length -lt 200) {
        Write-Host ""
        Write-Host "⚠ 警告: 响应长度过短，可能存在截断问题！" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "✓ 响应长度正常，未发现截断问题" -ForegroundColor Green
    }
    
} catch {
    Write-Host ""
    Write-Host "✗ 长文本请求失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果所有测试都通过，说明流式响应修复成功！" -ForegroundColor Green
Write-Host "如果测试3出现截断，请查看 CHANGELOG_20251101_132054.md 的回滚方案" -ForegroundColor Yellow
Write-Host ""

