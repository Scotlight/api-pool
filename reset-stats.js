// 重置池统计数据的脚本
// 使用方法: node reset-stats.js

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('========================================');
console.log('池统计数据重置工具');
console.log('========================================\n');

console.log('⚠️  警告：此操作将重置选定池的所有统计数据！\n');

rl.question('请输入 Worker URL (例如: https://your-worker.workers.dev): ', (workerUrl) => {
  rl.question('请输入管理员密码: ', (password) => {
    rl.question('请输入要重置的池ID (留空则重置所有池): ', async (poolId) => {
      
      console.log('\n正在登录...');
      
      try {
        // 登录获取 session token
        const loginRes = await fetch(`${workerUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        
        if (!loginRes.ok) {
          console.error('❌ 登录失败：密码错误或服务器错误');
          rl.close();
          return;
        }
        
        const loginData = await loginRes.json();
        const sessionToken = loginData.sessionToken;
        const cookie = `session_token=${sessionToken}`;
        
        console.log('✓ 登录成功\n');
        
        // 获取所有池
        const poolsRes = await fetch(`${workerUrl}/api/pools`, {
          headers: { 'Cookie': cookie }
        });
        
        if (!poolsRes.ok) {
          console.error('❌ 获取池列表失败');
          rl.close();
          return;
        }
        
        const poolsData = await poolsRes.json();
        const pools = poolsData.pools || [];
        
        if (pools.length === 0) {
          console.log('没有找到任何池');
          rl.close();
          return;
        }
        
        console.log(`找到 ${pools.length} 个池\n`);
        
        // 筛选要重置的池
        const targetPools = poolId 
          ? pools.filter(p => p.id === poolId)
          : pools;
        
        if (targetPools.length === 0) {
          console.log(`❌ 未找到池ID: ${poolId}`);
          rl.close();
          return;
        }
        
        console.log(`准备重置 ${targetPools.length} 个池的统计数据...\n`);
        
        // 重置每个池
        for (const pool of targetPools) {
          console.log(`正在重置: ${pool.name} (${pool.id})`);
          
          // 构造重置后的池配置
          const updatedPool = {
            ...pool,
            stats: {
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
              lastRequestTime: null,
              totalTokens: 0,
              promptTokens: 0,
              completionTokens: 0,
              requestsLastMinute: [],
              requestsLastDay: []
            }
          };
          
          // 更新池
          const updateRes = await fetch(`${workerUrl}/api/pools/${pool.id}`, {
            method: 'PUT',
            headers: {
              'Cookie': cookie,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedPool)
          });
          
          if (updateRes.ok) {
            console.log(`  ✓ 重置成功`);
          } else {
            console.log(`  ✗ 重置失败: ${updateRes.status}`);
          }
        }
        
        console.log('\n========================================');
        console.log('✓ 统计数据重置完成！');
        console.log('========================================');
        console.log('\n刷新管理界面查看最新统计数据。');
        
      } catch (error) {
        console.error('\n❌ 错误:', error.message);
      }
      
      rl.close();
    });
  });
});

