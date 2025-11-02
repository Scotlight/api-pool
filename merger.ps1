# ==================== 模块合并脚本 ====================
# 将所有模块文件合并成单一的 worker.js 文件

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "多池隔离系统 - 模块合并工具" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 定义模块文件顺序（按依赖关系排序）
$modules = @(
    "constants.js",
    "utils.js",
    "kv-storage.js",
    "pool-manager.js",
    "routing.js",
    "gemini-forward.js",
    "session.js",
    "admin-ui.js",
    "api-handlers.js"
)

# 输出文件路径
$outputFile = "..\worker_multipool.js"
$tempFile = "..\worker_multipool_temp.js"

Write-Host "准备合并以下模块:" -ForegroundColor Yellow
$modules | ForEach-Object {
    Write-Host "  • $_" -ForegroundColor White
}
Write-Host ""

# 开始合并
Write-Host "正在合并模块..." -ForegroundColor Cyan

# 创建输出文件头部
@"
// ==================== 多池隔离系统 v3.0 ====================
// 自动生成于: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
// 
// 这是一个真正的多池隔离系统：
// - 多个独立的池，完全隔离
// - 每个池有自己的 authKey (sk-pool-xxxx)
// - 每个池管理自己的 Gemini API Keys
// - 每个池可限制允许使用的模型
// - 支持 23 个 Gemini 模型

"@ | Out-File -FilePath $tempFile -Encoding UTF8

# 合并所有模块
foreach ($module in $modules) {
    $modulePath = Join-Path $PSScriptRoot $module
    
    if (Test-Path $modulePath) {
        Write-Host "  ✓ 合并 $module" -ForegroundColor Green
        
        # 读取模块内容
        $content = Get-Content $modulePath -Raw -Encoding UTF8
        
        # 移除 import 语句
        $content = $content -replace "import\s+{[^}]+}\s+from\s+['""][^'""]+['""];\r?\n?", ""
        $content = $content -replace "import\s+\*\s+as\s+\w+\s+from\s+['""][^'""]+['""];\r?\n?", ""
        
        # 移除 export 关键字
        $content = $content -replace "export\s+(async\s+)?function", "async function"
        $content = $content -replace "export\s+(const|let|var)", "$1"
        $content = $content -replace "export\s+{[^}]+};?\r?\n?", ""
        
        # 添加模块分隔注释
        "`n`n// ==================== 模块: $module ====================`n" | Out-File -FilePath $tempFile -Append -Encoding UTF8
        
        # 写入处理后的内容
        $content | Out-File -FilePath $tempFile -Append -Encoding UTF8 -NoNewline
        
    } else {
        Write-Host "  ✗ 找不到 $module" -ForegroundColor Red
    }
}

# 添加主入口函数
Write-Host "`n正在添加主入口函数..." -ForegroundColor Cyan

@"


// ==================== 主入口函数 ====================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    try {
      // 处理 CORS 预检请求
      if (method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      }
      
      // 登录页面
      if (path === "/login") {
        return htmlResponse(generateLoginHTML());
      }
      
      // 登录API
      if (path === "/api/login" && method === "POST") {
        const body = await request.json();
        const result = await login(env, body.password);
        
        if (result.success) {
          return jsonResponse(result, HTTP_STATUS.OK, {
            "Set-Cookie": createSessionCookie(result.sessionToken)
          });
        } else {
          return jsonResponse(result, HTTP_STATUS.UNAUTHORIZED);
        }
      }
      
      // 管理后台
      if (path === "/admin" || path === "/") {
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }
        
        const pools = await getAllPools(env, true);
        return htmlResponse(generateDashboardHTML(pools));
      }
      
      // API 管理端点
      if (path.startsWith("/api/pools")) {
        // TODO: 添加会话验证
        return await routeApiRequest(request, env);
      }
      
      // OpenAI 兼容的 API 端点
      if (path === "/v1/chat/completions" && method === "POST") {
        // 验证请求
        const validation = validateRequest(request);
        if (!validation.valid) {
          return errorResponse(validation.error, ERROR_TYPES.AUTHENTICATION, HTTP_STATUS.UNAUTHORIZED);
        }
        
        // 解析请求体
        const reqBody = await request.json();
        const modelName = reqBody.model;
        
        // 路由请求
        const routeResult = await routeRequest(env, validation.authKey, modelName);
        if (!routeResult.success) {
          return errorResponse(routeResult.error, routeResult.errorType, routeResult.statusCode);
        }
        
        // 转发到 Gemini API
        return await forwardChatCompletion(env, routeResult.pool, routeResult.geminiKey, reqBody);
      }
      
      // Embeddings 端点
      if (path === "/v1/embeddings" && method === "POST") {
        const validation = validateRequest(request);
        if (!validation.valid) {
          return errorResponse(validation.error, ERROR_TYPES.AUTHENTICATION, HTTP_STATUS.UNAUTHORIZED);
        }
        
        const reqBody = await request.json();
        const modelName = reqBody.model || "embedding-001";
        
        const routeResult = await routeRequest(env, validation.authKey, modelName);
        if (!routeResult.success) {
          return errorResponse(routeResult.error, routeResult.errorType, routeResult.statusCode);
        }
        
        return await forwardEmbedding(env, routeResult.pool, routeResult.geminiKey, reqBody);
      }
      
      // 默认响应
      return jsonResponse({
        message: "多池隔离系统 v3.0",
        endpoints: {
          login: "/login",
          admin: "/admin",
          api: {
            pools: "/api/pools",
            chat: "/v1/chat/completions",
            embeddings: "/v1/embeddings"
          }
        },
        features: [
          "多池隔离",
          "独立鉴权 (sk-pool-xxxx)",
          "独立 Gemini Keys",
          "模型限制",
          "23个 Gemini 模型支持"
        ]
      });
      
    } catch (error) {
      return errorResponse(
        "服务器错误: " + error.message,
        ERROR_TYPES.SERVER_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  }
};
"@ | Out-File -FilePath $tempFile -Append -Encoding UTF8

# 移动临时文件到最终位置
Move-Item -Path $tempFile -Destination $outputFile -Force

Write-Host ""
Write-Host "✓ 合并完成！" -ForegroundColor Green
Write-Host ""

# 显示文件信息
$fileInfo = Get-Item $outputFile
$sizeKB = [math]::Round($fileInfo.Length/1KB, 2)
$lines = (Get-Content $outputFile).Count

Write-Host "输出文件: $outputFile" -ForegroundColor Yellow
Write-Host "  大小: $sizeKB KB" -ForegroundColor White
Write-Host "  行数: $lines" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 查看生成的文件: $outputFile" -ForegroundColor White
Write-Host "2. 测试功能是否正常" -ForegroundColor White
Write-Host "3. 部署到 Cloudflare Workers" -ForegroundColor White
Write-Host ""
