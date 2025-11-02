# Cloudflare Workers 快速部署指南

完整的 Gemini API 多池代理系统部署教程，5 分钟从零开始。

---

## 📋 前置要求

- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费版即可）
- Node.js 16+ （用于运行合并脚本）
- 至少一个 [Gemini API Key](https://aistudio.google.com/app/apikey)

---

## 🚀 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

浏览器会自动打开授权页面，完成登录。

### 3. 创建 KV 命名空间

在项目根目录（`bridge` 目录）执行：

```bash
wrangler kv:namespace create "POOL_KV"
```

**重要**：记下输出的 `id`，类似：

```
✅ Success!
Add the following to your wrangler.toml:
{ binding = "POOL_KV", id = "abc123def456..." }
```

### 4. 创建 wrangler.toml 配置文件

在 `C:\Users\XHY\AppData\Local\bridge\` 目录创建 `wrangler.toml`：

```toml
name = "gemini-proxy"
main = "worker_multipool.js"
compatibility_date = "2024-01-01"

[vars]
# 可选：在这里配置非敏感变量

# KV 命名空间绑定
kv_namespaces = [
  { binding = "POOL_KV", id = "你的KV命名空间ID" }
]
```

**替换 `id`** 为第 3 步得到的 KV 命名空间 ID。

### 5. 合并模块文件

进入 `gemini` 目录：

```bash
cd C:\Users\XHY\AppData\Local\bridge\gemini
node merge.js
```

**输出**：生成 `C:\Users\XHY\AppData\Local\bridge\worker_multipool.js`（约 138KB）

### 6. 配置环境变量（重要！）

在 Cloudflare Workers 控制台配置**加密**环境变量：

#### 方法 A：通过命令行（推荐）

```bash
cd C:\Users\XHY\AppData\Local\bridge

# 设置管理员密码（必需）
wrangler secret put ADMIN_PASSWORD
# 提示输入时，输入你的管理员密码，比如：MySecurePassword123!

# 设置会话密钥（可选，建议配置）
wrangler secret put SESSION_SECRET
# 提示输入时，输入一个随机字符串，比如：your-random-session-secret-here
```

#### 方法 B：通过 Web 控制台

1. 访问 [Cloudflare Workers 控制台](https://dash.cloudflare.com/)
2. 选择你的 Worker
3. 进入 **Settings** → **Variables**
4. 添加环境变量：
   - `ADMIN_PASSWORD`: 你的管理员密码（**必需**）
   - `SESSION_SECRET`: 会话密钥（可选，不设置则使用 ADMIN_PASSWORD）

**⚠️ 安全提示**：
- 使用复杂密码（包含大小写字母、数字、特殊字符）
- 不要在代码中硬编码密码
- 定期更换密码

### 7. 部署到 Cloudflare Workers

```bash
cd C:\Users\XHY\AppData\Local\bridge
wrangler deploy
```

**成功输出示例**：
```
✅ Successfully deployed worker!
🌏 https://gemini-proxy.your-account.workers.dev
```

**记下你的 Worker URL**，例如：`https://gemini-proxy.your-account.workers.dev`

---

## 🎯 首次使用

### 1. 访问管理后台

在浏览器打开：`https://gemini-proxy.your-account.workers.dev/login`

输入你在第 6 步设置的 `ADMIN_PASSWORD`，点击登录。

### 2. 创建第一个池

登录成功后，点击 **"➕ 创建新池"**：

**表单填写**：
- **池名称**：例如 `生产环境池`
- **Gemini API Keys**：每行一个，例如：
  ```
  AIzaSyABC123...xyz
  AIzaSyDEF456...abc
  ```
- **允许的模型**（可选）：不选则允许所有模型
- **池描述**（可选）：例如 `用于生产环境的 Gemini API 池`

点击 **"创建池"**。

### 3. 获取 Auth Key

创建成功后，在 Dashboard 会看到新池的卡片，点击 **"📝 管理此池"**：

你会看到：
- **Pool ID**: `pool-xxxxx-xxxxxx`
- **Auth Key**: `sk-pool-xxxxxxxxxx`（点击可复制）

**Auth Key 就是你调用 API 时使用的密钥。**

---

## 🔌 API 使用示例

### cURL 调用

```bash
curl https://gemini-proxy.your-account.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-pool-xxxxxxxxxx" \
  -d '{
    "model": "gemini-2.0-flash",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "stream": false
  }'
```

### Python 调用（OpenAI SDK）

```bash
pip install openai
```

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-pool-xxxxxxxxxx",
    base_url="https://gemini-proxy.your-account.workers.dev/v1"
)

