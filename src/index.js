// ==================== 主入口文件 ====================
// Cloudflare Workers 主处理程序

import { HTTP_STATUS, ERROR_TYPES } from './constants.js';
import { jsonResponse, errorResponse, htmlResponse } from './utils.js';
import { validateRequest, routeRequest } from './routing.js';
import { forwardChatCompletion, forwardEmbedding } from './gemini-forward.js';
import { login, verifyAdminRequest, createSessionCookie, SESSION_TIMEOUT_SECONDS } from './session.js';
import { generateLoginHTML, generateDashboardHTML } from './admin-ui-new.js';
import { generateCreatePoolHTML } from './pool-create-ui.js';
import { generatePoolDetailHTML } from './pool-detail-ui.js';
import { routeApiRequest, handleGetModels } from './api-handlers.js';
import { getAllPools } from './pool-manager.js';
import { getModelCacheStatus } from './model-fetcher.js';

/**
 * Cloudflare Workers 主处理函数
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    try {
      // 处理 CORS 预检请求
      if (method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
      }
      
      // ===========================================
      // 管理界面路由
      // ===========================================
      
      // 登录页面
      if (path === "/login") {
        return htmlResponse(generateLoginHTML());
      }
      
      // 登录 API
      if (path === "/api/login" && method === "POST") {
        const body = await request.json();
        const result = await login(env, body.password);
        
        if (result.success) {
          return jsonResponse(result, HTTP_STATUS.OK, {
            "Set-Cookie": createSessionCookie(result.sessionToken, SESSION_TIMEOUT_SECONDS)
          });
        } else {
          return jsonResponse(result, HTTP_STATUS.UNAUTHORIZED);
        }
      }
      
      // 管理后台首页
      if (path === "/admin" || path === "/") {
        // 验证会话
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }

        // 获取所有池并渲染
        const pools = await getAllPools(env, true);
        return htmlResponse(generateDashboardHTML(pools));
      }

      // 创建池页面
      if (path === "/admin/create-pool") {
        // 验证会话
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }

        return htmlResponse(generateCreatePoolHTML());
      }

      // 单个池详情页面
      const poolDetailMatch = path.match(/^\/admin\/pools\/([^\/]+)$/);
      if (poolDetailMatch) {
        // 验证会话
        if (!verifyAdminRequest(request)) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }

        const poolId = poolDetailMatch[1];
        return htmlResponse(generatePoolDetailHTML(poolId));
      }
      
      // ===========================================
      // API 管理端点
      // ===========================================
      
      if (path.startsWith("/api/pools")) {
        // 验证管理员权限
        if (!verifyAdminRequest(request)) {
          return jsonResponse({
            success: false,
            message: "未授权：请先登录"
          }, HTTP_STATUS.UNAUTHORIZED);
        }
        
        // 路由到对应的处理器
        return await routeApiRequest(request, env);
      }
      
      // ===========================================
      // OpenAI 兼容的 API 端点
      // ===========================================
      
      // Chat Completions (支持 /v1/chat/completions 和 /api/chat/completions)
      if ((path === "/v1/chat/completions" || path === "/api/chat/completions") && method === "POST") {
        // 1. 验证请求（提取 authKey）
        const validation = validateRequest(request);
        if (!validation.valid) {
          return errorResponse(
            validation.error,
            ERROR_TYPES.AUTHENTICATION,
            HTTP_STATUS.UNAUTHORIZED
          );
        }
        
        // 2. 解析请求体
        const reqBody = await request.json();
        const modelName = reqBody.model;
        
        if (!modelName) {
          return errorResponse(
            "缺少模型名称",
            ERROR_TYPES.INVALID_REQUEST,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        
        // 3. 路由请求（找到对应的池和 Gemini Key）
        const routeResult = await routeRequest(env, validation.authKey, modelName);
        if (!routeResult.success) {
          return errorResponse(
            routeResult.error,
            routeResult.errorType,
            routeResult.statusCode
          );
        }
        
        // 4. 转发到 Gemini API
        return await forwardChatCompletion(
          env,
          routeResult.pool,
          routeResult.geminiKey,
          reqBody
        );
      }
      
      // Embeddings
      if (path === "/v1/embeddings" && method === "POST") {
        // 1. 验证请求
        const validation = validateRequest(request);
        if (!validation.valid) {
          return errorResponse(
            validation.error,
            ERROR_TYPES.AUTHENTICATION,
            HTTP_STATUS.UNAUTHORIZED
          );
        }
        
        // 2. 解析请求体
        const reqBody = await request.json();
        const modelName = reqBody.model || "embedding-001";
        
        // 3. 路由请求
        const routeResult = await routeRequest(env, validation.authKey, modelName);
        if (!routeResult.success) {
          return errorResponse(
            routeResult.error,
            routeResult.errorType,
            routeResult.statusCode
          );
        }
        
        // 4. 转发到 Gemini API
        return await forwardEmbedding(
          env,
          routeResult.pool,
          routeResult.geminiKey,
          reqBody
        );
      }
      
      // Models 列表（OpenAI 兼容）- 使用动态获取 (支持 /v1/models 和 /api/models)
      if ((path === "/v1/models" || path === "/api/models") && method === "GET") {
        return await handleGetModels(env);
      }
      
      // Open WebUI 特定端点 - chat completed 回调
      if (path === "/api/chat/completed" && method === "POST") {
        // Open WebUI 在对话完成后会调用此端点
        // 我们简单返回成功即可
        return jsonResponse({ success: true, message: "Chat completed" });
      }
      
      // ===========================================
      // 默认响应 - API 信息
      // ===========================================

      // 获取模型缓存状态
      const modelCacheStatus = getModelCacheStatus();

      return jsonResponse({
        name: "多池隔离系统",
        version: "3.0",
        description: "真正的多池隔离 Gemini API 代理系统",
        endpoints: {
          admin: {
            login: "/login",
            dashboard: "/admin"
          },
          management: {
            pools: "/api/pools",
            poolDetail: "/api/pools/{poolId}"
          },
          api: {
            chat: "/v1/chat/completions",
            embeddings: "/v1/embeddings",
            models: "/v1/models"
          }
        },
        features: [
          "✓ 真正的多池隔离",
          "✓ 独立认证密钥 (sk-pool-xxxx)",
          "✓ 每池独立 Gemini API Keys",
          "✓ 每池独立模型限制",
          "✓ 动态获取 Gemini 模型列表",
          "✓ OpenAI 格式兼容",
          "✓ 流式输出支持",
          "✓ 多模态支持（文本+图片）",
          "✓ 请求统计和监控"
        ],
        supportedModels: modelCacheStatus.modelCount || "动态获取",
        modelCacheStatus: modelCacheStatus.isValid ? "已缓存" : "未缓存",
        documentation: "https://github.com/your-repo/multi-pool-system"
      });
      
    } catch (error) {
      console.error("请求处理错误:", error);
      return errorResponse(
        "服务器内部错误: " + error.message,
        ERROR_TYPES.SERVER_ERROR,
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  }
};
