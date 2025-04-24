// pages/student-card.js
import Head from 'next/head'
import { parse } from 'cookie'
import { useState, useRef, useEffect } from 'react' // 导入 useEffect
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
  const requiredLevel = parseInt(process.env.REQUIRED_TRUST_LEVEL || '3', 10)

  // 先检查 OAuth2 身份验证
  if (!oauthUsername) {
    return { redirect:{ destination:'/', permanent:false } }
  }

  // build studentEmail
  const rawDom = process.env.EMAIL_DOMAIN
  const domain = rawDom.startsWith('@') ? rawDom : '@'+rawDom
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}${domain}`

  // 确保用户存在
  const googleUser = await fetchGoogleUser(studentEmail)
  if (!googleUser) {
    // 用户不存在，需要注册，先检查信任等级
    if (trustLevel < requiredLevel) {
      return { redirect: { destination: '/insufficient-level', permanent: false } }
    }
    return { redirect:{ destination:'/register', permanent:false } }
  }

  // 用户存在，允许访问学生证，不检查信任等级
  const initialFullName = `${googleUser.name.givenName} ${googleUser.name.familyName}`
  const studentId     = cookies.oauthUserId

  return {
    props: { initialFullName, studentEmail, studentId }
  }
}

export default function StudentCard({
  initialFullName, // 接收 initialFullName
  studentEmail,
  studentId
}) {
  const [editableName, setEditableName] = useState(initialFullName);
  const cardRef = useRef(null);
  const nameInputRef = useRef(null); // Ref for the input element
  const nameDisplayRef = useRef(null); // Ref for the temporary span

  // 修改为带kst前缀的学生ID
  const sid = `kst${String(studentId).padStart(6, '0')}`;

  // 修改：使用本地默认头像图片
  // 请确保图片文件已放置在 public/img/student-default.jpg
  const avatarUrl = '/img/student-default.jpg';

  // 下载卡片处理函数
  const handleDownload = () => {
    const cardElement = cardRef.current;
    const nameInputElement = nameInputRef.current;
    const nameDisplayElement = nameDisplayRef.current;

    if (!cardElement || !nameInputElement || !nameDisplayElement) return;

    // 1. 隐藏输入框，显示包含当前名字的 span
    nameInputElement.style.display = 'none';
    nameDisplayElement.innerText = editableName; // 设置 span 的文本
    nameDisplayElement.style.display = 'inline'; // 显示 span

    html2canvas(cardElement, {
      useCORS: true,
      scale: 2, // 提高分辨率
      logging: false, // 关闭日志减少控制台输出
      onclone: (clonedDoc) => {
        // 确保克隆的文档中也是 span 可见，input 隐藏
        const clonedInput = clonedDoc.querySelector('.name-input-real'); // 使用新类名
        const clonedDisplay = clonedDoc.querySelector('.name-display');
        if (clonedInput) clonedInput.style.display = 'none';
        if (clonedDisplay) clonedDisplay.style.display = 'inline';
      }
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'student-id-card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 3. 下载完成后，恢复原状：隐藏 span，显示 input
      nameDisplayElement.style.display = 'none';
      nameInputElement.style.display = 'inline-block'; // 或 'block'/'flex' 取决于布局

    }).catch(err => {
      console.error("下载学生证时出错:", err);
      alert("无法下载学生证，请稍后再试。");
      // 同样需要恢复原状
      nameDisplayElement.style.display = 'none';
      nameInputElement.style.display = 'inline-block';
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
              {/* ... photo-column ... */}
              <div className="photo-column">
                <div className="photo-container">
                  {/* img 标签的 src 现在会指向本地图片 */}
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
                  {/* 实际输入框，添加 ref 和新类名 */}
                  <input
                    ref={nameInputRef} // 添加 ref
                    type="text"
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    className="name-input name-input-real" // 添加新类名
                  />
                  {/* 用于下载时显示的 span，默认隐藏，添加 ref */}
                  <span ref={nameDisplayRef} className="name-display" style={{ display: 'none', flex: 1, minWidth: '100px', padding: '2px 4px' }}></span>
                </div>
                <p><strong>Student ID:</strong> {sid}</p>
                <p><strong>Email:</strong> {studentEmail}</p>
                {/* 移除 .major-info 类，让其表现与其他 p 标签一致 */}
                <p><strong>Major:</strong> {MAJOR}</p>
                <p><strong>Year of Enrollment:</strong> {ENROLLMENT_YEAR}</p>
                <p><strong>Year of Graduation:</strong> {GRADUATION_YEAR}</p>

                {/* ... validation-section ... */}
                <div className="validation-section">
                  <div className="signature-box">
                    <p className="signature-text">student</p>
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
          flex-direction: column;
          justify-content: center;
          align-items: center;
          /* 移除背景图以简化调试，或确保图片有效 */
          /* background: url(...) center/cover no-repeat; */
          background-color: #e0e0e0; /* 使用纯色背景 */
          padding: 15px;
          box-sizing: border-box; /* 确保 padding 不会影响总宽度 */
        }
        .wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 750px; /* 限制卡片最大宽度 */
          margin-bottom: 20px;
        }
        .card {
          width: 100%;
          background: #fff;
          border-radius: 15px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden; /* 防止内容溢出 */
          display: flex;
          flex-direction: column;
        }
        .card-header {
          background: linear-gradient(to right, #152b64, #1a3a7e);
          color: #fff;
          padding: 15px 20px; /* 调整内边距 */
        }
        .logo-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .school-logo {
          width: 50px; /* 调整 logo 大小 */
          height: 50px;
          object-fit: contain;
          background: none;
          border: none;
          border-radius: 0;
          padding: 0; /* 移除内边距 */
        }
        .card-header h1 {
          margin: 0;
          font-size: 16px; /* 调整字体大小 */
          font-weight: bold;
          line-height: 1.2;
        }
        .id-label {
          margin: 3px 0 0;
          font-size: 12px; /* 调整字体大小 */
          font-weight: normal;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #e6e6e6;
        }
        .card-body {
          display: flex;
          padding: 15px; /* 调整内边距 */
          gap: 15px; /* 调整间距 */
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
          flex-wrap: wrap; /* 允许在小屏幕上换行 */
        }
        .photo-column {
          display: flex;
          flex-direction: column;
          gap: 10px; /* 调整间距 */
          align-items: center;
          width: 120px; /* 固定宽度 */
          flex-shrink: 0; /* 防止缩小 */
        }
        .photo-container {
          width: 100%;
        }
        .student-photo {
          width: 100%; /* 宽度自适应容器 */
          height: auto; /* 高度自适应 */
          aspect-ratio: 3 / 4; /* 保持照片比例 */
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
          width: 70px; /* 调整二维码大小 */
          height: 70px;
          border: 2px solid #fff;
        }
        .qr-label {
          margin: 3px 0 0;
          font-size: 10px; /* 调整字体大小 */
          color: #666;
        }
        .info-container {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* 允许 flex item 收缩 */
          padding: 0 5px;
          gap: 4px; /* 调整信息项间距 */
        }
        .info-container p, .editable-field {
          margin: 0; /* 移除默认 margin */
          font-size: 13px; /* 调整字体大小 */
          color: #333;
          display: flex;
          align-items: baseline; /* 基线对齐 */
          flex-wrap: nowrap; /* 默认不换行 */
          line-height: 1.4; /* 增加行高 */
          word-break: break-word; /* 允许长单词换行 */
        }
        .info-container p strong, .editable-field strong {
          color: #000;
          margin-right: 5px;
          min-width: 120px; /* 调整标签最小宽度 */
          width: 120px; /* 固定标签宽度 */
          flex-shrink: 0; /* 防止标签缩小 */
          font-weight: 600; /* 加粗标签 */
        }
        /* 姓名输入框样式 */
        .name-input {
          font-size: 13px; /* 匹配 p 标签 */
          color: #333;
          border: none;
          background: transparent;
          padding: 2px 4px;
          outline: none;
          flex: 1; /* 占据剩余空间 */
          min-width: 100px; /* 最小宽度 */
          display: inline-block; /* 确保它在 flex 布局中正确显示 */
        }
        .name-input:focus {
          background: #f0f0f0;
          border-radius: 3px;
        }
        /* 用于下载的 span */
        .name-display {
           font-size: 13px;
           color: #333;
           padding: 2px 4px;
           flex: 1;
           min-width: 100px;
           word-break: break-word; /* 允许名字换行 */
        }

        .validation-section {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed #ddd;
          display: flex;
          justify-content: space-between;
          align-items: flex-end; /* 底部对齐 */
          flex-wrap: wrap; /* 允许换行 */
          gap: 10px;
        }
        .signature-box {
          border-bottom: 1px solid #000;
          width: 100px; /* 调整宽度 */
          padding-bottom: 2px;
          margin-bottom: 0; /* 移除底部 margin */
        }
        .signature-text {
          text-align: center;
          font-size: 11px; /* 调整字体大小 */
          margin: 0;
          color: #555;
        }
        .issue-info {
          text-align: right;
          font-size: 11px; /* 调整字体大小 */
        }
        .issue-info p {
          margin: 0; /* 移除默认 margin */
          font-size: 11px; /* 确保字体大小一致 */
        }
        .card-footer {
          background: #152b64;
          color: #fff;
          padding: 8px 15px; /* 调整内边距 */
          text-align: center;
          font-size: 11px; /* 调整字体大小 */
        }
        .card-footer p {
          margin: 2px 0;
          color: #e6e6e6;
        }
        /* 下载按钮样式 */
        .download-button {
          padding: 10px 20px; /* 调整按钮大小 */
          font-size: 14px; /* 调整字体大小 */
          color: #fff;
          background-color: #0070f3;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          width: auto; /* 自动宽度 */
          max-width: 250px; /* 限制最大宽度 */
          margin-bottom: 15px;
        }
        .download-button:hover {
          background-color: #005bb5;
        }
        /* 返回链接样式 */
        .back-link {
          text-align: center;
          margin-top: 10px; /* 调整间距 */
        }
        .back-link a { /* 直接修改 a 标签 */
          color:#333; /* 在浅色背景下改为深色 */
          text-decoration:none;
          font-size: 14px; /* 调整字体大小 */
          padding: 6px 12px; /* 调整内边距 */
          background: rgba(0,0,0,0.1);
          border-radius: 5px;
        }
        .back-link a:hover { background: rgba(0,0,0,0.2); }

        /* 移动端适配 - 统一断点 */
        @media (max-width: 600px) {
           .card-body {
             flex-direction: column; /* 强制垂直排列 */
             align-items: center; /* 居中对齐 */
             gap: 15px;
           }
           .photo-column {
             flex-direction: row; /* 照片和二维码水平排列 */
             justify-content: space-around; /* 分散对齐 */
             width: 100%; /* 占据全部宽度 */
             max-width: 300px; /* 限制最大宽度 */
             gap: 15px;
           }
           .photo-container {
             width: 100px; /* 固定照片容器宽度 */
           }
           .qr-container {
             margin-top: 0; /* 移除顶部间距 */
           }
           .info-container {
             width: 100%; /* 占据全部宽度 */
             padding: 0; /* 移除左右内边距 */
             align-items: center; /* 居中对齐内容 */
           }
           .info-container p, .editable-field {
             width: 100%; /* 信息项占满宽度 */
             max-width: 350px; /* 限制最大宽度 */
             flex-wrap: wrap; /* 允许标签和内容换行 */
             align-items: baseline;
             justify-content: center; /* 居中 */
             text-align: center; /* 文本居中 */
           }
           .info-container p strong, .editable-field strong {
             width: 100%; /* 标签占满一行 */
             min-width: unset; /* 移除最小宽度 */
             text-align: center; /* 标签居中 */
             margin-bottom: 2px; /* 标签和内容间距 */
             margin-right: 0;
           }
           .name-input, .name-display {
             text-align: center; /* 输入框/名字居中 */
             width: 100%; /* 占满宽度 */
           }
           .validation-section {
             flex-direction: column; /* 垂直排列 */
             align-items: center; /* 居中对齐 */
             gap: 8px;
           }
           .issue-info {
             text-align: center; /* 居中对齐 */
           }
           .card-header h1 {
             font-size: 14px;
           }
           .id-label {
             font-size: 10px;
           }
           .card-footer {
             font-size: 10px;
           }
        }
      `}</style>
    </>
  )
}
