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
