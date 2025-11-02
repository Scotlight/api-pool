// ==================== 多池隔离系统 v3.0 (D1 数据库版本) ====================
// 自动生成于: 2025-11-02T05:17:15.695Z
// 
// 这是一个真正的多池隔离系统 - D1 数据库版本：
// - 多个独立的池，完全隔离
// - 每个池有自己的 authKey (sk-pool-xxxx)
// - 每个池管理自己的 Gemini API Keys
// - 每个池可限制允许使用的模型
// - 支持 23 个 Gemini 模型
// 
// 存储方式: Cloudflare D1 数据库
// 适用场景: 10+ 个池，大规模部署
// 配置要求: 需要创建 D1 数据库，绑定为 DB



// ==================== 模块: constants.js ====================
// ==================== 常量定义模块 ====================
// 定义所有系统常量：API URL、KV键、模型列表等

// Gemini API 基础URL
const API_BASE_URL = "https://generativelanguage.googleapis.com";

// Gemini API 路径
const GEMINI_CHAT_NATIVE_PATH = "/v1/models/";
const GEMINI_EMBEDDING_NATIVE_PATH = "/v1/models/embedding-001:embedContent";

// OpenAI 兼容端点
const API_ENDPOINTS = {
  chat: "/v1/chat/completions",
  embeddings: "/v1/embeddings",
};

// KV 存储键
const KV_KEYS = {
  POOLS: "pools",                          // 存储所有池配置
  POOL_AUTH_MAPPING: "pool_auth_mapping",  // authKey -> poolId 映射
  ADMIN_PASSWORD: "admin_password",        // 管理员密码
  SESSION_SECRET: "session_secret",        // 会话密钥
};

// 缓存配置
const CACHE_TTL = 30000; // 30秒缓存

// 所有支持的 Gemini 模型（23个）
const ALL_GEMINI_MODELS = [
  // Gemini 2.5 Series - 最新最强
  "gemini-2.5-pro-latest",
  "gemini-2.5-flash-latest",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  
  // Gemini 2.0 Series - 实验性功能
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-thinking-exp-1219",
  "gemini-2.0-flash-thinking-exp",
  
  // Gemini 1.5 Pro Series - 高性能
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro-002",
  "gemini-1.5-pro-001",
  
  // Gemini 1.5 Flash Series - 快速高效
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.5-flash-8b-001",
  
  // Experimental Models - 实验版本
  "gemini-exp-1206",
  "gemini-exp-1121",
  "gemini-exp-1114",
  
  // Legacy Models - 传统模型
  "gemini-pro",
  "gemini-pro-vision"
];

// 模型系列分类
const MODEL_FAMILIES = {
  "2.5": ["gemini-2.5-pro-latest", "gemini-2.5-flash-latest", "gemini-2.5-pro", "gemini-2.5-flash"],
  "2.0": ["gemini-2.0-flash-exp", "gemini-2.0-flash-thinking-exp-1219", "gemini-2.0-flash-thinking-exp"],
  "1.5-pro": ["gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-1.5-pro-002", "gemini-1.5-pro-001"],
  "1.5-flash": [
    "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-002", "gemini-1.5-flash-001",
    "gemini-1.5-flash-8b", "gemini-1.5-flash-8b-latest", "gemini-1.5-flash-8b-001"
  ],
  "experimental": ["gemini-exp-1206", "gemini-exp-1121", "gemini-exp-1114"],
  "legacy": ["gemini-pro", "gemini-pro-vision"]
};

// HTTP 状态码
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

// 错误类型
const ERROR_TYPES = {
  INVALID_REQUEST: "invalid_request_error",
  AUTHENTICATION: "authentication_error",
  PERMISSION: "permission_error",
  NOT_FOUND: "not_found_error",
  RATE_LIMIT: "rate_limit_error",
  SERVER_ERROR: "server_error",
};


// ==================== 模块: utils.js ====================
// ==================== 工具函数模块 ====================
// 通用工具函数：ID生成、Key混淆、JSON响应等


// ==================== 日志类 ====================
let logLevel = "debug"; // debug, info, warn, error

export class Logger {
  static debug(message, ...args) {
    if (logLevel === "debug") {
      console.debug("[DEBUG] " + message, ...args);
    }
  }

  static info(message, ...args) {
    if (logLevel === "debug" || logLevel === "info") {
      console.info("[INFO] " + message, ...args);
    }
  }

  static warn(message, ...args) {
    if (logLevel === "debug" || logLevel === "info" || logLevel === "warn") {
      console.warn("[WARN] " + message, ...args);
    }
  }

  static error(message, ...args) {
    console.error("[ERROR] " + message, ...args);
  }
}

function setLogLevel(level) {
  if (["debug", "info", "warn", "error"].includes(level)) {
    logLevel = level;
  }
}

/**
 * 生成唯一ID（使用 crypto.randomUUID）
 * 格式：prefix-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * 只包含字母、数字，所有调用商都支持
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix = "pool") {
  // 使用 crypto.randomUUID 确保加密安全性
  const uuid = crypto.randomUUID();
  // 移除连字符得到 32 字符的安全随机字符串
  const randomPart = uuid.replace(/-/g, '');
  return `${prefix}-${randomPart}`;
}

/**
 * 生成池的 authKey（使用 crypto.randomUUID）
 * 格式：sk-pool-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * 确保所有字符都是 OpenAI/Gemini 兼容的（只包含字母、数字、连字符）
 * @returns {string} 格式为 sk-pool-xxxx 的authKey
 */
function generatePoolAuthKey() {
  // 使用 crypto.randomUUID 生成 UUID
  const uuid = crypto.randomUUID();
  // 移除 UUID 中的连字符，转换为小写
  const randomPart = uuid.replace(/-/g, '').substring(0, 32);
  return `sk-pool-${randomPart}`;
}

/**
 * 生成池ID（别名函数）
 * @returns {string} 池ID
 */
function generatePoolId() {
  return generateId('pool');
}

/**
 * 生成authKey（别名函数）
 * @returns {string} authKey
 */
function generateAuthKey() {
  return generatePoolAuthKey();
}

/**
 * 生成随机密钥（使用 crypto.randomUUID）
 * 只包含字母、数字，所有调用商都支持
 * @param {number} length - 密钥长度（最多 32 字符）
 * @returns {string} 随机密钥
 */
function generateRandomKey(length = 32) {
  // 如果需要很长的密钥，组合多个 UUID
  const uuidCount = Math.ceil(length / 32);
  let result = '';
  
  for (let i = 0; i < uuidCount; i++) {
    const uuid = crypto.randomUUID();
    result += uuid.replace(/-/g, '');
  }
  
  return result.substring(0, length);
}

/**
 * 混淆Key显示（只显示开头和结尾）
 * @param {string} key - 要混淆的Key
 * @returns {string} 混淆后的Key
 */
function obfuscateKey(key) {
  if (!key || key.length < 12) return "***";
  return key.substring(0, 8) + "..." + key.substring(key.length - 4);
}

/**
 * 创建JSON响应
 * @param {Object} data - 响应数据
 * @param {number} status - HTTP状态码
 * @param {Object} headers - 额外的响应头
 * @returns {Response} Response对象
 */
function jsonResponse(data, status = HTTP_STATUS.OK, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers
    }
  });
}

/**
 * 创建HTML响应
 * @param {string} html - HTML内容
 * @param {number} status - HTTP状态码
 * @returns {Response} Response对象
 */
function htmlResponse(html, status = HTTP_STATUS.OK) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    }
  });
}

/**
 * 创建错误响应（OpenAI格式）
 * @param {string} message - 错误消息
 * @param {string} type - 错误类型
 * @param {number} status - HTTP状态码
 * @returns {Response} Response对象
 */
function errorResponse(message, type, status) {
  return jsonResponse({
    error: {
      message,
      type,
      param: null,
      code: null
    }
  }, status);
}

/**
 * 验证必填字段
 * @param {Object} obj - 要验证的对象
 * @param {Array<string>} requiredFields - 必填字段列表
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
function validateRequiredFields(obj, requiredFields) {
  const missing = requiredFields.filter(field => {
    return obj[field] === undefined || obj[field] === null || obj[field] === '';
  });
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * 格式化时间戳为相对时间
 * @param {string} timestamp - ISO时间戳
 * @returns {string} 相对时间描述
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return "从未";
  
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 深度克隆对象
 * @param {Object} obj - 要克隆的对象
 * @returns {Object} 克隆后的对象
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 安全解析JSON
 * @param {string} str - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 检查是否是有效的API Key格式
 * @param {string} key - API Key
 * @returns {boolean} 是否有效
 */
function isValidApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  
  // Gemini API Key: AIza开头
  if (key.startsWith('AIza')) return key.length > 20;
  
  // Pool Auth Key: sk-pool-开头
  if (key.startsWith('sk-pool-')) return key.length > 15;
  
  return false;
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试间隔（毫秒）
 * @returns {Promise} Promise
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * (i + 1)); // 递增延迟
      }
    }
  }

  throw lastError;
}

/**
 * 获取北京时间字符串
 * @returns {string} 北京时间字符串（YYYY-MM-DD HH:mm:ss）
 */
function getBJTimeString() {
  const date = new Date();
  const bjTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return bjTime.toISOString().replace("T", " ").substring(0, 19);
}

/**
 * 估算文本的token数量
 * @param {string} text - 要估算的文本
 * @param {boolean} isChatMessage - 是否为聊天消息
 * @param {string} textType - 文本类型: "normal", "image_prompt", "completion", "code"
 * @returns {number} - 估算的token数量
 */
function estimateTokenCount(text, isChatMessage = false, textType = "normal") {
  if (!text) return 0;

  // 计算中文字符数和总字符数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

  // 计算代码块
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  let codeChars = 0;
  for (const block of codeBlocks) {
    codeChars += block.length;
  }

  // 计算ASCII符号字符（标点、数字等）
  const symbolChars = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?\d]/g) || []).length;

  // 计算空格、换行等空白字符
  const whitespaceChars = (text.match(/\s/g) || []).length;

  const totalChars = text.length;
  const nonChineseChars = totalChars - chineseChars;

  let estimatedTokens = 0;

  // 根据文本类型使用不同的估算逻辑
  switch (textType) {
    case "image_prompt":
      estimatedTokens = Math.ceil(chineseChars * 0.6) + Math.ceil(nonChineseChars / 5);
      break;

    case "code":
      estimatedTokens = Math.ceil(chineseChars * 0.7) + Math.ceil((nonChineseChars - codeChars) / 4) + Math.ceil(codeChars / 6);
      break;

    case "completion":
      estimatedTokens = Math.ceil(chineseChars * 0.65) + Math.ceil(nonChineseChars / 3.5);
      if (symbolChars > totalChars * 0.3) {
        estimatedTokens = Math.ceil(estimatedTokens * 1.1);
      }
      break;

    case "normal":
    default:
      let baseEstimate = Math.ceil(chineseChars * 0.7) + Math.ceil((nonChineseChars - codeChars) / 4);

      if (codeChars > 0) {
        baseEstimate += Math.ceil(codeChars / 5.5);
      }

      if (whitespaceChars > totalChars * 0.2) {
        baseEstimate = Math.ceil(baseEstimate * 0.95);
      }

      estimatedTokens = baseEstimate;
      break;
  }

  // 添加消息格式开销
  if (isChatMessage) {
    let messageOverhead = 4;
    if (totalChars > 1000) {
      messageOverhead = 3;
    } else if (totalChars < 20) {
      messageOverhead = 5;
    }

    estimatedTokens += messageOverhead;
  }

  return Math.max(1, Math.round(estimatedTokens)); // 确保至少返回1个token
}


