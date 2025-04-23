import Head from 'next/head'
import { parse } from 'cookie'
const { readCountAndLimit } = require('../lib/counter');

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

export async function getServerSideProps({ req }) {
  try {
    // --- 名额检查 ---
    const { count, limit } = await readCountAndLimit();

    if (count >= limit) {
      console.log(`注册限额已达到(${limit})。当前已注册: ${count}。重定向到首页。`);
      // 名额已满，重定向回首页并附带提示参数
      return { redirect: { destination: '/?limit_reached=true', permanent: false } };
    }
    // --- 名额检查结束 ---

    const cookies       = parse(req.headers.cookie || '')
    const oauthUsername = cookies.oauthUsername
    const trustLevel    = parseInt(cookies.oauthTrustLevel || '0', 10)
    
    // 从环境变量中获取所需信任等级，默认为3
    const requiredTrustLevel = parseInt(process.env.REQUIRED_TRUST_LEVEL || '3', 10)

    // 必须先 OAuth2 且信任等级 ≥ 环境变量设置的值
    if (!oauthUsername || trustLevel < requiredTrustLevel) {
      return { redirect: { destination: '/', permanent: false } }
    }

    // 构建学生邮箱
    const rawDom = process.env.EMAIL_DOMAIN
    const domain = rawDom.startsWith('@') ? rawDom : '@' + rawDom
    const studentEmail = oauthUsername.includes('@')
      ? oauthUsername
      : `${oauthUsername}${domain}`

    // 查询 Google Directory，看用户是否已经存在
    const googleUser = await fetchGoogleUser(studentEmail)
    if (googleUser) {
      // 已存在，直接跳 student-portal
      return { redirect: { destination: '/student-portal', permanent: false } }
    }

    return { props: { oauthUsername } }
  } catch (error) {
    console.error("验证注册资格失败:", error);
    // 出错时默认不允许注册
    return { redirect: { destination: '/?error=true', permanent: false } };
  }
}

export default function Register({ oauthUsername }) {
  return (
    <>
      <Head>
        <title>New Student Registration</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>
      <div className="container">
        <div className="card">
          <h1>New Student Registration</h1>
          <form method="POST" action="/api/register">
            <label htmlFor="username">Username (Same as your Linux.do username, read‑only):</label>
            <input type="text" id="username" name="username"
                   value={oauthUsername} readOnly />

            <label htmlFor="fullName">Full Name:</label>
            <input type="text" id="fullName" name="fullName" required />

            <label htmlFor="semester">Semester:</label>
            <select id="semester" name="semester" required>
              <option>Fall 2025</option>
            </select>

            <label htmlFor="program">Program:</label>
            <select id="program" name="program" required>
              <option>Master of Computer Science</option>
            </select>

            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" required />
            {/* 添加密码要求提示 */}
            <p className="password-hint">必须包含字母和数字，且长度至少为8个字符。</p>

            <label htmlFor="personalEmail">Personal Email:</label>
            <input type="email" id="personalEmail" name="personalEmail" required />

            <button type="submit">Register</button>
          </form>
        </div>
        <footer>
          © 2025 KST
        </footer>
      </div>
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #f0f4f8;
          padding: 20px;
        }
        .card {
          background: #fff;
          max-width: 480px;
          width: 100%;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 20px;
          font-size: 24px;
        }
        label {
          display: block;
          margin: 15px 0 5px;
          color: #555;
        }
        input, select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 16px;
        }
        /* 为提示添加样式 */
        .password-hint {
          font-size: 0.85em;
          color: #666;
          margin-top: 4px; /* 与输入框的间距 */
          margin-bottom: 0; /* 移除默认的段落下边距 */
        }
        input[readOnly] {
          background: #eaeaea;
        }
        button {
          width: 100%;
          margin-top: 24px;
          padding: 12px;
          background: #0070f3;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 18px;
          cursor: pointer;
        }
        button:hover {
          background: #005bb5;
        }
        footer {
          margin-top: 30px;
          color: #777;
          font-size: 14px;
          text-align: center;
        }
        
        /* 移动端适配 */
        @media (max-width: 480px) {
          .card {
            padding: 20px 15px;
          }
          h1 {
            font-size: 22px;
          }
          input, select, button {
            font-size: 15px;
          }
        }
      `}</style>
    </>
  )
}
