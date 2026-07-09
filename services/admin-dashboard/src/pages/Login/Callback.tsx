import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInCallback } from '../../lib/oidc';
import { useAuth } from '../../hooks/useAuth';
import { Spin, Result } from 'antd';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const user = await signInCallback();
        if (user && user.id_token) {
          login(user.id_token, {
            id: user.profile.sub,
            email: user.profile.email,
            name: user.profile.name || user.profile.email,
            role: 'admin',
          });
          navigate('/dashboard');
        } else {
          setError('No user data received from ZITADEL');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        setError(msg);
      }
    };
    handleCallback();
  }, [navigate, login]);

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0c29' }}>
        <Result status="error" title="Authentication Failed" subTitle={error} />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0c29' }}>
      <Spin size="large" tip="Completing authentication..." />
    </div>
  );
};

export default Callback;
