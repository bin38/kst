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
        dbError: false
      },
    };
  } catch (error) {
    console.error("获取注册信息失败:", error);
    // 数据库错误时显示错误状态
    return {
      props: {
        dbError: true,
        errorMessage: '数据库连接失败，请稍后再试'
      }
    };
  }
}

export default function Home({ registrationLimit, currentRegistrations, limitReached, dbError, errorMessage }) {
  const router = useRouter();
  const isLimitReached = limitReached || router.query.limit_reached === 'true';

  // 显示数据库错误
  if (dbError) {
    return (
      <>
        <Head>
          <title>系统维护中 - KST</title>
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
              <h3>系统维护中</h3>
              <div className="error-message">
                <p>{errorMessage}</p>
              </div>
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
            max-width: 1200px;
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
            /* 移除白色背景 */
            border-radius: 50%;
            padding: 3px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          
          .logo-area h1 {
            font-size: 2.4rem;
            margin: 0 0 5px 0;
            text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
          }
          
          .logo-area h2 {
            font-size: 1.2rem;
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
            max-width: 450px;
            width: 100%;
            transition: transform 0.3s ease;
          }
          
          .card h3 {
            color: #152b64;
            margin-bottom: 15px;
          }
          
          .card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 35px 30px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 450px;
            width: 100%;
            transition: transform 0.3s ease;
          }
          
          .card h3 {
            color: #152b64;
            margin-bottom: 15px;
            font-size: 1.8rem;
            font-weight: 600;
          }
          
          .subtitle {
            color: #555;
            margin: 0 0 25px 0;
            font-size: 1.1em;
          }
          
          .quota-info {
            background-color: rgba(240, 244, 255, 0.7);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 25px;
          }
          
          .quota-info p {
            margin: 0 0 10px 0;
            font-size: 1rem;
            color: #333;
          }
          
          .progress-bar {
            height: 10px;
            background-color: rgba(224, 224, 224, 0.7);
            border-radius: 5px;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            background: linear-gradient(to right, #4caf50, #2196f3);
            border-radius: 5px;
            transition: width 0.3s ease;
          }
          
          .button {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            padding: 14px 30px;
            background: linear-gradient(to right, #152b64, #644b66);
            color: #fff;
            border-radius: 8px;
            text-decoration: none;
            font-size: 1.1rem;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            width: 80%;
            max-width: 300px;
          }
          
          .button:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
          }
          
          .help-text {
            margin-top: 25px;
            font-size: 0.9rem;
            color: #555;
          }
          
          .limit-message {
            margin: 20px 0;
            padding: 15px;
            background-color: rgba(255, 243, 205, 0.8);
            border: 1px solid #ffeeba;
            color: #856404;
            border-radius: 8px;
          }

          .error-message {
            margin: 20px 0;
            padding: 15px;
            background-color: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.3);
            color: #721c24;
            
            .logo-area h2 {
              font-size: 1rem;
            }
            
            .logo {
              width: 80px;
              height: 80px;
            }
            
            .card {
              padding: 25px 20px;
            }
            
            .card h3 {
              font-size: 1.6rem;
            }
          }
          
          @media (max-width: 480px) {
            .container {
              padding: 15px;
            }
            
            .logo-area h1 {
              font-size: 1.6rem;
            }
            
            .logo-area h2 {
              font-size: 0.9rem;
            }
            
            .logo {
              width: 70px;
              height: 70px;
              margin-bottom: 10px;
            }
            
            .card {
              padding: 20px 15px;
              border-radius: 12px;
            }
            
            .card h3 {
              font-size: 1.4rem;
              margin-bottom: 10px;
            }
            
            .subtitle {
              font-size: 0.95rem;
              margin-bottom: 20px;
            }
            
            .quota-info {
              padding: 10px;
              margin-bottom: 20px;
            }
            
            .button {
              padding: 12px 20px;
              font-size: 1rem;
              width: 100%;
            }
            
            footer {
              margin-top: 30px;
              font-size: 0.8rem;
              padding: 0 10px;
            }
          }
        `}</style>
      </>
    );
  }

  // 正常显示
  return (
    <>
      <Head>
        <title>KST 学生门户登录</title>
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
            <h3>学生门户登录</h3>
            <p className="subtitle">请使用Linux.do账号进行身份验证</p>
            
            {/* 显示名额信息 */}
            <div className="quota-info">
              <p>注册名额: <strong>{currentRegistrations}</strong> / {registrationLimit}</p>
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" style={{ marginRight: '8px' }}>
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                </svg>
                使用 Linux.do 登录
              </a>
            )}

            <div className="help-text">
              <p>如有问题，请联系学校信息技术服务中心</p>
            </div>
          </div>
          
          <footer>
            © 2025 KST - 信息技术服务中心 | 致谢: @ChatGPT 
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
          max-width: 1200px;
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
          /* 移除白色背景 */
          border-radius: 50%;
          padding: 3px;
          margin-bottom: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .logo-area h1 {
          font-size: 2.4rem;
          margin: 0 0 5px 0;
          text-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }
        
        .logo-area h2 {
          font-size: 1.2rem;
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
          max-width: 450px;
          width: 100%;
          transition: transform 0.3s ease;
        }
        
        .card h3 {
          color: #152b64;
          margin-bottom: 15px;
          font-size: 1.8rem;
          font-weight: 600;
        }
        
        .subtitle {
          color: #555;
          margin: 0 0 25px 0;
          font-size: 1.1em;
        }
        
        .quota-info {
          background-color: rgba(240, 244, 255, 0.7);
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 25px;
        }
        
        .quota-info p {
          margin: 0 0 10px 0;
          font-size: 1rem;
          color: #333;
        }
        
        .progress-bar {
          height: 10px;
          background-color: rgba(224, 224, 224, 0.7);
          border-radius: 5px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, #4caf50, #2196f3);
          border-radius: 5px;
          transition: width 0.3s ease;
        }
        
        .button {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          padding: 14px 30px;
          background: linear-gradient(to right, #152b64, #644b66);
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-size: 1.1rem;
          font-weight: 500;
          transition: all 0.3s ease;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          width: 80%;
          max-width: 300px;
        }
        
        .button:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
        }
        
        .help-text {
          margin-top: 25px;
          font-size: 0.9rem;
          color: #555;
        }
        
        .limit-message {
          margin: 20px 0;
          padding: 15px;
          background-color: rgba(255, 243, 205, 0.8);
          border: 1px solid #ffeeba;
          color: #856404;
          border-radius: 8px;
        }
        
        footer {
          margin-top: 40px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        /* 移动端响应式优化 */
        @media (max-width: 768px) {
          .logo-area h1 {
            font-size: 2rem;
          }
          
          .logo-area h2 {
            font-size: 1rem;
          }
          
          .logo {
            width: 80px;
            height: 80px;
          }
          
          .card {
            padding: 25px 20px;
          }
          
          .card h3 {
            font-size: 1.6rem;
          }
        }
        
        @media (max-width: 480px) {
          .container {
            padding: 15px;
          }
          
          .logo-area h1 {
            font-size: 1.6rem;
          }
          
          .logo-area h2 {
            font-size: 0.9rem;
          }
          
          .logo {
            width: 70px;
            height: 70px;
            margin-bottom: 10px;
          }
          
          .card {
            padding: 20px 15px;
            border-radius: 12px;
          }
          
          .card h3 {
            font-size: 1.4rem;
            margin-bottom: 10px;
          }
          
          .subtitle {
            font-size: 0.95rem;
            margin-bottom: 20px;
          }
          
          .quota-info {
            padding: 10px;
            margin-bottom: 20px;
          }
          
          .button {
            padding: 12px 20px;
            font-size: 1rem;
            width: 100%;
          }
          
          footer {
            margin-top: 30px;
            font-size: 0.8rem;
            padding: 0 10px;
          }
        }
      `}</style>
    </>
  )
}
