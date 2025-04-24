import Head from 'next/head'
import { parse } from 'cookie'
const { readCountAndLimit } = require('../lib/counter');

export async function getServerSideProps() {
  try {
    const { count, limit } = await readCountAndLimit();
    
    return {
      props: {
        currentRegistrations: count,
        registrationLimit: limit,
        dbError: false
      }
    };
  } catch (error) {
    console.error("获取注册信息失败:", error);
    return {
      props: {
        currentRegistrations: 0,
        registrationLimit: 0,
        dbError: true
      }
    };
  }
}

export default function QuotaExceeded({ currentRegistrations, registrationLimit, dbError }) {
  return (
    <>
      <Head>
        <title>注册名额已满 - KST</title>
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
            <h3>注册名额已满</h3>
            <div className="quota-message">
              <p>抱歉，当前注册名额已全部用完。</p>
              
              {!dbError && (
                <div className="quota-info">
                  <p>已注册人数: <strong>{currentRegistrations}</strong> / {registrationLimit}</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                </div>
              )}
              
              <p>请稍后再尝试注册，或联系学校信息技术服务中心咨询具体情况。</p>
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
          color: #f39c12;
          margin-bottom: 15px;
          font-size: 1.8rem;
          font-weight: 600;
        }
        
        .quota-message {
          margin: 20px 0;
          padding: 15px;
          background-color: rgba(255, 243, 205, 0.3);
          border: 1px solid rgba(255, 224, 138, 0.5);
          color: #856404;
          border-radius: 8px;
          text-align: left;
        }
        
        .quota-info {
          margin: 15px 0;
          padding: 10px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 5px;
        }
        
        .quota-info p {
          margin: 5px 0;
          font-weight: 500;
        }
        
        .progress-bar {
          height: 10px;
          background-color: rgba(224, 224, 224, 0.7);
          border-radius: 5px;
          overflow: hidden;
          margin-top: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, #f39c12, #e74c3c);
          border-radius: 5px;
          transition: width 0.3s ease;
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
