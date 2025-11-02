// ==================== 池创建页面 ====================
// 简化版：批量导入 Gemini Keys

export function generateCreatePoolHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>创建新池 - 多池管理系统</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #333;
    }
    .help-text {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }
    input, textarea, select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    textarea {
      resize: vertical;
      min-height: 60px;
    }
    .key-item {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 10px;
      background: #f9f9f9;
      position: relative;
    }
    .key-item .remove-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #f44336;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .key-item .remove-btn:hover {
      background: #d32f2f;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s;
    }
    .btn-primary {
      background: #4CAF50;
      color: white;
    }
    .btn-primary:hover {
      background: #3e8e41;
    }
    .btn-secondary {
      background: #666;
      color: white;
      margin-left: 10px;
    }
    .btn-secondary:hover {
      background: #555;
    }
    .btn-add {
      background: #2196F3;
      color: white;
      margin-top: 10px;
    }
    .btn-add:hover {
      background: #1976D2;
    }
    .success-message {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      display: none;
    }
    .error-message {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      display: none;
    }
    .loading {
      text-align: center;
      padding: 20px;
      display: none;
    }
    .result-box {
      background: #e3f2fd;
      border: 1px solid #90caf9;
      padding: 20px;
      border-radius: 6px;
      margin-top: 20px;
      display: none;
    }
    .result-box h3 {
      color: #1976d2;
      margin-bottom: 15px;
    }
    .result-box code {
      background: #fff;
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 13px;
      word-break: break-all;
    }
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .checkbox-group input[type="checkbox"] {
      width: auto;
    }
    .nav-link {
      color: white;
      text-decoration: none;
      margin-left: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 创建新池</h1>
    <p>为你的项目配置独立的 Gemini API 池</p>
    <a href="/admin" class="nav-link">← 返回管理后台</a>
  </div>

  <div class="container">
    <div class="success-message" id="successMessage"></div>
    <div class="error-message" id="errorMessage"></div>
    <div class="loading" id="loading">⏳ 正在创建池...</div>

    <form id="createPoolForm">
      <!-- 基本信息 -->
      <div class="form-group">
        <label for="poolName">池名称 *</label>
        <input type="text" id="poolName" required placeholder="例如：生产环境池">
        <div class="help-text">为这个池起一个容易识别的名字</div>
      </div>

      <div class="form-group">
        <label for="poolDescription">池描述</label>
        <textarea id="poolDescription" placeholder="例如：用于生产环境的 API 调用"></textarea>
        <div class="help-text">可选：描述这个池的用途</div>
      </div>

      <!-- Gemini Keys 批量导入 -->
      <div class="form-group">
        <label for="geminiKeys">Gemini API Keys *（每行一个，支持批量导入）</label>
        <textarea id="geminiKeys" required placeholder="每行输入一个 Gemini API Key，例如：&#10;AIzaSyABC123...&#10;AIzaSyDEF456...&#10;AIzaSyGHI789..." style="min-height: 150px; font-family: monospace;"></textarea>
        <div class="help-text">每行输入一个 Gemini API Key，支持一次性导入多个</div>
      </div>

      <!-- 模型限制 -->
      <div class="form-group">
        <label for="allowedModels">允许的模型（可选）</label>
        <textarea id="allowedModels" placeholder="留空表示允许所有模型，或者每行输入一个模型名，例如：&#10;gemini-2.5-pro-latest&#10;gemini-2.5-flash-latest"></textarea>
        <div class="help-text">留空表示允许所有模型。如果要限制，每行输入一个模型名</div>
      </div>

      <!-- 启用状态 -->
      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" id="poolEnabled" checked>
          <label for="poolEnabled" style="margin: 0;">启用此池</label>
        </div>
        <div class="help-text">取消勾选将创建禁用状态的池</div>
      </div>

      <!-- 按钮 -->
      <div style="margin-top: 30px;">
        <button type="submit" class="btn btn-primary">✓ 创建池</button>
        <button type="button" class="btn btn-secondary" onclick="window.location.href='/admin'">取消</button>
      </div>
    </form>

    <!-- 成功结果展示 -->
    <div class="result-box" id="resultBox">
      <h3>✓ 池创建成功！</h3>
      <div style="margin-bottom: 10px;">
        <strong>池 ID:</strong> <code id="resultPoolId"></code>
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Auth Key:</strong> <code id="resultAuthKey"></code>
      </div>
      <div style="margin-bottom: 15px; color: #d32f2f;">
        ⚠️ 请保存 Auth Key！这是调用 API 的密钥。
      </div>
      <button class="btn btn-primary" onclick="window.location.href='/admin'">返回管理后台</button>
    </div>
  </div>

  <script>
    // 表单提交
    document.getElementById('createPoolForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      // 收集数据
      const poolName = document.getElementById('poolName').value.trim();
      const poolDescription = document.getElementById('poolDescription').value.trim();
      const poolEnabled = document.getElementById('poolEnabled').checked;

      // 收集 Gemini Keys（每行一个）
      const keysText = document.getElementById('geminiKeys').value.trim();
      const keyLines = keysText.split('\\n').map(line => line.trim()).filter(line => line);

      // 验证
      if (keyLines.length === 0) {
        showError('请至少输入一个 Gemini API Key');
        return;
      }
      
      // 验证所有 Key 格式
      const invalidFormatKeys = keyLines.filter(key => !key.startsWith('AIza'));
      if (invalidFormatKeys.length > 0) {
        showError(\`发现 \${invalidFormatKeys.length} 个无效的 Key 格式！\\n\\nKey 必须以 AIza 开头。\\n\\n第一个无效 Key: \${invalidFormatKeys[0]}\`);
        return;
      }
      
      // 验证密钥中没有不支持的字符
      const invalidCharKeys = keyLines.filter(key => !/^[a-zA-Z0-9\\-_]+$/.test(key));
      if (invalidCharKeys.length > 0) {
        showError(\`发现 \${invalidCharKeys.length} 个包含无效字符的 Key！\\n\\n密钥只能包含：\\n• 字母 (A-Z, a-z)\\n• 数字 (0-9)\\n• 连字符 (-) 和下划线 (_)\\n\\n第一个无效 Key: \${invalidCharKeys[0]}\`);
        return;
      }

      // 构建 geminiKeys 数组（不需要名称）
      const geminiKeys = keyLines.map(key => ({
        key: key,
        enabled: true,
        weight: 1
      }));

      // 处理模型列表
      const allowedModelsText = document.getElementById('allowedModels').value.trim();
      const allowedModels = allowedModelsText
        ? allowedModelsText.split('\\n').map(m => m.trim()).filter(m => m)
        : [];

      // 构建请求数据
      const poolData = {
        name: poolName,
        description: poolDescription,
        geminiKeys: geminiKeys,
        allowedModels: allowedModels,
        enabled: poolEnabled
      };

      console.log('提交的数据:', poolData);

      // 显示加载状态
      document.getElementById('loading').style.display = 'block';
      document.getElementById('createPoolForm').style.display = 'none';
      hideMessages();

      try {
        const response = await fetch('/api/pools', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(poolData)
        });

        const result = await response.json();
        console.log('服务器响应:', result);

        if (response.ok && result.success) {
          // 显示成功结果
          document.getElementById('resultPoolId').textContent = result.pool.id;
          document.getElementById('resultAuthKey').textContent = result.pool.authKey;
          document.getElementById('resultBox').style.display = 'block';
          document.getElementById('loading').style.display = 'none';
        } else {
          throw new Error(result.message || result.error || '创建失败');
        }
      } catch (error) {
        console.error('创建错误:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('createPoolForm').style.display = 'block';
        showError('创建失败: ' + error.message);
      }
    });

    function showError(message) {
      const errorEl = document.getElementById('errorMessage');
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 5000);
    }

    function showSuccess(message) {
      const successEl = document.getElementById('successMessage');
      successEl.textContent = message;
      successEl.style.display = 'block';
    }

    function hideMessages() {
      document.getElementById('errorMessage').style.display = 'none';
      document.getElementById('successMessage').style.display = 'none';
    }
  </script>
</body>
</html>
  `;
}
