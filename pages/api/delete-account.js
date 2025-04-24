// pages/api/delete-account.js
import cookie from 'cookie'
// 导入计数器函数
const { decrementCount } = require('../../lib/counter');
const { isDbConnected, checkDbConnection } = require('../../lib/db'); // 导入数据库连接检查

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  // parse oauth cookies
  const cookies = cookie.parse(req.headers.cookie || '')
  const oauthUsername = cookies.oauthUsername
  const trustLevel    = parseInt(cookies.oauthTrustLevel || '0', 10)

  if (!oauthUsername || trustLevel < 3) {
    return res.status(403).end('Forbidden')
  }

  // build student email
  const rawDom = process.env.EMAIL_DOMAIN
  const domain = rawDom.startsWith('@') ? rawDom : '@' + rawDom
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}${domain}`

  // 检查数据库连接
  if (!isDbConnected()) {
    if (!await checkDbConnection()) {
      console.error('API Delete Account: 数据库连接失败');
      // 即使数据库有问题，也应该尝试删除 Google 账户
      // 但后续的计数器操作会失败
    }
  }

  let access_token;
  try {
    // get Google access token
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
    if (!tokenRes.ok) {
      console.error('API Delete Account: Error fetching Google token:', await tokenRes.text())
      throw new Error('Token Error');
    }
    const tokenData = await tokenRes.json();
    access_token = tokenData.access_token;

    // delete the user
    const delRes = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(studentEmail)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${access_token}` },
      }
    )
    // 如果用户在 Google 不存在 (404)，也视为成功删除（幂等性）
    if (!delRes.ok && delRes.status !== 404) {
      const errorText = await delRes.text();
      console.error('API Delete Account: Error deleting Google user:', delRes.status, errorText);
      throw new Error('Deletion Failed');
    }
    console.log(`API Delete Account: Google 用户 ${studentEmail} 已删除 (或不存在)`);

    // 成功删除 Google 用户后，减少注册计数
    try {
      // 仅当数据库连接正常时尝试减少计数
      if (isDbConnected()) {
        await decrementCount();
        console.log(`API Delete Account: 用户 ${studentEmail} 删除成功，计数已减少`);
      } else {
        console.warn(`API Delete Account: 用户 ${studentEmail} 已删除，但数据库连接失败，无法减少计数`);
      }
    } catch (counterError) {
      // 计数器错误不应阻止用户删除成功，但需要记录严重错误
      console.error(`API Delete Account: 严重错误 - 用户 ${studentEmail} 已在 Google 删除，但减少注册计数失败:`, counterError);
      // 可以考虑发送告警邮件或记录到专门的日志
    }

    // clear cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize('oauthUsername', '', { path: '/', expires: new Date(0), httpOnly: true, secure: true, sameSite: 'lax' }),
      cookie.serialize('oauthUserId',   '', { path: '/', expires: new Date(0), httpOnly: true, secure: true, sameSite: 'lax' }),
      cookie.serialize('oauthTrustLevel','', { path: '/', expires: new Date(0), httpOnly: true, secure: true, sameSite: 'lax' }),
      // 清除可能存在的旧 state cookie
      cookie.serialize('oauthState', '', { path: '/', expires: new Date(0), httpOnly: true, secure: true, sameSite: 'lax' }),
    ])

    // done
    res.status(200).json({ success: true })

  } catch (error) {
    console.error('API Delete Account: 发生意外错误:', error);
    // 根据错误类型返回不同的状态码
    if (error.message.includes('Token Error')) {
      return res.status(503).end('Service unavailable (Google API token error)');
    }
    if (error.message.includes('Deletion Failed')) {
      return res.status(500).end('Failed to delete account from Google');
    }
    // 其他未知错误
    return res.status(500).end('An unexpected error occurred during account deletion.');
  }
}
