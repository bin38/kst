import Head from 'next/head'
import { useRouter } from 'next/router';
const { readCountAndLimit } = require('../lib/counter');

// 添加 getServerSideProps
export async function getServerSideProps(context) {
  try {
    const { count, limit } = await readCountAndLimit();
    const limitReachedQuery = context.query.limit_reached === 'true';

    return {
      props: {
        registrationLimit: limit,
        currentRegistrations: count,
        limitReached: count >= limit || limitReachedQuery,
      },
    };
  } catch (error) {
    console.error("获取注册信息失败:", error);
    // 返回默认值
    return {
      props: {
        registrationLimit: parseInt(process.env.REGISTRATION_LIMIT || 200, 10),
        currentRegistrations: 0,
        limitReached: false
      }
    };
  }
}

export default function Home({ registrationLimit, currentRegistrations, limitReached }) {
  const router = useRouter();
  const isLimitReached = limitReached || router.query.limit_reached === 'true';

  return (
    <>
      <Head><title>KST 大学学生门户登录</title></Head> 
      <div className="container">
        <div className="card">
          {/* <img src="/images/kst-logo.png" alt="KST Logo" className="logo" /> */}
          <h1>欢迎来到 KST 大学</h1>
          <p className="subtitle">请通过 Linux.do 进行身份验证以继续访问学生门户</p>
          
          {/* 显示名额信息 */}
          <div className="quota-info">
            <p>注册名额: {currentRegistrations} / {registrationLimit}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(100, (currentRegistrations / registrationLimit) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* 根据名额状态显示按钮或提示 */}
          {isLimitReached ? (
            <div className="limit-message">
              <p>抱歉，当前注册名额已满，请稍后再试。</p>
            </div>
          ) : (
            <a className="button" href="/api/oauth2/initiate">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              使用 Linux.do 登录
            </a>
          )}

          <div className="cta">
            <p>如有问题，请联系学校信息技术服务中心。</p>
          </div>
        </div>
        
        <footer>
          © 2025 KST - 信息技术服务中心 | 致谢: @ChatGPT 
        </footer>
      </div>
      
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex; 
          flex-direction: column;
          justify-content: center; 
          align-items: center;
          background: linear-gradient(135deg, #e0f2f7, #b3e5fc); 
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        }
        /* 如果添加 Logo，可以取消注释此样式 */
        /*
        .logo {
          width: 80px; 
          height: auto;
          margin-bottom: 20px;
        }
        */
        .card {
          background: #fff;
          padding: 50px 40px; 
          border-radius: 12px; 
          box-shadow: 0 8px 25px rgba(0,0,0,0.1); 
          text-align: center;
          max-width: 500px; 
          width: 100%;
          transition: transform 0.3s ease, box-shadow 0.3s ease; /* 添加过渡效果 */
        }
        /* 为卡片添加悬停效果 */
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        h1 { 
          color: #1a237e; 
          margin-bottom: 10px; 
          font-size: 2.2em; 
          font-weight: 600;
        }
        .subtitle { 
          color: #555; 
          margin: 0 0 30px 0; 
          font-size: 1.1em;
        }
        p { 
          color: #555; 
          margin: 10px 0; 
          line-height: 1.6; 
        }
        .button {
          display: inline-flex; /* 改为 inline-flex 以便图标和文字对齐 */
          align-items: center; /* 垂直居中图标和文字 */
          justify-content: center; /* 水平居中内容 */
          margin-top: 20px;
          padding: 14px 30px; 
          background: linear-gradient(to right, #1e88e5, #0d47a1); 
          color: #fff; 
          border-radius: 8px; 
          text-decoration: none; 
          font-size: 18px;
          font-weight: 500;
          transition: all 0.3s ease; 
          box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3); 
          border: none; /* 确保没有边框 */
          cursor: pointer; /* 添加指针手势 */
        }
        .button:hover { 
          background: linear-gradient(to right, #1565c0, #0a3880); 
          transform: translateY(-2px); 
          box-shadow: 0 6px 15px rgba(0, 123, 255, 0.4); 
        }
        .cta { 
          margin-top: 40px; 
          color: #666; 
          font-size: 15px; 
          border-top: 1px solid #eee; 
          padding-top: 20px;
        }
        .cta p {
          margin: 5px 0; 
        }
        footer {
          margin-top: 40px; 
          color: #666; 
          font-size: 14px;
          text-align: center; 
        }
        /* 移除页脚链接的默认样式，如果需要的话 */
        /*
        footer a { 
          color: #0070f3; 
          text-decoration: none; 
        }
        footer a:hover { 
          text-decoration: underline; 
        }
        */
        .quota-info {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f0f4ff;
          border-radius: 8px;
          color: #333;
          font-size: 1em;
        }
        
        .progress-bar {
          height: 10px;
          background-color: #e0e0e0;
          border-radius: 5px;
          margin-top: 8px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, #4caf50, #2196f3);
          border-radius: 5px;
          transition: width 0.3s ease;
        }
        
        .limit-message {
          margin-top: 20px;
          padding: 15px;
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          color: #856404;
          border-radius: 8px;
          font-weight: 500;
        }
      `}</style>
    </>
  )
}
