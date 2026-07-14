import React from 'react';
import PageHeader from '../components/PageHeader';

const BifrostConsole: React.FC = () => {
  const host = window.location.hostname;
  const srcUrl = host.includes('onrender.com') 
    ? 'https://bifrost-jfjr.onrender.com'
    : `http://${host}:8082`;

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="Platform · Gateway"
        title="AI Gateway (Bifrost)"
        description="Configure LLM model fallback policies, rate limits, key rotation, and caching rules directly on the Bifrost gateway console."
      />
      <div className="card overflow-hidden w-full h-[calc(100vh-260px)]">
        <iframe
          src={srcUrl}
          title="Bifrost AI Gateway Console"
          className="w-full h-full border-none bg-white"
        />
      </div>
    </div>
  );
};

export default BifrostConsole;
