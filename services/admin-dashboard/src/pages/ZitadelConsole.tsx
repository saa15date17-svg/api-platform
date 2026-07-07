import React from 'react';

const ZitadelConsole: React.FC = () => {
  return (
    <div style={{ height: 'calc(100vh - 112px)', width: '100%', overflow: 'hidden', background: '#fff', borderRadius: '8px' }}>
      <iframe
        src="https://auth.optamus.cloud/ui/console/"
        title="Zitadel Console"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
};

export default ZitadelConsole;
