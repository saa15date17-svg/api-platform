import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, message, Button, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { ErrorBoundary, StatCard } from '../../components';

interface Plan {
  key: string;
  name: string;
  price: string;
  rpm: number | string;
  tpm: string;
  tpd: string;
}

const Billing: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPlanCount, setTotalPlanCount] = useState(0);
  const [activePlanCount, setActivePlanCount] = useState(0);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ plans: Plan[] }>('/api/v1/billing/plans');
      const plansData = data.plans || [];
      setPlans(plansData);
      setTotalPlanCount(plansData.length);
      setActivePlanCount(plansData.filter(p => p.name !== 'Free').length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing plans');
      message.error('Failed to load billing plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const columns = [
    { title: 'Plan Name', dataIndex: 'name', key: 'name', render: (n: string) => <Tag color="blue">{n}</Tag> },
    { title: 'Price', dataIndex: 'price', key: 'price' },
    { title: 'Requests/Min', dataIndex: 'rpm', key: 'rpm' },
    { title: 'Tokens/Min', dataIndex: 'tpm', key: 'tpm' },
    { title: 'Tokens/Day', dataIndex: 'tpd', key: 'tpd' },
  ];

  if (error) {
    return (
      <ErrorBoundary>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Billing Plans</h2>
            <Button icon={<ReloadOutlined />} onClick={fetchPlans}>Refresh</Button>
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
          <h2 style={{ margin: 0 }}>Billing Plans</h2>
          <Button icon={<ReloadOutlined />} onClick={fetchPlans}>Refresh</Button>
        </div>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <StatCard title="Total Plans" value={totalPlanCount} loading={loading} />
          </Col>
          <Col span={12}>
            <StatCard title="Paid Plans" value={activePlanCount} loading={loading} valueStyle={{ color: '#3f8600' }} />
          </Col>
        </Row>

        <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : (
            <Table<Plan>
              columns={columns}
              dataSource={plans}
              rowKey="key"
              pagination={false}
              size="middle"
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Billing;