response = client.chat.completions.create(
    model="gemini-2.0-flash",
    messages=[
        {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    stream=True  # 支持流式输出
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### Node.js 调用

```bash
npm install openai
```

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'sk-pool-xxxxxxxxxx',
  baseURL: 'https://gemini-proxy.your-account.workers.dev/v1'
});

async function main() {
  const stream = await client.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'user', content: '你好' }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
  }
}

main();
```

---

## 📊 查看可用模型

### 方法 1：API 查询

```bash
curl https://gemini-proxy.your-account.workers.dev/v1/models
```

返回 OpenAI 格式的模型列表（动态从 Gemini API 获取）。

### 方法 2：管理界面

登录后点击 **"📋 动态模型列表"** 查看所有可用模型。

---

## 🔧 更新部署

修改代码后重新部署：

```bash
# 1. 重新合并模块
cd C:\Users\XHY\AppData\Local\bridge\gemini
node merge.js

# 2. 重新部署
cd C:\Users\XHY\AppData\Local\bridge
wrangler deploy
```

**注意**：
- KV 数据不会丢失
- 环境变量不需要重新配置
- 已创建的池和配置自动保留

---

## 🐛 常见问题

### Q1: 部署时提示 "Error: No account id found"

**解决**：运行 `wrangler login` 重新登录。

### Q2: 提示 "Binding 'POOL_KV' not found"

**解决**：检查 `wrangler.toml` 中 KV 命名空间的 `id` 是否正确。

### Q3: 登录时提示 "Invalid password"

**解决**：
1. 确认 `ADMIN_PASSWORD` 环境变量已正确设置
2. 运行 `wrangler secret put ADMIN_PASSWORD` 重新设置

### Q4: API 返回 401 Unauthorized

**可能原因**：
- Auth Key 错误：复制完整的 `sk-pool-xxx` Key
- 池被禁用：在管理界面检查池状态
- Gemini Key 失效：检查 Gemini API Key 是否有效

### Q5: 返回 "No available models"

**解决**：
1. 确保池中至少有一个**启用**的 Gemini API Key
2. 确保 Gemini Key 有效（在 [Google AI Studio](https://aistudio.google.com/app/apikey) 测试）
3. 等待 1 分钟让系统缓存模型列表

---

## 🎓 进阶使用

### 多池隔离

创建多个池，每个池有独立的：
- Auth Key（用于 API 认证）
- Gemini API Keys（支持多个，按权重负载均衡）
- 模型白名单（限制允许使用的模型）
- 统计数据（请求次数、成功率等）

**使用场景**：
- 生产环境池（高权重 Keys）
- 开发测试池（测试 Keys）
- 第三方客户池（限制模型和配额）

### 负载均衡

在一个池中添加多个 Gemini Key，系统会根据**权重**自动负载均衡：

```
Key 1: 权重 3  → 60% 流量
Key 2: 权重 1  → 20% 流量
Key 3: 权重 1  → 20% 流量
```

### 模型白名单

在创建池时勾选**允许的模型**，未勾选的模型无法通过该池调用：

```json
{
  "allowedModels": [
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ]
}
```

客户端调用 `gemini-2.5-pro-latest` 时会返回 403 错误。

---

## 📚 完整文档

- **系统架构**：[README.md](./README.md)
- **动态模型**：[DYNAMIC_MODELS.md](./DYNAMIC_MODELS.md)
- **部署说明**：[DEPLOY.md](./DEPLOY.md)
- **项目结构**：[INDEX.md](./INDEX.md)

---

## 💡 提示

1. **定期备份**：定期导出池配置（通过 `GET /api/pools` API）
2. **监控使用**：在管理界面查看每个池的统计数据
3. **轮换密钥**：定期重新生成 Auth Key（在池详情页点击"重新生成"）
4. **日志查看**：在 Cloudflare Workers 控制台查看实时日志
5. **免费额度**：Cloudflare Workers 免费版每天 100,000 次请求

---

## 🎉 部署完成！

现在你已经成功部署了一个：

✅ OpenAI 兼容的 Gemini API 代理
✅ 多池隔离管理系统
✅ 负载均衡和权重控制
✅ 完整的 Web 管理界面
✅ 动态模型列表更新

**开始享受你的 API 吧！** 🚀
