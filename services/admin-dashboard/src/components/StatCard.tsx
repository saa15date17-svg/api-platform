import { Card, Statistic } from 'antd';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  precision?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  loading?: boolean;
  valueStyle?: React.CSSProperties;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  precision,
  prefix,
  suffix,
  loading,
  valueStyle,
}) => {
  return (
    <Card>
      <Statistic
        title={title}
        value={value}
        precision={precision}
        prefix={prefix}
        suffix={suffix}
        loading={loading}
        valueStyle={valueStyle}
      />
    </Card>
  );
};
