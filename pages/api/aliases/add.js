// pages/api/aliases/add.js
import cookie from 'cookie';
import crypto from 'crypto'; // 导入 crypto 用于生成密码

// 辅助函数：检查 Google 用户是否存在（可复用）
async function fetchGoogleUser(email, accessToken) {
  const userRes = await fetch(
    `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return userRes.ok ? await userRes.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('方法不允许'); // Method Not Allowed
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  const primaryUsername = cookies.oauthUsername; // 来自 Linux.do OAuth 的用户名
  const trust = parseInt(cookies.oauthTrustLevel || '0', 10);

  if (!primaryUsername || trust < 3) {
    return res.status(403).end('禁止访问'); // Forbidden
  }

  // 确定固定的辅助邮箱地址
  const rawDom = process.env.EMAIL_DOMAIN;
  const domain = rawDom.startsWith('@') ? rawDom.slice(1) : rawDom;
  // 确保 primaryUsername 不包含 '@' (以防万一)
  const cleanPrimaryUsername = primaryUsername.split('@')[0];
  const secondaryEmail = `kst_${cleanPrimaryUsername}@${domain}`;

  // --- 创建新用户逻辑 ---
  try {
    // 获取 Google Access Token
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

    // *** 检查辅助账号是否已存在 ***
    const existingSecondaryUser = await fetchGoogleUser(secondaryEmail, access_token);
    if (existingSecondaryUser) {
      return res.status(409).end(`辅助账号 ${secondaryEmail} 已存在。如果需要重新创建，请先删除。`); // Secondary account ... already exists...
    }

    // 为新用户生成随机密码
    const generatedPassword = crypto.randomBytes(12).toString('hex');

    // 准备用于创建的用户数据
    const newUser = {
      primaryEmail: secondaryEmail, // 使用固定的辅助邮箱
      name: {
        givenName: cleanPrimaryUsername, // 使用主用户名为名字
        familyName: "(辅助 KST)", // 表明是辅助账号 // Indicate it's a secondary account
      },
      password: generatedPassword,
      changePasswordAtNextLogin: true,
      archived: true, // 尝试创建为归档用户 // Attempt to create as Archived User
      // orgUnitPath: '/path/to/secondary_ou' // 可选：分配到特定组织单位 // Optional: Assign to specific OU
    };

    // 调用 Google Admin SDK 创建用户
    const createRes = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      }
    );

    if (!createRes.ok) {
      // 处理潜在的创建错误（例如 'archived: true' 的许可问题）
      const errorData = await createRes.json();
      console.error('Google 用户创建错误:', errorData);
      const message = errorData.error?.message || '创建用户失败'; // Failed to create user
      return res.status(createRes.status).end(`用户创建失败: ${message}`); // User creation failed: ...
    }

    // 用户创建成功
    const createdUser = await createRes.json();
    console.log(`成功创建辅助用户: ${createdUser.primaryEmail}`); // Successfully created secondary user: ...

    // 返回成功信息（考虑移除密码以提高安全性）
    res.status(200).json({
      message: '辅助邮箱账号创建成功。', // Secondary email account created successfully.
      email: createdUser.primaryEmail,
      password: generatedPassword,
    });

  } catch (error) {
    console.error('创建辅助用户时出错:', error); // Error creating secondary user: ...
    res.status(500).end('创建用户时发生内部服务器错误。'); // Internal server error during user creation.
  }
}
