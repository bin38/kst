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
  
  // 修改为带kst前缀的学生ID
  const sid = `kst${String(studentId).padStart(6, '0')}`;

  const avatarUrl = `https://i.pravatar.cc/150?u=${encodeURIComponent(studentEmail)}`

  // 下载卡片处理函数
  const handleDownload = () => {
    // 修复：下载前临时隐藏输入框，显示纯文本以避免瑕疵
    const nameInput = cardRef.current.querySelector('.name-input');
    const oldValue = nameInput.value;
    const oldReadOnly = nameInput.readOnly;
    
    nameInput.value = editableName;
    nameInput.readOnly = true;
    nameInput.style.border = 'none';
    nameInput.style.background = 'transparent';
    nameInput.style.color = '#333';
    
    html2canvas(cardRef.current, { 
      useCORS: true,
      scale: 2,
      onclone: (clonedDoc) => {
        // 也处理克隆的DOM中的输入框
        const clonedInput = clonedDoc.querySelector('.name-input');
        if (clonedInput) {
          clonedInput.style.border = 'none';
          clonedInput.style.background = 'transparent';
          clonedInput.style.color = '#333';
          clonedInput.readOnly = true;
        }
      }
    }).then(canvas => {
      // 下载后恢复输入框状态
      nameInput.readOnly = oldReadOnly;
      nameInput.style.border = '';
      nameInput.style.background = '';
      nameInput.style.color = '';
      
      const link = document.createElement('a');
      link.download = 'student-id-card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      console.error("下载学生证时出错:", err);
      alert("无法下载学生证，请稍后再试。");
      // 恢复输入框状态
      nameInput.readOnly = oldReadOnly;
      nameInput.style.border = '';
      nameInput.style.background = '';
      nameInput.style.color = '';
    });
  };

  return (
    <>
      <Head>
        <title>Student ID Card - KST</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* 将 wrapper 移到 card 外面，以便按钮可以放在卡片下方 */}
      <div className="page-container"> 
        <div className="wrapper">
          {/* 添加 ref 到卡片 div */}
          <div className="card" ref={cardRef}> 
            {/* 学校标志和名称 */}
            <div className="card-header">
              <div className="logo-container">
                {/* 更新图片路径 */}
                <img src="/img/logo.png" alt="KST Logo" className="school-logo" /> 
                <div>
                  <h1>Kyrgyzstan State University of Technology</h1>
                  <p className="id-label">Official Student ID</p>
                </div>
              </div>
            </div>

            {/* 卡片主体：照片和信息 */}
            <div className="card-body">
              <div className="photo-column">
                <div className="photo-container">
                  <img src={avatarUrl} alt="Student Photo" className="student-photo" />
                </div>
                <div className="qr-container">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(sid)}`} 
                       alt="Student ID QR Code" 
                       className="qr-code" />
                  <p className="qr-label">Student ID QR</p>
                </div>
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
                <p><strong>Student ID:</strong> {sid}</p>
                <p><strong>Email:</strong> {studentEmail}</p>
                <p className="major-info"><strong>Major:</strong> {MAJOR}</p>
                <p><strong>Year of Enrollment:</strong> {ENROLLMENT_YEAR}</p>
                <p><strong>Year of Graduation:</strong> {GRADUATION_YEAR}</p>
                
                <div className="validation-section">
                  <div className="signature-box">
                    <p className="signature-text">Academic Dean</p>
                  </div>
                  <div className="issue-info">
                    <p className="issue-date">Issued: {ENROLLMENT_YEAR}</p>
                    <p className="valid-until">Valid until: {GRADUATION_YEAR}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 卡片底部 */}
            <div className="card-footer">
              <p className="address">123 University Ave, Bishkek, Kyrgyzstan</p>
              <p className="website">www.kst.edu.kg</p>
            </div>
          </div>
        </div>
        {/* 下载按钮放在 wrapper 外面，卡片下方 */}
        <button onClick={handleDownload} className="download-button">
          Download Student ID Card
        </button>
        <p className="back-link">
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
          padding: 15px;
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
          width: 100%;
          /* 增加最大宽度以适应长文本 */
          max-width: 750px; 
          background: #fff;
          border-radius: 15px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .card-header {
          background: linear-gradient(to right, #152b64, #1a3a7e);
          color: #fff;
          padding: 20px 15px;
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .school-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          /* 确保没有背景或边框 */
          background: none;
          border: none;
          border-radius: 0; /* 移除圆形 */
          padding: 5px; /* 保留一些内边距 */
        }
        .card-header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
          line-height: 1.2;
        }
        .id-label {
          margin: 5px 0 0;
          font-size: 14px;
          font-weight: normal;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #e6e6e6;
        }
        .card-body {
          display: flex;
          padding: 20px 15px;
          gap: 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
        }
        .photo-column {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }
        .photo-container {
          width: 120px;
          flex-shrink: 0;
        }
        .student-photo {
          width: 120px;
          height: 140px;
          object-fit: cover;
          border-radius: 8px;
          border: 3px solid #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 5px;
        }
        .qr-code {
          width: 80px;
          height: 80px;
          border: 2px solid #fff;
        }
        .qr-label {
          margin: 5px 0 0;
          font-size: 11px;
          color: #666;
        }
        .info-container {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 0 5px;
          width: 100%; /* 确保容器足够宽 */
        }
        .info-container p, .editable-field {
          margin: 6px 0;
          font-size: 14px;
          color: #333;
          display: flex;
          align-items: center; /* 垂直居中对齐 */
          flex-wrap: wrap;
          position: relative;
          width: 100%; /* 确保足够宽度 */
        }
        .info-container p strong, .editable-field strong {
          color: #000;
          margin-right: 5px;
          min-width: 65px;
          width: 150px;
          display: inline-block;
        }
        /* 姓名输入框样式 */
        .name-input {
          font-size: 14px;
          color: #333;
          border: none; /* 移除边框 */
          background: transparent; /* 透明背景 */
          padding: 2px 4px; /* 微调内边距 */
          outline: none; /* 移除焦点时的轮廓 */
          flex: 1;
          min-width: 100px;
        }
        .name-input:focus {
          background: #f0f0f0; /* 聚焦时给一点背景提示 */
          border-radius: 3px;
        }
        /* 专门为专业信息添加样式，确保它能完整显示 */
        .major-info {
          display: flex;
          /* 防止专业名称换行 */
          white-space: nowrap; 
          overflow: hidden; /* 如果仍然太长，隐藏溢出部分 */
          text-overflow: ellipsis; /* 显示省略号 */
          align-items: center; /* 保持垂直居中 */
        }
        .major-info strong {
           /* 移除可能导致换行的底部边距 */
           margin-bottom: 0;
        }
        .validation-section {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px dashed #ddd;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          border-bottom: 1px solid #000;
          width: 120px;
          padding-bottom: 5px;
          margin-bottom: 5px;
        }
        .signature-text {
          text-align: center;
          font-size: 12px;
          margin: 0;
          color: #555;
        }
        .issue-info {
          text-align: right;
          font-size: 12px;
        }
        .issue-info p {
          margin: 3px 0;
          font-size: 12px;
        }
        .card-footer {
          background: #152b64;
          color: #fff;
          padding: 10px 15px;
          text-align: center;
          font-size: 12px;
        }
        .card-footer p {
          margin: 3px 0;
          color: #e6e6e6;
        }
        /* 下载按钮样式 */
        .download-button {
          padding: 12px 25px;
          font-size: 16px;
          color: #fff;
          background-color: #0070f3;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          width: 80%;
          max-width: 300px;
          margin-bottom: 15px;
        }
        .download-button:hover {
          background-color: #005bb5;
        }
        /* 返回链接样式 */
        .back-link {
          text-align: center;
          margin-top: 15px;
        }
        a { 
          color:#fff; /* 在深色背景下改为白色 */
          text-decoration:none; 
          font-size: 16px;
          padding: 8px 15px;
          background: rgba(0,0,0,0.3);
          border-radius: 5px;
        }
        a:hover { background: rgba(0,0,0,0.5); }

        /* 移动端适配 */
        @media (max-width: 768px) { /* 调整断点以适应更宽的卡片 */
           .card {
             max-width: 95%; /* 在中等屏幕上使用百分比宽度 */
           }
           .card-body {
             flex-direction: column;
             align-items: center;
           }
           .photo-column {
             flex-direction: row;
             justify-content: space-around;
             width: 100%;
           }
           .info-container {
             width: 100%;
           }
           /* 在较小屏幕上允许专业名称换行 */
           .major-info {
             white-space: normal;
             flex-wrap: wrap;
             align-items: flex-start;
           }
           .major-info strong {
             margin-bottom: 3px;
           }
        }

        @media (max-width: 580px) {
          /* 保持之前的移动端样式 */
          .card-body {
            flex-direction: column;
            align-items: center;
          }
          .photo-column {
            flex-direction: row;
            justify-content: space-around;
            width: 100%;
          }
          .photo-container {
            width: 100px;
          }
          .student-photo {
            width: 100px;
            height: 120px;
          }
          .info-container {
            width: 100%;
          }
          .major-info {
            flex-direction: column; /* 在非常小的屏幕上强制标签和内容上下排列 */
            align-items: flex-start;
          }
          .major-info strong {
            width: auto;
            margin-bottom: 3px;
          }
        }
      `}</style>
    </>
  )
}
