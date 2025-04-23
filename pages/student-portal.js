// pages/student-portal.js
import Head from 'next/head'
import { parse } from 'cookie'

// Constants for semester & program
const SEMESTER = 'Fall 2025'
const PROGRAM  = 'Master of Computer Science'

// Helper to refresh token & fetch user from Google Directory
async function fetchGoogleUser(email) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token'
    })
  })
  if (!tokenRes.ok) return null
  const { access_token } = await tokenRes.json()
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

  // Must be OAuth2’d and trust_level ≥ 3
  if (!oauthUsername || trustLevel < 3) {
    return { redirect: { destination: '/', permanent: false } }
  }

  // Build the student’s email
  const rawDom = process.env.EMAIL_DOMAIN
  const domain = rawDom.startsWith('@') ? rawDom : '@' + rawDom
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}${domain}`

  // Fetch the Google user – if missing, send them back to register
  const googleUser = await fetchGoogleUser(studentEmail)
  if (!googleUser) {
    return { redirect: { destination: '/register', permanent: false } }
  }

  // Pull name & recoveryEmail from Google
  const fullName      = `${googleUser.name.givenName} ${googleUser.name.familyName}`
  const personalEmail = googleUser.recoveryEmail || ''
  const studentId     = cookies.oauthUserId

  return {
    props: {
      fullName,
      personalEmail,
      studentEmail,
      studentId
    }
  }
}

export default function StudentPortal({
  fullName,
  personalEmail,
  studentEmail,
  studentId
}) {
  // Pad the forum ID to 6 digits
  const sid = String(studentId).padStart(6, '0')

  // Links
  const gmailLink =
    `https://accounts.google.com/ServiceLogin?Email=${encodeURIComponent(studentEmail)}` +
    `&continue=https://mail.google.com/mail`
  const canvaLink = 'https://www.canva.com/?disable-cn-redirect=true' // 更新为禁止重定向的链接
  const adobeLink = `https://new.express.adobe.com/`
  
  // 福利链接
  const notionLink = 'https://www.notion.so/'
  const figmaLink = 'https://www.figma.com/education'
  const beautifulaiLink = 'https://www.beautiful.ai/education'
  const iaskaiLink = 'https://iask.ai/student'

  // Delete handler
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your account?')) return
    const res = await fetch('/api/delete-account', { method: 'POST' })
    if (res.ok) {
      window.location.href = '/'
    } else {
      alert('Failed to delete account.')
    }
  }

  return (
    <>
      <Head><title>Student Portal</title></Head>

      <div className="container">
        {/* School logo & heading */}
        <div className="school-header">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer circle */}
            <circle cx="24" cy="24" r="22" fill="#0062cc" />
            {/* Stylized book shape */}
            <rect x="14" y="14" width="20" height="12" rx="2" fill="#fff" />
            <path d="M14,26 L24,36 L34,26 Z" fill="#fff" />
            {/* "KS" text */}
            <text
              x="24"
              y="22"
              textAnchor="middle"
              fontSize="12"
              fontFamily="Arial, sans-serif"
              fill="#0062cc"
            >
              KS
            </text>
          </svg>
          <div className="school-text">
            <h1>Kyrgyzstan State University of Technology</h1>
            <h2>Student Portal</h2>
          </div>
        </div>

        {/* Profile info */}
        <div className="info">
          <p><strong>Name:</strong> {fullName}</p>
          <p><strong>Semester:</strong> {SEMESTER}</p>
          <p><strong>Program:</strong> {PROGRAM}</p>
          <p><strong>Student Email:</strong> {studentEmail}</p>
          <p><strong>Personal Email:</strong> {personalEmail}</p>
          <p><strong>Student ID:</strong> {sid}</p>
        </div>

        {/* 福利信息区域 */}
        <div className="benefits-section">
          <h2 className="section-title">您的教育福利</h2>
          <div className="benefit-card">
            <h3>1. Google Workspace for Education</h3>
            <ul>
              <li><strong>Google邮箱：</strong>获得一个Google邮箱账号（7天内设置任意二次验证）</li>
              <li><strong>云存储空间：</strong>每个账号分配了200G的Google Drive云存储空间（不要存储重要信息）</li>
            </ul>
            <div className="benefit-actions">
              <a href={gmailLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Gmail</a>
              <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Google Drive</a>
            </div>
          </div>

          <div className="benefit-card">
            <h3>2. Adobe Express Premium (教育版)</h3>
            <p>首次登录时直接在输入框输入注册的edu谷歌账号会自动加入学校，后续登录可以直接点击谷歌进行登录</p>
            <div className="benefit-actions">
              <a href={adobeLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Adobe Express</a>
            </div>
          </div>

          <div className="benefit-card">
            <h3>3. Notion 教育会员</h3>
            <p>直接使用谷歌账号进行注册即可在升级方案中获得教育plus升级</p>
            <div className="benefit-actions">
              <a href={notionLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Notion</a>
            </div>
          </div>

          <div className="benefit-card">
            <h3>4. Canva 可画国际版 (Canva for Education)</h3>
            <p>直接使用注册的谷歌邮箱进行登录即可</p>
            <div className="benefit-actions">
              <a href={canvaLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Canva国际版</a>
            </div>
          </div>

          <div className="benefit-card">
            <h3>5. Figma 教育会员</h3>
            <p>使用谷歌教育邮箱注册即可获得教育权益</p>
            <div className="benefit-actions">
              <a href={figmaLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Figma</a>
            </div>
          </div>

          <div className="benefit-card">
            <h3>6. Beautiful.ai 教育会员</h3>
            <p>使用谷歌教育邮箱注册即可获得教育权益</p>
            <div className="benefit-actions">
              <a href={beautifulaiLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问Beautiful.ai</a>
            </div>
          </div>

          <div className="benefit-card">
            <h3>7. iask.ai 教育会员</h3>
            <p>使用谷歌教育邮箱注册即可获得教育权益</p>
            <div className="benefit-actions">
              <a href={iaskaiLink} target="_blank" rel="noopener noreferrer" className="benefit-btn">访问iask.ai</a>
            </div>
          </div>
        </div>

        {/* 常用应用 */}
        <h2 className="section-title">常用应用</h2>
        {/* Tiles */}
        <div className="grid">
          {/* Student Email opens in new tab */}
          <a
            href={gmailLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://www.gstatic.com/images/branding/product/1x/gmail_48dp.png"
              alt="Student Email"
            />
            <p>学生邮箱</p>
          </a>

          {/* e‑Student Card stays in same tab */}
          <a href="/student-card" className="grid-item">
            <div className="card-icon">🎓</div>
            <p>电子学生证</p>
          </a>

          {/* Adobe Express opens in new tab */}
          <a
            href={adobeLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Adobe_Express_logo_RGB_1024px.png/500px-Adobe_Express_logo_RGB_1024px.png"
              alt="Adobe Express"
            />
            <p>Adobe Express</p>
          </a>

          {/* Notion */}
          <a
            href={notionLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
              alt="Notion"
            />
            <p>Notion</p>
          </a>

          {/* Canva opens in new tab */}
          <a
            href={canvaLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://static.canva.com/web/images/8439b51bb7a19f6e65ce1064bc37c197.svg"
              alt="Canva"
            />
            <p>Canva 国际版</p>
          </a>

          {/* Figma */}
          <a
            href={figmaLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://cdn.worldvectorlogo.com/logos/figma-1.svg"
              alt="Figma"
            />
            <p>Figma</p>
          </a>

          {/* Beautiful.ai */}
          <a
            href={beautifulaiLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://assets-global.website-files.com/59deb588800ae30001ec19c9/5d9770503d7224d611a1d297_Beautiful%20AI%20Logo%20B.svg"
              alt="Beautiful.ai"
            />
            <p>Beautiful.ai</p>
          </a>

          {/* iask.ai */}
          <a
            href={iaskaiLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://iask.ai/logo.png"
              alt="iask.ai"
            />
            <p>iask.ai</p>
          </a>

          {/* Add Email Aliases stays in same tab */}
          <a href="/aliases" className="grid-item">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="24" cy="24" r="22" fill="#28a745" />
              <line x1="24" y1="14" x2="24" y2="34" stroke="#fff" strokeWidth="4" />
              <line x1="14" y1="24" x2="34" y2="24" stroke="#fff" strokeWidth="4" />
            </svg>
            <p>添加邮箱别名</p>
          </a>
          
          {/* Reset Password */}
          <a href="/reset-password" className="grid-item">
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="24" r="8" fill="#ffc107" />
              <rect x="18" y="20" width="20" height="8" fill="#ffc107" />
              <rect x="34" y="20" width="4" height="4" fill="#fff" />
              <rect x="38" y="20" width="4" height="4" fill="#fff" />
            </svg>
            <p>重置密码</p>
          </a>
        </div>

        {/* Delete My Account button */}
        <button className="delete-button" onClick={handleDelete}>
          删除我的账号
        </button>

        <footer>
          © 2025 Kyrgyzstan State University of Technology
        </footer>
      </div>

      <style jsx>{`
        .container {
          max-width: 900px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .school-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .school-text h1 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }
        .school-text h2 {
          margin: 0;
          font-size: 18px;
          color: #555;
        }
        .info {
          background: #f7f7f7;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .info p {
          margin: 6px 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
        }
        .grid-item {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 24px 12px;
          text-align: center;
          transition: transform 0.1s, box-shadow 0.1s;
          text-decoration: none;
          color: inherit;
        }
        .grid-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .grid-item img {
          width: 48px;
          height: 48px;
          margin-bottom: 8px;
          object-fit: contain;
        }
        .card-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .empty {
          visibility: hidden;
        }
        .delete-button {
          display: block;
          margin: 30px auto 0;
          padding: 10px 20px;
          background: #dc3545;
          color: #fff;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
        }
        .delete-button:hover {
          background: #c82333;
        }
        footer {
          margin-top: 40px;
          text-align: center;
          color: #777;
          font-size: 14px;
        }
        footer a {
          color: #0070f3;
          text-decoration: none;
        }
        footer a:hover {
          text-decoration: underline;
        }
        
        .section-title {
          margin: 30px 0 15px;
          color: #333;
          font-size: 22px;
          text-align: center;
        }
        
        .benefits-section {
          margin: 20px 0;
        }
        
        .benefit-card {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .benefit-card h3 {
          margin-top: 0;
          color: #333;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        
        .benefit-card ul {
          padding-left: 20px;
        }
        
        .benefit-card li, .benefit-card p {
          margin: 8px 0;
          color: #555;
        }
        
        .benefit-actions {
          margin-top: 15px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .benefit-btn {
          padding: 8px 16px;
          background: #0070f3;
          color: white;
          border-radius: 4px;
          text-decoration: none;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .benefit-btn:hover {
          background: #0051b3;
        }
      `}</style>
    </>
  )
}
