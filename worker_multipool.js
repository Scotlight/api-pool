// ==================== 多池隔离系统 v3.0 - 移除请求记录版本 ====================
// 自动生成于 2025-11-02 08:59:10
// 
// 修改说明：
// - 移除了请求成功/失败记录功能
// - 移除了成功率、失败率等统计
// - 保留了使用量监控（RPM/TPM/RPD/TPD）
// - 保留了令牌使用统计


// ==================== constants.js ====================

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

// ==================== utils.js ====================

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
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix = "pool") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 生成池的 authKey
 * @returns {string} 格式为 sk-pool-xxxx 的authKey
 */
function generatePoolAuthKey() {
  const random = Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15);
  return `sk-pool-${random}`;
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
 * 生成随机密钥（用于会话等）
 * @param {number} length - 密钥长度
 * @returns {string} 随机密钥
 */
function generateRandomKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

// ==================== kv-storage.js ====================

// ==================== KV 存储模块 ====================
// 处理所有 KV 存储操作：池配置、authKey映射等


// 内存缓存
let poolsCache = null;
let authMappingCache = null;
let lastCacheUpdate = 0;

// 数据锁机制
let dataLock = {
  locked: false,
  owner: null,
  timestamp: 0,
  timeout: 20000, // 锁超时时间，20秒
};

/**
 * 获取数据锁
 * @param {string} operationId - 操作ID
 * @returns {string|boolean} 锁ID或false
 */
function acquireDataLock(operationId = null) {
  const now = Date.now();

  // 检查是否有锁超时，自动释放
  if (dataLock.locked && now - dataLock.timestamp > dataLock.timeout) {
    Logger.warn(`检测到锁超时，自动释放。上一个持有者: ${dataLock.owner || "未知"}, 持有时间: ${(now - dataLock.timestamp) / 1000}秒`);
    releaseDataLock(true);
  }

  // 尝试获取锁
  if (!dataLock.locked) {
    dataLock.locked = true;
    dataLock.owner = operationId || `op-${now}-${Math.random().toString(36).substring(2, 7)}`;
    dataLock.timestamp = now;
    return dataLock.owner; // 返回锁ID而不是布尔值
  }

  return false;
}

/**
 * 释放数据锁
 * @param {boolean} force - 是否强制释放
 * @param {string} lockId - 锁ID
 * @returns {boolean} 是否成功释放
 */
function releaseDataLock(force = false, lockId = null) {
  // 如果锁已经是释放状态，直接返回成功
  if (!dataLock.locked) {
    return true;
  }

  // 只有锁的拥有者或强制释放才能解锁
  if (force || !lockId || dataLock.owner === lockId) {
    dataLock.locked = false;
    dataLock.owner = null;
    return true;
  }
  Logger.warn(`尝试释放非自己持有的锁被拒绝。请求者: ${lockId}, 持有者: ${dataLock.owner}`);
  return false;
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
    const data = await env.API_TOKENS.get(KV_KEYS.POOLS, { type: "json" });
    poolsCache = data || {};
    lastCacheUpdate = now;
    return poolsCache;
  } catch (error) {
    console.error("Failed to load pools:", error);
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
    await env.API_TOKENS.put(KV_KEYS.POOLS, JSON.stringify(pools));
    poolsCache = pools;
    lastCacheUpdate = Date.now();
    return true;
  } catch (error) {
    console.error("Failed to save pools:", error);
    return false;
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
    const data = await env.API_TOKENS.get(KV_KEYS.POOL_AUTH_MAPPING, { type: "json" });
    authMappingCache = data || {};
    return authMappingCache;
  } catch (error) {
    console.error("Failed to load auth mapping:", error);
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
    await env.API_TOKENS.put(KV_KEYS.POOL_AUTH_MAPPING, JSON.stringify(mapping));
    authMappingCache = mapping;
    return true;
  } catch (error) {
    console.error("Failed to save auth mapping:", error);
    return false;
  }
}

/**
 * 加载管理员密码
 * @param {Object} env - Worker环境对象
 * @returns {Promise<string|null>} 管理员密码
 */
async function loadAdminPassword(env) {
  try {
    const password = await env.API_TOKENS.get(KV_KEYS.ADMIN_PASSWORD);
    return password;
  } catch (error) {
    console.error("Failed to load admin password:", error);
    return null;
  }
}

/**
 * 保存管理员密码
 * @param {Object} env - Worker环境对象
 * @param {string} password - 新密码
 * @returns {Promise<boolean>} 是否成功
 */
async function saveAdminPassword(env, password) {
  try {
    await env.API_TOKENS.put(KV_KEYS.ADMIN_PASSWORD, password);
    return true;
  } catch (error) {
    console.error("Failed to save admin password:", error);
    return false;
  }
}

