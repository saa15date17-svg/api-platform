import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, message } from 'antd';
import { ArrowUpOutlined, TeamOutlined, KeyOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { StatCard } from '../../components';
import { ErrorBoundary } from '../../components';

interface DashboardStats {
  total_users: number;
  active_keys: number;
  requests_today: number;
  revenue: number;
}

const StatsGrid: React.FC<{ stats: DashboardStats; loading: boolean }> = ({ stats, loading }) => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} lg={6}>
      <StatCard title="Total Users" value={stats.total_users} prefix={<TeamOutlined />} loading={loading} />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <StatCard title="Active API Keys" value={stats.active_keys} prefix={<KeyOutlined />} loading={loading} />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <StatCard title="Requests Today" value={stats.requests_today} prefix={<ArrowUpOutlined />} loading={loading} />
    </Col>
    <Col xs={24} sm={12} lg={6}>
      <StatCard title="Revenue" value={stats.revenue} precision={2} prefix={<DollarOutlined />} loading={loading} />
    </Col>
  </Row>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    active_keys: 0,
    requests_today: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, keysRes, usageRes] = await Promise.all([
        api.get<{ users: any[] }>('/api/v1/users'),
        api.get<{ keys: any[] }>('/api/v1/keys'),
        api.get<any>('/api/v1/usage/stats'),
      ]);
      setStats({
        total_users: usersRes.users?.length || 0,
        active_keys: keysRes.keys?.filter((k: any) => k.is_active).length || 0,
        requests_today: usageRes.total_requests || 0,
        revenue: usageRes.total_cost || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      message.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>Dashboard</h2>
        <ErrorBoundary>
          <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
            <p style={{ color: '#ff4d4f' }}>{error}</p>
          </div>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Dashboard</h2>
      <ErrorBoundary>
        <StatsGrid stats={stats} loading={loading} />
      </ErrorBoundary>
    </div>
  );
};

export default Dashboard;
