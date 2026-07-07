import { ReactNode } from 'react';
import { Typography, Space, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  breadcrumbs?: { path?: string; label: string }[];
  extra?: ReactNode;
  onBack?: () => void;
  children?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  extra,
  onBack,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbItems = breadcrumbs
    ? [
        {
          key: 'home',
          label: <HomeOutlined style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => navigate('/dashboard')} />,
        },
        ...breadcrumbs.map((item, index) => ({
          key: index.toString(),
          label: item.path && index < breadcrumbs.length - 1 ? (
            <a onClick={() => navigate(item.path!)}>{item.label}</a>
          ) : (
            item.label
          ),
        })),
      ]
    : undefined;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          {breadcrumbItems && (
            <Space size="small" style={{ marginBottom: 8 }}>
              <HomeOutlined style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => navigate('/dashboard')} />
              {breadcrumbItems.slice(1).map((item) => (
                <span key={item.key}>
                  <span style={{ color: '#999', margin: '0 8px' }}>/</span>
                  <span>{item.label as any}</span>
                </span>
              ))}
            </Space>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onBack && (
              <Button type="text" onClick={onBack} style={{ padding: 0, height: 'auto' }}>
                ← Back
              </Button>
            )}
            <Title level={4} style={{ margin: 0 }}>{title}</Title>
          </div>
        </div>
        {extra && <Space>{extra}</Space>}
      </div>
      {children}
    </div>
  );
};