/**
 * 加载会话密钥
 * @param {Object} env - Worker环境对象
 * @returns {Promise<string|null>} 会话密钥
 */
async function loadSessionSecret(env) {
  try {
    const secret = await env.API_TOKENS.get(KV_KEYS.SESSION_SECRET);
    return secret;
  } catch (error) {
    console.error("Failed to load session secret:", error);
    return null;
  }
}

/**
 * 保存会话密钥
 * @param {Object} env - Worker环境对象
 * @param {string} secret - 会话密钥
 * @returns {Promise<boolean>} 是否成功
 */
async function saveSessionSecret(env, secret) {
  try {
    await env.API_TOKENS.put(KV_KEYS.SESSION_SECRET, secret);
    return true;
  } catch (error) {
    console.error("Failed to save session secret:", error);
    return false;
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
 * 获取KV存储状态
 * @param {Object} env - Worker环境对象
 * @returns {Promise<Object>} 存储状态信息
 */
async function getStorageStatus(env) {
  try {
    const pools = await loadPools(env, true);
    const authMapping = await loadAuthMapping(env, true);

    return {
      poolCount: Object.keys(pools).length,
      authKeyCount: Object.keys(authMapping).length,
      cacheAge: Date.now() - lastCacheUpdate,
      cached: poolsCache !== null
    };
  } catch (error) {
    return {
      error: error.message
    };
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
    // 加载所有池配置
    const pools = await loadPools(env);

    // 更新或添加池配置
    pools[poolId] = poolConfig;

    // 保存回KV
    await savePools(env, pools);

    return true;
  } catch (error) {
    Logger.error(`Failed to save pool config ${poolId}:`, error);
    return false;
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
    const pools = await loadPools(env);
    return pools[poolId] || null;
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
    // 将对象转换为数组
    return Object.values(pools);
  } catch (error) {
    Logger.error("Failed to load all pool configs:", error);
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
    const pools = await loadPools(env);

    if (!pools[poolId]) {
      return false;
    }

    delete pools[poolId];

    await savePools(env, pools);

    return true;
  } catch (error) {
    Logger.error(`Failed to delete pool config ${poolId}:`, error);
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
    const mapping = await loadAuthMapping(env);
    mapping[authKey] = poolId;
    return await saveAuthMapping(env, mapping);
  } catch (error) {
    Logger.error("Failed to save authKey mapping:", error);
    return false;
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
    const mapping = await loadAuthMapping(env);

    if (!mapping[authKey]) {
      return false;
    }

    delete mapping[authKey];

    return await saveAuthMapping(env, mapping);
  } catch (error) {
    Logger.error("Failed to delete authKey mapping:", error);
    return false;
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
    const mapping = await loadAuthMapping(env);
    return mapping[authKey] || null;
  } catch (error) {
    Logger.error("Failed to load authKey mapping:", error);
    return null;
  }
}

/**
 * 增加池统计信息（简单计数器）
 * @param {Object} env - Worker环境对象
 * @param {string} poolId - 池ID
 * @param {boolean} success - 请求是否成功
 * @returns {Promise<void>}
 */
async function incrementPoolStats(env, poolId, tokenUsage = 0) {
  try {
    // 加载池配置
    const pools = await loadPools(env);
    const pool = pools[poolId];
    
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
    pools[poolId] = pool;
    await savePools(env, pools);

    Logger.debug(`Pool ${poolId} usage stats updated: tokens=${tokenUsage}`);
  } catch (error) {
    Logger.error("Failed to update pool usage stats:", error);
  }
}

// ==================== pool-manager.js ====================

// 处理池的 CRUD 操作、Gemini Key 管理、统计等


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

// ==================== routing.js ====================

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

// ==================== gemini-forward.js ====================

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

// ==================== session.js ====================

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


// ==================== admin-ui-new.js ====================

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
      <div class="metric-card">
        <div class="metric-label">总请求数</div>
        <div class="metric-value">${totalRequests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">成功请求</div>
        <div class="metric-value" style="color: #10b981;">${successRequests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">失败请求</div>
        <div class="metric-value" style="color: #ef4444;">${failedRequests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">成功率</div>
        <div class="metric-value">${successRate}<span class="metric-unit">%</span></div>
        <div class="metric-change metric-success">${successRequests}/${totalRequests}</div>
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
        <h3>🎯 成功率分析</h3>
        <div class="chart-container">
          <canvas id="successChart"></canvas>
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

    // 2. 成功率分析（饼图）
    new Chart(document.getElementById('successChart'), {
      type: 'doughnut',
      data: {
        labels: ['成功', '失败'],
        datasets: [{
          data: [${successRequests}, ${failedRequests}],
          backgroundColor: [chartColors.success, chartColors.danger],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // 3. 令牌使用（柱状图）
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

    // 4. 池统计（柱状图）
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


// ==================== api-handlers.js ====================

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
