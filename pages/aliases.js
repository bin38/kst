// pages/aliases.js
import Head from 'next/head'
import { parse } from 'cookie'
import { useState } from 'react'

// 刷新 OAuth2 token
async function fetchGoogleToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    })
  })
  if (!res.ok) return null
  const { access_token } = await res.json()
  return access_token
}

export async function getServerSideProps({ req }) {
  const cookies       = parse(req.headers.cookie || '')
  const oauthUsername = cookies.oauthUsername
  const trustLevel    = parseInt(cookies.oauthTrustLevel || '0', 10)

  if (!oauthUsername || trustLevel < 3) {
    return { redirect: { destination: '/', permanent: false } }
  }

  const rawDom      = process.env.EMAIL_DOMAIN
  const domain      = rawDom.startsWith('@') ? rawDom.slice(1) : rawDom
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}@${domain}`

  const token = await fetchGoogleToken()
  let aliases = []
  if (token) {
    const listRes = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(studentEmail)}/aliases`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (listRes.ok) {
      const data = await listRes.json()
      aliases = (data.aliases || []).map(a => a.alias)
    }
  }

  return {
    props: {
      aliases,
      studentEmail,
      emailDomain: domain,
    }
  }
}

export default function AliasesPage({ aliases, studentEmail, emailDomain }) {
  const [list, setList]       = useState(aliases)
  const [suffix, setSuffix]   = useState('')

  // 删除别名
  const handleDelete = async alias => {
    if (!confirm(`Delete alias ${alias}?`)) return
    const res = await fetch('/api/aliases/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias })
    })
    if (res.ok) {
      setList(list.filter(a => a !== alias))
    } else {
      alert('Delete failed')
    }
  }

  // 新增别名
  const handleAdd = async e => {
    e.preventDefault()
    if (!suffix) {
      return alert('Please enter the alias suffix.')
    }
    // 前端前缀固化
    const fullAlias = `kst_${suffix}@${emailDomain}`
    const res = await fetch('/api/aliases/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias: fullAlias })
    })
    if (res.ok) {
      setList([...list, fullAlias])
      setSuffix('')
    } else {
      const text = await res.text()
      alert('Add failed: ' + text)
    }
  }

  return (
    <>
      <Head>
        <title>Manage Email Aliases</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>
      <div className="container">
        <div className="school-header">
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" fill="#0062cc" />
            <rect x="14" y="14" width="20" height="12" rx="2" fill="#fff" />
            <path d="M14,26 L24,36 L34,26 Z" fill="#fff" />
            <text x="24" y="22" textAnchor="middle" fontSize="12" fill="#0062cc" fontFamily="Arial, sans-serif">
              KS
            </text>
          </svg>
          <div className="school-text">
            <h1>Kyrgyzstan State University of Technology</h1>
            <h2>Manage Email Aliases</h2>
          </div>
        </div>

        <div className="info">
          <p><strong>Student Email:</strong> {studentEmail}</p>
        </div>

        <div className="aliases">
          <h3>Existing Aliases</h3>
          {list.length === 0 && <p>No aliases yet.</p>}
          {list.map(alias => (
            <div key={alias} className="alias-item">
              <span>{alias}</span>
              <button onClick={() => handleDelete(alias)}>Delete</button>
            </div>
          ))}
        </div>

        <form className="add-form" onSubmit={handleAdd}>
          <span>kst_</span>
          <input
            value={suffix}
            onChange={e => setSuffix(e.target.value.trim())}
            placeholder="your-alias-suffix"
          />
          <span>@{emailDomain}</span>
          <button type="submit">Add Alias</button>
        </form>

        <p className="back-link">
          <a href="/student-portal">← Back to Portal</a>
        </p>
      </div>

      <style jsx>{`
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          padding: 0 20px; 
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
          padding: 16px; 
          border-radius: 6px; 
          margin-bottom: 20px;
          word-break: break-word;
        }
        .aliases { 
          background: #fff; 
          padding: 16px; 
          border-radius: 6px; 
          margin-bottom: 20px; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.1); 
        }
        .alias-item { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 8px 0;
          flex-wrap: wrap;
          gap: 10px;
          word-break: break-all;
        }
        .alias-item span {
          flex: 1;
          min-width: 200px;
        }
        .alias-item + .alias-item { 
          border-top: 1px solid #eee; 
        }
        .alias-item button { 
          background: #dc3545; 
          color: #fff; 
          border: none; 
          padding: 4px 8px; 
          border-radius: 4px; 
          cursor: pointer; 
        }
        .alias-item button:hover { 
          background: #c82333; 
        }
        .add-form { 
          display: flex; 
          gap: 8px; 
          align-items: center;
          flex-wrap: wrap;
        }
        .add-form span { 
          white-space: nowrap; 
          font-weight: bold; 
        }
        .add-form input { 
          flex: 1; 
          min-width: 100px;
          padding: 8px; 
          border: 1px solid #ccc; 
          border-radius: 4px; 
        }
        .add-form button { 
          padding: 8px 16px; 
          background: #28a745; 
          color: #fff; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
        }
        .add-form button:hover { 
          background: #218838; 
        }
        .back-link {
          text-align: center; 
          margin-top: 20px;
        }
        a { 
          color: #0070f3; 
          text-decoration: none; 
        }
        a:hover { 
          text-decoration: underline; 
        }

        /* 移动端适配 */
        @media (max-width: 480px) {
          .container {
            margin: 20px auto;
          }
          .school-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .school-text h1 {
            font-size: 20px;
          }
          .school-text h2 {
            font-size: 16px;
          }
          .add-form {
            gap: 5px;
          }
          .add-form button {
            width: 100%;
            margin-top: 5px;
          }
        }
      `}</style>
    </>
  )
}