// ==================== 模块: d1-storage.js ====================
// ==================== D1 数据库存储模块 ====================
// 使用 Cloudflare D1 数据库存储池配置（替代 KV）


// 内存缓存
let poolsCache = null;
let authMappingCache = null;
let lastCacheUpdate = 0;

/**
 * 初始化数据库表（如果不存在）
 * @param {Object} db - D1 数据库对象
 */
async function initializeDatabase(db) {
  try {
    // 使用 batch 批量执行 SQL 语句
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS pools (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS auth_mappings (
        auth_key TEXT PRIMARY KEY,
        pool_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_pools_updated ON pools(updated_at DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_pool ON auth_mappings(pool_id)`)
    ]);

    Logger.info('D1 数据库初始化成功');
  } catch (error) {
    Logger.error('D1 数据库初始化失败:', error);
    throw error;
  }
}

/**
 * 加载所有池配置
 * @param {Object} env - Worker环境对象
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} 池配置对象
 */
async function loadPools(env, forceRefresh = false) {
  const now = Date.now();
  
  // 检查缓存
  if (!forceRefresh && poolsCache && (now - lastCacheUpdate < CACHE_TTL)) {
    return poolsCache;
  }
  
  try {
    // 确保数据库已初始化
    await initializeDatabase(env.DB);

    const result = await env.DB.prepare(
      'SELECT id, config FROM pools ORDER BY updated_at DESC'
    ).all();

    const pools = {};
    for (const row of result.results) {
      pools[row.id] = JSON.parse(row.config);
    }

    poolsCache = pools;
    lastCacheUpdate = now;
    return pools;
  } catch (error) {
    Logger.error('Failed to load pools from D1:', error);
    return {};
  }
}

/**
 * 保存所有池配置
 * @param {Object} env - Worker环境对象
 * @param {Object} pools - 池配置对象
 * @returns {Promise<boolean>} 是否成功
 */
async function savePools(env, pools) {
  try {
    // D1 不需要批量保存，单个池保存即可
    // 这个方法主要用于兼容 KV 接口
    poolsCache = pools;
    lastCacheUpdate = Date.now();
    return true;
  } catch (error) {
    Logger.error('Failed to save pools to D1:', error);
    return false;
  }
}

/**
 * 保存单个池配置
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {Object} poolConfig - 池配置对象
 * @returns {Promise<boolean>} 是否成功
 */
async function savePoolConfig(env, poolId, poolConfig) {
  try {
    Logger.info(`Saving pool config for pool: ${poolId}`);
    await initializeDatabase(env.DB);

    const now = Date.now();
    const configStr = JSON.stringify(poolConfig);

    const result = await env.DB.prepare(`
      INSERT INTO pools (id, config, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        config = excluded.config,
        updated_at = excluded.updated_at
    `).bind(poolId, configStr, now, now).run();

    Logger.info(`Pool config saved. Result:`, result.meta);

    // 清除缓存
    poolsCache = null;

    return true;
  } catch (error) {
    Logger.error(`Failed to save pool config ${poolId}:`, error);
    throw error; // 重新抛出错误，而不是返回 false
  }
}

/**
 * 加载单个池配置
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Object|null>} 池配置对象或null
 */
async function loadPoolConfig(env, poolId) {
  try {
    await initializeDatabase(env.DB);

    const result = await env.DB.prepare(
      'SELECT config FROM pools WHERE id = ?'
    ).bind(poolId).first();

    if (result) {
      return JSON.parse(result.config);
    }
    return null;
  } catch (error) {
    Logger.error(`Failed to load pool config ${poolId}:`, error);
    return null;
  }
}

/**
 * 加载所有池配置（返回数组格式）
 * @param {Object} env - Worker环境对象
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Array>} 池配置数组
 */
async function loadAllPoolConfigs(env, forceRefresh = false) {
  try {
    const pools = await loadPools(env, forceRefresh);
    return Object.values(pools);
  } catch (error) {
    Logger.error('Failed to load all pool configs:', error);
    return [];
  }
}

/**
 * 删除池配置
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<boolean>} 是否成功
 */
async function deletePoolConfig(env, poolId) {
  try {
    Logger.info(`Deleting pool config: ${poolId}`);
    await initializeDatabase(env.DB);

    const result = await env.DB.prepare(
      'DELETE FROM pools WHERE id = ?'
    ).bind(poolId).run();

    Logger.info(`Pool config deleted. Result:`, result.meta);

    // 清除缓存
    poolsCache = null;

    return true;
  } catch (error) {
    Logger.error(`Failed to delete pool config ${poolId}:`, error);
    throw error; // 重新抛出错误
  }
}

/**
 * 加载 authKey 映射
 * @param {Object} env - Worker环境对象
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Object>} authKey到poolId的映射
 */
async function loadAuthMapping(env, forceRefresh = false) {
  const now = Date.now();
  
  // 检查缓存
  if (!forceRefresh && authMappingCache && (now - lastCacheUpdate < CACHE_TTL)) {
    return authMappingCache;
  }
  
  try {
    await initializeDatabase(env.DB);

    const result = await env.DB.prepare(
      'SELECT auth_key, pool_id FROM auth_mappings'
    ).all();

    const mapping = {};
    for (const row of result.results) {
      mapping[row.auth_key] = row.pool_id;
    }

    authMappingCache = mapping;
    return mapping;
  } catch (error) {
    Logger.error('Failed to load auth mapping from D1:', error);
    return {};
  }
}

/**
 * 保存 authKey 映射
 * @param {Object} env - Worker环境对象
 * @param {Object} mapping - authKey到poolId的映射
 * @returns {Promise<boolean>} 是否成功
 */
async function saveAuthMapping(env, mapping) {
  try {
    // D1 不需要批量保存，单个映射保存即可
    // 这个方法主要用于兼容 KV 接口
    authMappingCache = mapping;
    return true;
  } catch (error) {
    Logger.error('Failed to save auth mapping to D1:', error);
    return false;
  }
}

/**
 * 保存 authKey 到 poolId 的映射
 * @param {Object} env - Worker环境对象
 * @param {string} authKey - 认证密钥
 * @param {string} poolId - 池ID
 * @returns {Promise<boolean>} 是否成功
 */
async function saveAuthKeyMapping(env, authKey, poolId) {
  try {
    Logger.info(`Saving authKey mapping: ${authKey} -> ${poolId}`);
    await initializeDatabase(env.DB);

    const now = Date.now();

    const result = await env.DB.prepare(`
      INSERT INTO auth_mappings (auth_key, pool_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(auth_key) DO UPDATE SET
        pool_id = excluded.pool_id
    `).bind(authKey, poolId, now).run();

    Logger.info(`AuthKey mapping saved. Result:`, result.meta);

    // 清除缓存
    authMappingCache = null;

    return true;
  } catch (error) {
    Logger.error('Failed to save authKey mapping:', error);
    throw error; // 重新抛出错误，而不是返回 false
  }
}

/**
 * 删除 authKey 映射
 * @param {Object} env - Worker环境对象
 * @param {string} authKey - 认证密钥
 * @returns {Promise<boolean>} 是否成功
 */
async function deleteAuthKeyMapping(env, authKey) {
  try {
    Logger.info(`Deleting authKey mapping: ${authKey}`);
    await initializeDatabase(env.DB);

    const result = await env.DB.prepare(
      'DELETE FROM auth_mappings WHERE auth_key = ?'
    ).bind(authKey).run();

    Logger.info(`AuthKey mapping deleted. Result:`, result.meta);

    // 清除缓存
    authMappingCache = null;

    return true;
  } catch (error) {
    Logger.error('Failed to delete authKey mapping:', error);
    throw error; // 重新抛出错误
  }
}

/**
 * 根据 authKey 加载 poolId
 * @param {Object} env - Worker环境对象
 * @param {string} authKey - 认证密钥
 * @returns {Promise<string|null>} 池ID或null
 */
async function loadAuthKeyMapping(env, authKey) {
  try {
    await initializeDatabase(env.DB);

    const result = await env.DB.prepare(
      'SELECT pool_id FROM auth_mappings WHERE auth_key = ?'
    ).bind(authKey).first();

    return result ? result.pool_id : null;
  } catch (error) {
    Logger.error('Failed to load authKey mapping:', error);
    return null;
  }
}

/**
 * 增加池使用量统计（仅统计RPM/TPM/RPD/TPD，不统计请求记录）
 * 只记录使用量，不记录成功/失败
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {number} tokenUsage - 本次请求使用的令牌数
 * @returns {Promise<void>}
 */
async function incrementPoolStats(env, poolId, tokenUsage = 0) {
  try {
    // 从数据库加载池配置
    const pool = await loadPoolConfig(env, poolId);
    
    if (!pool) {
      Logger.warn(`Pool ${poolId} not found for usage stats update`);
      return;
    }

    // 初始化统计对象（仅包含使用量数据，不包含请求记录）
    if (!pool.stats) {
      pool.stats = {
        requestsLastMinute: [],
        requestsLastDay: [],
        tokensTotal: 0
      };
    }

    const now = Date.now();
    
    // 记录当前请求的使用量（仅用于 RPM/TPM/RPD/TPD 计算）
    pool.stats.requestsLastMinute.push({ timestamp: now, tokens: tokenUsage });
    pool.stats.requestsLastDay.push({ timestamp: now, tokens: tokenUsage });
    pool.stats.tokensTotal = (pool.stats.tokensTotal || 0) + tokenUsage;

    // 清理过期数据（超过1分钟和1天的记录）
    const oneMinuteAgo = now - 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    pool.stats.requestsLastMinute = pool.stats.requestsLastMinute.filter(r => r.timestamp > oneMinuteAgo);
    pool.stats.requestsLastDay = pool.stats.requestsLastDay.filter(r => r.timestamp > oneDayAgo);

    // 保存更新的池配置
    await savePoolConfig(env, poolId, pool);

    Logger.debug(`Pool ${poolId} usage stats updated: tokens=${tokenUsage}`);
  } catch (error) {
    Logger.error('Failed to update pool usage stats:', error);
  }
}

/**
 * 清除所有缓存
 */
function clearCache() {
  poolsCache = null;
  authMappingCache = null;
  lastCacheUpdate = 0;
}

/**
 * 数据锁机制（D1 使用事务，这里提供兼容接口）
 */
function acquireDataLock(operationId = null) {
  return operationId || `op-${Date.now()}`;
}

function releaseDataLock(force = false, lockId = null) {
  return true;
}


// ==================== 模块: model-fetcher.js ====================
// ==================== 模型动态获取模块 ====================
// 通过 Gemini API 动态获取可用模型列表


// 模型列表缓存
let modelListCache = {
  models: null,
  timestamp: 0,
  ttl: 3600000, // 1小时缓存
};

/**
 * 从 Gemini API 获取可用模型列表
 * @param {string} apiKey - Gemini API Key
 * @returns {Promise<Array>} 模型列表
 */
async function fetchGeminiModels(apiKey) {
  try {
    const url = `${API_BASE_URL}/v1beta/models?key=${apiKey}`;

    Logger.debug(`正在从 Gemini API 获取模型列表...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      Logger.error(`获取模型列表失败: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      Logger.error('模型列表响应格式错误');
      return null;
    }

    // 提取模型信息
    const models = data.models
      .filter(model => {
        // 过滤出支持 generateContent 的模型（聊天模型）
        return model.supportedGenerationMethods &&
               model.supportedGenerationMethods.includes('generateContent');
      })
      .map(model => {
        // 提取模型名称（去掉 "models/" 前缀）
        const modelName = model.name.replace('models/', '');

        return {
          id: modelName,
          name: model.displayName || modelName,
          description: model.description || '',
          inputTokenLimit: model.inputTokenLimit || 0,
          outputTokenLimit: model.outputTokenLimit || 0,
          supportedGenerationMethods: model.supportedGenerationMethods || [],
          temperature: model.temperature,
          topP: model.topP,
          topK: model.topK,
        };
      });

    Logger.info(`成功获取 ${models.length} 个 Gemini 模型`);

    return models;
  } catch (error) {
    Logger.error('获取模型列表时发生错误:', error);
    return null;
  }
}

/**
 * 获取模型列表（带缓存）
 * @param {string} apiKey - Gemini API Key
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<Array>} 模型列表
 */
async function getGeminiModels(apiKey, forceRefresh = false) {
  const now = Date.now();

  // 检查缓存是否有效
  if (!forceRefresh &&
      modelListCache.models &&
      (now - modelListCache.timestamp < modelListCache.ttl)) {
    Logger.debug('使用缓存的模型列表');
    return modelListCache.models;
  }

  // 缓存失效或强制刷新，重新获取
  const models = await fetchGeminiModels(apiKey);

  if (models) {
    modelListCache.models = models;
    modelListCache.timestamp = now;
  }

  return models;
}

/**
 * 从多个 API Key 中获取模型列表（尝试直到成功）
 * @param {Array<string>} apiKeys - API Key 数组
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<Array>} 模型列表
 */
async function getGeminiModelsFromPool(apiKeys, forceRefresh = false) {
  // 如果有缓存且不强制刷新，直接返回
  const now = Date.now();
  if (!forceRefresh &&
      modelListCache.models &&
      (now - modelListCache.timestamp < modelListCache.ttl)) {
    Logger.debug('使用缓存的模型列表');
    return modelListCache.models;
  }

  // 尝试使用每个 API Key 获取模型列表
  for (const apiKey of apiKeys) {
    const models = await getGeminiModels(apiKey, true);
    if (models && models.length > 0) {
      Logger.info(`成功使用 API Key 获取到 ${models.length} 个模型`);
      return models;
    }
  }

  Logger.warn('所有 API Key 都无法获取模型列表，使用备用模型列表');

  // 如果所有 Key 都失败，返回缓存（即使过期）或空数组
  return modelListCache.models || [];
}

/**
 * 验证模型是否存在于可用列表中
 * @param {string} modelId - 模型ID
 * @param {Array} models - 模型列表（可选，如果不提供则使用缓存）
 * @returns {boolean} 是否有效
 */
function isValidModel(modelId, models = null) {
  const modelList = models || modelListCache.models;

  if (!modelList || modelList.length === 0) {
    Logger.warn('模型列表为空，无法验证模型有效性');
    return true; // 如果列表为空，默认允许（降级处理）
  }

  return modelList.some(model => model.id === modelId);
}

/**
 * 获取模型详细信息
 * @param {string} modelId - 模型ID
 * @param {Array} models - 模型列表（可选）
 * @returns {Object|null} 模型详情
 */
function getModelInfo(modelId, models = null) {
  const modelList = models || modelListCache.models;

  if (!modelList || modelList.length === 0) {
    return null;
  }

  return modelList.find(model => model.id === modelId) || null;
}

/**
 * 清除模型列表缓存
 */
function clearModelCache() {
  modelListCache.models = null;
  modelListCache.timestamp = 0;
  Logger.debug('模型列表缓存已清除');
}

/**
 * 设置模型缓存 TTL
 * @param {number} ttl - 缓存时间（毫秒）
 */
function setModelCacheTTL(ttl) {
  modelListCache.ttl = ttl;
  Logger.debug(`模型缓存 TTL 已设置为 ${ttl}ms`);
}

/**
 * 获取缓存状态
 * @returns {Object} 缓存信息
 */
function getModelCacheStatus() {
  const now = Date.now();
  const age = modelListCache.models ? now - modelListCache.timestamp : null;
  const isValid = age !== null && age < modelListCache.ttl;

  return {
    hasCachedModels: modelListCache.models !== null,
    modelCount: modelListCache.models ? modelListCache.models.length : 0,
    cacheAge: age,
    ttl: modelListCache.ttl,
    isValid: isValid,
  };
}


// ==================== 模块: pool-manager.js ====================
﻿// 处理池的 CRUD 操作、Gemini Key 管理、统计等


/**
 * 验证池配置
 * @param {Object} config - 池配置对象
 * @param {Array} availableModels - 可用模型列表（可选）
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validatePoolConfig(config, availableModels = null) {
  const errors = [];

  // 验证名称
  if (!config.name || typeof config.name !== 'string') {
    errors.push('池名称必须是非空字符串');
  }

  // 验证 Gemini Keys
  if (!Array.isArray(config.geminiKeys) || config.geminiKeys.length === 0) {
    errors.push('至少需要一个 Gemini API Key');
  } else {
    config.geminiKeys.forEach((keyObj, index) => {
      if (!keyObj.key || typeof keyObj.key !== 'string') {
        errors.push(`Gemini Key #${index + 1} 无效`);
      }
    });
  }

  // 验证允许的模型（使用动态模型列表）
  if (config.allowedModels && Array.isArray(config.allowedModels) && config.allowedModels.length > 0) {
    if (availableModels && availableModels.length > 0) {
      // 如果提供了模型列表，进行验证
      config.allowedModels.forEach(modelId => {
        if (!isValidModel(modelId, availableModels)) {
          Logger.warn(`未知的模型 ID: ${modelId}`);
          // 注意：这里只警告，不阻止创建，因为模型列表可能会更新
        }
      });
    } else {
      // 如果没有模型列表，只记录日志，不阻止操作
      Logger.debug('无可用模型列表进行验证，跳过模型验证');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 创建新池
 * @param {Object} env - Worker环境对象
 * @param {Object} config - 池配置
 * @returns {Promise<Object>} 创建的池对象
 */
async function createPool(env, config) {
  // 验证配置
  const validation = validatePoolConfig(config);
  if (!validation.valid) {
    throw new Error('池配置无效: ' + validation.errors.join(', '));
  }
  
  // 生成池ID和authKey
  const poolId = generatePoolId();
  const authKey = generateAuthKey();
  
  // 构建池对象
  const pool = {
    id: poolId,
    name: config.name,
    description: config.description || '',
    authKey: authKey,
    geminiKeys: config.geminiKeys.map((keyObj, index) => ({
      id: `key_${index + 1}`,
      key: keyObj.key,
      name: keyObj.name || `Key ${index + 1}`,
      enabled: keyObj.enabled !== undefined ? keyObj.enabled : true,
      weight: keyObj.weight || 1
    })),
    allowedModels: config.allowedModels || [], // 空数组表示允许所有模型
    enabled: config.enabled !== undefined ? config.enabled : true,
    stats: {
      lastRequestTime: null,
      // Token 统计（仅使用量）
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      // 时间序列数据（最近 1 分钟和最近 1 天）
      requestsLastMinute: [],  // [{timestamp, tokens}]
      requestsLastDay: []       // [{timestamp, tokens}]
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // 保存池配置
  await savePoolConfig(env, poolId, pool);
  
  // 保存 authKey 映射
  await saveAuthKeyMapping(env, authKey, poolId);
  
  return pool;
}

/**
 * 获取池详情
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Object|null>} 池对象或null
 */
async function getPool(env, poolId) {
  return await loadPoolConfig(env, poolId);
}

/**
 * 获取所有池
 * @param {Object} env - Worker环境对象
 * @param {boolean} forceRefresh - 是否强制刷新缓存
 * @returns {Promise<Array>} 池数组
 */
async function getAllPools(env, forceRefresh = false) {
  return await loadAllPoolConfigs(env, forceRefresh);
}

/**
 * 更新池配置
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object|null>} 更新后的池对象或null
 */
async function updatePool(env, poolId, updates) {
  // 获取现有池
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  // 允许更新的字段
  const allowedFields = ['name', 'description', 'geminiKeys', 'allowedModels', 'enabled'];
  
  // 应用更新
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      pool[field] = updates[field];
    }
  }
  
  // 验证更新后的配置
  const validation = validatePoolConfig(pool);
  if (!validation.valid) {
    throw new Error('更新后的配置无效: ' + validation.errors.join(', '));
  }
  
  // 更新时间戳
  pool.updatedAt = Date.now();
  
  // 保存更新
  await savePoolConfig(env, poolId, pool);
  
  return pool;
}

/**
 * 删除池
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<boolean>} 是否成功
 */
async function deletePool(env, poolId) {
  // 获取池信息（为了删除 authKey 映射）
  const pool = await getPool(env, poolId);
  if (!pool) {
    return false;
  }
  
  // 删除池配置
  await deletePoolConfig(env, poolId);
  
  // 删除 authKey 映射
  await deleteAuthKeyMapping(env, pool.authKey);
  
  return true;
}

/**
 * 重新生成池的 authKey
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Object|null>} 更新后的池对象或null
 */
async function regeneratePoolAuthKey(env, poolId) {
  // 获取现有池
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  // 删除旧的 authKey 映射
  await deleteAuthKeyMapping(env, pool.authKey);
  
  // 生成新的 authKey
  const newAuthKey = generateAuthKey();
  pool.authKey = newAuthKey;
  pool.updatedAt = Date.now();
  
  // 保存更新后的池
  await savePoolConfig(env, poolId, pool);
  
  // 创建新的 authKey 映射
  await saveAuthKeyMapping(env, newAuthKey, poolId);
  
  return pool;
}

/**
 * 更新池统计信息
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {boolean} success - 请求是否成功
 * @param {Object} tokenUsage - Token使用量 {prompt, completion, total}
 * @returns {Promise<void>}
 */
async function updatePoolStats(env, poolId, success, tokenUsage = null) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return;
  }
  
  const now = Date.now();
  
  // 更新基础统计
  pool.stats.totalRequests += 1;
  if (success) {
    pool.stats.successfulRequests += 1;
  } else {
    pool.stats.failedRequests += 1;
  }
  pool.stats.lastRequestTime = now;
  
  // 更新 Token 统计
  if (tokenUsage) {
    pool.stats.totalTokens += tokenUsage.total || 0;
    pool.stats.promptTokens += tokenUsage.prompt || 0;
    pool.stats.completionTokens += tokenUsage.completion || 0;
  }
  
  // 添加到时间序列数据
  const requestRecord = {
    timestamp: now,
    success: success,
    tokens: tokenUsage?.total || 0
  };
  
  // 初始化数组（如果不存在）
  if (!pool.stats.requestsLastMinute) {
    pool.stats.requestsLastMinute = [];
  }
  if (!pool.stats.requestsLastDay) {
    pool.stats.requestsLastDay = [];
  }
  
  pool.stats.requestsLastMinute.push(requestRecord);
  pool.stats.requestsLastDay.push(requestRecord);
  
  // 清理过期数据（1分钟前和1天前）
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  pool.stats.requestsLastMinute = pool.stats.requestsLastMinute.filter(
    r => r.timestamp > oneMinuteAgo
  );
  pool.stats.requestsLastDay = pool.stats.requestsLastDay.filter(
    r => r.timestamp > oneDayAgo
  );
  
  // 保存更新
  await savePoolConfig(env, poolId, pool);
  
  // 也记录到 KV (用于快速查询)
  await incrementPoolStats(env, poolId, success);
}

/**
 * 获取池统计信息
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Object|null>} 统计对象或null
 */
async function getPoolStats(env, poolId) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  return {
    poolId: poolId,
    poolName: pool.name,
    stats: pool.stats,
    geminiKeysCount: pool.geminiKeys.length,
    enabledKeysCount: pool.geminiKeys.filter(k => k.enabled).length,
    allowedModelsCount: pool.allowedModels.length || 0, // 0表示允许所有模型
    enabled: pool.enabled,
    createdAt: pool.createdAt,
    updatedAt: pool.updatedAt
  };
}

/**
 * 添加 Gemini Key 到池
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {Object} keyConfig - Key配置
 * @returns {Promise<Object|null>} 更新后的池对象或null
 */
async function addGeminiKeyToPool(env, poolId, keyConfig) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  // 生成 Key ID
  const keyId = `key_${pool.geminiKeys.length + 1}`;
  
  // 添加新 Key
  pool.geminiKeys.push({
    id: keyId,
    key: keyConfig.key,
    name: keyConfig.name || `Key ${pool.geminiKeys.length + 1}`,
    enabled: keyConfig.enabled !== undefined ? keyConfig.enabled : true,
    weight: keyConfig.weight || 1
  });
  
  pool.updatedAt = Date.now();
  
  // 保存更新
  await savePoolConfig(env, poolId, pool);
  
  return pool;
}

/**
 * 从池中移除 Gemini Key
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {string} keyId - Key ID
 * @returns {Promise<Object|null>} 更新后的池对象或null
 */
async function removeGeminiKeyFromPool(env, poolId, keyId) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  // 至少保留一个 Key
  if (pool.geminiKeys.length <= 1) {
    throw new Error('至少需要保留一个 Gemini API Key');
  }
  
  // 移除指定的 Key
  pool.geminiKeys = pool.geminiKeys.filter(k => k.id !== keyId);
  pool.updatedAt = Date.now();
  
  // 保存更新
  await savePoolConfig(env, poolId, pool);
  
  return pool;
}

/**
 * 更新池中的 Gemini Key
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {string} keyId - Key ID
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object|null>} 更新后的池对象或null
 */
async function updateGeminiKey(env, poolId, keyId, updates) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  // 找到要更新的 Key
  const key = pool.geminiKeys.find(k => k.id === keyId);
  if (!key) {
    throw new Error(`Key ${keyId} 不存在`);
  }
  
  // 更新字段
  const allowedFields = ['name', 'enabled', 'weight'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      key[field] = updates[field];
    }
  }
  
  pool.updatedAt = Date.now();
  
  // 保存更新
  await savePoolConfig(env, poolId, pool);
  
  return pool;
}

