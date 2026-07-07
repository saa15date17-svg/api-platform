import React from 'react';

const BifrostConsole: React.FC = () => {
  return (
    <div style={{ height: 'calc(100vh - 112px)', width: '100%', overflow: 'hidden', background: '#fff', borderRadius: '8px' }}>
      <iframe
        src="http://localhost:8082"
        title="Bifrost AI Gateway Console"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
};

export default BifrostConsole;
