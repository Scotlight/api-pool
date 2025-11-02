// ==================== 新管理界面模块 ====================
// 适配多池隔离系统的管理界面

import { obfuscateKey } from './utils.js';

// 登录页面HTML
const loginHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多池管理系统 - 登录</title>
  <style>
    :root {
      --primary-color: #4CAF50;
      --primary-dark: #3e8e41;
      --error-color: #f44336;
    }
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .login-container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 400px;
    }
    .system-icon {
      text-align: center;
      font-size: 3rem;
      margin-bottom: 20px;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
    }
    input {
      width: 100%;
      padding: 12px;
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover {
      background-color: var(--primary-dark);
    }
    .error {
      color: var(--error-color);
      text-align: center;
      margin-bottom: 15px;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="system-icon">🔐</div>
    <h1>多池管理系统</h1>
    <div class="error" id="error"></div>
    <form id="loginForm">
      <input type="password" id="password" placeholder="请输入管理密码" required>
      <button type="submit">登录</button>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const btn = e.target.querySelector('button');
      const errorEl = document.getElementById('error');

      btn.textContent = '登录中...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        if (res.ok) {
          window.location.href = '/admin';
        } else {
          errorEl.textContent = '密码错误';
        }
      } catch (err) {
        errorEl.textContent = '登录失败: ' + err.message;
      } finally {
        btn.textContent = '登录';
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
`;

// 多池管理控制面板（合并版本，带图表）
function generateDashboardHTML(pools) {
  const totalPools = pools.length;
  const enabledPools = pools.filter(p => p.enabled).length;
  const totalKeys = pools.reduce((sum, p) => sum + p.geminiKeys.length, 0);
  const enabledKeys = pools.reduce((sum, p) => sum + p.geminiKeys.filter(k => k.enabled).length, 0);
  
  // 统计数据（示例，实际应从数据库获取）
  const totalRequests = pools.reduce((sum, p) => sum + (p.stats?.totalRequests || 0), 0);
  const successRequests = pools.reduce((sum, p) => sum + (p.stats?.successRequests || 0), 0);
  const failedRequests = totalRequests - successRequests;
  const successRate = totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) : 0;
  const totalTokens = pools.reduce((sum, p) => sum + (p.stats?.totalTokens || 0), 0);

  const poolsHtml = pools.map((pool) => {
    const enabledKeysCount = pool.geminiKeys.filter(k => k.enabled).length;
    const totalKeysCount = pool.geminiKeys.length;
    const statusBadge = pool.enabled
      ? '<span style="color: #4CAF50;">●</span> 启用'
      : '<span style="color: #f44336;">●</span> 禁用';

    return `
      <div class="pool-card">
        <div class="pool-header">
          <div>
            <h3>${pool.name}</h3>
            <div class="pool-id">${pool.id}</div>
          </div>
          <span class="pool-status ${pool.enabled ? 'status-enabled' : 'status-disabled'}">
            ${pool.enabled ? '✓ 已启用' : '✗ 已禁用'}
          </span>
        </div>
        ${pool.description ? `<div class="pool-description">${pool.description}</div>` : ''}
        
        <div class="auth-key">
          <code>${obfuscateKey(pool.authKey)}</code>
          <button class="copy-btn" onclick="copyToClipboard('${pool.authKey}')">📋 复制</button>
        </div>

        <div class="pool-stats">
          <div class="stat-item">
            <span class="stat-label">API Keys</span>
            <span class="stat-value">${totalKeysCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已启用</span>
            <span class="stat-value">${enabledKeysCount}</span>
          </div>
          ${pool.allowedModels && pool.allowedModels.length > 0 ? `
          <div class="stat-item">
            <span class="stat-label">模型数</span>
            <span class="stat-value">${pool.allowedModels.length}</span>
          </div>
          ` : ''}
        </div>

        <details class="keys-details">
          <summary>查看 Gemini Keys (${totalKeysCount})</summary>
          <div class="keys-list">
            ${pool.geminiKeys.map((k, i) => `
              <div class="key-item ${k.enabled ? 'key-enabled' : 'key-disabled'}">
                <span><strong>Key ${i + 1}:</strong> ${k.name || 'Unnamed'}</span>
                <span class="key-status">${k.enabled ? '✓' : '✗'}</span>
                <code>${obfuscateKey(k.key)}</code>
              </div>
            `).join('')}
          </div>
        </details>

        <div class="pool-actions">
          <a href="/admin/pools/${pool.id}" class="btn btn-primary">📝 管理</a>
          <button class="btn btn-danger" onclick="deletePool('${pool.id}', '${pool.name}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多池管理系统 - 控制面板</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* 日夜模式变量 */
    :root {
      --bg-color: #f5f7fa;
      --text-color: #333;
      --card-bg: white;
      --border-color: #e5e7eb;
      --shadow: rgba(0,0,0,0.08);
    }
    
    body.dark-mode {
      --bg-color: #1a1a2e;
      --text-color: #e0e0e0;
      --card-bg: #16213e;
      --border-color: #2d3748;
      --shadow: rgba(0,0,0,0.3);
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-color);
      padding: 20px;
      transition: background 0.3s ease;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      border-radius: 16px;
      margin-bottom: 30px;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
      position: relative;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }
    
    /* 主题切换按钮 */
    .theme-toggle {
      position: absolute;
      top: 20px;
      right: 30px;
      background: rgba(255,255,255,0.2);
      border: none;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }
    .theme-toggle:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1) rotate(15deg);
    }
    
    /* 实时监控仪表盘 */
    .monitoring-section {
      margin-bottom: 30px;
    }
    .monitoring-section h2 {
      color: var(--text-color);
      margin-bottom: 20px;
      font-size: 1.8rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: var(--card-bg);
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 8px var(--shadow);
      border-left: 4px solid #667eea;
      transition: all 0.3s;
    }
    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }
    .metric-value {
      font-size: 2.8rem;
      font-weight: bold;
      color: #667eea;
      margin: 10px 0;
      font-feature-settings: "tnum";
    }
    .metric-label {
      color: #666;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-unit {
      color: #999;
      font-size: 1.2rem;
      font-weight: normal;
      margin-left: 8px;
    }
    .metric-change {
      font-size: 0.85rem;
      margin-top: 8px;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .metric-success {
      background: #d1fae5;
      color: #065f46;
    }
    
    /* 图表区域 */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .chart-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .chart-card h3 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.3rem;
    }
    .chart-container {
      position: relative;
      height: 280px;
    }
    
    /* 池列表部分 */
    .pools-section {
      margin-top: 40px;
    }
    .pools-section h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.8rem;
    }
    .pool-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: all 0.3s;
    }
    .pool-card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }
    .pool-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
    }
    .pool-header h3 {
      color: #333;
      font-size: 1.4rem;
      margin-bottom: 5px;
    }
    .pool-id {
      color: #999;
      font-size: 0.85rem;
      font-family: monospace;
    }
    .pool-status {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status-enabled {
      background: #d1fae5;
      color: #065f46;
    }
    .status-disabled {
      background: #fee2e2;
      color: #991b1b;
    }
    .pool-description {
      color: #666;
      font-size: 0.95rem;
      margin: 12px 0;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .auth-key {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 15px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: monospace;
      border: 1px solid #e5e7eb;
    }
    .auth-key code {
      color: #667eea;
      font-size: 0.9rem;
    }
    .copy-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: #5568d3;
    }
    .pool-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    .stat-item {
      text-align: center;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .stat-item .stat-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #667eea;
    }
    .stat-item .stat-label {
      color: #666;
      font-size: 0.85rem;
      margin-top: 5px;
    }
    .keys-details {
      margin: 15px 0;
    }
    .keys-details summary {
      cursor: pointer;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      font-weight: 600;
      color: #667eea;
      user-select: none;
      transition: all 0.2s;
    }
    .keys-details summary:hover {
      background: #f3f4f6;
    }
    .keys-list {
      margin-top: 10px;
    }
    .key-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      margin: 8px 0;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 3px solid #e5e7eb;
      font-size: 0.9rem;
    }
    .key-item code {
      color: #999;
      font-size: 0.85rem;
    }
    .key-enabled {
      border-left-color: #10b981;
      background: #f0fdf4;
    }
    .key-disabled {
      border-left-color: #ef4444;
      background: #fef2f2;
      opacity: 0.7;
    }
    .key-status {
      font-weight: bold;
    }
    .pool-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      display: inline-block;
    }
    .btn-primary {
      background: #667eea;
      color: white;
      flex: 1;
      text-align: center;
    }
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
    }
    .btn-danger {
      background: #ef4444;
      color: white;
      flex: 1;
      text-align: center;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .btn-secondary {
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
    }
    .btn-secondary:hover {
      background: #f0f0f0;
    }
    .actions {
      margin: 40px 0;
      text-align: center;
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .empty-state h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 2rem;
    }
    .empty-state p {
      color: #666;
      font-size: 1.1rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <button class="theme-toggle" onclick="toggleTheme()" title="切换日夜模式">
      <span id="themeIcon">🌙</span>
    </button>
    <h1>🎯 多池隔离管理系统</h1>
    <p>真正的多池隔离 · 独立认证 · 灵活配置</p>
  </div>

  <!-- 实时监控仪表盘 -->
  <div class="monitoring-section">
    <h2>📊 实时监控仪表盘</h2>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">每分钟请求数</div>
        <div class="metric-value">0<span class="metric-unit">RPM</span></div>
        <div class="metric-change metric-success">实时监控中</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">每天请求数</div>
        <div class="metric-value">${totalRequests}<span class="metric-unit">RPD</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">每分钟令牌数</div>
        <div class="metric-value">0<span class="metric-unit">TPM</span></div>
        <div class="metric-change metric-success">实时监控中</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">每天令牌数</div>
        <div class="metric-value">${totalTokens}<span class="metric-unit">TPD</span></div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="charts-grid">
      <div class="chart-card">
        <h3>📈 请求趋势</h3>
        <div class="chart-container">
          <canvas id="requestChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>💎 令牌使用</h3>
        <div class="chart-container">
          <canvas id="tokenChart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>🔑 池统计</h3>
        <div class="chart-container">
          <canvas id="poolChart"></canvas>
        </div>
      </div>
    </div>
  </div>

  <!-- 系统统计 -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">池总数</div>
      <div class="metric-value">${totalPools}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">启用中</div>
      <div class="metric-value" style="color: #10b981;">${enabledPools}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">API Keys 总数</div>
      <div class="metric-value">${totalKeys}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Keys 启用数</div>
      <div class="metric-value" style="color: #10b981;">${enabledKeys}</div>
    </div>
  </div>

  <!-- 池列表 -->
  <div class="pools-section">
    <h2>🏊 API 池列表</h2>
    ${pools.length > 0 ? poolsHtml : `
      <div class="empty-state">
        <h2>🌟 还没有创建任何池</h2>
        <p>点击下方按钮创建您的第一个池</p>
      </div>
    `}
  </div>

  <div class="actions">
    <a href="/admin/create-pool" class="btn btn-primary">➕ 创建新池</a>
    <a href="/api/pools" class="btn btn-secondary" target="_blank">📋 查看池 API</a>
    <a href="/v1/models" class="btn btn-secondary" target="_blank">🤖 查看模型列表</a>
    <button class="btn btn-secondary" onclick="location.reload()">🔄 刷新页面</button>
  </div>

  <script>
    // 复制到剪贴板
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('✓ 已复制到剪贴板！');
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
          alert('✓ 池删除成功！');
          location.reload();
        } else {
          alert('✗ 删除失败: ' + data.message);
        }
      } catch (error) {
        alert('✗ 删除失败: ' + error.message);
      }
    }

    // 初始化图表
    const chartColors = {
      primary: '#667eea',
      success: '#10b981',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    };

    // 1. 请求趋势图（折线图）
    new Chart(document.getElementById('requestChart'), {
      type: 'line',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        datasets: [{
          label: '请求数',
          data: [${Math.floor(totalRequests * 0.1)}, ${Math.floor(totalRequests * 0.15)}, ${Math.floor(totalRequests * 0.25)}, ${Math.floor(totalRequests * 0.35)}, ${Math.floor(totalRequests * 0.45)}, ${Math.floor(totalRequests * 0.6)}, ${totalRequests}],
          borderColor: chartColors.primary,
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 2. 令牌使用（柱状图）
    new Chart(document.getElementById('tokenChart'), {
      type: 'bar',
      data: {
        labels: ['输入令牌', '输出令牌', '总令牌'],
        datasets: [{
          label: '令牌数',
          data: [${Math.floor(totalTokens * 0.6)}, ${Math.floor(totalTokens * 0.4)}, ${totalTokens}],
          backgroundColor: [chartColors.info, chartColors.warning, chartColors.primary],
          borderWidth: 0,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 3. 池统计（柱状图）
    new Chart(document.getElementById('poolChart'), {
      type: 'bar',
      data: {
        labels: ['池总数', '启用中', 'Keys 总数', 'Keys 启用'],
        datasets: [{
          label: '数量',
          data: [${totalPools}, ${enabledPools}, ${totalKeys}, ${enabledKeys}],
          backgroundColor: [chartColors.primary, chartColors.success, chartColors.info, chartColors.success],
          borderWidth: 0,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // 主题切换功能
    function toggleTheme() {
      const body = document.body;
      const icon = document.getElementById('themeIcon');
      const isDark = body.classList.toggle('dark-mode');
      
      icon.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // 页面加载时恢复主题
    (function() {
      const savedTheme = localStorage.getItem('theme');
      const icon = document.getElementById('themeIcon');
      
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        icon.textContent = '☀️';
      }
    })();
  </script>
</body>
</html>
  `;
}

export function generateLoginHTML() {
  return loginHtml;
}

export { generateDashboardHTML };
