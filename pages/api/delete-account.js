// pages/api/delete-account.js
import { parse } from 'cookie';
const { decrementCount } = require('../../lib/counter');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '不支持的请求方法' });
  }

  try {
    // 从cookie获取认证信息
    const cookies = parse(req.headers.cookie || '');
    const oauthUsername = cookies.oauthUsername;
    const trustLevel = parseInt(cookies.oauthTrustLevel || '0', 10);
    
    // 检查身份验证
    if (!oauthUsername || trustLevel < 3) {
      return res.status(403).json({ message: '权限不足' });
    }
    
    // 构建学生邮箱
    const rawDom = process.env.EMAIL_DOMAIN;
    const domain = rawDom.startsWith('@') ? rawDom : '@' + rawDom;
    const studentEmail = oauthUsername.includes('@') ? oauthUsername : `${oauthUsername}${domain}`;
    
    // TODO: 这里应该有删除 Google Workspace 账户的代码
    console.log(`删除用户: ${studentEmail}`);
    
    // 假设删除成功，减少注册计数
    await decrementCount();
    
    // 返回成功消息
    res.status(200).json({ message: '账户已成功删除' });
  } catch (error) {
    console.error('删除账户处理出错:', error);
    res.status(500).json({ message: '服务器处理删除请求时出错' });
  }
}
