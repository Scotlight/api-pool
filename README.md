# Gemini API 多池管理系统

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Scotlight/api-pool)
[![GitHub](https://img.shields.io/badge/GitHub-Scotlight/api--pool-blue?logo=github)](https://github.com/Scotlight/api-pool)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

> **致谢**：本项目基于 [ling-drag0n/api-pool](https://github.com/ling-drag0n/api-pool) 开发，在原项目的基础上进行了针对 Gemini API 的适配和功能增强。感谢原作者的优秀工作！

## 项目介绍

Gemini API 多池管理系统是一个专为管理 Google Gemini API 密钥设计的代理应用程序。该系统支持创建多个完全隔离的 API 池，每个池拥有独立的认证密钥和配置，实现 OpenAI 格式 API 的转发和代理功能，适用于多团队共享 API 密钥或提高 API 请求可靠性的场景。

## 主要功能

### 1. API 转发与兼容性

- 完整支持 OpenAI API 格式的请求转发
- 支持多种 API 端点：聊天(chat/completions)、嵌入(embeddings)、模型列表(models)
- 自动转换 OpenAI 格式 ↔ Gemini 格式
- 保持完全的 API 兼容性

### 2. 多池隔离管理

- 创建多个完全独立的 API 池
- 每个池拥有独立的 Auth Key（`sk-pool-xxxx` 格式）
- 池级别的模型访问控制
- 池级别的统计数据追踪

### 3. 灵活的密钥管理

- 支持在 KV 存储中保存和管理 Gemini API 密钥
- 支持批量添加、删除、启用、禁用 API 密钥
- 支持为每个密钥设置权重（负载均衡）
- 自动混淆显示密钥，保护安全

### 4. 智能负载均衡

- 基于权重的加权随机选择算法
- 自动处理 API 请求失败和重试机制
- 支持禁用单个密钥而不影响其他密钥

### 5. 动态模型管理

- 自动从 Gemini API 获取最新可用模型
- 模型列表缓存（1小时），减少 API 调用
- 支持限制每个池允许使用的模型

### 6. 高级流式处理

- 完整支持 OpenAI 的流式响应（SSE）处理
- 实现自适应延迟算法，根据内容大小动态调整响应速率
- 支持逐字符或批量发送两种模式
- 保留原始 SSE 事件格式，确保完全兼容

### 7. 实时统计与监控

- Web 管理界面实时显示所有池的状态
- 追踪每个池的请求次数、成功率、失败次数
- 显示每个池的 Gemini Keys 数量和启用状态

### 8. 安全特性

- 管理界面密码保护（环境变量配置）
- Session Token 认证机制
- 密钥混淆显示，保护 API 密钥安全
- 支持独立的会话密钥配置

## 技术架构

- 运行平台：Cloudflare Workers（全球边缘计算）
- 存储方式：
  - **Cloudflare KV**（适合<10个池，配置简单）→ 使用 `worker_kv.js`
  - **Cloudflare D1**（推荐10+个池，容量更大）→ 使用 `worker_d1.js`
  - 两个独立版本，根据需求选择部署
- 开发语言：JavaScript ES6+（模块化架构）
- 部署方式：选择对应的 worker 文件部署

## 版本选择指南

### 🎯 两个独立版本

系统提供两个完全独立的部署文件，简单清晰：

| 版本 | 文件 | 存储 | 适合场景 |
|------|------|------|----------|
| **KV 版本** | `worker_kv.js` | Cloudflare KV | <10 个池 |
| **D1 版本** | `worker_d1.js` | Cloudflare D1 | 10+ 个池 |

**无需选择存储类型**，直接部署对应的文件即可！

### 快速决策树

```
池数量 < 10 个？
├─ 是 → 使用 worker_kv.js ✅
└─ 否 → 使用 worker_d1.js ✅

需要 SQL 查询？
├─ 是 → 使用 worker_d1.js ✅
└─ 否 → 使用 worker_kv.js ✅

预计快速增长？
├─ 是 → 使用 worker_d1.js ✅
└─ 否 → 使用 worker_kv.js ✅
```

### 详细对比

| 项目 | KV 版本 | D1 版本 |
|------|---------|---------|
| **部署文件** | worker_kv.js | worker_d1.js |
| **容量** | 1 GB | 5 GB |
| **配置难度** | ⭐ 简单 | ⭐⭐ 中等 |
| **读取速度** | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐⭐⭐ 快 |
| **适合场景** | 小规模 | 大规模 |

### 推荐配置

| 场景 | 推荐版本 | 理由 |
|------|----------|------|
| **新项目** | `worker_d1.js` | 容量大，扩展性好 |
| **测试项目** | `worker_kv.js` | 配置简单，快速开始 |
| **生产环境** | `worker_d1.js` | 更稳定，查询灵活 |
| **小规模** | `worker_kv.js` | 够用且速度快 |
| **大规模** | `worker_d1.js` | 容量支持更多池 |

**默认推荐**：选择 `worker_d1.js`，一步到位！

---

## 快速部署

### 🚀 一键部署（推荐）

点击上方的 **"Deploy to Cloudflare Workers"** 按钮可快速开始部署流程。

**注意**：一键部署后仍需完成以下配置：
1. 创建 KV 命名空间或 D1 数据库
2. 绑定存储到 Worker
3. 设置环境变量 `ADMIN_PASSWORD`

详细步骤请参考下方的手动部署指南。

---

### 📋 部署步骤概览

| 步骤 | KV 版本 | D1 版本 |
|------|---------|---------|
| **1. 创建存储** | 创建 KV 命名空间 `API_TOKENS` | 创建 D1 数据库 `gemini-pool-db` |
| **2. 创建 Worker** | 新建 Worker 并上传 `worker_kv.js` | 新建 Worker 并上传 `worker_d1.js` |
| **3. 绑定存储** | 绑定 KV → `API_TOKENS` | 绑定 D1 → `DB` |
| **4. 设置密码** | 添加环境变量 `ADMIN_PASSWORD` | 添加环境变量 `ADMIN_PASSWORD` |

**注意**：
- D1 版本会在首次运行时自动初始化数据库表，无需手动执行 SQL
- 管理员密码**必须**通过环境变量 `ADMIN_PASSWORD` 设置，没有默认密码

---

### 方式一：Web 控制台部署（简单）

#### 准备工作
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages**

#### KV 版本部署

**1. 创建 KV 命名空间**
- 进入 **KV** → **Create namespace** → 命名为 `API_TOKENS`

**2. 创建并配置 Worker**
- **Create Worker** → 粘贴 `worker_kv.js` 代码 → **Save and Deploy**
- **Settings** → **Variables** → **KV Namespace Bindings**
  - Variable name: `API_TOKENS`
  - KV namespace: 选择刚创建的
- **Variables** → **Environment Variables** → 添加 → 选择“密钥”（必须是！！！）
  - `ADMIN_PASSWORD`: 你的管理员密码（必需）

✅ 访问 Worker URL，使用设置的密码登录

#### D1 版本部署

**1. 创建 D1 数据库**
- 进入 **D1** → **Create database** → 命名为 `gemini-pool-db`

**2. 创建并配置 Worker**
- **Create Worker** → 粘贴 `worker_d1.js` 代码 → **Save and Deploy**
- **Settings** → **Variables** → **D1 Database Bindings**
  - Variable name: `DB`
  - D1 database: 选择 `gemini-pool-db`
- **Variables** → **Environment Variables** → 添加 → 选择“密钥”（必须是！！！）
  - `ADMIN_PASSWORD`: 你的管理员密码（必需）

✅ 访问 Worker URL，使用设置的密码登录（表会自动创建）

---

### 方式二：CLI 部署（推荐）

#### 基础设置

```bash
# 1. 安装并登录
npm install -g wrangler
wrangler login

# 2. 克隆项目（如果从 GitHub 下载）
git clone <repository-url>
cd <project-folder>
```

#### KV 版本

```bash
# 复制配置模板
cp wrangler-kv.toml.example wrangler.toml

# 创建 KV 并记录输出的 ID
wrangler kv:namespace create "API_TOKENS"

# 编辑 wrangler.toml，将 id 替换为上面输出的 Namespace ID

# 设置密码并部署
wrangler secret put ADMIN_PASSWORD
wrangler deploy
```

#### D1 版本

```bash
# 复制配置模板
cp wrangler-d1.toml.example wrangler.toml

# 创建 D1 并记录输出的 Database ID
wrangler d1 create gemini-pool-db

# 编辑 wrangler.toml，将 database_id 替换为上面输出的 Database ID

# 设置密码并部署（首次运行会自动初始化表）
wrangler secret put ADMIN_PASSWORD
wrangler deploy
```

✅ 部署成功后，你将获得一个 `*.workers.dev` 的 URL。

---

## 使用方法

### 访问管理界面

1. 打开浏览器，访问您的 Worker URL
   ```
   https://your-worker.workers.dev/login
   ```

2. 输入您设置的管理员密码登录

3. 登录后进入 Dashboard，可以：
   - 查看所有池的概览
   - 创建新的池
   - 管理现有池的配置
   - 添加/删除/启用/禁用 Gemini API Keys

### 创建第一个池

1. 点击 **"➕ 创建新池"** 按钮

2. 填写池信息：
   - **池名称**：例如 `生产环境池`
   - **Gemini API Keys**：每行一个，例如：
     ```
     AIzaSyABC123...xyz
     AIzaSyDEF456...abc
     ```
   - **允许的模型**：可选，不选则允许所有模型
   - **池描述**：可选

3. 点击 **"创建池"**

4. 创建成功后，系统会自动生成：
   - **Pool ID**: `pool-xxxxx-xxxxxx`
   - **Auth Key**: `sk-pool-xxxxxxxxxx`（用于 API 调用）

### 使用 API 代理

使用池的 Auth Key 调用 Worker URL，完全兼容 OpenAI SDK。

#### JavaScript 示例：

```javascript
const response = await fetch("https://your-worker.workers.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer sk-pool-xxxxxxxxxx`, // 使用池的 Auth Key
  },
  body: JSON.stringify({
    model: "gemini-2.0-flash", // 使用 Gemini 模型
    messages: [{ role: "user", content: "你好" }]
  }),
});
```

#### Python 示例（使用 OpenAI SDK）

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-pool-xxxxxxxxxx",
    base_url="https://your-worker.workers.dev/v1"
)

response = client.chat.completions.create(
    model="gemini-2.0-flash",
    messages=[{"role": "user", "content": "你好"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

#### cURL 示例

```bash
curl https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-pool-xxxxxxxxxx" \
  -d '{
    "model": "gemini-2.0-flash",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": false
  }'
