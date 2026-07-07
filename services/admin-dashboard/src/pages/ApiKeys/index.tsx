import React, { useState, useEffect, useCallback } from 'react';
import { Tag, message, Button, Modal, Form, Input, InputNumber, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { ErrorBoundary, DataTable, confirmDialog, StatCard } from '../../components';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  spending_limit: number | null;
  created_at: number;
}

const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ keys: ApiKey[] }>('/api/v1/keys');
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
      message.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (values: { name: string; user_id: string; spending_limit?: number }) => {
    setSubmitting(true);
    try {
      await api.post('/api/v1/keys', {
        name: values.name,
        user_id: values.user_id,
        spending_limit: values.spending_limit,
      });
      message.success('API Key created successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchKeys();
    } catch {
      message.error('Failed to create API key');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = useCallback((id: string, name: string) => {
    confirmDialog({
      title: 'Revoke API Key',
      content: `Are you sure you want to revoke API key "${name}"? This action cannot be undone.`,
      okText: 'Revoke',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/api/v1/keys/${id}`);
          message.success('API Key revoked');
          setKeys(keys.filter(k => k.id !== id));
        } catch {
          message.error('Failed to revoke API key');
        }
      },
    });
  }, [keys]);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: ApiKey, b: ApiKey) => a.name.localeCompare(b.name) },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      filters: [
        { text: 'Active', value: true },
        { text: 'Disabled', value: false },
      ],
      onFilter: (value: any, record: ApiKey) => record.is_active === value,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Disabled'}</Tag>,
    },
    {
      title: 'Spending Limit',
      dataIndex: 'spending_limit',
      key: 'spending_limit',
      render: (v: number | null) => v !== null && v !== undefined ? `$${v.toFixed(2)}` : 'Unlimited',
      sorter: (a: ApiKey, b: ApiKey) => (a.spending_limit || 0) - (b.spending_limit || 0),
    },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (v: number) => v ? new Date(v * 1000).toLocaleDateString() : '-' },
  ];

  const activeKeys = keys.filter(k => k.is_active).length;
  const revokedKeys = keys.length - activeKeys;

  if (error) {
    return (
      <ErrorBoundary>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Developer API Keys</h2>
            <Button type="primary" onClick={() => { form.resetFields(); setIsModalVisible(true); }}>
              Generate API Key
            </Button>
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Developer API Keys</h2>
          <Button type="primary" onClick={() => { form.resetFields(); setIsModalVisible(true); }}>
            Generate API Key
          </Button>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <StatCard title="Total Keys" value={keys.length} />
          </Col>
          <Col span={8}>
            <StatCard title="Active Keys" value={activeKeys} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={8}>
            <StatCard title="Revoked Keys" value={revokedKeys} valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>

        <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : (
            <DataTable<ApiKey>
              columns={columns}
              dataSource={keys}
              loading={loading}
              onRefresh={fetchKeys}
              searchable
              onSearch={(values) => setSearchText(values.search || '')}
              rowActions={(record) => (
                <>
                  <Button type="link" danger size="small" onClick={() => handleDelete(record.id, record.name)}>
                    Revoke
                  </Button>
                </>
              )}
            />
          )}
        </div>

        <Modal
          title="Generate New API Key"
          open={isModalVisible}
          onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
          onOk={() => form.submit()}
          confirmLoading={submitting}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="name" label="Key Name" rules={[{ required: true, message: 'Please enter key name' }]}>
              <Input placeholder="e.g. Production Backend" />
            </Form.Item>
            <Form.Item name="user_id" label="User ID to Bind" rules={[{ required: true, message: 'Please enter User ID' }]}>
              <Input placeholder="User ID of the developer" />
            </Form.Item>
            <Form.Item name="spending_limit" label="Spending Limit ($USD, Optional)">
              <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 50.00" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default ApiKeys;
