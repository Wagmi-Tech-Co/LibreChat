import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import type { ContextType } from '~/common';
import {
  useAuthContext,
  useAssistantsMap,
  useAgentsMap,
  useFileMap,
  useSearchEnabled,
} from '~/hooks';
import {
  AgentsMapContext,
  AssistantsMapContext,
  FileMapContext,
  SetConvoProvider,
} from '~/Providers';
import { MCPLoadingProvider } from '~/Providers/MCPLoadingProvider';
import TermsAndConditionsModal from '~/components/ui/TermsAndConditionsModal';
import { useUserTermsQuery, useGetStartupConfig } from '~/data-provider';
import { Nav, MobileNav } from '~/components/Nav';
import { Banner } from '~/components/Banners';

export default function Root() {
  const [showTerms, setShowTerms] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [navVisible, setNavVisible] = useState(() => {
    const savedNavVisible = localStorage.getItem('navVisible');
    return savedNavVisible !== null ? JSON.parse(savedNavVisible) : true;
  });

  const { isAuthenticated, logout } = useAuthContext();
  const assistantsMap = useAssistantsMap({ isAuthenticated });
  const agentsMap = useAgentsMap({ isAuthenticated });
  const fileMap = useFileMap({ isAuthenticated });

  const { data: config } = useGetStartupConfig();
  const { data: termsData } = useUserTermsQuery({
    enabled: isAuthenticated && config?.interface?.termsOfService?.modalAcceptance === true,
  });

  useSearchEnabled(isAuthenticated);

  useEffect(() => {
    if (termsData) {
      setShowTerms(!termsData.termsAccepted);
    }
  }, [termsData]);

  const handleAcceptTerms = () => {
    setShowTerms(false);
  };

  const handleDeclineTerms = () => {
    setShowTerms(false);
    logout('/login?redirect=false');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SetConvoProvider>
      <FileMapContext.Provider value={fileMap}>
        <AssistantsMapContext.Provider value={assistantsMap}>
          <AgentsMapContext.Provider value={agentsMap}>
            <MCPLoadingProvider>
              <Banner onHeightChange={setBannerHeight} />
              <div 
                className="flex"
                style={{ height: `calc(100dvh - ${bannerHeight}px)` }}
              >
                <div className="relative z-0 flex h-full w-full overflow-hidden">
                  {/* Video Background with Filter */}
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <video
                      className="h-full w-full object-cover opacity-25"
                      autoPlay
                      loop
                      muted
                      playsInline
                    >
                      <source src="/assets/Arka-Plan.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    
                    {/* Dotted pattern overlay */}
                    <div 
                      className="absolute inset-0"
                      style={{
                          backgroundImage: 'url(/assets/background_filter.png)',
                          backgroundSize: "auto",
                          backgroundRepeat: "repeat",
                          backgroundPosition: 'center center',
                      }} 
                    />
                  </div>

                  <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
                  <div className="relative flex h-full max-w-full flex-1 flex-col overflow-hidden">
                    <MobileNav setNavVisible={setNavVisible} />
                    <Outlet context={{ navVisible, setNavVisible } satisfies ContextType} />
                  </div>
                </div>
              </div>
              {config?.interface?.termsOfService?.modalAcceptance === true && (
                <TermsAndConditionsModal
                  open={showTerms}
                  onOpenChange={setShowTerms}
                  onAccept={handleAcceptTerms}
                  onDecline={handleDeclineTerms}
                  title={config.interface.termsOfService.modalTitle}
                  modalContent={config.interface.termsOfService.modalContent}
                />
              )}
            </MCPLoadingProvider>
          </AgentsMapContext.Provider>
        </AssistantsMapContext.Provider>
      </FileMapContext.Provider>
    </SetConvoProvider>
  );
}