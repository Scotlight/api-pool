// ==================== 会话管理模块 ====================
// 处理管理员认证和会话管理

import { generateRandomKey } from './utils.js';

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
 * @returns {Object} { success: boolean, sessionToken?: string, message?: string }
 */
export function login(env, password) {
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
export function validateSession(sessionToken) {
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
export function logout(sessionToken) {
  return sessions.delete(sessionToken);
}

/**
 * 创建 session cookie
 * @param {string} token - Session Token
 * @param {number} maxAge - Cookie 最大生存时间（秒）
 * @returns {string} Cookie 字符串
 */
export function createSessionCookie(token, maxAge = 86400) {
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
 * @param {Request} request - 请求对象
 * @returns {boolean} 是否有权限
 */
export function verifyAdminRequest(request) {
  const sessionToken = extractSessionToken(request);
  
  if (!sessionToken) {
    return false;
  }
  
  return validateSession(sessionToken);
}

/**
 * 清理过期的 sessions
 */
export function cleanupExpiredSessions() {
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
export function getActiveSessionCount() {
  cleanupExpiredSessions();
  return sessions.size;
}

