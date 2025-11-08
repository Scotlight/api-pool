// ==================== 会话管理模块 ====================
// 处理管理员认证和会话管理

import { generateRandomKey } from './utils.js';

const SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30天
const SESSION_TIMEOUT_SECONDS = 30 * 24 * 60 * 60; // 30天（秒）

// 导出会话超时时间供其他模块使用
export { SESSION_TIMEOUT_SECONDS };

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
export function verifyAdminPassword(env, password) {
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
 * @returns {Promise<Object>} { success: boolean, sessionToken?: string, message?: string }
 */
export async function login(env, password) {
  const isValid = verifyAdminPassword(env, password);

  if (!isValid) {
    return {
      success: false,
      message: "密码错误"
    };
  }

  // 生成 session token
  const sessionToken = generateRandomKey(32);
  const now = Date.now();
  const expiresAt = now + SESSION_TIMEOUT;

  // 存储到 D1 数据库
  try {
    await env.DB.prepare(`
      INSERT OR REPLACE INTO sessions (token, created_at, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionToken, now, expiresAt).run();

    return {
      success: true,
      sessionToken: sessionToken,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('保存session到D1失败:', error);
    return {
      success: false,
      message: "登录失败，请稍后重试"
    };
  }
}

/**
 * 验证 session token
 * @param {Object} env - Worker环境对象
 * @param {string} sessionToken - Session Token
 * @returns {Promise<boolean>} 是否有效
 */
export async function validateSession(env, sessionToken) {
  if (!sessionToken) {
    return false;
  }

  try {
    const result = await env.DB.prepare(`
      SELECT expires_at FROM sessions WHERE token = ?
    `).bind(sessionToken).first();

    if (!result) {
      return false;
    }

    const now = Date.now();
    // 检查是否过期
    if (now > result.expires_at) {
      // 删除过期session
      await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`)
        .bind(sessionToken).run();
      return false;
    }

    return true;
  } catch (error) {
    console.error('验证session失败:', error);
    return false;
  }
}

/**
 * 登出
 * @param {Object} env - Worker环境对象
 * @param {string} sessionToken - Session Token
 * @returns {Promise<boolean>} 是否成功
 */
export async function logout(env, sessionToken) {
  if (!sessionToken) {
    return false;
  }

  try {
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`)
      .bind(sessionToken).run();
    return true;
  } catch (error) {
    console.error('登出失败:', error);
    return false;
  }
}

/**
 * 创建 session cookie
 * @param {string} token - Session Token
 * @param {number} maxAge - Cookie 最大生存时间（秒），默认 30 天
 * @returns {string} Cookie 字符串
 */
export function createSessionCookie(token, maxAge = SESSION_TIMEOUT_SECONDS) {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * 从请求中提取 session token
 * @param {Request} request - 请求对象
 * @returns {string|null} Session Token 或 null
 */
export function extractSessionToken(request) {
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
 * @param {Object} env - Worker环境对象
 * @param {Request} request - 请求对象
 * @returns {Promise<boolean>} 是否有权限
 */
export async function verifyAdminRequest(env, request) {
  const sessionToken = extractSessionToken(request);
  
  if (!sessionToken) {
    return false;
  }
  
  return await validateSession(env, sessionToken);
}

/**
 * 清理过期的 sessions
 * @param {Object} env - Worker环境对象
 * @returns {Promise<number>} 删除的session数量
 */
export async function cleanupExpiredSessions(env) {
  try {
    const now = Date.now();
    const result = await env.DB.prepare(`
      DELETE FROM sessions WHERE expires_at < ?
    `).bind(now).run();
    return result.meta.changes || 0;
  } catch (error) {
    console.error('清理过期session失败:', error);
    return 0;
  }
}

/**
 * 获取活跃 session 数量
 * @param {Object} env - Worker环境对象
 * @returns {Promise<number>} 活跃 session 数量
 */
export async function getActiveSessionCount(env) {
  try {
    const now = Date.now();
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?
    `).bind(now).first();
    return result?.count || 0;
  } catch (error) {
    console.error('获取活跃session数量失败:', error);
    return 0;
  }
}

