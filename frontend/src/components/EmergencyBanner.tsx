import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const EmergencyBanner: React.FC = () => {
  const [banner, setBanner] = useState<{ enabled: boolean; text: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('emergency_banner_dismissed') === 'true') {
      setDismissed(true);
      return;
    }

    const apiUrl = (import.meta.env.PUBLIC_API_URL as string | undefined) || 'http://localhost:3000';
    fetch(`${apiUrl}/api/settings/emergency`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setBanner(data); })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('emergency_banner_dismissed', 'true');
  };

  if (!banner?.enabled || !banner.text || dismissed) return null;

  return (
    <div className="bg-destructive text-white px-4 py-3 relative" role="alert">
      <div className="container mx-auto flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{banner.text}</p>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-destructive/80 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default EmergencyBanner;
