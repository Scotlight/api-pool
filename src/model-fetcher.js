// ==================== 模型动态获取模块 ====================
// 通过 Gemini API 动态获取可用模型列表

import { API_BASE_URL } from './constants.js';
import { Logger } from './utils.js';

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
export async function fetchGeminiModels(apiKey) {
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
export async function getGeminiModels(apiKey, forceRefresh = false) {
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
export async function getGeminiModelsFromPool(apiKeys, forceRefresh = false) {
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
export function isValidModel(modelId, models = null) {
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
export function getModelInfo(modelId, models = null) {
  const modelList = models || modelListCache.models;

  if (!modelList || modelList.length === 0) {
    return null;
  }

  return modelList.find(model => model.id === modelId) || null;
}

/**
 * 清除模型列表缓存
 */
export function clearModelCache() {
  modelListCache.models = null;
  modelListCache.timestamp = 0;
  Logger.debug('模型列表缓存已清除');
}

/**
 * 设置模型缓存 TTL
 * @param {number} ttl - 缓存时间（毫秒）
 */
export function setModelCacheTTL(ttl) {
  modelListCache.ttl = ttl;
  Logger.debug(`模型缓存 TTL 已设置为 ${ttl}ms`);
}

/**
 * 获取缓存状态
 * @returns {Object} 缓存信息
 */
export function getModelCacheStatus() {
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
