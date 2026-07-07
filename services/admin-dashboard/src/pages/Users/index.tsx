import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { api } from '../../api/client';
import { ErrorBoundary, DataTable, confirmDialog } from '../../components';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: number;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ users: User[] }>('/api/v1/users/all');
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = async (id: string, role: string) => {
    try {
      await api.post(`/api/v1/users/${id}/update`, { role });
      message.success(`User role updated to ${role}`);
      setUsers(users.map(u => u.id === id ? { ...u, role } : u));
    } catch {
      message.error('Failed to update user role');
    }
  };

  const confirmDelete = (id: string, email: string) => {
    confirmDialog({
      title: 'Delete User',
      content: `Are you sure you want to delete user "${email}"? This action cannot be undone.`,
      onOk: async () => {
        try {
          await api.delete(`/api/v1/users/${id}`);
          message.success('User deleted');
          setUsers(users.filter(u => u.id !== id));
        } catch {
          message.error('Failed to delete user');
        }
      },
    });
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a: User, b: User) => a.email.localeCompare(b.email) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: User, b: User) => a.name.localeCompare(b.name) },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      sorter: (a: User, b: User) => a.role.localeCompare(b.role),
      filters: [
        { text: 'Admin', value: 'admin' },
        { text: 'User', value: 'user' },
        { text: 'Billing', value: 'billing' },
      ],
      onFilter: (value: any, record: User) => record.role === value,
      render: (role: string) => (
        <span style={{ textTransform: 'uppercase' }}>{role}</span>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => (v ? 'Yes' : 'No'),
      sorter: (a: User, b: User) => Number(a.is_active) - Number(b.is_active),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: number) => v ? new Date(v * 1000).toLocaleDateString() : '-',
      sorter: (a: User, b: User) => a.created_at - b.created_at,
      defaultSortOrder: 'descend' as const,
    },
  ];

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchText.toLowerCase()) ||
      u.name.toLowerCase().includes(searchText.toLowerCase()) ||
      u.role.toLowerCase().includes(searchText.toLowerCase())
  );

  if (error) {
    return (
      <ErrorBoundary>
        <div>
          <h2 style={{ marginBottom: 16 }}>Users</h2>
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
        <h2 style={{ marginBottom: 16 }}>Users</h2>
        <DataTable<User>
          columns={columns}
          dataSource={filteredUsers}
          loading={loading}
          onRefresh={fetchUsers}
          searchable
          onSearch={(values) => setSearchText(values.search || '')}
          rowActions={(record) => (
            <>
              {record.role !== 'admin' ? (
                <a key="make-admin" onClick={() => updateUserRole(record.id, 'admin')}>Make Admin</a>
              ) : (
                <a key="demote" onClick={() => updateUserRole(record.id, 'user')}>Demote</a>
              )}
              <a key="delete" style={{ color: '#ff4d4f', marginLeft: 12 }} onClick={() => confirmDelete(record.id, record.email)}>Delete</a>
            </>
          )}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Users;