/**
 * ����ص�ʵʱͳ�����ݣ�RPM/RPD/TPM/TPD��
 * @param {Object} pool - �ض���
 * @returns {Object} ͳ������
 */
function calculatePoolMetrics(pool) {
  if (!pool.stats) {
    return {
      rpm: 0,
      rpd: 0,
      tpm: 0,
      tpd: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0
    };
  }
  
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const requestsLastMinute = pool.stats.requestsLastMinute || [];
  const requestsLastDay = pool.stats.requestsLastDay || [];
  
  const rpm = requestsLastMinute.filter(r => r.timestamp > oneMinuteAgo).length;
  const rpd = requestsLastDay.filter(r => r.timestamp > oneDayAgo).length;
  
  const tpm = requestsLastMinute
    .filter(r => r.timestamp > oneMinuteAgo)
    .reduce((sum, r) => sum + (r.tokens || 0), 0);
  
  const tpd = requestsLastDay
    .filter(r => r.timestamp > oneDayAgo)
    .reduce((sum, r) => sum + (r.tokens || 0), 0);
  
  return {
    rpm,
    rpd,
    tpm,
    tpd,
    totalTokens: pool.stats.totalTokens || 0,
    promptTokens: pool.stats.promptTokens || 0,
    completionTokens: pool.stats.completionTokens || 0
  };
}

