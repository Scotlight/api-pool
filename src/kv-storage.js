// ==================== KV 存储模块 ====================
// 处理所有 KV 存储操作：池配置、authKey映射等

import { KV_KEYS, CACHE_TTL } from './constants.js';
import { Logger } from './utils.js';

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
export function acquireDataLock(operationId = null) {
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
export function releaseDataLock(force = false, lockId = null) {
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
export async function loadPools(env, forceRefresh = false) {
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
export async function savePools(env, pools) {
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
export async function loadAuthMapping(env, forceRefresh = false) {
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
export async function saveAuthMapping(env, mapping) {
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
export async function loadAdminPassword(env) {
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
export async function saveAdminPassword(env, password) {
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
export async function loadSessionSecret(env) {
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
export async function saveSessionSecret(env, secret) {
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
export function clearCache() {
  poolsCache = null;
  authMappingCache = null;
  lastCacheUpdate = 0;
}

/**
 * 获取KV存储状态
 * @param {Object} env - Worker环境对象
 * @returns {Promise<Object>} 存储状态信息
 */
export async function getStorageStatus(env) {
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
export async function savePoolConfig(env, poolId, poolConfig) {
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
export async function loadPoolConfig(env, poolId) {
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
export async function loadAllPoolConfigs(env, forceRefresh = false) {
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
export async function deletePoolConfig(env, poolId) {
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
export async function saveAuthKeyMapping(env, authKey, poolId) {
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
export async function deleteAuthKeyMapping(env, authKey) {
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
export async function loadAuthKeyMapping(env, authKey) {
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
export async function incrementPoolStats(env, poolId, tokenUsage = 0) {
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
