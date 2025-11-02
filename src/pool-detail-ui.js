// ==================== 单个池详情 UI 模块 ====================
// 提供单个池的详细管理界面，可以管理每个 API Key

import { htmlResponse } from './utils.js';

/**
 * 生成单个池详情页面 HTML
 * @param {string} poolId - 池ID（从URL获取）
 * @returns {string} HTML字符串
 */
export function generatePoolDetailHTML(poolId) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>池详情 - Gemini API 代理</title>
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
      max-width: 1000px;
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
    .back-btn {
      display: inline-block;
      margin-bottom: 20px;
      padding: 10px 20px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .back-btn:hover {
      background: #f0f0f0;
      transform: translateY(-2px);
    }
    .pool-info-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .stats-dashboard {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      color: white;
    }
    .dashboard-title {
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: 20px;
      text-align: center;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }
    .metric-label {
      font-size: 0.9em;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
    }
    .metric-unit {
      font-size: 0.8em;
      opacity: 0.8;
      margin-left: 4px;
    }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.3);
    }
    .stat-item {
      text-align: center;
    }
    .stat-label {
      font-size: 0.85em;
      opacity: 0.85;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 1.3em;
      font-weight: 600;
    }
    .pool-name {
      font-size: 2em;
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    .pool-id {
      font-size: 0.9em;
      color: #999;
      font-family: monospace;
      margin-bottom: 16px;
    }
    .pool-status {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 16px;
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
      margin-bottom: 20px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .auth-key-section {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .auth-key-label {
      font-weight: 600;
      color: #666;
      margin-bottom: 8px;
    }
    .auth-key-value {
      font-family: monospace;
      font-size: 1.1em;
      color: #333;
      padding: 12px;
      background: white;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
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
    }
    .btn-success {
      background: #10b981;
      color: white;
    }
    .btn-success:hover {
      background: #059669;
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .btn-small {
      padding: 6px 12px;
      font-size: 12px;
    }
    .section-title {
      font-size: 1.5em;
      font-weight: bold;
      color: white;
      margin: 30px 0 16px 0;
    }
    .keys-container {
      display: grid;
      gap: 12px;
    }
    .batch-actions-bar {
      background: white;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .key-card {
      background: white;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      transition: all 0.3s;
    }
    .key-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .key-card.disabled {
      opacity: 0.6;
      background: #f9fafb;
    }
    .key-card.selected {
      border: 2px solid #667eea;
      background: #f0f4ff;
    }
    .key-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .key-info {
      flex: 1;
      margin-right: 16px;
    }
    .key-value {
      font-family: monospace;
      font-size: 0.95em;
      color: #333;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .key-meta {
      display: flex;
      gap: 16px;
      font-size: 0.85em;
      color: #666;
      margin-bottom: 6px;
    }
    .key-stats {
      display: flex;
      gap: 12px;
      font-size: 0.8em;
      color: #666;
      padding-top: 4px;
      border-top: 1px solid #e5e7eb;
    }
    .key-stats span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .key-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .key-status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: bold;
    }
    .badge-enabled {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-disabled {
      background: #fee2e2;
      color: #991b1b;
    }
    .add-key-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
      color: #333;
    }
    .form-input {
      width: 100%;
      padding: 10px;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
      font-family: monospace;
    }
    .form-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 12px;
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
    .actions-bar {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="/admin" class="back-btn">← 返回 Dashboard</a>

    <div id="loading" class="loading">加载中...</div>
    <div id="error" class="error" style="display: none;"></div>

    <div id="pool-content" style="display: none;">
      <!-- 实时统计仪表盘 -->
      <div class="stats-dashboard">
        <div class="dashboard-title">📊 实时监控仪表盘</div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">每分钟请求数</div>
            <div class="metric-value" id="rpm">0</div>
            <div class="metric-unit">RPM</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">每天请求数</div>
            <div class="metric-value" id="rpd">0</div>
            <div class="metric-unit">RPD</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">每分钟令牌数</div>
            <div class="metric-value" id="tpm">0</div>
            <div class="metric-unit">TPM</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">每天令牌数</div>
            <div class="metric-value" id="tpd">0</div>
            <div class="metric-unit">TPD</div>
          </div>
        </div>
        
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-label">总令牌数</div>
            <div class="stat-value" id="totalTokens">0</div>
          </div>
        </div>
      </div>

      <div class="pool-info-card">
        <div class="pool-name" id="poolName"></div>
        <div class="pool-id" id="poolId"></div>
        <span class="pool-status" id="poolStatus"></span>
        <div class="pool-description" id="poolDescription"></div>

        <div class="auth-key-section">
          <div class="auth-key-label">🔑 Auth Key (sk-pool-...)</div>
          <div class="auth-key-value">
            <span id="authKey"></span>
            <button class="btn btn-primary btn-small" onclick="copyAuthKey()">复制</button>
          </div>
        </div>

        <div class="actions-bar">
          <button class="btn btn-success" onclick="regenerateAuthKey()">🔄 重新生成 Auth Key</button>
          <button class="btn btn-danger" onclick="deletePool()">🗑️ 删除此池</button>
        </div>
      </div>

      <!-- 模型管理区域 -->
      <div class="section-title">
        🤖 允许的模型管理
      </div>

      <div class="pool-info-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0 0 8px 0; color: #333;">当前允许的模型</h3>
            <p style="margin: 0; font-size: 0.9em; color: #666;" id="modelHint">
              空列表表示允许所有模型
            </p>
          </div>
          <button class="btn btn-primary" onclick="toggleModelEditor()">
            <span id="modelEditBtnText">✏️ 编辑模型</span>
          </button>
        </div>

        <!-- 当前模型列表显示 -->
        <div id="currentModelsDisplay" style="margin-bottom: 16px;">
          <div id="modelsList" style="display: flex; flex-wrap: wrap; gap: 8px;">
            <!-- 动态填充 -->
          </div>
        </div>

        <!-- 模型编辑器 -->
        <div id="modelEditor" style="display: none;">
          <form id="updateModelsForm">
            <div class="form-group">
              <label class="form-label">选择允许的模型（留空表示允许所有）</label>
              <div id="modelCheckboxes" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; max-height: 400px; overflow-y: auto; padding: 16px; background: #f9fafb; border-radius: 8px;">
                <!-- 动态填充 -->
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 8px;">
                💡 不选择任何模型表示允许所有模型；选择后只允许选中的模型访问
              </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 16px;">
              <button type="submit" class="btn btn-primary">💾 保存</button>
              <button type="button" class="btn btn-secondary" onclick="cancelModelEdit()">取消</button>
            </div>
          </form>
        </div>
      </div>

      <div class="section-title">
        📋 Gemini API Keys 管理
      </div>

      <!-- 批量操作工具栏 -->
      <div class="batch-actions-bar" id="batchActionsBar" style="display: none;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
            <span style="font-weight: 600;">全选</span>
          </label>
          <span id="selectedCount" style="color: #666;">已选择 0 个</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-small" onclick="batchCopy()">
            📋 批量复制
          </button>
          <button class="btn btn-warning btn-small" onclick="batchToggleStatus()" id="batchToggleBtn">
            批量禁用
          </button>
          <button class="btn btn-danger btn-small" onclick="batchDelete()">
            批量删除
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteDisabledKeys()" style="background: #dc2626;">
            🗑️ 删除已禁用
          </button>
        </div>
      </div>

      <!-- 批量导入卡片 -->
      <div class="add-key-card" id="batchImportCard" style="display: none;">
        <h3 style="margin-bottom: 16px; color: #333;">📦 批量导入 API Keys</h3>
        <form id="batchImportForm">
          <div class="form-group">
            <label class="form-label">Gemini API Keys（每行一个）</label>
            <textarea 
              id="batchKeysInput" 
              class="form-input" 
              placeholder="每行输入一个 Gemini API Key，例如：&#10;AIzaSyABC123...&#10;AIzaSyDEF456...&#10;AIzaSyGHI789..." 
              style="min-height: 150px; font-family: monospace;"
              required></textarea>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              每行输入一个 Key，支持空行，自动去除首尾空格
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">默认权重</label>
              <input type="number" id="batchKeyWeight" class="form-input" value="1" min="1" max="100">
            </div>
            <div class="form-group">
              <label class="form-label" style="display: block; margin-bottom: 22px;">默认启用状态</label>
              <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="batchKeyEnabled" checked>
                <span>启用</span>
              </label>
            </div>
          </div>
          <div style="display: flex; gap: 12px;">
            <button type="submit" class="btn btn-success">批量导入</button>
            <button type="button" class="btn btn-secondary" onclick="toggleBatchImport()">取消</button>
          </div>
        </form>
      </div>

      <!-- 单个添加/批量导入切换按钮 -->
      <div class="add-key-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; color: #333;" id="addKeyTitle">➕ 添加新的 API Key</h3>
          <button class="btn btn-primary btn-small" onclick="toggleBatchImport()" id="toggleBtn">
            📦 批量导入
          </button>
        </div>
        <form id="addKeyForm">
          <div class="form-group">
            <label class="form-label">Gemini API Key</label>
            <input type="text" id="newKeyValue" class="form-input" placeholder="AIzaSy..." required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">权重 (Weight)</label>
              <input type="number" id="newKeyWeight" class="form-input" value="1" min="1" max="100">
            </div>
            <div class="form-group">
              <label class="form-label" style="display: block; margin-bottom: 22px;">启用状态</label>
              <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="newKeyEnabled" checked>
                <span>启用</span>
              </label>
            </div>
          </div>
          <button type="submit" class="btn btn-success">添加 Key</button>
        </form>
      </div>

      <div class="keys-container" id="keysContainer"></div>
    </div>
  </div>

  <script>
    const POOL_ID = '${poolId}';
    let poolData = null;
    let availableModels = [];  // 可用模型列表

    // 加载可用模型列表
    async function loadAvailableModels() {
      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}/models\`);
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
          availableModels = data.models;
        }
      } catch (error) {
        console.error('加载模型列表失败:', error);
      }
    }

    // 格式化时间显示
    function formatTime(timestamp) {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
      return Math.floor(diff / 86400000) + '天前';
    }

    // 加载池详情
    async function loadPoolDetail() {
      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`);
        const data = await response.json();

        if (data.success) {
          poolData = data.pool;
          renderPoolDetail();
          await loadAvailableModels();  // 加载模型列表
          renderModelsDisplay();  // 渲染模型显示
          document.getElementById('loading').style.display = 'none';
          document.getElementById('pool-content').style.display = 'block';
        } else {
          showError('加载池详情失败: ' + data.message);
        }
      } catch (error) {
        showError('加载池详情失败: ' + error.message);
      }
    }

    // 渲染池详情
    function renderPoolDetail() {
      document.getElementById('poolName').textContent = poolData.name;
      document.getElementById('poolId').textContent = poolData.poolId;

      const statusEl = document.getElementById('poolStatus');
      statusEl.textContent = poolData.enabled ? '✓ 已启用' : '✗ 已禁用';
      statusEl.className = 'pool-status ' + (poolData.enabled ? 'status-enabled' : 'status-disabled');

      const descEl = document.getElementById('poolDescription');
      if (poolData.description) {
        descEl.textContent = poolData.description;
        descEl.style.display = 'block';
      } else {
        descEl.style.display = 'none';
      }

      document.getElementById('authKey').textContent = poolData.authKey;

      // 更新统计仪表盘
      updateStatsDisplay();

      renderKeys();
    }

    // 更新统计仪表盘显示
    function updateStatsDisplay() {
      if (!poolData.stats) return;

      // 计算实时指标
      const metrics = calculatePoolMetrics(poolData);

      // 更新主要指标（RPM/RPD/TPM/TPD）
      document.getElementById('rpm').textContent = metrics.rpm || 0;
      document.getElementById('rpd').textContent = metrics.rpd || 0;
      document.getElementById('tpm').textContent = (metrics.tpm || 0).toLocaleString();
      document.getElementById('tpd').textContent = (metrics.tpd || 0).toLocaleString();

      // 更新使用量统计（已移除请求记录相关的显示）
      document.getElementById('totalTokens').textContent = (metrics.totalTokens || 0).toLocaleString();
    }

    // 客户端计算池指标（与服务端 calculatePoolMetrics 相同逻辑）
    function calculatePoolMetrics(pool) {
      if (!pool.stats) {
        return {
          rpm: 0, rpd: 0, tpm: 0, tpd: 0, totalTokens: 0
        };
      }

      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const requestsLastMinute = pool.stats.requestsLastMinute || [];
      const requestsLastDay = pool.stats.requestsLastDay || [];

      // 计算 RPM 和 TPM
      const recentMinuteRequests = requestsLastMinute.filter(r => r.timestamp > oneMinuteAgo);
      const rpm = recentMinuteRequests.length;
      const tpm = recentMinuteRequests.reduce((sum, r) => sum + (r.tokens || 0), 0);

      // 计算 RPD 和 TPD
      const recentDayRequests = requestsLastDay.filter(r => r.timestamp > oneDayAgo);
      const rpd = recentDayRequests.length;
      const tpd = recentDayRequests.reduce((sum, r) => sum + (r.tokens || 0), 0);

      return {
        rpm, rpd, tpm, tpd,
        totalTokens: pool.stats.totalTokens || 0
      };
    }

    // 渲染 Keys 列表
    function renderKeys() {
      const container = document.getElementById('keysContainer');

      if (!poolData.geminiKeys || poolData.geminiKeys.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: white; padding: 20px;">还没有添加任何 API Key</div>';
        return;
      }

      container.innerHTML = poolData.geminiKeys.map((key, index) => \`
        <div class="key-card \${key.enabled ? '' : 'disabled'}" id="key-card-\${index}">
          <input type="checkbox" class="key-checkbox" onchange="updateSelection()" data-index="\${index}">
          <div class="key-info">
            <div class="key-value">\${key.key}</div>
            <div class="key-meta">
              <span>权重: <strong>\${key.weight || 1}</strong></span>
              <span class="key-status-badge \${key.enabled ? 'badge-enabled' : 'badge-disabled'}">
                \${key.enabled ? '✓ 已启用' : '✗ 已禁用'}
              </span>
            </div>
            <div class="key-stats">
              <span title="总调用次数">📊 调用: <strong>\${key.totalRequests || 0}</strong></span>
              <span title="成功次数" style="color: #10b981;">✓ \${key.successfulRequests || 0}</span>
              <span title="失败次数" style="color: #ef4444;">✗ \${key.failedRequests || 0}</span>
              \${key.lastUsedAt ? \`<span title="最后使用时间" style="font-size: 0.8em; color: #9ca3af;">\${formatTime(key.lastUsedAt)}</span>\` : ''}
            </div>
          </div>
          <div class="key-actions">
            <button class="btn btn-primary btn-small" onclick="toggleKeyStatus(\${index})">
              \${key.enabled ? '禁用' : '启用'}
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteKey(\${index})">删除</button>
          </div>
        </div>
      \`).join('');

      // 显示批量操作工具栏
      document.getElementById('batchActionsBar').style.display = poolData.geminiKeys.length > 0 ? 'flex' : 'none';
      updateSelection();
    }

    // 渲染模型显示
    function renderModelsDisplay() {
      const modelsList = document.getElementById('modelsList');
      const allowedModels = poolData.allowedModels || [];

      if (allowedModels.length === 0) {
        modelsList.innerHTML = '<span style="color: #10b981; font-weight: 600;">✓ 允许所有模型</span>';
      } else {
        modelsList.innerHTML = allowedModels.map(model => \`
          <span style="background: #667eea; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.9em;">
            \${model}
          </span>
        \`).join('');
      }
    }

    // 切换模型编辑器
    function toggleModelEditor() {
      const editor = document.getElementById('modelEditor');
      const display = document.getElementById('currentModelsDisplay');
      const btnText = document.getElementById('modelEditBtnText');

      if (editor.style.display === 'none') {
        // 显示编辑器
        renderModelCheckboxes();
        editor.style.display = 'block';
        display.style.display = 'none';
        btnText.textContent = '❌ 取消编辑';
      } else {
        // 隐藏编辑器
        editor.style.display = 'none';
        display.style.display = 'block';
        btnText.textContent = '✏️ 编辑模型';
      }
    }

    // 渲染模型复选框
    function renderModelCheckboxes() {
      const container = document.getElementById('modelCheckboxes');
      const allowedModels = poolData.allowedModels || [];

      if (availableModels.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: #666;">加载模型列表中...</div>';
        return;
      }

      container.innerHTML = availableModels.map(model => \`
        <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
          <input type="checkbox" name="models" value="\${model}" \${allowedModels.includes(model) ? 'checked' : ''} style="width: 18px; height: 18px;">
          <span style="font-size: 0.9em;">\${model}</span>
        </label>
      \`).join('');
    }

    // 取消模型编辑
    function cancelModelEdit() {
      const editor = document.getElementById('modelEditor');
      const display = document.getElementById('currentModelsDisplay');
      const btnText = document.getElementById('modelEditBtnText');

      editor.style.display = 'none';
      display.style.display = 'block';
      btnText.textContent = '✏️ 编辑模型';
    }

    // 处理模型更新表单提交
    document.getElementById('updateModelsForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      // 获取选中的模型
      const checkedBoxes = document.querySelectorAll('input[name="models"]:checked');
      const selectedModels = Array.from(checkedBoxes).map(cb => cb.value);

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allowedModels: selectedModels
          })
        });

        const data = await response.json();

        if (data.success) {
          poolData.allowedModels = selectedModels;
          renderModelsDisplay();
          cancelModelEdit();
          alert(\`模型列表更新成功！\${selectedModels.length === 0 ? '现在允许所有模型。' : \`现在只允许 \${selectedModels.length} 个模型。\`}\`);
        } else {
          alert('更新失败: ' + data.message);
        }
      } catch (error) {
        alert('更新失败: ' + error.message);
      }
    });

    // 复制 Auth Key
    function copyAuthKey() {
      const authKey = document.getElementById('authKey').textContent;
      navigator.clipboard.writeText(authKey).then(() => {
        alert('Auth Key 已复制到剪贴板！');
      });
    }

    // 添加新 Key
    document.getElementById('addKeyForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const newKey = {
        key: document.getElementById('newKeyValue').value.trim(),
        weight: parseInt(document.getElementById('newKeyWeight').value),
        enabled: document.getElementById('newKeyEnabled').checked
      };

      if (!newKey.key.startsWith('AIza')) {
        alert('无效的 Gemini API Key 格式！Key 应该以 AIza 开头。');
        return;
      }

      // 添加到现有 keys
      const updatedKeys = [...poolData.geminiKeys, newKey];

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiKeys: updatedKeys
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('API Key 添加成功！');
          document.getElementById('addKeyForm').reset();
          document.getElementById('newKeyWeight').value = '1';
          document.getElementById('newKeyEnabled').checked = true;
          loadPoolDetail();
        } else {
          alert('添加失败: ' + data.message);
        }
      } catch (error) {
        alert('添加失败: ' + error.message);
      }
    });

    // 切换批量导入表单显示
    function toggleBatchImport() {
      const batchCard = document.getElementById('batchImportCard');
      const singleCard = document.querySelector('.add-key-card:not(#batchImportCard)');
      
      if (batchCard.style.display === 'none') {
        // 显示批量导入，隐藏单个添加
        batchCard.style.display = 'block';
        singleCard.style.display = 'none';
      } else {
        // 显示单个添加，隐藏批量导入
        batchCard.style.display = 'none';
        singleCard.style.display = 'block';
        // 清空批量导入输入框
        document.getElementById('batchImportForm').reset();
        document.getElementById('batchKeyWeight').value = '1';
        document.getElementById('batchKeyEnabled').checked = true;
      }
    }

    // 批量导入 Keys
    document.getElementById('batchImportForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const keysText = document.getElementById('batchKeysInput').value.trim();
      const defaultWeight = parseInt(document.getElementById('batchKeyWeight').value);
      const defaultEnabled = document.getElementById('batchKeyEnabled').checked;

      // 解析输入（每行一个Key）
      const keyLines = keysText.split('\\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (keyLines.length === 0) {
        alert('请至少输入一个 API Key！');
        return;
      }

      // 验证所有Key格式
      const invalidKeys = keyLines.filter(key => !key.startsWith('AIza'));
      if (invalidKeys.length > 0) {
        alert(\`发现 \${invalidKeys.length} 个无效的 Key 格式！\\n\\nKey 应该以 AIza 开头。\\n\\n第一个无效 Key: \${invalidKeys[0]}\`);
        return;
      }

      // 构建新Keys数组
      const newKeys = keyLines.map(key => ({
        key: key,
        weight: defaultWeight,
        enabled: defaultEnabled
      }));

      // 合并到现有Keys
      const updatedKeys = [...poolData.geminiKeys, ...newKeys];

      // 确认
      if (!confirm(\`即将批量导入 \${newKeys.length} 个 API Key。\\n\\n确定继续？\`)) {
        return;
      }

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiKeys: updatedKeys
          })
        });

        const data = await response.json();

        if (data.success) {
          alert(\`成功导入 \${newKeys.length} 个 API Key！\`);
          document.getElementById('batchImportForm').reset();
          document.getElementById('batchKeyWeight').value = '1';
          document.getElementById('batchKeyEnabled').checked = true;
          toggleBatchImport(); // 切换回单个添加
          loadPoolDetail();
        } else {
          alert('批量导入失败: ' + data.message);
        }
      } catch (error) {
        alert('批量导入失败: ' + error.message);
      }
    });

    // 切换 Key 启用状态
    async function toggleKeyStatus(index) {
      const updatedKeys = [...poolData.geminiKeys];
      updatedKeys[index].enabled = !updatedKeys[index].enabled;

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiKeys: updatedKeys
          })
        });

        const data = await response.json();

        if (data.success) {
          poolData.geminiKeys = updatedKeys;
          renderKeys();
        } else {
          alert('更新失败: ' + data.message);
        }
      } catch (error) {
        alert('更新失败: ' + error.message);
      }
    }

    // 删除 Key
    async function deleteKey(index) {
      if (poolData.geminiKeys.length === 1) {
        alert('无法删除最后一个 API Key！池至少需要一个 Key。');
        return;
      }

      if (!confirm(\`确定要删除这个 API Key 吗？\\n\\n\${poolData.geminiKeys[index].key}\`)) {
        return;
      }

      const updatedKeys = poolData.geminiKeys.filter((_, i) => i !== index);

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiKeys: updatedKeys
          })
        });

        const data = await response.json();

        if (data.success) {
          alert('API Key 删除成功！');
          loadPoolDetail();
        } else {
          alert('删除失败: ' + data.message);
        }
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }

    // 更新选择状态
    function updateSelection() {
      const checkboxes = document.querySelectorAll('.key-checkbox');
      const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
      const totalCount = checkboxes.length;

      // 更新计数
      document.getElementById('selectedCount').textContent = \`已选择 \${selectedCount} 个\`;

      // 更新全选状态
      const selectAllCheckbox = document.getElementById('selectAll');
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedCount === totalCount && totalCount > 0;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
      }

      // 更新卡片样式
      checkboxes.forEach(cb => {
        const index = cb.dataset.index;
        const card = document.getElementById(\`key-card-\${index}\`);
        if (card) {
          if (cb.checked) {
            card.classList.add('selected');
          } else {
            card.classList.remove('selected');
          }
        }
      });

      // 根据选中的状态更新批量操作按钮文本
      if (selectedCount > 0) {
        const selectedIndices = Array.from(checkboxes)
          .map((cb, i) => cb.checked ? i : -1)
          .filter(i => i !== -1);
        const enabledCount = selectedIndices.filter(i => poolData.geminiKeys[i].enabled).length;
        const disabledCount = selectedIndices.length - enabledCount;
        
        const batchToggleBtn = document.getElementById('batchToggleBtn');
        if (enabledCount > disabledCount) {
          batchToggleBtn.textContent = '批量禁用';
        } else if (disabledCount > enabledCount) {
          batchToggleBtn.textContent = '批量启用';
        } else {
          batchToggleBtn.textContent = '批量切换';
        }
      }
    }

    // 全选/取消全选
    function toggleSelectAll() {
      const selectAll = document.getElementById('selectAll').checked;
      const checkboxes = document.querySelectorAll('.key-checkbox');
      checkboxes.forEach(cb => {
        cb.checked = selectAll;
      });
      updateSelection();
    }

    // 批量切换状态
    async function batchToggleStatus() {
      const checkboxes = document.querySelectorAll('.key-checkbox:checked');
      if (checkboxes.length === 0) {
        alert('请先选择要操作的 API Keys');
        return;
      }

      const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
      const enabledCount = selectedIndices.filter(i => poolData.geminiKeys[i].enabled).length;
      const toDisable = enabledCount >= selectedIndices.length / 2;

      if (!confirm(\`确定要批量\${toDisable ? '禁用' : '启用'} \${selectedIndices.length} 个 API Keys 吗？\`)) {
        return;
      }

      try {
        const updatedKeys = poolData.geminiKeys.map((key, index) => {
          if (selectedIndices.includes(index)) {
            return { ...key, enabled: !toDisable };
          }
          return key;
        });

        const response = await fetch(\`/api/pools/\${POOL_ID}/keys\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geminiKeys: updatedKeys })
        });

        const data = await response.json();

        if (data.success) {
          alert(\`成功\${toDisable ? '禁用' : '启用'} \${selectedIndices.length} 个 API Keys！\`);
          loadPoolDetail();
        } else {
          alert('批量操作失败: ' + data.message);
        }
      } catch (error) {
        alert('批量操作失败: ' + error.message);
      }
    }

    // 批量复制
    function batchCopy() {
      const checkboxes = document.querySelectorAll('.key-checkbox:checked');
      if (checkboxes.length === 0) {
        alert('请先选择要复制的 API Keys');
        return;
      }

      const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
      const selectedKeys = selectedIndices.map(i => poolData.geminiKeys[i].key);
      
      // 将选中的 Keys 复制到剪贴板（每行一个）
      const keysText = selectedKeys.join('\\n');
      
      navigator.clipboard.writeText(keysText).then(() => {
        alert(\`已复制 \${selectedKeys.length} 个 API Keys 到剪贴板！\\n\\n每行一个，可直接粘贴到批量导入。\`);
      }).catch(err => {
        // 降级方案：显示在弹窗中
        const textarea = document.createElement('textarea');
        textarea.value = keysText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          alert(\`已复制 \${selectedKeys.length} 个 API Keys 到剪贴板！\`);
        } catch (e) {
          alert('复制失败，请手动复制：\\n\\n' + keysText);
        }
        document.body.removeChild(textarea);
      });
    }

    // 批量删除
    async function batchDelete() {
      const checkboxes = document.querySelectorAll('.key-checkbox:checked');
      if (checkboxes.length === 0) {
        alert('请先选择要删除的 API Keys');
        return;
      }

      const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
      
      // 检查是否会删除所有 Keys
      if (selectedIndices.length >= poolData.geminiKeys.length) {
        alert('无法删除所有 API Keys！池至少需要保留一个 Key。');
        return;
      }

      if (!confirm(\`确定要批量删除 \${selectedIndices.length} 个 API Keys 吗？\\n\\n此操作不可撤销！\`)) {
        return;
      }

      try {
        const updatedKeys = poolData.geminiKeys.filter((key, index) => !selectedIndices.includes(index));

        const response = await fetch(\`/api/pools/\${POOL_ID}/keys\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geminiKeys: updatedKeys })
        });

        const data = await response.json();

        if (data.success) {
          alert(\`成功删除 \${selectedIndices.length} 个 API Keys！\`);
          loadPoolDetail();
        } else {
          alert('批量删除失败: ' + data.message);
        }
      } catch (error) {
        alert('批量删除失败: ' + error.message);
      }
    }

    // 删除所有已禁用的 Keys
    async function deleteDisabledKeys() {
      const disabledKeys = poolData.geminiKeys.filter(k => !k.enabled);
      
      if (disabledKeys.length === 0) {
        alert('没有已禁用的 Key');
        return;
      }

      if (!confirm(\`确定要删除所有已禁用的 Key 吗？\\n\\n将删除 \${disabledKeys.length} 个已禁用的 Key\\n此操作无法撤销！\`)) {
        return;
      }

      try {
        // 保留已启用的 Keys
        const enabledKeys = poolData.geminiKeys.filter(k => k.enabled);
        
        const response = await fetch(\`/api/pools/\${POOL_ID}/keys\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            geminiKeys: enabledKeys
          })
        });

        const data = await response.json();

        if (data.success) {
          alert(\`成功删除 \${disabledKeys.length} 个已禁用的 Key！\`);
          loadPoolDetail();
        } else {
          alert('删除失败: ' + data.message);
        }
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }

    // 重新生成 Auth Key
    async function regenerateAuthKey() {
      if (!confirm('确定要重新生成 Auth Key 吗？\\n\\n注意：旧的 Key 将立即失效！')) {
        return;
      }

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}/regenerate-auth\`, {
          method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
          alert('Auth Key 已重新生成！\\n\\n新的 Key：' + data.pool.authKey);
          loadPoolDetail();
        } else {
          alert('重新生成失败: ' + data.message);
        }
      } catch (error) {
        alert('重新生成失败: ' + error.message);
      }
    }

    // 删除池
    async function deletePool() {
      if (!confirm(\`确定要删除池 "\${poolData.name}" 吗？\\n\\n此操作将：\\n1. 删除池配置\\n2. 使 Auth Key 失效\\n3. 无法撤销！\`)) {
        return;
      }

      try {
        const response = await fetch(\`/api/pools/\${POOL_ID}\`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
          alert('池删除成功！');
          window.location.href = '/admin';
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

    // 页面加载时获取池详情
    loadPoolDetail();
  </script>
</body>
</html>`;
}
