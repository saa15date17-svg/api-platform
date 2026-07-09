import React, { useState } from 'react';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Form, Input, Button, Card, message, Typography, Alert, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { signInRedirect } from '../../lib/oidc';

interface LoginResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  role: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasZitadel = !!(import.meta.env.VITE_ZITADEL_ISSUER && import.meta.env.VITE_ZITADEL_CLIENT_ID);

  const handleZitadelLogin = async () => {
    try {
      await signInRedirect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ZITADEL login failed';
      setError(msg);
      message.error(msg);
    }
  };

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      setError(null);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(`${API_BASE}/api/v1/auths/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }
      const data: LoginResponse = await resp.json();
      login(data.token, {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      });
      message.success(`Welcome, ${data.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <Card
        style={{
          width: 420,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>
            ⚙️
          </div>
          <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>Admin Dashboard</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.5)' }}>Sign in to manage your platform</Typography.Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 8 }} />}

        {hasZitadel && (
          <>
            <Button
              block
              size="large"
              onClick={handleZitadelLogin}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: 10,
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              Sign in with ZITADEL
            </Button>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>or use credentials</span>
            </Divider>
          </>
        )}

        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, message: 'Please enter your email' }]}>
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
              placeholder="admin@optamus.cloud"
              size="large"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
              placeholder="Password"
              size="large"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: 10, height: 48, fontSize: 16, fontWeight: 600 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