```

> **重要提示**：必须使用在管理界面创建的池的 Auth Key 进行身份验证，否则 API 请求将被拒绝。

## 客户端兼容性

本系统完全兼容 OpenAI API 格式，支持所有兼容 OpenAI 的客户端。

### Open WebUI 配置

**方法 1: 环境变量**
```bash
docker run -d -p 8080:8080 \
  -e OPENAI_API_BASE_URL=https://your-worker.workers.dev \
  -e OPENAI_API_KEY=sk-pool-xxxx \
  ghcr.io/open-webui/open-webui:main
```

**方法 2: 界面配置**
1. Settings → Connections
2. API Base URL: `https://your-worker.workers.dev`
3. API Key: `sk-pool-xxxx`

**支持的端点**：
- `/v1/chat/completions` 和 `/api/chat/completions`
- `/v1/models` 和 `/api/models`
- `/api/chat/completed`（回调）

### 其他客户端

任何支持 OpenAI API 的客户端都可以使用，例如：
- **Chatbox** - 桌面客户端
- **ChatGPT Next Web** - Web 界面
- **LobeChat** - 现代化聊天界面
- **BetterChatGPT** - 开源聊天工具

**配置方式相同**：
- Base URL: `https://your-worker.workers.dev/v1`
- API Key: `sk-pool-xxxx`
- Model: 选择任意 Gemini 模型

