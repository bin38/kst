import { parse } from 'cookie'
const { incrementCount, readCountAndLimit } = require('../../lib/counter');
const { isDbConnected, checkDbConnection } = require('../../lib/db');

// 密码验证函数 (服务端)
const validatePasswordServer = (pwd) => {
  if (!pwd || pwd.length < 8) return false;
  if (!/\d/.test(pwd)) return false;
  if (!/[a-zA-Z]/.test(pwd)) return false;
  return true;
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST')
    return res.status(405).end('Method Not Allowed')
  }

  const cookies       = parse(req.headers.cookie || '')
  const oauthUsername = cookies.oauthUsername
  const trustLevel    = parseInt(cookies.oauthTrustLevel||'0',10)
  const requiredLevel = parseInt(process.env.REQUIRED_TRUST_LEVEL || '3', 10)

  // 先检查 OAuth2 身份验证
  if (!oauthUsername) {
    return res.status(403).end('Forbidden')
  }

  // 修改：接收 givenName 和 familyName
  const { givenName, familyName, semester, program, personalEmail, password } = req.body

  // --- 服务器端验证 ---
  if (!givenName || givenName.trim().length < 2) {
    return res.status(400).end('Given name must be at least 2 characters long.');
  }
  if (!familyName || familyName.trim().length < 2) {
    return res.status(400).end('Family name must be at least 2 characters long.');
  }
  if (!validatePasswordServer(password)) {
    return res.status(400).end('Password must be at least 8 characters long and include both letters and numbers.');
  }
  if (!personalEmail || !personalEmail.includes('@')) { // 简单的邮箱格式检查
    return res.status(400).end('Invalid personal email address.');
  }
  // 检查其他字段是否存在（如果需要）
  if (!semester || !program) {
    return res.status(400).end('Missing semester or program.');
  }
  // --- 验证结束 ---


  // 学生邮箱
  const rawDom = process.env.EMAIL_DOMAIN||'chatgpt.org.uk'
  const domain = rawDom.startsWith('@')?rawDom:'@'+rawDom
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}${domain}`

  let access_token;
  try {
    // 获取 Google Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type:    'refresh_token'
      })
    })
    const { access_token: newAccessToken } = await tokenRes.json()
    access_token = newAccessToken

    // 防重复注册：询问 Google 目录
    const dirRes = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(studentEmail)}`,
      { headers:{ Authorization:`Bearer ${access_token}` } }
    )
    if (dirRes.ok) {
      // 用户已存在，直接跳转到学生门户
      return res.redirect(302, '/student-portal')
    }

    // 用户不存在，检查信任等级
    if (trustLevel < requiredLevel) {
      return res.redirect(302, '/insufficient-level')
    }

    // 在创建用户前检查名额
    const { count, limit } = await readCountAndLimit();
    if (count >= limit) {
      console.warn(`API Register: 注册尝试失败，名额已满 (${count}/${limit})`);
      // 重定向到专门的名额已满页面
      return res.redirect(302, '/quota-exceeded');
    }


    // 创建 G Suite 用户 - 直接使用验证过的 givenName 和 familyName
    const createRes = await fetch(
      'https://admin.googleapis.com/admin/directory/v1/users',
      {
        method:'POST',
        headers:{
          Authorization:`Bearer ${access_token}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          // 直接使用传入并验证过的字段
          name:{ givenName: givenName.trim(), familyName: familyName.trim() },
          password,
          primaryEmail: studentEmail,
          recoveryEmail: personalEmail,
          // orgUnitPath: '/Students' // 示例
        })
      }
    )
    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error('API Register: 创建 Google 用户失败:', createRes.status, errorText);
      // 尝试解析 Google 返回的错误信息
      let userMessage = 'Could not create student account';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          userMessage += `: ${errorJson.error.message}`;
        }
      } catch (e) { /* 忽略 JSON 解析错误 */ }
      return res.status(500).end(userMessage);
    }

    // 成功创建 Google 用户后，增加注册计数
    try {
      await incrementCount();
      console.log(`API Register: 用户 ${studentEmail} 创建成功，计数已增加`);
    } catch (counterError) {
      // 计数器错误不应阻止用户注册成功，但需要记录严重错误
      console.error(`API Register: 严重错误 - 用户 ${studentEmail} 已在 Google 创建，但增加注册计数失败:`, counterError);
      // 可以考虑发送告警邮件或记录到专门的日志
      // 但仍然让用户继续，因为 Google 账户已创建
    }


    // 完成后直奔 portal
    res.redirect(302, '/student-portal')

  } catch (error) {
    console.error('API Register: 发生意外错误:', error);
    // 根据错误类型返回不同的状态码
    if (error.message.includes('Google token') || error.message.includes('Google Directory')) {
      return res.status(503).end('Service unavailable (Google API error)');
    }
    if (error.message.includes('数据库连接失败')) {
      return res.status(503).end('Database service unavailable');
    }
    if (error.message.includes('注册名额已满')) {
       // 理论上这里不会执行，因为前面已经检查并重定向了，但作为保险
       return res.redirect(302, '/quota-exceeded');
    }
    return res.status(500).end('An unexpected error occurred during registration.');
  }
}