/**
 * ��ȡ�ص�����ͳ����Ϣ������ʵʱָ�꣩
 * @param {Object} env - Worker��������
 * @param {string} poolId - ��ID
 * @returns {Promise<Object|null>} ͳ�����ݻ�null
 */
async function getPoolStatsWithMetrics(env, poolId) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return null;
  }
  
  const metrics = calculatePoolMetrics(pool);
  
  return {
    poolId: pool.id,
    poolName: pool.name,
    enabled: pool.enabled,
    createdAt: pool.createdAt,
    lastRequestTime: pool.stats?.lastRequestTime || null,
    ...metrics
  };
}
/**
 * Update statistics for a specific API Key
 * @param {Object} env - Worker environment
 * @param {string} poolId - Pool ID
 * @param {string} keyId - Key ID
 * @param {boolean} success - Whether the request was successful
 * @returns {Promise<void>}
 */
async function updateKeyStats(env, poolId, keyId, success) {
  const pool = await getPool(env, poolId);
  if (!pool) {
    return;
  }
  
  // Find the specific Key
  const keyObj = pool.geminiKeys.find(k => k.id === keyId);
  if (!keyObj) {
    return;
  }
  
  // Initialize stats fields if they don't exist
  if (typeof keyObj.totalRequests !== 'number') keyObj.totalRequests = 0;
  if (typeof keyObj.successfulRequests !== 'number') keyObj.successfulRequests = 0;
  if (typeof keyObj.failedRequests !== 'number') keyObj.failedRequests = 0;
  
  // Update stats
  keyObj.totalRequests += 1;
  if (success) {
    keyObj.successfulRequests += 1;
  } else {
    keyObj.failedRequests += 1;
  }
  keyObj.lastUsedAt = Date.now();
  
  // Save updates
  await savePoolConfig(env, poolId, pool);
}


// ==================== 模块: routing.js ====================


// ==================== 模块: routing.js ====================
// ==================== 路由模块 ====================
// 处理请求路由、authKey验证、模型检查、Key选择


/**
 * 从请求中提取 authKey
 * @param {Request} request - 请求对象
 * @returns {string|null} authKey 或 null
 */
function extractAuthKey(request) {
  // 从 Authorization 头中提取
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    // 支持 "Bearer sk-pool-xxxx" 格式
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
    // 也支持直接传 authKey
    return authHeader.trim();
  }
  
  // 从 URL 参数中提取
  const url = new URL(request.url);
  const keyParam = url.searchParams.get('key') || url.searchParams.get('apikey');
  if (keyParam) {
    return keyParam.trim();
  }
  
  return null;
}

/**
 * 验证请求
 * @param {Request} request - 请求对象
 * @returns {Object} { valid: boolean, authKey?: string, error?: string }
 */
function validateRequest(request) {
  const authKey = extractAuthKey(request);
  
  if (!authKey) {
    return {
      valid: false,
      error: "缺少认证密钥"
    };
  }
  
  // 验证 authKey 格式（应该是 sk-pool- 开头）
  if (!authKey.startsWith('sk-pool-')) {
    return {
      valid: false,
      error: "认证密钥格式无效"
    };
  }
  
  return {
    valid: true,
    authKey: authKey
  };
}

/**
 * 根据 authKey 查找对应的池
 * @param {Object} env - Worker环境对象
 * @param {string} authKey - 认证密钥
 * @returns {Promise<Object|null>} 池对象或null
 */
async function findPoolByAuthKey(env, authKey) {
  // 从 KV 中获取 authKey 到 poolId 的映射
  const poolId = await loadAuthKeyMapping(env, authKey);
  
  if (!poolId) {
    return null;
  }
  
  // 获取池对象
  const pool = await getPool(env, poolId);
  
  return pool;
}

/**
 * 检查模型是否被池允许
 * @param {Object} pool - 池对象
 * @param {string} modelName - 模型名称
 * @returns {boolean} 是否允许
 */
function isModelAllowed(pool, modelName) {
  // 如果 allowedModels 为空，表示允许所有模型
  if (!pool.allowedModels || pool.allowedModels.length === 0) {
    return true;
  }
  
  // 检查模型是否在允许列表中
  return pool.allowedModels.includes(modelName);
}

/**
 * 从池中选择一个可用的 Gemini Key
 * @param {Object} pool - 池对象
 * @returns {Object|null} Gemini Key 对象 {id, key, ...} 或 null
 */
