import Head from 'next/head';
import { parse } from 'cookie';
import { useState } from 'react';

// Removed fetchGoogleToken as it's now only needed server-side for validation

export async function getServerSideProps({ req }) {
  const cookies = parse(req.headers.cookie || '');
  const oauthUsername = cookies.oauthUsername;
  const trustLevel = parseInt(cookies.oauthTrustLevel || '0', 10);

  // Basic validation: user must be logged in and meet trust level
  if (!oauthUsername || trustLevel < 3) {
    return { redirect: { destination: '/', permanent: false } };
  }

  const rawDom = process.env.EMAIL_DOMAIN;
  const domain = rawDom.startsWith('@') ? rawDom.slice(1) : rawDom;
  const studentEmail = oauthUsername.includes('@')
    ? oauthUsername
    : `${oauthUsername}@${domain}`;

  // No need to fetch aliases anymore
  return {
    props: {
      studentEmail, // Main email of the logged-in user
      emailDomain: domain,
    },
  };
}

// Renamed component for clarity
export default function CreateSecondaryAccountPage({ studentEmail, emailDomain }) {
  const [suffix, setSuffix] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // To store success/error message
  const [newAccountInfo, setNewAccountInfo] = useState(null); // To store created account details

  // Handle form submission to create a new secondary account
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!suffix) {
      return alert('Please enter the desired account suffix.');
    }
    setIsLoading(true);
    setResult(null);
    setNewAccountInfo(null);

    const fullNewEmail = `kst_${suffix}@${emailDomain}`;

    try {
      const res = await fetch('/api/aliases/add', { // Using the same endpoint name for now
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the full desired email as 'alias' (matching API expectation)
        body: JSON.stringify({ alias: fullNewEmail }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ type: 'success', message: data.message || 'Account created successfully!' });
        setNewAccountInfo({ email: data.email, password: data.password }); // Store details
        setSuffix(''); // Clear input on success
      } else {
        const text = await res.text();
        setResult({ type: 'error', message: `Failed to create account: ${text}` });
      }
    } catch (error) {
      console.error("Error calling API:", error);
      setResult({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        {/* Updated Title */}
        <title>Create Secondary Email Account</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>
      <div className="container">
        <div className="school-header">
          {/* School logo/icon can remain */}
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
             {/* ... existing svg ... */}
             <circle cx="24" cy="24" r="22" fill="#0062cc" />
             <rect x="14" y="14" width="20" height="12" rx="2" fill="#fff" />
             <path d="M14,26 L24,36 L34,26 Z" fill="#fff" />
             <text x="24" y="22" textAnchor="middle" fontSize="12" fill="#0062cc" fontFamily="Arial, sans-serif">KS</text>
          </svg>
          <div className="school-text">
            <h1>Kyrgyzstan State University of Technology</h1>
            {/* Updated Subtitle */}
            <h2>Create Secondary Email Account</h2>
          </div>
        </div>

        <div className="info">
          <p><strong>Your Primary Email:</strong> {studentEmail}</p>
          <p>Use this form to create a new, secondary email-only account (e.g., for specific services). The account format will be <strong>kst_suffix@{emailDomain}</strong>.</p>
          <p><strong>Note:</strong> This creates a separate account with its own password, primarily intended for email access.</p>
        </div>

        {/* Form for creating new account */}
        <form className="add-form" onSubmit={handleAdd}>
          <h3>Create New Account</h3>
          <div className="input-group">
            <span>kst_</span>
            <input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.trim().toLowerCase())} // Ensure lowercase suffix
              placeholder="your-account-suffix"
              disabled={isLoading}
              required
            />
            <span>@{emailDomain}</span>
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        {/* Display Result */}
        {result && (
          <div className={`result-message ${result.type}`}>
            <p>{result.message}</p>
            {/* Display new account info if creation was successful */}
            {newAccountInfo && result.type === 'success' && (
              <div className="account-details">
                <p><strong>New Account Email:</strong> {newAccountInfo.email}</p>
                {/* WARNING: Displaying password is a security risk */}
                {newAccountInfo.password && <p><strong>Temporary Password:</strong> {newAccountInfo.password}</p>}
                <p><small>You will be required to change this password upon first login.</small></p>
              </div>
            )}
          </div>
        )}

        {/* Removed alias list and delete buttons */}

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
          background: #f0f4f8; /* Lighter blue background */
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 25px;
          border: 1px solid #d1e0ec;
          font-size: 0.95em;
          line-height: 1.5;
        }
        .info p {
          margin: 5px 0;
        }
        .info strong {
           color: #152b64;
        }

        /* Form styling */
        .add-form {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .add-form h3 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #333;
          text-align: center;
        }
        .input-group {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-wrap: wrap; /* Allow wrapping on small screens */
          margin-bottom: 15px;
        }
        .input-group span {
          white-space: nowrap;
          font-weight: bold;
          color: #555;
        }
        .input-group input {
          flex: 1;
          min-width: 150px; /* Ensure input has reasonable width */
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1em;
        }
        .add-form button {
          display: block; /* Make button full width */
          width: 100%;
          padding: 12px 16px;
          background: #28a745;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.1em;
          transition: background-color 0.2s;
        }
        .add-form button:hover {
          background: #218838;
        }
        .add-form button:disabled {
          background: #aaa;
          cursor: not-allowed;
        }

        /* Result message styling */
        .result-message {
          padding: 15px;
          margin-top: 20px;
          border-radius: 6px;
          border: 1px solid;
        }
        .result-message.success {
          background-color: #d4edda;
          border-color: #c3e6cb;
          color: #155724;
        }
        .result-message.error {
          background-color: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }
        .result-message p {
          margin: 0 0 10px 0;
        }
        .account-details {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        .account-details p {
          margin: 5px 0;
          word-break: break-all; /* Break long passwords/emails */
        }

        .back-link {
          text-align: center;
          margin-top: 30px;
        }
        a {
          color: #0070f3;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }

        /* Removed alias list styles */

        /* Mobile adjustments */
        @media (max-width: 480px) {
          .container {
            margin: 20px auto;
          }
          .school-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .school-text h1 { font-size: 20px; }
          .school-text h2 { font-size: 16px; }
          .input-group input { min-width: 120px; }
        }
      `}</style>
    </>
  );
}
