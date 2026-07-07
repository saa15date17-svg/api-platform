import React from 'react';
import { Layout, Menu, Button, theme } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  KeyOutlined,
  BarChartOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard', roles: ['admin', 'user', 'billing'] },
  { key: '/users', icon: <TeamOutlined />, label: 'Users', roles: ['admin'] },
  { key: '/api-keys', icon: <KeyOutlined />, label: 'API Keys', roles: ['admin', 'billing'] },
  { key: '/usage', icon: <BarChartOutlined />, label: 'Usage', roles: ['admin', 'user', 'billing'] },
  { key: '/billing', icon: <DollarOutlined />, label: 'Billing', roles: ['admin', 'billing'] },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings', roles: ['admin'] },
  { key: '/zitadel', icon: <SettingOutlined />, label: 'IAM Console (Zitadel)', roles: ['admin'] },
  { key: '/bifrost', icon: <SettingOutlined />, label: 'AI Gateway (Bifrost)', roles: ['admin'] },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();
  const { user } = useAuth();

  const visibleItems = menuItems.filter(item => !item.roles || item.roles.includes(user?.role || ''));
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ height: 32, margin: 16, color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>
          API Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: themeToken.colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={async () => {
              await api.signout();
              localStorage.removeItem('token');
              navigate('/login');
            }}
          >
            Logout
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
