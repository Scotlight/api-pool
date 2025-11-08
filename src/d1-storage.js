// ==================== D1 数据库存储模块 ====================
// 使用 Cloudflare D1 数据库存储池配置（替代 KV）

import { CACHE_TTL } from './constants.js';
import { Logger } from './utils.js';

// 内存缓存
let poolsCache = null;
let authMappingCache = null;
let lastCacheUpdate = 0;

/**
 * 初始化数据库表（如果不存在）
 * @param {Object} db - D1 数据库对象
 */
export async function initializeDatabase(db) {
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
      db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_pools_updated ON pools(updated_at DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_auth_pool ON auth_mappings(pool_id)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`)
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
export async function loadPools(env, forceRefresh = false) {
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
export async function savePools(env, pools) {
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
export async function savePoolConfig(env, poolId, poolConfig) {
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
export async function loadPoolConfig(env, poolId) {
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
export async function loadAllPoolConfigs(env, forceRefresh = false) {
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
export async function deletePoolConfig(env, poolId) {
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
export async function loadAuthMapping(env, forceRefresh = false) {
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
export async function saveAuthMapping(env, mapping) {
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
export async function saveAuthKeyMapping(env, authKey, poolId) {
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
export async function deleteAuthKeyMapping(env, authKey) {
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
export async function loadAuthKeyMapping(env, authKey) {
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
export async function incrementPoolStats(env, poolId, tokenUsage = 0) {
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
export function clearCache() {
  poolsCache = null;
  authMappingCache = null;
  lastCacheUpdate = 0;
}

/**
 * 数据锁机制（D1 使用事务，这里提供兼容接口）
 */
export function acquireDataLock(operationId = null) {
  return operationId || `op-${Date.now()}`;
}

export function releaseDataLock(force = false, lockId = null) {
  return true;
}
