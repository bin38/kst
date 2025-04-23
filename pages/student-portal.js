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
  // 修改为带kst前缀的学生ID
  const sid = `kst${String(studentId).padStart(6, '0')}`

  // Links
  const gmailLink =
    `https://accounts.google.com/ServiceLogin?Email=${encodeURIComponent(studentEmail)}` +
    `&continue=https://mail.google.com/mail`
  const driveLink = 'https://drive.google.com' // 添加 Drive 链接
  const canvaLink = 'https://www.canva.com/?disable-cn-redirect=true' 
  const adobeLink = `https://new.express.adobe.com/`
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
      <Head>
        <title>Student Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

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

        {/* 常用应用 */}
        <h2 className="section-title">常用应用与福利</h2> 
        {/* Tiles */}
        <div className="grid">
          {/* e‑Student Card - 移到第一位 */}
          <a href="/student-card" className="grid-item">
            <div className="card-icon">🎓</div>
            <p>电子学生证</p>
          </a>

          {/* Student Email */}
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
            <p>学生邮箱 (Gmail)</p>
          </a>

          {/* Google Drive */}
          <a
            href={driveLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Google_Drive_icon_%282020%29.svg/1024px-Google_Drive_icon_%282020%29.svg.png" 
              alt="Google Drive"
            />
            <p>云存储 (Drive)</p>
          </a>

          {/* Adobe Express */}
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
            <p>Adobe Express (教育版)</p>
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
            <p>Notion (教育版)</p>
          </a>

          {/* Canva */}
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
            <p>Canva (教育版)</p>
          </a>

          {/* Figma */}
          <a
            href={figmaLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/img/figma.png" // 修正：使用正斜杠
              alt="Figma"
            />
            <p>Figma (教育版)</p>
          </a>

          {/* Beautiful.ai */}
          <a
            href={beautifulaiLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img 
              src="/img/beautiful.ai.png" // 修正：使用正斜杠
              alt="Beautiful.ai"
            />
            <p>Beautiful.ai (教育版)</p>
          </a>

          {/* iask.ai */}
          <a
            href={iaskaiLink}
            className="grid-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img 
              src="/img/iask.ai.png" // 路径已正确，保持不变
              alt="iask.ai"
            />
            <p>iask.ai (教育版)</p>
          </a>

          {/* Add Email Aliases */}
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
          
          {/* 可以添加一个空的 grid-item 来占位，使布局更整齐 */}
          {/* <div className="grid-item empty" /> */}
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
          margin: 20px auto;
          padding: 0 15px;
        }
        .school-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
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
          word-break: break-word;
        }
        
        .section-title {
          margin: 30px 0 15px;
          color: #333;
          font-size: 22px;
          text-align: center;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 15px;
        }
        .grid-item {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px 10px;
          text-align: center;
          transition: transform 0.1s, box-shadow 0.1s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 140px;
        }
        .grid-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .grid-item img, .grid-item svg {
          width: 48px;
          height: 48px;
          margin-bottom: 12px;
          object-fit: contain;
        }
        .grid-item p {
          margin: 0;
          font-size: 14px;
        }
        .card-icon {
          font-size: 48px;
          margin-bottom: 12px;
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
        
        /* 移动端适配 */
        @media (max-width: 480px) {
          .school-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .school-text h1 {
            font-size: 20px;
          }
          .school-text h2 {
            font-size: 16px;
          }
          .grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 10px;
          }
          .grid-item {
            min-height: 120px;
            padding: 12px 8px;
          }
          .grid-item img, .grid-item svg, .card-icon {
            width: 40px;
            height: 40px;
            font-size: 40px;
            margin-bottom: 8px;
          }
          .grid-item p {
            font-size: 12px;
          }
          .section-title {
            font-size: 20px;
          }
        }
      `}</style>
    </>
  )
}
