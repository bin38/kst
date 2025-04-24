import { parse } from 'cookie'
// 导入计数器函数
const { incrementCount, readCountAndLimit } = require('../../lib/counter');
const { isDbConnected, checkDbConnection } = require('../../lib/db'); // 导入数据库连接检查

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST')
    return res.status(405).end('Method Not Allowed')
  }

  const cookies       = parse(req.headers.cookie || '')
  const oauthUsername = cookies.oauthUsername
  const trustLevel    = parseInt(cookies.oauthTrustLevel||'0',10)

  if (!oauthUsername||trustLevel<3) {
    return res.status(403).end('Forbidden')
  }

  const { fullName, semester, program, personalEmail, password } = req.body
  if (!fullName||!semester||!program||!personalEmail||!password) {
    return res.status(400).end('Missing fields')
  }

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
      return res.status(400).end('This student is already registered')
    }

    // 在创建用户前检查名额
    const { count, limit } = await readCountAndLimit();
    if (count >= limit) {
      console.warn(`API Register: 注册尝试失败，名额已满 (${count}/${limit})`);
      // 重定向回首页并带上参数提示名额已满
      return res.redirect(302, '/?limit_reached=true');
    }

    // 拆分名字
    let [givenName,...rest] = fullName.trim().split(' ')
    const familyName = rest.join(' ')||givenName

    // 创建 G Suite 用户
    const createRes = await fetch(
      'https://admin.googleapis.com/admin/directory/v1/users',
      {
        method:'POST',
        headers:{
          Authorization:`Bearer ${access_token}`,
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          name:{givenName,familyName},
          password,
          primaryEmail: studentEmail,
          recoveryEmail: personalEmail,
          // 根据需要添加其他字段，例如 orgUnitPath
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
       return res.redirect(302, '/?limit_reached=true');
    }
    return res.status(500).end('An unexpected error occurred during registration.');
  }
}
