import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head><title>Kyrgyzstan State University of Technology</title></Head>
      <div className="container">
        <div className="card">
          <h1>欢迎来到KST大学</h1>
          <p>请通过 Linux.do 进行身份验证以继续：</p>
          <a className="button" href="/api/oauth2/initiate">
            使用 Linux.do 登录
          </a>
          <div className="cta">
            <p>请注意：本系统仅供已注册学生使用</p>
            <p>如有问题请联系学校技术支持部门</p>
          </div>
        </div>
        
        <footer>
          © 2025 KST - 信息技术服务中心
        </footer>
      </div>
      
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          background: linear-gradient(135deg, #f0f4f8, #d9e2ec);
          padding: 20px;
        }
        .card {
          background: #fff;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 480px; width: 100%;
        }
        h1 { color: #333; margin-bottom: 20px; }
        p { color: #555; margin: 10px 0; }
        .button {
          display: inline-block; margin-top: 20px;
          padding: 12px 24px; background: #0070f3;
          color: #fff; border-radius: 6px;
          text-decoration: none; font-size: 18px;
          transition: background 0.3s;
        }
        .button:hover { background: #005bb5; }
        .cta { margin-top: 30px; color: #444; font-size: 16px; }
        footer {
          margin-top: 40px; color: #777; font-size: 14px;
        }
        footer a { color: #0070f3; text-decoration: none; }
        footer a:hover { text-decoration: underline; }
      `}</style>
    </>
  )
}
