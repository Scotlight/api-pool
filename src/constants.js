// ==================== 常量定义模块 ====================
// 定义所有系统常量：API URL、KV键、模型列表等

// Gemini API 基础URL
export const API_BASE_URL = "https://generativelanguage.googleapis.com";

// Gemini API 路径
export const GEMINI_CHAT_NATIVE_PATH = "/v1/models/";
export const GEMINI_EMBEDDING_NATIVE_PATH = "/v1/models/embedding-001:embedContent";

// OpenAI 兼容端点
export const API_ENDPOINTS = {
  chat: "/v1/chat/completions",
  embeddings: "/v1/embeddings",
};

// KV 存储键
export const KV_KEYS = {
  POOLS: "pools",                          // 存储所有池配置
  POOL_AUTH_MAPPING: "pool_auth_mapping",  // authKey -> poolId 映射
  ADMIN_PASSWORD: "admin_password",        // 管理员密码
  SESSION_SECRET: "session_secret",        // 会话密钥
};

// 缓存配置
export const CACHE_TTL = 30000; // 30秒缓存

// 所有支持的 Gemini 模型（23个）
export const ALL_GEMINI_MODELS = [
  // Gemini 2.5 Series - 最新最强
  "gemini-2.5-pro-latest",
  "gemini-2.5-flash-latest",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  
  // Gemini 2.0 Series - 实验性功能
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-thinking-exp-1219",
  "gemini-2.0-flash-thinking-exp",
  
  // Gemini 1.5 Pro Series - 高性能
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro-002",
  "gemini-1.5-pro-001",
  
  // Gemini 1.5 Flash Series - 快速高效
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.5-flash-8b-001",
  
  // Experimental Models - 实验版本
  "gemini-exp-1206",
  "gemini-exp-1121",
  "gemini-exp-1114",
  
  // Legacy Models - 传统模型
  "gemini-pro",
  "gemini-pro-vision"
];

// 模型系列分类
export const MODEL_FAMILIES = {
  "2.5": ["gemini-2.5-pro-latest", "gemini-2.5-flash-latest", "gemini-2.5-pro", "gemini-2.5-flash"],
  "2.0": ["gemini-2.0-flash-exp", "gemini-2.0-flash-thinking-exp-1219", "gemini-2.0-flash-thinking-exp"],
  "1.5-pro": ["gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-1.5-pro-002", "gemini-1.5-pro-001"],
  "1.5-flash": [
    "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-002", "gemini-1.5-flash-001",
    "gemini-1.5-flash-8b", "gemini-1.5-flash-8b-latest", "gemini-1.5-flash-8b-001"
  ],
  "experimental": ["gemini-exp-1206", "gemini-exp-1121", "gemini-exp-1114"],
  "legacy": ["gemini-pro", "gemini-pro-vision"]
};

// HTTP 状态码
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

// 错误类型
export const ERROR_TYPES = {
  INVALID_REQUEST: "invalid_request_error",
  AUTHENTICATION: "authentication_error",
  PERMISSION: "permission_error",
  NOT_FOUND: "not_found_error",
  RATE_LIMIT: "rate_limit_error",
  SERVER_ERROR: "server_error",
};
