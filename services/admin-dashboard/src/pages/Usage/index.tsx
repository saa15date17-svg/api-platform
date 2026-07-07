import React, { useState, useEffect, useCallback } from 'react';
import { Card, Col, Row, message, Button } from 'antd';
import { ReloadOutlined, ArrowUpOutlined, ThunderboltOutlined, DollarOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { ErrorBoundary, StatCard } from '../../components';

interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
}

const Usage: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>({
    total_requests: 0,
    total_tokens: 0,
    total_cost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<any>('/api/v1/usage/stats');
      setStats({
        total_requests: data.total_requests || 0,
        total_tokens: data.total_tokens || 0,
        total_cost: data.total_cost || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
      message.error('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) {
    return (
      <ErrorBoundary>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Usage Analytics</h2>
            <Button icon={<ReloadOutlined />} onClick={fetchStats}>Refresh</Button>
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
          <h2 style={{ margin: 0 }}>Usage Analytics</h2>
          <Button icon={<ReloadOutlined />} onClick={fetchStats}>Refresh</Button>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Total Requests"
              value={stats.total_requests}
              prefix={<ArrowUpOutlined />}
              loading={loading}
              valueStyle={{ color: loading ? undefined : '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Total Tokens"
              value={stats.total_tokens}
              prefix={<ThunderboltOutlined />}
              loading={loading}
              valueStyle={{ color: loading ? undefined : '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Total Cost ($)"
              value={stats.total_cost}
              precision={4}
              prefix={<DollarOutlined />}
              loading={loading}
              valueStyle={{ color: loading ? undefined : '#cf1322' }}
            />
          </Col>
        </Row>

        <Card title="Usage Trends" style={{ marginTop: 24 }}>
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>
            Detailed usage charts will be available when connected to the analytics backend.
          </p>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default Usage;