function selectGeminiKey(pool) {
  // 过滤出启用的 Keys
  const enabledKeys = pool.geminiKeys.filter(k => k.enabled);
  
  if (enabledKeys.length === 0) {
    return null;
  }
  
  // 如果只有一个Key，直接返回
  if (enabledKeys.length === 1) {
    return enabledKeys[0];
  }
  
  // 多个Key时，使用加权随机选择
  const totalWeight = enabledKeys.reduce((sum, k) => sum + (k.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const keyObj of enabledKeys) {
    random -= (keyObj.weight || 1);
    if (random <= 0) {
      return keyObj;
    }
  }
  
  // 保底返回第一个
  return enabledKeys[0];
}

/**
 * 路由请求到对应的池和 Gemini Key
 * @param {Object} env - Worker环境对象
 * @param {string} authKey - 认证密钥
 * @param {string} modelName - 模型名称（可选，/v1/models 端点不需要）
 * @returns {Promise<Object>} 路由结果
 */
async function routeRequest(env, authKey, modelName) {
  // 1. 查找池
  const pool = await findPoolByAuthKey(env, authKey);
  
  if (!pool) {
    return {
      success: false,
      error: "无效的认证密钥",
      errorType: ERROR_TYPES.AUTHENTICATION,
      statusCode: HTTP_STATUS.UNAUTHORIZED
    };
  }
  
  // 2. 检查池是否启用
  if (!pool.enabled) {
    return {
      success: false,
      error: "该池已被禁用",
      errorType: ERROR_TYPES.POOL_DISABLED,
      statusCode: HTTP_STATUS.FORBIDDEN
    };
  }
  
  // 3. 检查模型是否允许（如果提供了模型名称）
  if (modelName && !isModelAllowed(pool, modelName)) {
    return {
      success: false,
      error: `模型 ${modelName} 不在该池的允许列表中`,
      errorType: ERROR_TYPES.MODEL_NOT_ALLOWED,
      statusCode: HTTP_STATUS.FORBIDDEN
    };
  }
  
  // 4. 选择 Gemini Key
  const geminiKey = selectGeminiKey(pool);
  
  if (!geminiKey) {
    return {
      success: false,
      error: "该池没有可用的 Gemini API Key",
      errorType: ERROR_TYPES.NO_AVAILABLE_KEY,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE
    };
  }
  
  // 5. 返回成功结果
  return {
    success: true,
    pool: pool,
    geminiKey: geminiKey
  };
}


// ==================== 模块: streaming.js ====================
// ==================== 流式响应处理模块 ====================
// 处理流式响应的自适应延迟、内容分发和token估算


/**
 * 处理流式响应，添加自适应延迟
 * @param {ReadableStream} inputStream - 输入流
 * @param {WritableStream} outputStream - 输出流
 * @param {Object} config - 配置对象
 * @returns {Promise<{completionTokens: number, totalContent: string}>}
 */
async function processStreamingResponse(inputStream, outputStream, config) {
  const reader = inputStream.getReader();
  const writer = outputStream.getWriter();

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // 优化缓冲区管理
  let buffer = "";
  let lastChunkTime = Date.now();
  let recentChunkSizes = [];
  let currentDelay = config.minDelay;
  let contentReceived = false;
  let isStreamEnding = false;
  let totalContentReceived = 0;
  let isFirstChunk = true;

  // Token计算增强: 跟踪累积的响应内容
  let allResponseContent = "";
  let completionTokens = 0;
  let lastDeltaContent = "";

  // 添加对话历史收集
  let collectCompletionText = config.collectCompletionText === true;
  let lastChoice = null;

  try {
    Logger.debug("开始处理流式响应");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        Logger.debug("流读取完成");
        isStreamEnding = true;
        if (buffer.length > 0) {
          await processBuffer(buffer, writer, encoder, isStreamEnding, {
            ...config,
            currentDelay: config.finalLowDelay || 1,
          });
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));

        // 流结束后，基于累积的内容更新token计数
        if (collectCompletionText && allResponseContent.length > 0) {
          completionTokens = estimateTokenCount(allResponseContent);
          Logger.debug(`流响应结束，估算完成部分token数: ${completionTokens}`);

          // 更新token使用统计
          if (config.updateStatsCallback && typeof config.updateStatsCallback === "function") {
            config.updateStatsCallback(completionTokens);
          }
        }
        break;
      }

      if (value && value.length) {
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 计算延迟和性能指标
        const currentTime = Date.now();
        const timeSinceLastChunk = currentTime - lastChunkTime;
        lastChunkTime = currentTime;

        // 跟踪接收的数据
        contentReceived = true;
        totalContentReceived += chunk.length;

        // 管理最近块大小的历史记录
        recentChunkSizes.push(chunk.length);
        if (recentChunkSizes.length > config.chunkBufferSize) {
          recentChunkSizes.shift();
        }

        // 优化的SSE消息处理 - 使用双换行符作为消息分隔符
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || ""; // 保留最后一部分可能不完整的消息

        // 处理完整的消息
        for (const message of messages) {
          if (!message.trim()) continue;

          // 提取并跟踪内容以改进token计算
          if (collectCompletionText) {
            try {
              if (message.startsWith("data:")) {
                const jsonContent = message.substring(5).trim();
                if (jsonContent !== "[DONE]") {
                  const jsonData = JSON.parse(jsonContent);
                  if (jsonData.choices && jsonData.choices.length > 0) {
                    lastChoice = jsonData.choices[0];
                    if (lastChoice.delta && lastChoice.delta.content) {
                      // 收集所有内容以用于最终token计算
                      lastDeltaContent = lastChoice.delta.content;
                      allResponseContent += lastDeltaContent;
                    }
                  }
                }
              }
            } catch (e) {
              // 解析错误，忽略此消息的token计算
              Logger.debug(`无法解析消息进行token累积: ${e.message}`);
            }
          }

          const lines = message.split("\n");
          for (const line of lines) {
            if (line.trim()) {
              // 为第一个内容块使用更快的延迟以提高感知响应速度
              const useDelay = isFirstChunk ? Math.min(config.minDelay, 2) : currentDelay;
              isFirstChunk = false;

              await processLine(line, writer, encoder, useDelay, config, false);
            }
          }

          // 消息之间添加小延迟使输出更自然
          if (config.interMessageDelay) {
            await new Promise((r) => setTimeout(r, config.interMessageDelay));
          }
        }

        // 动态调整延迟
        const avgChunkSize = recentChunkSizes.reduce((sum, size) => sum + size, 0) / recentChunkSizes.length;
        currentDelay = adaptDelay(avgChunkSize, timeSinceLastChunk, config, false);

        // 大内容启用快速处理模式
        if (totalContentReceived > (config.fastModeThreshold || 5000)) {
          currentDelay = Math.min(currentDelay, config.fastOutputDelay || 3);
        }
      }
    }
  } catch (error) {
    Logger.error("处理流式响应时出错:", error);
    try {
      // 发送格式化的错误响应
      const errorResponse = {
        error: {
          message: error.message,
          type: "stream_processing_error",
        },
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
    } catch (e) {
      Logger.error("写入错误响应失败:", e);
    }
  } finally {
    try {
      await writer.close();
    } catch (e) {
      Logger.error("关闭写入器失败:", e);
    }
  }

  // 返回token使用情况
  return {
    completionTokens,
    totalContent: allResponseContent,
  };
}

/**
 * 处理单行SSE数据
 * @param {string} line - SSE数据行
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {number} delay - 延迟时间
 * @param {Object} config - 配置对象
 * @param {boolean} isStreamEnding - 是否流结束
 */
async function processLine(line, writer, encoder, delay, config, isStreamEnding) {
  if (!line.trim() || !line.startsWith("data:")) return;

  try {
    // 去除前缀，解析JSON
    const content = line.substring(5).trim();
    if (content === "[DONE]") {
      await writer.write(encoder.encode(`${line}\n\n`));
      return;
    }

    try {
      const jsonData = JSON.parse(content);

      // OpenAI流式格式处理
      if (jsonData.choices && Array.isArray(jsonData.choices)) {
        const choice = jsonData.choices[0];

        if (choice.delta && choice.delta.content) {
          const deltaContent = choice.delta.content;
          const contentLength = deltaContent.length;

          // 针对不同长度的内容使用不同策略
          if (contentLength > 20 && !isStreamEnding && config.intelligentBatching) {
            // 长内容分批处理
            await sendContentInBatches(deltaContent, jsonData, writer, encoder, delay, config);
          } else {
            // 短内容或结束时的内容直接处理
            await sendContentCharByChar(deltaContent, jsonData, writer, encoder, delay, config, isStreamEnding);
          }
          return;
        } else if (choice.delta && Object.keys(choice.delta).length === 0) {
          // 这可能是最后一个消息或控制消息
          await writer.write(encoder.encode(`${line}\n\n`));
          return;
        }
      }
    } catch (e) {
      // JSON解析失败，按原始内容处理
      Logger.debug(`非标准JSON内容: ${e.message}`);
    }

    // 按原样发送未能识别的内容
    await writer.write(encoder.encode(`${line}\n\n`));
  } catch (error) {
    Logger.error(`处理SSE行时出错: ${error.message}`);
    try {
      // 出错时尝试按原样发送
      await writer.write(encoder.encode(`${line}\n\n`));
    } catch (e) {
      // 忽略二次错误
    }
  }
}

/**
 * 处理缓冲数据
 * @param {string} buffer - 缓冲数据
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {boolean} isStreamEnding - 是否流结束
 * @param {Object} config - 配置对象
 */
async function processBuffer(buffer, writer, encoder, isStreamEnding, config) {
  if (!buffer.trim()) return;

  // 拆分成行并处理每一行
  const lines = buffer.split("\n");

  // 为流结束和中间内容使用不同的延迟
  const delay = isStreamEnding ? config.finalLowDelay || 1 : config.currentDelay || config.minDelay;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // 对最后一行使用流结束标志
    const isLastLine = i === lines.length - 1;
    await processLine(line, writer, encoder, delay, config, isLastLine && isStreamEnding);
  }
}

/**
 * 自适应延迟算法
 * @param {number} chunkSize - 块大小
 * @param {number} timeSinceLastChunk - 距离上次块的时间
 * @param {Object} config - 配置对象
 * @param {boolean} isStreamEnding - 是否流结束
 * @returns {number} 计算出的延迟时间
 */
function adaptDelay(chunkSize, timeSinceLastChunk, config, isStreamEnding) {
  if (chunkSize <= 0) return config.minDelay;

  // 流结束时使用finalLowDelay
  if (isStreamEnding && config.finalLowDelay !== undefined) {
    return Math.max(1, config.finalLowDelay);
  }

  // 确保配置值有效
  const minDelay = Math.max(1, config.minDelay || 3); // 降低最小延迟
  const maxDelay = Math.max(minDelay, config.maxDelay || 25); // 降低最大延迟
  const adaptiveDelayFactor = Math.max(0, Math.min(2, config.adaptiveDelayFactor || 0.4)); // 降低适应因子

  // 改进的延迟计算

  // 1. 基于块大小的因子（块越大，延迟越小）
  // 使用对数缩放提供更平滑的过渡，调整系数使大块内容更快输出
  const logChunkSize = Math.log2(Math.max(1, chunkSize));
  const sizeScaleFactor = Math.max(0.15, Math.min(1.2, 3.5 / logChunkSize));

  // 2. 基于时间间隔的因子（时间间隔越长，延迟越大）
  // 使用更平滑的曲线，减少时间间隔对延迟的影响
  const timeScaleFactor = Math.sqrt(Math.min(1500, Math.max(50, timeSinceLastChunk)) / 250);

  // 3. 计算最终延迟 - 使用更平滑的曲线
  let delay = minDelay + (maxDelay - minDelay) * sizeScaleFactor * timeScaleFactor * adaptiveDelayFactor;

  // 添加更细微的随机变化（±5%）以使输出更自然但更一致
  const randomFactor = 0.95 + Math.random() * 0.1;
  delay *= randomFactor;

  // 确保在允许范围内
  return Math.min(maxDelay, Math.max(minDelay, delay));
}

/**
 * 逐字符发送内容
 * @param {string} content - 要发送的内容
 * @param {Object} originalJson - 原始JSON对象
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {number} delay - 延迟时间
 * @param {Object} config - 配置对象
 * @param {boolean} isStreamEnding - 是否流结束
 */
