import { parse } from 'cookie';
const { readCountAndLimit, incrementCount } = require('../../lib/counter');

// 辅助函数：检查Google用户是否存在
async function fetchGoogleUser(email) {
  // 刷新 token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  })
  if (!tokenRes.ok) return null
  const { access_token } = await tokenRes.json()
  
  // 查询 Directory
  const userRes = await fetch(
    `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )
  if (!userRes.ok) return null
  return await userRes.json()
}

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
    
    // 获取表单数据
    const { username, fullName, semester, program, password, personalEmail } = req.body;
    
    // 检查必填字段
    if (!username || !fullName || !semester || !program || !password || !personalEmail) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }
    
    // 构建学生邮箱
    const rawDom = process.env.EMAIL_DOMAIN;
    const domain = rawDom.startsWith('@') ? rawDom : '@' + rawDom;
    const studentEmail = username.includes('@') ? username : `${username}${domain}`;
    
    // *** 新增: 先检查用户是否已存在 ***
    const existingUser = await fetchGoogleUser(studentEmail);
    if (existingUser) {
      console.log(`用户 ${studentEmail} 已存在，直接跳转至学生门户`);
      res.writeHead(302, { Location: '/student-portal' });
      res.end();
      return;
    }
    // *** 检查结束 ***
    
    // 再次检查名额限制
    const { count, limit } = await readCountAndLimit();
    
    if (count >= limit) {
      return res.status(429).json({ message: '注册名额已满，请稍后再试' });
    }
    
    // TODO: 这里应该有创建 Google Workspace 账户的代码
    console.log(`创建用户: ${studentEmail}, 姓名: ${fullName}, 学期: ${semester}, 项目: ${program}`);
    
    // 假设创建成功，增加注册计数
    await incrementCount();
    
    // 重定向到学生门户
    res.writeHead(302, { Location: '/student-portal' });
    res.end();
  } catch (error) {
    console.error('注册处理出错:', error);
    
    if (error.message === '注册名额已满') {
      return res.status(429).json({ message: '注册名额已满，请稍后再试' });
    }
    
    res.status(500).json({ message: '服务器处理注册请求时出错' });
  }
}
