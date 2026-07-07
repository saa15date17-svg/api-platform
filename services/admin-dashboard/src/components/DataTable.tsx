import { Table, TableProps, Button, Space, Form, Input, Select, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';

interface DataTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: TableProps<T>['columns'];
  searchable?: boolean;
  searchFields?: { name: string; label: string }[];
  filters?: { name: string; label: string; options: { label: string; value: any }[] }[];
  onSearch?: (values: Record<string, any>) => void;
  toolbarExtra?: React.ReactNode;
  rowActions?: (record: T) => React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
}

export function DataTable<T extends Record<string, any>>({
  columns = [],
  searchable,
  searchFields = [],
  filters = [],
  onSearch,
  toolbarExtra,
  rowActions,
  loading,
  onRefresh,
  ...rest
}: DataTableProps<T>) {
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const handleSearch = (values: Record<string, any>) => {
    onSearch?.(values);
    setSearchText(values.search || '');
  };

  const handleReset = () => {
    form.resetFields();
    onSearch?.({});
    setSearchText('');
  };

  const enhancedColumns = useMemo(() => {
    if (rowActions) {
      return [
        ...columns,
        {
          title: 'Actions',
          key: 'actions',
          width: 150,
          fixed: 'right' as const,
          render: (_: any, record: T) => (
            <Space>{rowActions(record)}</Space>
          ),
        },
      ];
    }
    return columns;
  }, [columns, rowActions]);

  return (
    <div>
      {(searchable || filters.length > 0 || toolbarExtra) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Form form={form} onFinish={handleSearch} layout="inline">
              {searchable && (
                <Form.Item name="search" style={{ marginBottom: 0 }}>
                  <Input
                    placeholder="Search..."
                    prefix={<SearchOutlined />}
                    allowClear
                    style={{ width: 240 }}
                  />
                </Form.Item>
              )}
              {filters.map((filter) => (
                <Form.Item key={filter.name} name={filter.name} style={{ marginBottom: 0 }}>
                  <Select
                    placeholder={filter.label}
                    options={filter.options}
                    allowClear
                    style={{ width: 180 }}
                  />
                </Form.Item>
              ))}
              {(searchable || filters.length > 0) && (
                <Form.Item style={{ marginBottom: 0 }}>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      Search
                    </Button>
                    <Button onClick={handleReset}>Reset</Button>
                  </Space>
                </Form.Item>
              )}
            </Form>
          </Col>
          <Col>
            <Space>
              {onRefresh && (
                <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                  Refresh
                </Button>
              )}
              {toolbarExtra}
            </Space>
          </Col>
        </Row>
      )}

      <Table<T>
        columns={enhancedColumns}
        {...rest}
        loading={loading}
        rowKey="id"
      />
    </div>
  );
}