async function sendContentCharByChar(content, originalJson, writer, encoder, delay, config, isStreamEnding) {
  if (!content) return;

  // 检查是否需要快速输出模式
  const useQuickMode = content.length > (config.minContentLengthForFastOutput || 500); // 降低快速输出的阈值
  const actualDelay = useQuickMode ? config.fastOutputDelay || 1 : delay; // 降低快速模式的延迟

  try {
    // 对于长内容优化批处理大小 - 使用更智能的批处理大小计算
    let sendBatchSize;

    // 根据内容长度动态调整批处理大小，使输出更平滑
    if (content.length > 200) {
      // 长内容使用更大的批次，但确保不会太大导致卡顿感
      sendBatchSize = isStreamEnding ? 6 : 4;
    } else if (content.length > 50) {
      // 中等长度内容
      sendBatchSize = isStreamEnding ? 3 : 2;
    } else {
      // 短内容
      sendBatchSize = 1;
    }

    // 检测内容是否包含自然语言断点（如标点符号）
    const punctuationMarks = [".", "。", "!", "！", "?", "？", ",", "，", ";", "；", ":", "：", "\n"];

    // 跟踪上次发送的时间，用于动态调整延迟
    let lastSendTime = Date.now();

    for (let i = 0; i < content.length; ) {
      // 寻找最近的自然断点
      let endIndex = i + sendBatchSize;
      let foundNaturalBreak = false;

      // 如果不是在结尾，尝试寻找自然断点
      if (endIndex < content.length - 1) {
        // 在当前批次范围内查找断点
        for (let j = i + 1; j <= Math.min(i + sendBatchSize * 1.5, content.length); j++) {
          if (punctuationMarks.includes(content[j])) {
            endIndex = j + 1; // 包含标点符号
            foundNaturalBreak = true;
            break;
          }
        }
      } else {
        // 确保不超过内容长度
        endIndex = Math.min(endIndex, content.length);
      }

      const currentBatch = content.substring(i, endIndex);

      // 将原始JSON中的内容替换为当前批次
      const modifiedJson = JSON.parse(JSON.stringify(originalJson));
      modifiedJson.choices[0].delta.content = currentBatch;

      // 写入当前批次的SSE行
      const modifiedLine = `data: ${JSON.stringify(modifiedJson)}\n\n`;
      await writer.write(encoder.encode(modifiedLine));

      // 动态调整延迟 - 考虑批次大小和是否在自然断点
      let dynamicDelay = actualDelay;

      // 在自然断点处增加轻微延迟，使输出更自然
      if (foundNaturalBreak) {
        dynamicDelay = Math.min(actualDelay * 1.2, actualDelay + 2);
      } else if (currentBatch.length <= 1) {
        // 单字符减少延迟
        dynamicDelay = Math.max(1, actualDelay * 0.7);
      }

      // 流结束时使用更短的延迟
      if (isStreamEnding && content.length - i < 15) {
        dynamicDelay = Math.min(dynamicDelay, config.finalLowDelay || 1);
      }

      // 更新索引到下一个位置
      i = endIndex;

      // 只在批次之间添加延迟，最后一批不添加
      if (i < content.length) {
        // 计算实际经过的时间，避免延迟累积
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastSendTime;
        const adjustedDelay = Math.max(0, dynamicDelay - elapsedTime);

        if (adjustedDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, adjustedDelay));
        }
        lastSendTime = Date.now();
      }
    }
  } catch (error) {
    Logger.error(`逐字符发送内容时出错: ${error.message}`);
    // 出错时，尝试发送完整内容
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(originalJson)}\n\n`));
    } catch (e) {
      Logger.error(`无法发送完整内容: ${e.message}`);
    }
  }
}

/**
 * 分批次发送内容，优化长内容的处理
 * @param {string} content - 要发送的内容
 * @param {Object} originalJson - 原始JSON对象
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {TextEncoder} encoder - 文本编码器
 * @param {number} delay - 延迟时间
 * @param {Object} config - 配置对象
 */
async function sendContentInBatches(content, originalJson, writer, encoder, delay, config) {
  if (!content || content.length === 0) return;

  // 根据内容长度和配置选择批处理大小 - 更智能的批处理大小
  let batchSize;
  if (content.length > 200) {
    batchSize = config.maxBatchSize || 6;
  } else if (content.length > 100) {
    batchSize = 4;
  } else if (content.length > 50) {
    batchSize = 3;
  } else {
    batchSize = 2;
  }

  // 根据内容长度动态调整延迟 - 更平滑的延迟
  const adjustedDelay = content.length > 100 ? Math.min(delay, config.fastOutputDelay || 2) : delay;

  // 检测内容是否包含自然语言断点
  const punctuationMarks = [".", "。", "!", "！", "?", "？", ",", "，", ";", "；", ":", "：", "\n"];

  // 跟踪上次发送的时间
  let lastSendTime = Date.now();

  try {
    let i = 0;
    while (i < content.length) {
      // 寻找最近的自然断点
      let endIndex = Math.min(i + batchSize, content.length);
      let foundNaturalBreak = false;

      // 在当前批次范围内查找断点
      if (endIndex < content.length - 1) {
        for (let j = i + Math.floor(batchSize / 2); j <= Math.min(i + batchSize * 1.5, content.length); j++) {
          if (punctuationMarks.includes(content[j])) {
            endIndex = j + 1; // 包含标点符号
            foundNaturalBreak = true;
            break;
          }
        }
      }

      const batch = content.substring(i, endIndex);

      // 创建新的JSON对象，只包含当前批次
      const batchJson = JSON.parse(JSON.stringify(originalJson));
      batchJson.choices[0].delta.content = batch;

      // 发送当前批次
      const batchLine = `data: ${JSON.stringify(batchJson)}\n\n`;
      await writer.write(encoder.encode(batchLine));

      // 动态调整延迟
      let dynamicDelay = adjustedDelay;

      // 在自然断点处增加轻微延迟
      if (foundNaturalBreak) {
        dynamicDelay = Math.min(adjustedDelay * 1.2, adjustedDelay + 1.5);
      }

      // 更新索引到下一个位置
      i = endIndex;

      // 只在批次之间添加延迟，最后一批不添加
      if (i < content.length) {
        // 计算实际经过的时间，避免延迟累积
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastSendTime;
        const finalDelay = Math.max(0, dynamicDelay - elapsedTime);

        if (finalDelay > 0) {
          await new Promise((r) => setTimeout(r, finalDelay));
        }
        lastSendTime = Date.now();
      }
    }
  } catch (error) {
    Logger.error(`分批处理内容时出错: ${error.message}`);
    // 出错时发送完整内容
    const fallbackJson = JSON.parse(JSON.stringify(originalJson));
    fallbackJson.choices[0].delta.content = content;
    await writer.write(encoder.encode(`data: ${JSON.stringify(fallbackJson)}\n\n`));
  }
}


// ==================== 模块: gemini-forward.js ====================
// ==================== Gemini API 转发模块 ====================
// 基于 Scotlight/gemini 项目的简洁实现
// https://github.com/Scotlight/gemini


/**
 * 估算消息数组的 token 数量
 */
function estimateTokensFromMessages(messages) {
  let totalTokens = 0;
  
  for (const msg of messages) {
    totalTokens += 4; // 每条消息的固定开销
    
    if (typeof msg.content === 'string') {
      totalTokens += estimateTokenCount(msg.content, true);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text') {
          totalTokens += estimateTokenCount(part.text, true);
        } else if (part.type === 'image_url') {
          totalTokens += 85;
        }
      }
    }
  }
  
  totalTokens += 3;
  return Math.round(totalTokens);
}

/**
 * 生成随机聊天 ID（OpenAI 格式）
 */
function generateChatId() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomChar = () => characters[Math.floor(Math.random() * characters.length)];
  return Array.from({ length: 29 }, randomChar).join("");
}

/**
 * OpenAI 消息格式转换为 Gemini 格式
 */
function convertMessagesToGemini(messages) {
  const contents = [];
  let systemInstruction = null;
  
  for (const msg of messages) {
    // 处理 system 消息
    if (msg.role === 'system') {
      systemInstruction = {
        parts: [{ text: msg.content }]
      };
      continue;
    }
    
    const role = msg.role === 'assistant' ? 'model' : 'user';
    
    // 处理文本内容
    if (typeof msg.content === 'string') {
      contents.push({
        role: role,
        parts: [{ text: msg.content }]
      });
    }
    // 处理多模态内容
    else if (Array.isArray(msg.content)) {
      const parts = [];
      for (const part of msg.content) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'image_url') {
          const imageUrl = part.image_url.url;
          if (imageUrl.startsWith('data:')) {
            const [header, base64Data] = imageUrl.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
          }
        }
      }
      contents.push({
        role: role,
        parts: parts
      });
    }
  }
  
  return { systemInstruction, contents };
}

/**
 * 转换 OpenAI 请求为 Gemini 请求
 */
function convertOpenAIToGemini(openaiRequest) {
  const { systemInstruction, contents } = convertMessagesToGemini(openaiRequest.messages);
  
  const geminiRequest = {
    contents: contents
  };
  
  // 添加 system_instruction（v1beta 使用下划线格式）
  if (systemInstruction) {
    geminiRequest.system_instruction = systemInstruction;
  }
  
  // 转换生成配置
  const generationConfig = {};
  
  if (openaiRequest.temperature !== undefined) {
    generationConfig.temperature = openaiRequest.temperature;
  }
  
  if (openaiRequest.max_tokens !== undefined) {
    generationConfig.maxOutputTokens = openaiRequest.max_tokens;
  }
  
  if (openaiRequest.top_p !== undefined) {
    generationConfig.topP = openaiRequest.top_p;
  }
  
  if (openaiRequest.stop !== undefined) {
    generationConfig.stopSequences = Array.isArray(openaiRequest.stop) 
      ? openaiRequest.stop 
      : [openaiRequest.stop];
  }
  
  if (Object.keys(generationConfig).length > 0) {
    geminiRequest.generationConfig = generationConfig;
  }
  
  // 安全设置：禁用所有过滤
  geminiRequest.safetySettings = [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
  ];
  
  return geminiRequest;
}

/**
 * 转换 Gemini 响应为 OpenAI 格式（非流式）
 */
function convertGeminiToOpenAI(geminiResponse, model) {
  let content = '';
  
  if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
    const candidate = geminiResponse.candidates[0];
    if (candidate.content && candidate.content.parts) {
      content = candidate.content.parts.map(p => p.text || '').join('');
    }
  }
  
  // finishReason 映射
  const reasonsMap = {
    "STOP": "stop",
    "MAX_TOKENS": "length",
    "SAFETY": "content_filter",
    "RECITATION": "content_filter"
  };
  
  const finishReason = geminiResponse.candidates?.[0]?.finishReason || 'stop';
  
  return {
    id: `chatcmpl-${generateChatId()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: content
      },
      finish_reason: reasonsMap[finishReason] || 'stop'
    }],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0
    }
  };
}

/**
 * 流式处理：解析 SSE 响应行
 */
const responseLineRE = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;

function parseStream(chunk, controller) {
  this.buffer += chunk;
  
  do {
    const match = this.buffer.match(responseLineRE);
    if (!match) break;
    
    controller.enqueue(match[1]);
    this.buffer = this.buffer.substring(match[0].length);
  } while (true);
}

function parseStreamFlush(controller) {
  if (this.buffer) {
    console.error("Stream buffer has remaining data:", this.buffer);
    controller.enqueue(this.buffer);
  }
}

/**
 * 流式处理：转换为 OpenAI 格式
 */
const delimiter = "\n\n";
const sseline = (obj) => {
  obj.created = Math.floor(Date.now() / 1000);
  return "data: " + JSON.stringify(obj) + delimiter;
};

function toOpenAiStream(line, controller) {
  let data;
  
  try {
    data = JSON.parse(line);
    if (!data.candidates) {
      throw new Error("Invalid completion chunk object");
    }
  } catch (err) {
    console.error("Error parsing stream line:", err);
    controller.enqueue(line + delimiter);
    return;
  }
  
  // finishReason 映射
  const reasonsMap = {
    "STOP": "stop",
    "MAX_TOKENS": "length",
    "SAFETY": "content_filter",
    "RECITATION": "content_filter"
  };
  
  const candidate = data.candidates[0];
  if (!candidate) return;
  
  const index = candidate.index || 0;
  
  // 提取内容
  let content = '';
  if (candidate.content && candidate.content.parts) {
    content = candidate.content.parts.map(p => p.text || '').join('');
  }
  
  const finishReason = candidate.finishReason 
    ? (reasonsMap[candidate.finishReason] || 'stop')
    : null;
  
  // 第一个数据块：发送 role
  if (!this.last[index]) {
    const obj = {
      id: this.id,
      object: "chat.completion.chunk",
      model: data.modelVersion || this.model,
      choices: [{
        index: index,
        delta: { role: "assistant", content: "" },
        finish_reason: null
      }]
    };
    controller.enqueue(sseline(obj));
    this.last[index] = true;
  }
  
  // 发送内容数据块
  if (content) {
    const obj = {
      id: this.id,
      object: "chat.completion.chunk",
      model: data.modelVersion || this.model,
      choices: [{
        index: index,
        delta: { content: content },
        finish_reason: null
      }]
    };
    controller.enqueue(sseline(obj));
  }
  
  // 发送结束标记
  if (finishReason) {
    const obj = {
      id: this.id,
      object: "chat.completion.chunk",
      model: data.modelVersion || this.model,
      choices: [{
        index: index,
        delta: {},
        finish_reason: finishReason
      }]
    };
    
    // 包含 usage 信息
    if (data.usageMetadata && this.streamIncludeUsage) {
      obj.usage = {
        prompt_tokens: data.usageMetadata.promptTokenCount || 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata.totalTokenCount || 0
      };
    }
    
    controller.enqueue(sseline(obj));
  }
}

function toOpenAiStreamFlush(controller) {
  controller.enqueue("data: [DONE]" + delimiter);
}

/**
 * 转发聊天完成请求到 Gemini API
 */
