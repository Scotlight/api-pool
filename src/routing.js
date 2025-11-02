// ==================== 路由模块 ====================
// 处理请求路由、authKey验证、模型检查、Key选择

import { loadAuthKeyMapping } from './kv-storage.js';
import { getPool } from './pool-manager.js';
import { HTTP_STATUS, ERROR_TYPES } from './constants.js';

/**
 * 从请求中提取 authKey
 * @param {Request} request - 请求对象
 * @returns {string|null} authKey 或 null
 */
export function extractAuthKey(request) {
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
export function validateRequest(request) {
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
export async function findPoolByAuthKey(env, authKey) {
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
export function isModelAllowed(pool, modelName) {
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
export function selectGeminiKey(pool) {
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
export async function routeRequest(env, authKey, modelName) {
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
