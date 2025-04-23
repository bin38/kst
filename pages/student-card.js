// pages/student-card.js
import Head from 'next/head'
import { parse } from 'cookie'
import { useState, useRef } from 'react' // 导入 useState 和 useRef
import html2canvas from 'html2canvas' // 导入 html2canvas

// Helper to fetch a Google user from Directory
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
    { headers:{ Authorization:`Bearer ${access_token}` } }
  )
  if (!userRes.ok) return null
  return await userRes.json()
}

// 更新常量以匹配示例图
const MAJOR = 'Electronics & Communication Engineering'
const ENROLLMENT_YEAR = '2024-09'
const GRADUATION_YEAR = '2028-06'

export async function getServerSideProps({ req }) {
  const cookies       = parse(req.headers.cookie||'')
  const oauthUsername = cookies.oauthUsername
  const trustLevel    = parseInt(cookies.oauthTrustLevel||'0',10)

  if (!oauthUsername || trustLevel < 3) {
    return { redirect:{ destination:'/', permanent:false } }
  }

  // build studentEmail
  const rawDom = process.env.EMAIL_DOMAIN
  const domain = rawDom.startsWith('@') ? rawDom : '@'+rawDom
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}${domain}`

  // ensure user exists in Google Directory
  const googleUser = await fetchGoogleUser(studentEmail)
  if (!googleUser) {
    return { redirect:{ destination:'/register', permanent:false } }
  }

  // 从 googleUser 中获取名字
  const initialFullName = `${googleUser.name.givenName} ${googleUser.name.familyName}`
  const studentId     = cookies.oauthUserId

  return {
    // 传递 initialFullName 而不是 fullName
    props: { initialFullName, studentEmail, studentId } 
  }
}

export default function StudentCard({
  initialFullName, // 接收 initialFullName
  studentEmail,
  studentId
}) {
  // 使用 useState 管理姓名状态
  const [editableName, setEditableName] = useState(initialFullName); 
  const cardRef = useRef(null); // 创建 ref 来引用卡片元素

  const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(studentEmail)}`

  // 下载卡片处理函数
  const handleDownload = () => {
    if (cardRef.current) {
      html2canvas(cardRef.current, { 
          useCORS: true, // 允许加载跨域图片 (pravatar)
          scale: 2 // 提高图片分辨率
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'student-id-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch(err => {
        console.error("oops, something went wrong!", err);
        alert("无法下载卡片，请稍后再试。");
      });
    }
  };

  return (
    <>
      <Head><title>Student ID Card - Kyrgyzstan State University of Technology</title></Head>

      {/* 将 wrapper 移到 card 外面，以便按钮可以放在卡片下方 */}
      <div className="page-container"> 
        <div className="wrapper">
          {/* 添加 ref 到卡片 div */}
          <div className="card" ref={cardRef}> 
            {/* 学校名称和 "Student ID" 文本 */}
            <div className="card-header">
              <h1>Kyrgyzstan State University of Technology</h1>
              <p className="id-label">Student ID</p>
            </div>

            {/* 卡片主体：照片和信息 */}
            <div className="card-body">
              <div className="photo-container">
                <img src={avatarUrl} alt="Student Photo" className="student-photo" />
              </div>
              <div className="info-container">
                {/* 使用 input 实现可编辑姓名 */}
                <div className="editable-field">
                  <strong>Name:</strong> 
                  <input 
                    type="text" 
                    value={editableName} 
                    onChange={(e) => setEditableName(e.target.value)} 
                    className="name-input"
                  />
                </div>
                <p><strong>Student ID:</strong> {studentId}</p>
                <p><strong>Major:</strong> {MAJOR}</p>
                <p><strong>Year of Enrollment:</strong> {ENROLLMENT_YEAR}</p>
                <p><strong>Year of Graduation:</strong> {GRADUATION_YEAR}</p>
              </div>
            </div>
          </div>
        </div>
        {/* 下载按钮放在 wrapper 外面，卡片下方 */}
        <button onClick={handleDownload} className="download-button">
          Download Card
        </button>
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/student-portal">← Back to Portal</a>
        </p>
      </div>

      <style jsx>{`
        /* 添加 page-container 样式 */
        .page-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column; /* 垂直排列 wrapper 和按钮 */
          justify-content: center;
          align-items: center;
          background: url('https://img.freepik.com/free-photo/wooden-floor-background_53876-88628.jpg?w=996&t=st=1700000000~exp=1700000600~hmac=...') center/cover no-repeat; 
          padding: 20px;
        }
        .wrapper {
          /* wrapper 不再需要 min-height 和背景 */
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%; /* 确保 wrapper 宽度足够 */
          margin-bottom: 20px; /* 与下载按钮的间距 */
        }
        .card {
          width: 500px;
          background: #fff;
          border-radius: 15px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        /* ... 其他 .card, .card-header, .card-body, .photo-container, .student-photo 样式保持不变 ... */
        .card-header {
          background: #800000;
          color: #fff;
          padding: 20px;
          text-align: center;
          /* 移除底部圆角，因为卡片是矩形 */
          /* border-bottom-left-radius: 15px; */
          /* border-bottom-right-radius: 15px; */
        }
        .card-header h1 {
          margin: 0 0 5px 0;
          font-size: 22px;
          font-weight: bold;
        }
        .card-header .id-label {
          margin: 0;
          font-size: 16px;
          font-weight: normal;
        }
        .card-body {
          display: flex;
          padding: 25px;
          gap: 20px;
          align-items: center;
        }
        .photo-container {
          flex-shrink: 0;
        }
        .student-photo {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          border: 3px solid #eee;
        }
        .info-container {
          flex-grow: 1;
        }
        .info-container p, .editable-field { /* 应用到 p 和新的 div */
          margin: 10px 0;
          font-size: 16px;
          color: #333;
          display: flex; /* 让 strong 和 input 在一行 */
          align-items: center; /* 垂直居中 */
        }
        .info-container p strong, .editable-field strong {
          color: #000;
          margin-right: 5px;
          min-width: 150px; /* 固定标签宽度，使其对齐 */
          display: inline-block;
        }
        /* 姓名输入框样式 */
        .name-input {
          font-size: 16px;
          color: #333;
          border: none; /* 移除边框 */
          background: transparent; /* 透明背景 */
          padding: 2px 4px; /* 微调内边距 */
          outline: none; /* 移除焦点时的轮廓 */
          width: calc(100% - 155px); /* 占据剩余宽度 */
        }
        .name-input:focus {
          background: #f0f0f0; /* 聚焦时给一点背景提示 */
          border-radius: 3px;
        }
        /* 下载按钮样式 */
        .download-button {
          padding: 10px 20px;
          font-size: 16px;
          color: #fff;
          background-color: #0070f3;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .download-button:hover {
          background-color: #005bb5;
        }
        /* 返回链接样式 */
        a { 
          color:#fff; /* 在深色背景下改为白色 */
          text-decoration:none; 
        }
        a:hover { text-decoration:underline; }
      `}</style>
    </>
  )
}
