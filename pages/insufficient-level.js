import Head from 'next/head'
import { parse } from 'cookie'

export async function getServerSideProps({ req }) {
  const cookies = parse(req.headers.cookie || '')
  const oauthUsername = cookies.oauthUsername
  const currentTrustLevel = parseInt(cookies.oauthTrustLevel || '0', 10)
  const requiredTrustLevel = parseInt(process.env.REQUIRED_TRUST_LEVEL || '3', 10)
  
  // 如果没有 OAuth 信息，重定向到首页
  if (!oauthUsername) {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    }
  }

  return {
    props: {
      username: oauthUsername,
      currentTrustLevel,
      requiredTrustLevel
    }
  }
}

export default function InsufficientLevel({ username, currentTrustLevel, requiredTrustLevel }) {
  return (
    <>
      <Head>
        <title>信任等级不足 - KST</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>
      <div className="container">
        <div className="overlay"></div>
        
        <div className="content-wrapper">
          <div className="logo-area">
            <img src="/img/logo.png" alt="KST Logo" className="logo" />
            <h1>吉尔吉斯坦科技大学</h1>
            <h2>Kyrgyzstan State University of Technology</h2>
          </div>
          
          <div className="card">
            <h3>信任等级不足</h3>
            <div className="error-message">
              <p>抱歉，您的 Linux.do 账号信任等级不满足要求。</p>
              <div className="level-info">
                <p>您的当前等级: <strong>{currentTrustLevel}</strong></p>
                <p>注册所需等级: <strong>{requiredTrustLevel}</strong></p>
              </div>
              <p>请在 Linux.do 社区继续活跃，提高信任等级后再尝试注册。</p>
            </div>
            <a className="back-button" href="/">返回首页</a>
          </div>
          
          <footer>
            © 2025 KST - 信息技术服务中心
          </footer>
        </div>
      </div>
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          position: relative;
          background: url('/img/hero-bg.jpg') center/cover no-repeat fixed;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(21, 43, 100, 0.8), rgba(100, 43, 115, 0.8));
          z-index: 1;
        }
        
        .content-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .logo-area {
          text-align: center;
          margin-bottom: 30px;
          color: #fff;
        }
        
        .logo {
          width: 100px;
          height: 100px;
          object-fit: contain;
          border-radius: 50%;
          padding: 3px;
          margin-bottom: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .logo-area h1 {
          font-size: 2rem;
          margin: 0 0 5px 0;
          text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }
        
        .logo-area h2 {
          font-size: 1.1rem;
          font-weight: 400;
          margin: 0;
          opacity: 0.9;
          text-shadow: 0 2px 3px rgba(0, 0, 0, 0.3);
        }
        
        .card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 35px 30px;
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          text-align: center;
          width: 100%;
          transition: transform 0.3s ease;
        }
        
        .card h3 {
          color: #dc3545;
          margin-bottom: 15px;
          font-size: 1.8rem;
          font-weight: 600;
        }
        
        .error-message {
          margin: 20px 0;
          padding: 15px;
          background-color: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          color: #721c24;
          border-radius: 8px;
          text-align: left;
        }
        
        .level-info {
          margin: 15px 0;
          padding: 10px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 5px;
        }
        
        .level-info p {
          margin: 5px 0;
        }
        
        .back-button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: linear-gradient(to right, #152b64, #644b66);
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .back-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
        }
        
        footer {
          margin-top: 40px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        @media (max-width: 480px) {
          .logo-area h1 {
            font-size: 1.6rem;
          }
          
          .logo-area h2 {
            font-size: 0.9rem;
          }
          
          .card {
            padding: 25px 20px;
          }
          
          .card h3 {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </>
  )
}
