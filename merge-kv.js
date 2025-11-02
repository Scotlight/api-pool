// ==================== KV 版本合并脚本 (Node.js) ====================
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('多池隔离系统 - KV 版本合并工具');
console.log('========================================\n');

// 定义 KV 版本的模块文件顺序（按依赖关系排序）
const modules = [
  'constants.js',
  'utils.js',
  'kv-storage.js',        // 只使用 KV 存储
  'model-fetcher.js',
  'pool-manager.js',
  'routing.js',
  'streaming.js',
  'gemini-forward.js',
  'session.js',
  'admin-ui-new.js',
  'pool-create-ui.js',
  'pool-detail-ui.js',
  'api-handlers.js'
];

// 输出文件路径
const outputFile = path.join(__dirname, 'worker_kv.js');

console.log('准备合并 KV 版本模块:');
modules.forEach(m => console.log(`  • ${m}`));
console.log('');

// 开始合并
console.log('正在合并模块...\n');

// 文件头部
let output = `// ==================== 多池隔离系统 v3.0 (KV 存储版本) ====================
// 自动生成于: ${new Date().toISOString()}
// 
// 这是一个真正的多池隔离系统 - KV 存储版本：
// - 多个独立的池，完全隔离
// - 每个池有自己的 authKey (sk-pool-xxxx)
// - 每个池管理自己的 Gemini API Keys
// - 每个池可限制允许使用的模型
// - 支持 23 个 Gemini 模型
// 
// 存储方式: Cloudflare KV
// 适用场景: <10 个池，简单部署
// 配置要求: 需要创建 KV 命名空间，绑定为 API_TOKENS

`;

// 合并所有模块
for (const module of modules) {
  const modulePath = path.join(__dirname, 'src', module);
  
  try {
    if (fs.existsSync(modulePath)) {
      console.log(`  ✓ 合并 ${module}`);
      
      // 读取模块内容
      let content = fs.readFileSync(modulePath, 'utf8');
      
      // 移除 import 语句
      content = content.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];\r?\n?/g, '');
      content = content.replace(/import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];\r?\n?/g, '');
      
      // 移除 export 关键字
      content = content.replace(/export\s+async\s+function/g, 'async function');
      content = content.replace(/export\s+function/g, 'function');
      content = content.replace(/export\s+(const|let|var)/g, '$1');
      content = content.replace(/export\s+{[^}]+};?\r?\n?/g, '');
      
      // 特殊处理 pool-manager.js，移除 storage.js 的引用
      if (module === 'pool-manager.js') {
        // 将 storage.js 的导入替换为直接使用 kv-storage.js 的函数
        content = content.replace(/await\s+storage\./g, 'await ');
      }
      
      // 添加模块分隔注释
      output += `\n\n// ==================== 模块: ${module} ====================\n`;
      output += content;
      
    } else {
      console.log(`  ✗ 找不到 ${module}`);
    }
  } catch (error) {
    console.error(`  ✗ 处理 ${module} 时出错:`, error.message);
  }
}

// 添加主入口（从 index.js 提取）
console.log('\n正在添加主入口函数...');

const indexPath = path.join(__dirname, 'src', 'index.js');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // 移除 import 语句
  indexContent = indexContent.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];\r?\n?/g, '');
  
  // 移除前面的注释
  indexContent = indexContent.replace(/^\/\/.*\n/gm, '');
  
  output += '\n\n// ==================== 主入口函数 ====================\n';
  output += indexContent;
} else {
  console.log('  ✗ 找不到 index.js，跳过');
}

// 写入输出文件
try {
  fs.writeFileSync(outputFile, output, 'utf8');
  
  const stats = fs.statSync(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const lines = output.split('\n').length;
  
  console.log('\n✓ KV 版本合并完成！\n');
  console.log(`输出文件: worker_kv.js`);
  console.log(`  大小: ${sizeKB} KB`);
  console.log(`  行数: ${lines}`);
  console.log('');
  
  console.log('========================================');
  console.log('下一步:');
  console.log('========================================\n');
  console.log('1. 复制配置文件:');
  console.log('   cp wrangler-kv.toml.example wrangler.toml');
  console.log('');
  console.log('2. 创建 KV 并修改 wrangler.toml 中的 id:');
  console.log('   wrangler kv:namespace create "API_TOKENS"');
  console.log('');
  console.log('3. 设置密码并部署:');
  console.log('   wrangler secret put ADMIN_PASSWORD');
  console.log('   wrangler deploy');
  console.log('');
  
} catch (error) {
  console.error('\n✗ 写入文件失败:', error.message);
  process.exit(1);
}