---

## 使用提示

### 1. 池管理

- **多池场景**：为不同团队或环境创建独立的池
  - 生产环境池：配置高权重的稳定 Keys
  - 测试环境池：配置测试用 Keys
  - 开发环境池：配置开发用 Keys

- **模型限制**：通过 `allowedModels` 限制每个池可使用的模型
  - 例如：生产环境只允许 `gemini-2.5-pro-latest`
  - 测试环境允许所有模型

### 2. 密钥管理

- **权重配置**：为不同的 Gemini Key 设置不同权重
  - 权重 3 的 Key 会获得 60% 的流量（假设总权重为 5）
  - 权重 1 的 Key 会获得 20% 的流量

- **批量导入**：在创建池时支持批量导入 Keys
  - 每行一个 Key，支持换行分隔
  - 自动去除空行和空格

- **启用/禁用**：可以临时禁用某个 Key 而不删除
  - 在池详情页面切换 Key 的启用状态
  - 禁用的 Key 不会被用于 API 调用

### 3. 监控统计

- **Dashboard 统计**：
  - 池总数、启用的池数量
  - Gemini Keys 总数、启用的 Keys 数量
  - 每个池的创建时间和状态

- **池详情统计**：
  - 总请求数、成功请求数、失败请求数
  - 成功率计算

