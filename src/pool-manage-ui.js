// ==================== 池管理 UI 模块 ====================
// 提供池的查看、编辑、删除界面

import { htmlResponse } from './utils.js';

/**
 * 生成池管理页面 HTML
 * @returns {string} HTML字符串
 */
export function generatePoolManageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>池管理 - Gemini API 代理</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    .actions {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background: #667eea;
      color: white;
    }
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: white;
      color: #667eea;
    }
    .btn-secondary:hover {
      background: #f0f0f0;
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .btn-success {
      background: #10b981;
      color: white;
    }
    .btn-success:hover {
      background: #059669;
    }
    .btn-small {
      padding: 6px 12px;
      font-size: 14px;
      margin-right: 8px;
    }
    .pools-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }
    .pool-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.3s;
    }
    .pool-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0,0,0,0.15);
    }
    .pool-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f0f0f0;
    }
    .pool-name {
      font-size: 1.4em;
      font-weight: bold;
      color: #333;
      margin-bottom: 4px;
    }
    .pool-id {
      font-size: 0.85em;
      color: #999;
      font-family: monospace;
    }
    .pool-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-enabled {
      background: #d1fae5;
      color: #065f46;
    }
    .status-disabled {
      background: #fee2e2;
      color: #991b1b;
    }
    .pool-info {
      margin-bottom: 16px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .info-label {
      color: #666;
      font-weight: 500;
    }
    .info-value {
      color: #333;
      font-weight: 600;
    }
    .auth-key {
      font-family: monospace;
      background: #f9fafb;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9em;
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .copy-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-btn:hover {
      background: #5568d3;
    }
    .pool-description {
      color: #666;
      font-size: 0.95em;
      margin: 12px 0;
      padding: 12px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .keys-section {
      margin: 16px 0;
    }
    .keys-toggle {
      cursor: pointer;
      color: #667eea;
      font-weight: 600;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .keys-toggle:hover {
      color: #5568d3;
    }
    .keys-list {
      margin-top: 12px;
      display: none;
    }
    .keys-list.expanded {
      display: block;
    }
    .key-item {
      background: #f9fafb;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 6px 0;
      font-family: monospace;
      font-size: 0.85em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .key-enabled {
      border-left: 3px solid #10b981;
    }
    .key-disabled {
      border-left: 3px solid #ef4444;
      opacity: 0.6;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }
    .stat-box {
      background: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 0.85em;
      color: #666;
      margin-top: 4px;
    }
    .pool-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #f0f0f0;
    }
    .loading {
      text-align: center;
      color: white;
      font-size: 1.2em;
      padding: 40px;
    }
    .error {
      background: #fee2e2;
      color: #991b1b;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .arrow {
      transition: transform 0.3s;
    }
    .arrow.expanded {
      transform: rotate(90deg);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 池管理</h1>
      <p>管理你的 API 池配置</p>
    </div>

    <div class="actions">
      <a href="/admin" class="btn btn-secondary">← 返回 Dashboard</a>
      <a href="/admin/create-pool" class="btn btn-primary">+ 创建新池</a>
    </div>

    <div id="loading" class="loading">加载中...</div>
    <div id="error" class="error" style="display: none;"></div>
    <div id="pools-container" class="pools-list"></div>
  </div>

  <script>
    let poolsData = [];

    // 加载所有池
    async function loadPools() {
      try {
        const response = await fetch('/api/pools');
        const data = await response.json();

        if (data.success) {
          poolsData = data.pools;
          renderPools();
          document.getElementById('loading').style.display = 'none';
        } else {
          showError('加载池列表失败: ' + data.message);
        }
      } catch (error) {
        showError('加载池列表失败: ' + error.message);
      }
    }

    // 渲染池列表
    function renderPools() {
      const container = document.getElementById('pools-container');

      if (poolsData.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: white; padding: 40px;"><h2>还没有任何池</h2><p>点击"创建新池"开始</p></div>';
        return;
      }

      container.innerHTML = poolsData.map(pool => {
        const enabledKeys = pool.geminiKeys.filter(k => k.enabled).length;
        const totalKeys = pool.geminiKeys.length;

        return \`
          <div class="pool-card">
            <div class="pool-header">
              <div>
                <div class="pool-name">\${pool.name}</div>
                <div class="pool-id">\${pool.id}</div>
              </div>
              <span class="pool-status \${pool.enabled ? 'status-enabled' : 'status-disabled'}">
                \${pool.enabled ? '✓ 已启用' : '✗ 已禁用'}
              </span>
            </div>

            \${pool.description ? \`<div class="pool-description">\${pool.description}</div>\` : ''}

            <div class="auth-key">
              <span>\${pool.authKey}</span>
              <button class="copy-btn" onclick="copyToClipboard('\${pool.authKey}')">复制</button>
            </div>

            <div class="stats">
              <div class="stat-box">
                <div class="stat-value">\${totalKeys}</div>
                <div class="stat-label">API Keys</div>
              </div>
              <div class="stat-box">
                <div class="stat-value">\${enabledKeys}</div>
                <div class="stat-label">已启用</div>
              </div>
            </div>

            <div class="keys-section">
              <div class="keys-toggle" onclick="toggleKeys('\${pool.id}')">
                <span class="arrow" id="arrow-\${pool.id}">▶</span>
                <span>查看 Gemini Keys (\${totalKeys})</span>
              </div>
              <div class="keys-list" id="keys-\${pool.id}">
                \${pool.geminiKeys.map(k => \`
                  <div class="key-item \${k.enabled ? 'key-enabled' : 'key-disabled'}">
                    <span>\${k.key}</span>
                    <span style="color: #666; font-size: 0.9em;">权重: \${k.weight || 1}</span>
                  </div>
                \`).join('')}
              </div>
            </div>

            \${pool.allowedModels && pool.allowedModels.length > 0 ? \`
              <div class="info-row">
                <span class="info-label">允许的模型</span>
                <span class="info-value">\${pool.allowedModels.length} 个</span>
              </div>
            \` : ''}

            <div class="pool-actions">
              <a href="/admin/pools/\${pool.id}" class="btn btn-primary btn-small">📝 管理此池</a>
              <button class="btn btn-danger btn-small" onclick="deletePool('\${pool.id}', '\${pool.name}')">🗑️ 删除</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    // 切换 Keys 显示
    function toggleKeys(poolId) {
      const keysList = document.getElementById('keys-' + poolId);
      const arrow = document.getElementById('arrow-' + poolId);
      keysList.classList.toggle('expanded');
      arrow.classList.toggle('expanded');
    }

    // 复制到剪贴板
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板！');
      });
    }

    // 删除池
    async function deletePool(poolId, poolName) {
      if (!confirm(\`确定要删除池 "\${poolName}" 吗？\\n\\n此操作将：\\n1. 删除池配置\\n2. 使该池的 Auth Key 失效\\n3. 此操作无法撤销！\`)) {
        return;
      }

      try {
        const response = await fetch(\`/api/pools/\${poolId}\`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          alert('池删除成功！');
          loadPools();
        } else {
          alert('删除失败: ' + data.message);
        }
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }

    // 显示错误
    function showError(message) {
      document.getElementById('loading').style.display = 'none';
      const errorDiv = document.getElementById('error');
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    // 页面加载时获取池列表
    loadPools();
  </script>
</body>
</html>`;
}
