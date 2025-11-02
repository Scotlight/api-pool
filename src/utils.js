// ==================== 工具函数模块 ====================
// 通用工具函数：ID生成、Key混淆、JSON响应等

import { HTTP_STATUS } from './constants.js';

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

export function setLogLevel(level) {
  if (["debug", "info", "warn", "error"].includes(level)) {
    logLevel = level;
  }
}

/**
 * 生成唯一ID（使用加密安全的随机数）
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = "pool") {
  const timestamp = Date.now().toString(36);
  // 生成加密安全的随机字节
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes)
    .map(byte => byte.toString(36))
    .join('')
    .substring(0, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 生成池的 authKey（使用加密安全的随机数）
 * @returns {string} 格式为 sk-pool-xxxx 的authKey
 */
export function generatePoolAuthKey() {
  // 生成 32 个随机字节的加密安全密钥
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  
  // 转换为十六进制字符串
  const randomHex = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  return `sk-pool-${randomHex.substring(0, 40)}`; // 取前 40 个字符
}

/**
 * 生成池ID（别名函数）
 * @returns {string} 池ID
 */
export function generatePoolId() {
  return generateId('pool');
}

/**
 * 生成authKey（别名函数）
 * @returns {string} authKey
 */
export function generateAuthKey() {
  return generatePoolAuthKey();
}

/**
 * 生成随机密钥（使用加密安全的随机数，用于会话等）
 * @param {number} length - 密钥长度
 * @returns {string} 随机密钥
 */
export function generateRandomKey(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomBytes[i] % chars.length);
  }
  return result;
}

/**
 * 混淆Key显示（只显示开头和结尾）
 * @param {string} key - 要混淆的Key
 * @returns {string} 混淆后的Key
 */
export function obfuscateKey(key) {
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
export function jsonResponse(data, status = HTTP_STATUS.OK, headers = {}) {
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
export function htmlResponse(html, status = HTTP_STATUS.OK) {
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
export function errorResponse(message, type, status) {
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
export function validateRequiredFields(obj, requiredFields) {
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
export function formatRelativeTime(timestamp) {
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
export function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 深度克隆对象
 * @param {Object} obj - 要克隆的对象
 * @returns {Object} 克隆后的对象
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 安全解析JSON
 * @param {string} str - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
export function safeJsonParse(str, defaultValue = null) {
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
export function isValidApiKey(key) {
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
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试间隔（毫秒）
 * @returns {Promise} Promise
 */
export async function retry(fn, maxRetries = 3, delay = 1000) {
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
export function getBJTimeString() {
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
export function estimateTokenCount(text, isChatMessage = false, textType = "normal") {
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
