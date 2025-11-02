-- =====================================================
-- Gemini API 多池管理系统 - D1 数据库初始化脚本
-- =====================================================
-- 
-- 注意：此文件仅供参考！
-- 系统会在首次运行时自动创建所需的表和索引
-- 无需手动执行此 SQL 文件
-- =====================================================

-- 创建池配置表
CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,                -- 池 ID (pool-xxxxx-xxxxxx)
  config TEXT NOT NULL,               -- 池配置 JSON
  created_at INTEGER NOT NULL,        -- 创建时间戳
  updated_at INTEGER NOT NULL         -- 更新时间戳
);

-- 创建 Auth Key 映射表
CREATE TABLE IF NOT EXISTS auth_mappings (
  auth_key TEXT PRIMARY KEY,          -- Auth Key (sk-pool-xxxxxxxxxx)
  pool_id TEXT NOT NULL,              -- 对应的池 ID
  created_at INTEGER NOT NULL         -- 创建时间戳
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_pools_updated 
ON pools(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_pool 
ON auth_mappings(pool_id);

-- 创建池统计表（可选，用于存储历史统计数据）
CREATE TABLE IF NOT EXISTS pool_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pool_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  tokens INTEGER DEFAULT 0,
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stats_pool_time 
ON pool_stats(pool_id, timestamp DESC);

-- 插入测试数据（可选，用于验证）
-- INSERT INTO pools (id, config, created_at, updated_at) VALUES
-- ('test-pool-001', '{"id":"test-pool-001","name":"测试池","enabled":true}', 1704067200000, 1704067200000);
