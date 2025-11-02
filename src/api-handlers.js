// ==================== API 处理器模块 ====================
// 处理所有 /api/pools 相关的端点

import {
  createPool,
  getPool,
  getAllPools,
  updatePool,
  deletePool,
  regeneratePoolAuthKey,
  getPoolStats,
  validatePoolConfig
} from './pool-manager.js';
import { jsonResponse, errorResponse, obfuscateKey } from './utils.js';
import { HTTP_STATUS, ERROR_TYPES } from './constants.js';
import { getGeminiModelsFromPool, getModelCacheStatus } from './model-fetcher.js';
import { Logger } from './utils.js';

/**
 * GET /api/pools - 获取所有池列表
 * @param {Object} env - Worker环境对象
 * @returns {Promise<Response>} JSON响应
 */
export async function handleGetPools(env) {
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
export async function handleCreatePool(env, reqBody) {
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
export async function handleGetPoolDetail(env, poolId) {
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
export async function handleUpdatePool(env, poolId, updates) {
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
export async function handleDeletePool(env, poolId) {
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
export async function handleRegenerateAuthKey(env, poolId) {
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
export async function handleGetPoolStats(env, poolId) {
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
export async function handleGetModels(env) {
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
export async function routeApiRequest(request, env) {
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
