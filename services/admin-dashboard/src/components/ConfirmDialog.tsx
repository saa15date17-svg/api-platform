import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { createRoot } from 'react-dom/client';

interface ConfirmDialogOptions {
  title: string;
  content: string;
  okText?: string;
  cancelText?: string;
  okButtonProps?: Record<string, any>;
  onOk: () => void | Promise<void>;
  onCancel?: () => void;
}

export function confirmDialog(options: ConfirmDialogOptions) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const modal = (
    <Modal
      open
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          {options.title}
        </span>
      }
      onCancel={() => {
        root.unmount();
        container.remove();
        options.onCancel?.();
      }}
      onOk={async () => {
        await options.onOk();
        root.unmount();
        container.remove();
      }}
      okText={options.okText || 'Yes'}
      cancelText={options.cancelText || 'Cancel'}
      okButtonProps={{ danger: true, ...options.okButtonProps }}
      cancelButtonProps={{ danger: false }}
      centered
    >
      <p>{options.content}</p>
    </Modal>
  );

  root.render(modal);

  return {
    destroy: () => {
      root.unmount();
      container.remove();
    },
  };
}