### 4. 模型管理

- **动态模型列表**：系统自动从 Gemini API 获取最新模型
- **缓存机制**：模型列表缓存 1 小时，减少 API 调用
- **查看可用模型**：访问 `/v1/models` 端点或管理界面的"动态模型列表"

## 故障排除

### 1. 登录失败

**问题**：输入密码后无法登录

**可能原因**：
- 环境变量 `ADMIN_PASSWORD` 未设置
- 密码输入错误

**解决方法**：
1. 检查 Cloudflare Workers 环境变量配置
2. 使用 `wrangler secret put ADMIN_PASSWORD` 重新设置
3. 确认密码正确

### 2. KV 存储错误

**问题**：提示 KV 命名空间未绑定

**可能原因**：
- KV 命名空间未创建
- KV 绑定名称错误

**解决方法**：
1. 确认已创建 KV 命名空间
2. 确认绑定名称为 `API_TOKENS`（不是其他名称）
3. 在 Worker Settings → Variables 中检查 KV 绑定

### 3. D1 数据库错误

**问题**：提示 "env.DB is undefined" 或数据库操作失败

**可能原因**：
- D1 数据库未创建
- D1 绑定名称错误
- 数据库表未初始化

**解决方法**：
1. 确认已创建 D1 数据库
2. 确认绑定名称为 `DB`（不是其他名称）
3. 执行初始化脚本：
   ```bash
   wrangler d1 execute gemini-pool-db --file=gemini/init-d1.sql
   ```
4. 在 Worker Settings → Variables 中检查 D1 绑定

### 4. API 返回 401 Unauthorized

**问题**：使用 Auth Key 调用 API 返回 401

**可能原因**：
- Auth Key 格式错误
- Auth Key 不存在
- 池被禁用

**解决方法**：
1. 检查 Auth Key 是否为 `sk-pool-` 开头
2. 在管理界面确认该池存在且启用
3. 复制正确的 Auth Key（避免多余空格）

### 4. 模型列表为空

**问题**：访问 `/v1/models` 返回空列表

**可能原因**：
- 没有创建任何池
- 所有池都被禁用
- 所有 Gemini Keys 都无效

