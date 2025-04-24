import { updateLimit } from '../../lib/counter';

// 简单的授权检查 - 在实际生产环境中应该更严格
function checkAuth(req) {
  // 从请求头获取 API 密钥
  const apiKey = req.headers['x-api-key'];
  
  // 检查环境变量中设置的 API 密钥
  const validKey = process.env.ADMIN_API_KEY;
  
  // 如果没有设置环境变量或密钥不匹配，则授权失败
  if (!validKey || apiKey !== validKey) {
    return false;
  }
  
  return true;
}

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '只允许 POST 请求' });
  }
  
  // 检查授权
  if (!checkAuth(req)) {
    return res.status(401).json({ error: '未授权' });
  }
  
  try {
    const { limit } = req.body;
    
    // 验证 limit 是否为有效数字
    const newLimit = parseInt(limit, 10);
    if (isNaN(newLimit) || newLimit < 0) {
      return res.status(400).json({ error: '无效的限额值' });
    }
    
    // 更新限额
    await updateLimit(newLimit);
    
    return res.status(200).json({ 
      success: true, 
      message: `注册限额已更新为 ${newLimit}` 
    });
  } catch (error) {
    console.error('更新限额失败:', error);
    return res.status(500).json({ 
      error: '服务器错误', 
      message: error.message 
    });
  }
}
