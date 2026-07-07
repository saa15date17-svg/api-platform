import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Row, Col, Divider } from 'antd';
import { SettingOutlined, MailOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { ErrorBoundary, StatCard } from '../../components';

interface SettingsData {
  platform_name: string;
  support_email: string;
}

const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<SettingsData>('/api/v1/configs/ui');
        if (data) {
          form.setFieldsValue(data);
          setLastSaved(new Date().toLocaleString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
        message.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  const onFinish = async (values: SettingsData) => {
    setSaving(true);
    try {
      await api.post('/api/v1/configs/ui', values);
      message.success('Settings saved successfully');
      setLastSaved(new Date().toLocaleString());
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <ErrorBoundary>
        <div>
          <h2 style={{ marginBottom: 16 }}>Settings</h2>
          <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
            <p style={{ color: '#ff4d4f' }}>{error}</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <StatCard title="Configuration Status" value={loading ? 'Loading...' : 'Ready'} valueStyle={{ color: loading ? undefined : '#3f8600' }} prefix={<SettingOutlined />} loading={loading} />
          </Col>
          <Col span={12}>
            <StatCard title="Support Email" value="Configured" valueStyle={{ color: '#1890ff' }} prefix={<MailOutlined />} />
          </Col>
        </Row>

        <Card title="Platform Configuration" style={{ marginBottom: 24 }}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item label="Platform Name" name="platform_name" rules={[{ required: true, message: 'Please enter platform name' }]}>
                  <Input placeholder="My API Platform" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Support Email" name="support_email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
                  <Input placeholder="support@example.com" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>
                Save Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {lastSaved && (
          <Card type="inner" title="Activity Log">
            <p style={{ margin: 0, color: '#999' }}>Last config update: {lastSaved}</p>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Settings;
