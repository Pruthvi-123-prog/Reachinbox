import React, { useEffect, useState } from 'react';

/**
 * Component to check and display Puter.js availability in the frontend
 */
const PuterStatus: React.FC = () => {
  const [status, setStatus] = useState<{
    isPuterAvailable: boolean;
    isAIAvailable: boolean;
    version?: string;
  }>({
    isPuterAvailable: false,
    isAIAvailable: false
  });

  useEffect(() => {
    const checkPuterStatus = () => {
      try {
        const puterWindow = window as any;
        const isPuterAvailable = typeof puterWindow.puter !== 'undefined';
        const isAIAvailable = isPuterAvailable && typeof puterWindow.puter.ai !== 'undefined';
        const version = isPuterAvailable ? puterWindow.puter.version : undefined;

        setStatus({
          isPuterAvailable,
          isAIAvailable,
          version
        });

        console.log('Puter.js Status:', {
          isPuterAvailable,
          isAIAvailable,
          version
        });
      } catch (error) {
        console.error('Error checking Puter.js status:', error);
        setStatus({
          isPuterAvailable: false,
          isAIAvailable: false
        });
      }
    };

    // Check immediately
    checkPuterStatus();

    // Also set up an interval to check every few seconds
    // This helps in case Puter.js loads after this component mounts
    const interval = setInterval(checkPuterStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: status.isPuterAvailable ? '#dff0d8' : '#f2dede',
      padding: '8px 12px',
      borderRadius: '4px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>Puter.js: {status.isPuterAvailable ? '✅' : '❌'}</div>
      <div>AI API: {status.isAIAvailable ? '✅' : '❌'}</div>
      {status.version && <div>Version: {status.version}</div>}
    </div>
  );
};

export default PuterStatus;
