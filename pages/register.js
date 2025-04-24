import Head from 'next/head'
import { parse } from 'cookie'
import { useState } from 'react' // 导入 useState

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
  const cookies       = parse(req.headers.cookie || '')
  const oauthUsername = cookies.oauthUsername
  const trustLevel    = parseInt(cookies.oauthTrustLevel || '0', 10)
  const requiredLevel = parseInt(process.env.REQUIRED_TRUST_LEVEL || '3', 10)

  // 必须先完成 OAuth2 身份验证
  if (!oauthUsername) {
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

  // 用户不存在时，才检查信任等级
  if (trustLevel < requiredLevel) {
    return { redirect: { destination: '/insufficient-level', permanent: false } }
  }

  return { props: { oauthUsername } }
}

export default function Register({ oauthUsername }) {
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [errors, setErrors] = useState({});

  // 密码验证函数
  const validatePassword = (pwd) => {
    if (pwd.length < 8) return '密码必须至少包含 8 个字符';
    if (!/\d/.test(pwd)) return '密码必须包含数字';
    if (!/[a-zA-Z]/.test(pwd)) return '密码必须包含字母';
    return '';
  };

  // 客户端表单验证和提交
  const handleSubmit = async (e) => {
    e.preventDefault(); // 阻止默认表单提交

    const newErrors = {};
    if (givenName.trim().length < 2) {
      newErrors.givenName = '名必须至少包含 2 个字符';
    }
    if (familyName.trim().length < 2) {
      newErrors.familyName = '姓必须至少包含 2 个字符';
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }
    if (!personalEmail.includes('@')) { // 简单的邮箱格式检查
        newErrors.personalEmail = '请输入有效的个人邮箱地址';
    }


    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // 如果验证通过，手动提交表单数据到 API
      const formData = {
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        semester: e.target.semester.value, // 从事件目标获取
        program: e.target.program.value,   // 从事件目标获取
        password: password,
        personalEmail: personalEmail,
      };

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
           // 如果 API 返回重定向，浏览器会自动处理
           // 如果 API 返回成功但没有重定向（例如状态 200），则手动跳转
           if (response.redirected) {
             window.location.href = response.url;
           } else {
             // 假设成功总是重定向，如果不是，则需要处理其他成功情况
             // 例如显示成功消息或跳转到门户
             window.location.href = '/student-portal';
           }
        } else {
          // 处理 API 返回的错误
          const errorText = await response.text();
          setErrors({ form: `注册失败: ${errorText}` });
        }
      } catch (error) {
        console.error('提交注册表单时出错:', error);
        setErrors({ form: '注册过程中发生网络错误，请稍后再试。' });
      }
    }
  };


  return (
    <>
      <Head><title>New Student Registration</title></Head>
      <div className="container">
        <div className="card">
          <h1>New Student Registration</h1>
          {/* 修改 form，移除 action，添加 onSubmit */}
          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Username (Same as your Linux.do username, read‑only):</label>
            <input type="text" id="username" name="username"
                   value={oauthUsername} readOnly />

            {/* 拆分姓名输入框 */}
            <label htmlFor="givenName">Given Name (名):</label>
            <input
              type="text"
              id="givenName"
              name="givenName"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              required
            />
            {errors.givenName && <p className="error-text">{errors.givenName}</p>}

            <label htmlFor="familyName">Family Name (姓):</label>
            <input
              type="text"
              id="familyName"
              name="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
            {errors.familyName && <p className="error-text">{errors.familyName}</p>}


            <label htmlFor="semester">Semester:</label>
            <select id="semester" name="semester" required>
              <option>Fall 2025</option>
            </select>

            <label htmlFor="program">Program:</label>
            <select id="program" name="program" required>
              <option>Master of Computer Science</option>
            </select>

            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {/* 添加密码提示 */}
            <p className="hint-text">至少 8 个字符，包含字母和数字。</p>
            {errors.password && <p className="error-text">{errors.password}</p>}


            <label htmlFor="personalEmail">Personal Email:</label>
            <input
              type="email"
              id="personalEmail"
              name="personalEmail"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              required
            />
             {errors.personalEmail && <p className="error-text">{errors.personalEmail}</p>}

            {/* 显示表单级别的错误 */}
            {errors.form && <p className="error-text form-error">{errors.form}</p>}

            <button type="submit">Register</button>
          </form>
        </div>
        <footer>
          {/* 移除 Powered by chatgpt.org.uk */}
        </footer>
      </div>
      <style jsx>{`
        .container {
          min-height:100vh;
          display:flex;flex-direction:column;
          justify-content:center;align-items:center;
          background:#f0f4f8;padding:20px;
        }
        .card {
          background:#fff;max-width:480px;width:100%;
          padding:40px;border-radius:10px;
          box-shadow:0 4px 12px rgba(0,0,0,0.1);
        }
        h1{text-align:center;color:#333;margin-bottom:20px;}
        label{display:block;margin:15px 0 5px;color:#555;}
        input,select{
          width:100%;padding:10px;
          border:1px solid #ccc;border-radius:6px;
          font-size:16px;
        }
        input[readOnly]{background:#eaeaea;}
        button{
          width:100%;margin-top:24px;
          padding:12px;background:#0070f3;
          color:#fff;border:none;border-radius:6px;
          font-size:18px;cursor:pointer;
        }
        button:hover{background:#005bb5;}
        footer{margin-top:30px;color:#777;font-size:14px; height: 20px; /* 保留一些空间 */}
        .error-text {
          color: red;
          font-size: 0.9em;
          margin-top: 2px;
          margin-bottom: 8px;
        }
        .hint-text {
          font-size: 0.85em;
          color: #666;
          margin-top: 2px;
          margin-bottom: 8px;
        }
        .form-error {
            margin-top: 15px;
            font-weight: bold;
        }
      `}</style>
    </>
  )
}
