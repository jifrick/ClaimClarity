import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DashboardView } from './pages/DashboardView';
import { RegulatoryGuidanceView } from './pages/RegulatoryGuidanceView';
import { PrivacySecurityView } from './pages/PrivacySecurityView';
import { NewCaseModal } from './components/NewCaseModal';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'guidance' | 'how_it_works' | 'privacy'>('landing');
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#B7D2D0] text-[#171717] font-sans selection:bg-[#397783] selection:text-white">
      <div className="animate-slide-down">
        <Navbar
          currentView={currentView}
          onNavigate={view => {
            if (view === 'new_case') {
              setShowNewCaseModal(true);
            } else {
              setCurrentView(view as any);
            }
          }}
        />
      </div>

      <main className="flex-1 pb-10 animate-fade-scale">
        {currentView === 'landing' && (
          <LandingPage
            onStart={() => {
              if (user) {
                setCurrentView('dashboard');
              } else {
                setCurrentView('dashboard');
              }
            }}
            onExploreDemo={() => setCurrentView('dashboard')}
            onViewGuidance={() => setCurrentView('guidance')}
          />
        )}

        {currentView === 'dashboard' && <DashboardView />}

        {currentView === 'guidance' && <RegulatoryGuidanceView />}

        {currentView === 'privacy' && <PrivacySecurityView />}

        {currentView === 'how_it_works' && (
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-[32px] sm:rounded-[44px] border border-black/5 p-6 sm:p-10 shadow-sm space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-[#397783]">
                ARCHITECTURE & SAFEGUARDS
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-[#171717] uppercase tracking-tight">
                How ClaimClarity Works
              </h2>
              <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
                <div className="p-4 rounded-2xl bg-[#daf0ee]/50 border border-[#b7d2d0]">
                  <p>
                    <strong>1. Case Isolation & Consent:</strong> Every case is assigned a cryptographically random UUID and tied strictly to your authenticated session. We never train public foundation models on your medical or policy records.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#daf0ee]/50 border border-[#b7d2d0]">
                  <p>
                    <strong>2. Document Coordinate Extraction:</strong> PDFs are processed with page-level segmentation. Paragraphs and tables are indexed with specific page numbers and block indexes.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#daf0ee]/50 border border-[#b7d2d0]">
                  <p>
                    <strong>3. Grounded Citation Validation:</strong> When an AI model extracts a clause (such as Section 4.1 PED waiting period or Section 4.2 emergency exception), our backend verifies that the quoted string actually exists on the cited page.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#daf0ee]/50 border border-[#b7d2d0]">
                  <p>
                    <strong>4. Representation Generation:</strong> The system compiles a factual, neutral letter addressed to your insurer's Grievance Redressal Officer (GRO), citing the verified evidence without fabricating dates or entitlements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer in floating pill container style */}
      <footer className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 pb-6 text-center text-xs text-[#20444c]">
        <div className="bg-white/80 backdrop-blur-md rounded-full px-6 py-3.5 border border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <p className="font-medium">© 2026 ClaimClarity • Built for India Health Insurance Policyholders</p>
          <div className="flex items-center space-x-4 font-semibold">
            <span className="text-[#397783]">Strictly Informational • No Legal Adjudication</span>
            <button onClick={() => setCurrentView('guidance')} className="hover:text-black transition underline">
              IRDAI Portal
            </button>
          </div>
        </div>
      </footer>

      {showNewCaseModal && (
        <NewCaseModal
          onCaseCreated={() => {
            setShowNewCaseModal(false);
            setCurrentView('dashboard');
          }}
          onCancel={() => setShowNewCaseModal(false)}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