**解决方法**：
1. 确保至少创建了一个池
2. 确保池中至少有一个启用的 Gemini Key
3. 在 [Google AI Studio](https://aistudio.google.com/app/apikey) 验证 Key 是否有效

### 5. 请求失败或响应缓慢

**问题**：API 请求失败或响应很慢

**可能原因**：
- Gemini API 服务器响应慢
- 所有 Gemini Keys 都失效
- 网络连接问题

**解决方法**：
1. 在管理界面查看池的统计数据，识别问题
2. 检查 Gemini Keys 是否有效
3. 尝试添加更多 Gemini Keys 提高可用性

## 高级配置

### 自定义流式输出模式

在 `streaming.js` 中可以配置流式输出行为：

```javascript
const config = {
  sendMode: "char",    // "char" 逐字符 或 "batch" 批量
  charDelay: 50,       // 字符间延迟（毫秒）
  batchSize: 5,        // 批量大小
  batchDelay: 100      // 批次间延迟（毫秒）
};
```

### 调整日志级别

在 `utils.js` 中设置日志级别：

```javascript
setLogLevel("info");  // "debug", "info", "warn", "error"
```

### 模型缓存时间

在 `model-fetcher.js` 中调整缓存时间：

```javascript
const CACHE_DURATION = 3600000;  // 1小时（毫秒）
```

### 自定义域名

在 `wrangler.toml` 中配置自定义域名：

```toml
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## 安全建议

1. **务必修改管理员密码**
   - 使用复杂密码（包含大小写字母、数字、特殊字符）
   - 定期更换密码

2. **使用加密环境变量**
   - 敏感信息（密码、密钥）使用 Wrangler 的 `secret put` 命令
   - 不要在代码中硬编码密码

3. **定期审查 Auth Keys**
   - 定期检查所有池的 Auth Keys
   - 删除不再使用的池和 Keys

4. **限制模型访问**
   - 为不同的池配置不同的 `allowedModels`
   - 避免敏感池允许所有模型

5. **监控使用情况**
   - 定期查看各池的统计数据
   - 识别异常使用模式

6. **使用自定义域名和 HTTPS**
   - 为 Worker 配置自定义域名
   - Cloudflare Workers 默认启用 HTTPS

## 项目结构

系统采用模块化开发，便于维护和扩展：

```
project/
├── src/                        # 源代码模块
│   ├── constants.js
│   ├── utils.js
│   ├── kv-storage.js
│   ├── d1-storage.js
│   ├── pool-manager.js
│   └── ...（其他模块）
├── worker_kv.js                # ⭐ KV 版本（已打包）
├── worker_d1.js                # ⭐ D1 版本（已打包）
├── wrangler-kv.toml.example    # ⭐ KV 配置模板
├── wrangler-d1.toml.example    # ⭐ D1 配置模板
├── init-d1.sql                 # D1 数据库初始化
├── merge-kv.js                 # KV 版本合并脚本
├── merge-d1.js                 # D1 版本合并脚本
└── README.md
```

**说明**：
- `worker_kv.js` 和 `worker_d1.js` 已打包好，可直接部署
- 如需重新打包：`node merge-kv.js` 或 `node merge-d1.js`

## 相关文档

- **[QUICKSTART.md](./QUICKSTART.md)** - 5分钟快速部署指南
- **[CREDITS.md](./CREDITS.md)** - 项目致谢和版权说明

---

## 致谢与项目关系

### 基于项目

本项目基于 **[ling-drag0n/api-pool](https://github.com/ling-drag0n/api-pool)** 开发。

原项目是一个优秀的 **OpenAI API** 密钥管理池系统，已具备 KV/D1 双存储、负载均衡、流式处理、实时统计（RPM/RPD/TPM/TPD）、批量管理等核心功能。

### 本项目的主要改进

我们在原项目基础上进行了以下核心改进：

#### 1. **API 平台转换**（核心改进）
- ✅ 从 OpenAI API 适配到 Google Gemini API
- ✅ OpenAI 格式 ↔ Gemini 格式自动转换
- ✅ Gemini 特有参数和响应格式支持
- ✅ Gemini 流式响应完整适配

#### 2. **多池隔离架构**（新增功能）
- ✅ 从单池管理改为多池隔离架构
- ✅ 每个池独立的 Auth Key（`sk-pool-xxxx` 格式）
- ✅ 池级别的 Gemini Keys 管理
- ✅ 池级别的统计数据追踪
- ✅ 池级别的模型访问控制

#### 3. **动态模型管理**（新增功能）
- ✅ 自动从 Gemini API 获取模型列表
- ✅ 模型列表缓存机制（1小时）
- ✅ 每个池可限制允许使用的模型
- ✅ 模型自动更新和验证

#### 4. **批量操作 UI 增强**（优化）
- ✅ 新增复选框批量选择界面
- ✅ 新增批量复制功能（格式化输出）
- ✅ 全选/取消全选功能
- ✅ 选中状态可视化高亮
- ✅ 智能批量操作按钮（自动切换文本）

#### 5. **D1 自动初始化**（优化）
- ✅ 使用 `batch()` 方式自动初始化表
- ✅ 首次运行自动创建所有表和索引
- ✅ 无需手动执行 SQL 脚本（原项目需要）

#### 6. **代码组织改进**（新增）
- ✅ 模块化代码结构（`src/` 文件夹）
- ✅ 独立的构建脚本（`merge-kv.js` / `merge-d1.js`）
- ✅ 完全分离的 KV 和 D1 版本
- ✅ 配置文件模板（`wrangler-*.toml.example`）

#### 7. **Gemini 专用文档**（新增）
- ✅ 针对 Gemini API 的完整部署文档
- ✅ 5分钟快速开始指南
- ✅ 功能独立说明文档（STATS_DASHBOARD.md、BATCH_IMPORT.md等）
- ✅ 完整的项目导航（INDEX.md）

### 感谢原作者

特别感谢 **[@ling-drag0n](https://github.com/ling-drag0n)** 创建的优秀项目架构和设计理念，为本项目提供了坚实的基础。

---

## 许可和贡献

本项目基于原项目许可开源，欢迎提交问题和改进建议。

如有任何问题或需要帮助，请查看文档或提交 issue。
