// pages/api/aliases/delete.js
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') { // 应该是 POST 或 DELETE，但 POST 对表单更简单
    res.setHeader('Allow', 'POST');
    return res.status(405).end('方法不允许'); // Method Not Allowed
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  const primaryUsername = cookies.oauthUsername; // 来自 Linux.do OAuth 的用户名
  const trust = parseInt(cookies.oauthTrustLevel || '0', 10);

  if (!primaryUsername || trust < 3) {
    return res.status(403).end('禁止访问'); // Forbidden
  }

  // 确定要删除的固定辅助邮箱地址
  const rawDom = process.env.EMAIL_DOMAIN;
  const domain = rawDom.startsWith('@') ? rawDom.slice(1) : rawDom;
  const cleanPrimaryUsername = primaryUsername.split('@')[0];
  const secondaryEmailToDelete = `kst_${cleanPrimaryUsername}@${domain}`;

  // 确定主邮箱用于安全检查
  const primaryEmail = primaryUsername.includes('@')
    ? primaryUsername
    : `${cleanPrimaryUsername}@${domain}`;

  // *** 安全检查：禁止删除主登录邮箱 ***
  if (secondaryEmailToDelete.toLowerCase() === primaryEmail.toLowerCase()) {
      console.warn(`尝试通过辅助删除端点删除主邮箱 (${primaryEmail}) 的操作已被阻止。`); // Attempt blocked to delete primary email...
      return res.status(400).end('无法使用此功能删除主登录账号。'); // Cannot delete the primary login account using this function.
  }

  try {
    // 获取 Access Token
    const tokRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    if (!tokRes.ok) {
      console.error('获取 Token 失败:', await tokRes.text());
      return res.status(500).end('Token 错误'); // Token error
    }
    const { access_token } = await tokRes.json();

    // 调用 Google Admin SDK 删除辅助用户
    const delRes = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(secondaryEmailToDelete)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // 处理响应
    if (delRes.status === 404) {
        return res.status(404).end(`辅助账号 ${secondaryEmailToDelete} 未找到。`); // Secondary account ... not found.
    }
    if (!delRes.ok) {
      const text = await delRes.text();
      console.error(`删除 ${secondaryEmailToDelete} 失败:`, text); // Failed to delete ...
      return res.status(delRes.status).end(`删除辅助账号失败: ${text}`); // Failed to delete secondary account: ...
    }

    // 删除成功
    console.log(`成功删除辅助用户: ${secondaryEmailToDelete}`); // Successfully deleted secondary user: ...
    res.status(200).json({ message: `辅助账号 ${secondaryEmailToDelete} 删除成功。` }); // Secondary account ... deleted successfully.

  } catch (error) {
    console.error(`删除辅助用户 ${secondaryEmailToDelete} 时出错:`, error); // Error deleting secondary user ...
    res.status(500).end('删除账号时发生内部服务器错误。'); // Internal server error during account deletion.
  }
}
