import { parse } from 'cookie';
const { updateLimit } = require('../../../lib/counter');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '不支持的请求方法' });
  }

  try {
    // 从cookie获取认证信息
    const cookies = parse(req.headers.cookie || '');
    const oauthUsername = cookies.oauthUsername;
    const trustLevel = parseInt(cookies.oauthTrustLevel || '0', 10);
    
    // 检查管理员权限 (假设管理员需要 trustLevel 5 或以上)
    if (!oauthUsername || trustLevel < 5) {
      return res.status(403).json({ message: '需要管理员权限' });
    }
    
    const { limit } = req.body;
    
    if (!limit || !Number.isInteger(parseInt(limit, 10)) || parseInt(limit, 10) < 0) {
      return res.status(400).json({ message: '请提供有效的名额限制数值' });
    }
    
    // 更新限额
    const newLimit = await updateLimit(parseInt(limit, 10));
    
    res.status(200).json({ 
      message: '注册名额限制已更新',
      newLimit 
    });
  } catch (error) {
    console.error('更新名额限制出错:', error);
    res.status(500).json({ message: '服务器处理请求时出错' });
  }
}