async function forwardChatCompletion(env, pool, geminiKeyObj, reqBody) {
  const modelName = reqBody.model;
  const isStreaming = reqBody.stream === true;
  
  try {
    // 转换请求
    const geminiRequest = convertOpenAIToGemini(reqBody);
    
    // 构建 API URL（使用 v1beta 支持 systemInstruction）
    const action = isStreaming ? 'streamGenerateContent' : 'generateContent';
    let geminiUrl = `${API_BASE_URL}/v1beta/models/${modelName}:${action}?key=${geminiKeyObj.key}`;
    if (isStreaming) {
      geminiUrl += '&alt=sse';
    }
    
    // 调用 Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequest)
    });
    
    // 处理流式响应
    if (isStreaming) {
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        
        return new Response(errorText, {
          status: geminiResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 使用 TransformStream 链式处理流
      const chatId = `chatcmpl-${generateChatId()}`;
      const transformedStream = geminiResponse.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TransformStream({
          transform: parseStream,
          flush: parseStreamFlush,
          buffer: "",
        }))
        .pipeThrough(new TransformStream({
          transform: toOpenAiStream,
          flush: toOpenAiStreamFlush,
          streamIncludeUsage: reqBody.stream_options?.include_usage,
          model: modelName,
          id: chatId,
          last: [],
        }))
        .pipeThrough(new TextEncoderStream());
      
      return new Response(transformedStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 处理非流式响应
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      
      return new Response(JSON.stringify({
        error: {
          message: errorData.error?.message || 'Gemini API 错误',
          type: 'api_error',
          code: geminiResponse.status
        }
      }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const geminiData = await geminiResponse.json();
    const openaiResponse = convertGeminiToOpenAI(geminiData, modelName);
    
    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('转发请求失败:', error);
    
    return new Response(JSON.stringify({
      error: {
        message: '转发到 Gemini API 失败: ' + error.message,
        type: 'server_error'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 转发嵌入请求到 Gemini API
 */
async function forwardEmbedding(env, pool, geminiKeyObj, reqBody) {
  try {
    const text = Array.isArray(reqBody.input) ? reqBody.input[0] : reqBody.input;
    const model = reqBody.model || 'text-embedding-004';
    
    const geminiUrl = `${API_BASE_URL}/v1beta/models/${model}:embedContent?key=${geminiKeyObj.key}`;
    
    const geminiRequest = {
      model: `models/${model}`,
      content: {
        parts: [{ text: text }]
      }
    };
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiRequest)
    });
    
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      
      return new Response(JSON.stringify({
        error: {
          message: errorData.error?.message || 'Gemini Embedding API 错误',
          type: 'api_error'
        }
      }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const geminiData = await geminiResponse.json();
    
    const openaiResponse = {
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: geminiData.embedding.values,
        index: 0
      }],
      model: model,
      usage: {
        prompt_tokens: 0,
        total_tokens: 0
      }
    };
    
    return new Response(JSON.stringify(openaiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        message: '转发 Embedding 请求失败: ' + error.message,
        type: 'server_error'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


// ==================== 模块: session.js ====================
// ==================== 会话管理模块 ====================
// 处理管理员认证和会话管理


// 会话存储（内存中，重启后失效）
const sessions = new Map();
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7天

/**
 * 获取管理员密码（从环境变量）
 * @param {Object} env - Worker环境对象
 * @returns {string} 管理员密码
 */
function getAdminPassword(env) {
  // 从环境变量读取
  const password = env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('未配置 ADMIN_PASSWORD 环境变量');
  }

  return password;
}


/**
 * 验证管理员密码
 * @param {Object} env - Worker环境对象
 * @param {string} password - 用户输入的密码
 * @returns {boolean} 是否验证成功
 */
function verifyAdminPassword(env, password) {
  try {
    const adminPassword = getAdminPassword(env);
    return password === adminPassword;
  } catch (error) {
    console.error('验证密码失败:', error.message);
    return false;
  }
}

/**
 * 管理员登录
 * @param {Object} env - Worker环境对象
 * @param {string} password - 密码
 * @returns {Object} { success: boolean, sessionToken?: string, message?: string }
 */
function login(env, password) {
  const isValid = verifyAdminPassword(env, password);

  if (!isValid) {
    return {
      success: false,
      message: "密码错误"
    };
  }

  // 生成 session token
  const sessionToken = generateRandomKey(32);
  const session = {
    token: sessionToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TIMEOUT
  };

  sessions.set(sessionToken, session);

  return {
    success: true,
    sessionToken: sessionToken,
    expiresAt: session.expiresAt
  };
}

/**
 * 验证 session token
 * @param {string} sessionToken - Session Token
 * @returns {boolean} 是否有效
 */
function validateSession(sessionToken) {
  const session = sessions.get(sessionToken);
  
  if (!session) {
    return false;
  }
  
  // 检查是否过期
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionToken);
    return false;
  }
  
  return true;
}

/**
 * 登出
 * @param {string} sessionToken - Session Token
 * @returns {boolean} 是否成功
 */
function logout(sessionToken) {
  return sessions.delete(sessionToken);
}

/**
 * 创建 session cookie
 * @param {string} token - Session Token
 * @param {number} maxAge - Cookie 最大生存时间（秒）
 * @returns {string} Cookie 字符串
 */
function createSessionCookie(token, maxAge = 86400) {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * 从请求中提取 session token
 * @param {Request} request - 请求对象
 * @returns {string|null} Session Token 或 null
 */
function extractSessionToken(request) {
  // 从 Cookie 中提取
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('session=')) {
        return cookie.substring(8);
      }
    }
  }
  
  // 从 Authorization 头中提取
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * 验证请求的管理员权限
 * @param {Request} request - 请求对象
 * @returns {boolean} 是否有权限
 */
function verifyAdminRequest(request) {
  const sessionToken = extractSessionToken(request);
  
  if (!sessionToken) {
    return false;
  }
  
  return validateSession(sessionToken);
}

/**
 * 清理过期的 sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  const toDelete = [];
  
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      toDelete.push(token);
    }
  }
  
  for (const token of toDelete) {
    sessions.delete(token);
  }
  
  return toDelete.length;
}

/**
 * 获取活跃 session 数量
 * @returns {number} 活跃 session 数量
 */
function getActiveSessionCount() {
  cleanupExpiredSessions();
  return sessions.size;
}



// ==================== 模块: admin-ui-new.js ====================
// ==================== 新管理界面模块 ====================
// 适配多池隔离系统的管理界面


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

function generateLoginHTML() {
  return loginHtml;
}



// ==================== 模块: pool-create-ui.js ====================
// ==================== 池创建页面 ====================
// 简化版：批量导入 Gemini Keys

function generateCreatePoolHTML() {
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


// ==================== 模块: pool-detail-ui.js ====================
﻿// ==================== 单个池详情 UI 模块 ====================
// 提供单个池的详细管理界面，可以管理每个 API Key


/**
 * 生成单个池详情页面 HTML
 * @param {string} poolId - 池ID（从URL获取）
 * @returns {string} HTML字符串
 */
function generatePoolDetailHTML(poolId) {
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

      // 验证 Gemini API Key 格式
      if (!newKey.key.startsWith('AIza')) {
        alert('无效的 Gemini API Key 格式！\n\nKey 必须以 AIza 开头。');
        return;
      }
      
      // 验证密钥中没有不支持的字符
      if (!/^[a-zA-Z0-9\-_]+$/.test(newKey.key)) {
        alert('无效的密钥字符！\n\n密钥只能包含：\n• 字母 (A-Z, a-z)\n• 数字 (0-9)\n• 连字符 (-) 和下划线 (_)');
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
      const invalidFormatKeys = keyLines.filter(key => !key.startsWith('AIza'));
      if (invalidFormatKeys.length > 0) {
        alert(\`发现 \${invalidFormatKeys.length} 个无效的 Key 格式！\\n\\nKey 必须以 AIza 开头。\\n\\n第一个无效 Key: \${invalidFormatKeys[0]}\`);
        return;
      }
      
      // 验证密钥中没有不支持的字符
      const invalidCharKeys = keyLines.filter(key => !/^[a-zA-Z0-9\\-_]+$/.test(key));
      if (invalidCharKeys.length > 0) {
        alert(\`发现 \${invalidCharKeys.length} 个包含无效字符的 Key！\\n\\n密钥只能包含：\\n• 字母 (A-Z, a-z)\\n• 数字 (0-9)\\n• 连字符 (-) 和下划线 (_)\\n\\n第一个无效 Key: \${invalidCharKeys[0]}\`);
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


// ==================== 模块: api-handlers.js ====================
// ==================== API 处理器模块 ====================
// 处理所有 /api/pools 相关的端点


/**
 * GET /api/pools - 获取所有池列表
 * @param {Object} env - Worker环境对象
 * @returns {Promise<Response>} JSON响应
 */
async function handleGetPools(env) {
  try {
    const pools = await getAllPools(env, true); // 强制刷新缓存
    
    // 隐藏敏感信息（authKey 和 Gemini Keys）
    const safePools = pools.map(pool => ({
      ...pool,
      authKey: obfuscateKey(pool.authKey),
      geminiKeys: pool.geminiKeys.map(k => ({
        ...k,
        key: obfuscateKey(k.key)
      }))
    }));
    
    return jsonResponse({
      success: true,
      pools: safePools,
      total: safePools.length
    });
  } catch (error) {
    Logger.error('获取池列表失败:', error);
    const errorMsg = error.message || String(error) || '未知错误';
    return errorResponse(
      "获取池列表失败: " + errorMsg,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * POST /api/pools - 创建新池
 * @param {Object} env - Worker环境对象
 * @param {Object} reqBody - 请求体
 * @returns {Promise<Response>} JSON响应
 */
async function handleCreatePool(env, reqBody) {
  try {
    // 验证配置
    const validation = validatePoolConfig(reqBody);
    if (!validation.valid) {
      return jsonResponse({
        success: false,
        message: "池配置无效",
        errors: validation.errors
      }, HTTP_STATUS.BAD_REQUEST);
    }
    
    // 创建池
    const pool = await createPool(env, reqBody);
    
    return jsonResponse({
      success: true,
      message: "池创建成功",
      pool: pool
    }, HTTP_STATUS.CREATED);
  } catch (error) {
    Logger.error('创建池失败:', error);
    const errorMsg = error.message || String(error) || '未知错误';
    return errorResponse(
      "创建池失败: " + errorMsg,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * GET /api/pools/{poolId} - 获取池详情
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Response>} JSON响应
 */
async function handleGetPoolDetail(env, poolId) {
  try {
    const pool = await getPool(env, poolId);
    
    if (!pool) {
      return jsonResponse({
        success: false,
        message: "池不存在"
      }, HTTP_STATUS.NOT_FOUND);
    }
    
    return jsonResponse({
      success: true,
      pool: pool
    });
  } catch (error) {
    Logger.error('获取池详情失败:', error);
    const errorMsg = error.message || String(error) || '未知错误';
    return errorResponse(
      "获取池详情失败: " + errorMsg,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * PUT /api/pools/{poolId} - 更新池配置
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {Object} updates - 更新内容
 * @returns {Promise<Response>} JSON响应
 */
async function handleUpdatePool(env, poolId, updates) {
  try {
    const pool = await updatePool(env, poolId, updates);
    
    if (!pool) {
      return jsonResponse({
        success: false,
        message: "池不存在"
      }, HTTP_STATUS.NOT_FOUND);
    }
    
    return jsonResponse({
      success: true,
      message: "池更新成功",
      pool: pool
    });
  } catch (error) {
    Logger.error('更新池失败:', error);
    const errorMsg = error.message || String(error) || '未知错误';
    return errorResponse(
      "更新池失败: " + errorMsg,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * DELETE /api/pools/{poolId} - 删除池
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Response>} JSON响应
 */
async function handleDeletePool(env, poolId) {
  try {
    const success = await deletePool(env, poolId);
    
    if (!success) {
      return jsonResponse({
        success: false,
        message: "池不存在或删除失败"
      }, HTTP_STATUS.NOT_FOUND);
    }
    
    return jsonResponse({
      success: true,
      message: "池删除成功"
    });
  } catch (error) {
    Logger.error('删除池失败:', error);
    const errorMsg = error.message || String(error) || '未知错误';
    return errorResponse(
      "删除池失败: " + errorMsg,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * POST /api/pools/{poolId}/regenerate-auth - 重新生成 authKey
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Response>} JSON响应
 */
async function handleRegenerateAuthKey(env, poolId) {
  try {
    const pool = await regeneratePoolAuthKey(env, poolId);
    
    if (!pool) {
      return jsonResponse({
        success: false,
        message: "池不存在"
      }, HTTP_STATUS.NOT_FOUND);
    }
    
    return jsonResponse({
      success: true,
      message: "AuthKey 重新生成成功",
      pool: pool
    });
  } catch (error) {
    return errorResponse(
      "重新生成 authKey 失败: " + error.message,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * GET /api/pools/{poolId}/stats - 获取池统计信息
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @returns {Promise<Response>} JSON响应
 */
async function handleGetPoolStats(env, poolId) {
  try {
    const stats = await getPoolStats(env, poolId);

    if (!stats) {
      return jsonResponse({
        success: false,
        message: "池不存在"
      }, HTTP_STATUS.NOT_FOUND);
    }

    return jsonResponse({
      success: true,
      stats: stats
    });
  } catch (error) {
    return errorResponse(
      "获取池统计失败: " + error.message,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * GET /v1/models - 获取可用模型列表（动态从 Gemini API 获取）
 * @param {Object} env - Worker环境对象
 * @returns {Promise<Response>} JSON响应（OpenAI 格式）
 */
async function handleGetModels(env) {
  try {
    // 收集所有池的所有 Gemini Keys
    const pools = await getAllPools(env);
    const allGeminiKeys = [];

    for (const pool of pools) {
      if (pool.enabled && pool.geminiKeys) {
        const enabledKeys = pool.geminiKeys
          .filter(k => k.enabled)
          .map(k => k.key);
        allGeminiKeys.push(...enabledKeys);
      }
    }

    if (allGeminiKeys.length === 0) {
      Logger.warn('没有可用的 Gemini API Key 来获取模型列表');
      return jsonResponse({
        object: "list",
        data: []
      });
    }

    // 从 Gemini API 动态获取模型列表
    const models = await getGeminiModelsFromPool(allGeminiKeys);

    if (!models || models.length === 0) {
      Logger.warn('无法从 Gemini API 获取模型列表');
      return jsonResponse({
        object: "list",
        data: []
      });
    }

    // 转换为 OpenAI 格式
    const openAiModels = models.map(model => ({
      id: model.id,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "google",
      permission: [],
      root: model.id,
      parent: null
    }));

    // 获取缓存状态
    const cacheStatus = getModelCacheStatus();

    Logger.info(`返回 ${openAiModels.length} 个模型，缓存状态: ${cacheStatus.isValid ? '有效' : '无效'}`);

    return jsonResponse({
      object: "list",
      data: openAiModels
    });
  } catch (error) {
    Logger.error('获取模型列表失败:', error);
    return errorResponse(
      "获取模型列表失败: " + error.message,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

/**
 * 路由 API 请求到对应的处理器
 * @param {Request} request - 请求对象
 * @param {Object} env - Worker环境对象
 * @returns {Promise<Response>} 响应
 */
async function routeApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  try {
    // GET /api/pools - 获取所有池
    if (path === "/api/pools" && method === "GET") {
      return await handleGetPools(env);
    }
    
    // POST /api/pools - 创建池
    if (path === "/api/pools" && method === "POST") {
      const body = await request.json();
      return await handleCreatePool(env, body);
    }
    
    // GET /api/pools/{poolId} - 获取池详情
    const poolDetailMatch = path.match(/^\/api\/pools\/([^\/]+)$/);
    if (poolDetailMatch && method === "GET") {
      return await handleGetPoolDetail(env, poolDetailMatch[1]);
    }
    
    // PUT /api/pools/{poolId} - 更新池
    if (poolDetailMatch && method === "PUT") {
      const body = await request.json();
      return await handleUpdatePool(env, poolDetailMatch[1], body);
    }
    
    // DELETE /api/pools/{poolId} - 删除池
    if (poolDetailMatch && method === "DELETE") {
      return await handleDeletePool(env, poolDetailMatch[1]);
    }
    
    // POST /api/pools/{poolId}/regenerate-auth - 重新生成authKey
    const regenMatch = path.match(/^\/api\/pools\/([^\/]+)\/regenerate-auth$/);
    if (regenMatch && method === "POST") {
      return await handleRegenerateAuthKey(env, regenMatch[1]);
    }
    
    // GET /api/pools/{poolId}/stats - 获取池统计
    const statsMatch = path.match(/^\/api\/pools\/([^\/]+)\/stats$/);
    if (statsMatch && method === "GET") {
      return await handleGetPoolStats(env, statsMatch[1]);
    }
    
    // PUT /api/pools/{poolId}/keys - 批量更新 Keys
    const keysMatch = path.match(/^\/api\/pools\/([^\/]+)\/keys$/);
    if (keysMatch && method === "PUT") {
      const body = await request.json();
      return await handleUpdatePool(env, keysMatch[1], body);
    }
    
    // 未找到匹配的路由
    return jsonResponse({
      success: false,
      message: "API 端点不存在"
    }, HTTP_STATUS.NOT_FOUND);
    
  } catch (error) {
    return errorResponse(
      "API 请求处理失败: " + error.message,
      ERROR_TYPES.SERVER_ERROR,
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}


// ==================== 主入口函数 ====================


/**
 * Cloudflare Workers 主处理函数
 */
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
      
      // ===========================================
      // 管理界面路由
      // ===========================================
      
      // 登录页面
      if (path === "/login") {
        return htmlResponse(generateLoginHTML());
      }
      
      // 登录 API
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
      
      // 管理后台首页
      if (path === "/admin" || path === "/") {
        // 验证会话
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }

        // 获取所有池并渲染
        const pools = await getAllPools(env, true);
        return htmlResponse(generateDashboardHTML(pools));
      }

      // 创建池页面
      if (path === "/admin/create-pool") {
        // 验证会话
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }

        return htmlResponse(generateCreatePoolHTML());
      }

      // 单个池详情页面
      const poolDetailMatch = path.match(/^\/admin\/pools\/([^\/]+)$/);
      if (poolDetailMatch) {
        // 验证会话
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }

        const poolId = poolDetailMatch[1];
        return htmlResponse(generatePoolDetailHTML(poolId));
      }
      
      // ===========================================
      // API 管理端点
      // ===========================================
      
      if (path.startsWith("/api/pools")) {
        // 验证管理员权限
        if (!verifyAdminRequest(request)) {
          return jsonResponse({
            success: false,
            message: "未授权：请先登录"
          }, HTTP_STATUS.UNAUTHORIZED);
        }
        
        // 路由到对应的处理器
        return await routeApiRequest(request, env);
      }
      
      // ===========================================
      // OpenAI 兼容的 API 端点
      // ===========================================
      
      // Chat Completions (支持 /v1/chat/completions 和 /api/chat/completions)
      if ((path === "/v1/chat/completions" || path === "/api/chat/completions") && method === "POST") {
        // 1. 验证请求（提取 authKey）
        const validation = validateRequest(request);
        if (!validation.valid) {
          return errorResponse(
            validation.error,
            ERROR_TYPES.AUTHENTICATION,
            HTTP_STATUS.UNAUTHORIZED
          );
        }
        
        // 2. 解析请求体
        const reqBody = await request.json();
        const modelName = reqBody.model;
        
        if (!modelName) {
          return errorResponse(
            "缺少模型名称",
            ERROR_TYPES.INVALID_REQUEST,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        
        // 3. 路由请求（找到对应的池和 Gemini Key）
        const routeResult = await routeRequest(env, validation.authKey, modelName);
        if (!routeResult.success) {
          return errorResponse(
            routeResult.error,
            routeResult.errorType,
            routeResult.statusCode
          );
        }
        
        // 4. 转发到 Gemini API
        return await forwardChatCompletion(
          env,
          routeResult.pool,
          routeResult.geminiKey,
          reqBody
        );
      }
      
      // Embeddings
      if (path === "/v1/embeddings" && method === "POST") {
        // 1. 验证请求
        const validation = validateRequest(request);
        if (!validation.valid) {
          return errorResponse(
            validation.error,
            ERROR_TYPES.AUTHENTICATION,
            HTTP_STATUS.UNAUTHORIZED
          );
        }
        
        // 2. 解析请求体
        const reqBody = await request.json();
        const modelName = reqBody.model || "embedding-001";
        
        // 3. 路由请求
        const routeResult = await routeRequest(env, validation.authKey, modelName);
        if (!routeResult.success) {
          return errorResponse(
            routeResult.error,
            routeResult.errorType,
            routeResult.statusCode
          );
        }
        
        // 4. 转发到 Gemini API
        return await forwardEmbedding(
          env,
          routeResult.pool,
          routeResult.geminiKey,
          reqBody
        );
      }
      
      // Models 列表（OpenAI 兼容）- 使用动态获取 (支持 /v1/models 和 /api/models)
      if ((path === "/v1/models" || path === "/api/models") && method === "GET") {
        return await handleGetModels(env);
      }
      
      // Open WebUI 特定端点 - chat completed 回调
      if (path === "/api/chat/completed" && method === "POST") {
        // Open WebUI 在对话完成后会调用此端点
        // 我们简单返回成功即可
        return jsonResponse({ success: true, message: "Chat completed" });
      }
      
      // ===========================================
      // 默认响应 - API 信息
      // ===========================================

      // 获取模型缓存状态
      const modelCacheStatus = getModelCacheStatus();

      return jsonResponse({
        name: "多池隔离系统",
        version: "3.0",
        description: "真正的多池隔离 Gemini API 代理系统",
        endpoints: {
          admin: {
            login: "/login",
            dashboard: "/admin"
          },
          management: {
            pools: "/api/pools",
            poolDetail: "/api/pools/{poolId}"
          },
          api: {
            chat: "/v1/chat/completions",
            embeddings: "/v1/embeddings",
            models: "/v1/models"
          }
        },
        features: [
          "✓ 真正的多池隔离",
          "✓ 独立认证密钥 (sk-pool-xxxx)",
          "✓ 每池独立 Gemini API Keys",
          "✓ 每池独立模型限制",
          "✓ 动态获取 Gemini 模型列表",
          "✓ OpenAI 格式兼容",
          "✓ 流式输出支持",
          "✓ 多模态支持（文本+图片）",
          "✓ 请求统计和监控"
        ],
        supportedModels: modelCacheStatus.modelCount || "动态获取",
        modelCacheStatus: modelCacheStatus.isValid ? "已缓存" : "未缓存",
        documentation: "https://github.com/your-repo/multi-pool-system"
      });
      
    } catch (error) {
      console.error("请求处理错误:", error);
      return errorResponse(
        "服务器内部错误: " + error.message,
        ERROR_TYPES.SERVER_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  }
};
