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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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

      <main className="flex-1">
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
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">How ClaimClarity Works</h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 text-xs text-slate-700 leading-relaxed">
              <p>
                <strong>1. Case Isolation & Consent:</strong> Every case is assigned a cryptographically random UUID and tied strictly to your authenticated session. We never train public foundation models on your medical or policy records.
              </p>
              <p>
                <strong>2. Document Coordinate Extraction:</strong> PDFs are processed with page-level segmentation. Paragraphs and tables are indexed with specific page numbers and block indexes.
              </p>
              <p>
                <strong>3. Grounded Citation Validation:</strong> When an AI model extracts a clause (such as Section 4.1 PED waiting period or Section 4.2 emergency exception), our backend verifies that the quoted string actually exists on the cited page.
              </p>
              <p>
                <strong>4. Representation Generation:</strong> The system compiles a factual, neutral letter addressed to your insurer's Grievance Redressal Officer (GRO), citing the verified evidence without fabricating dates or entitlements.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ClaimClarity (Formerly ClaimPilot). Built for India Health Insurance Policyholders.</p>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Strictly Informational • No Legal Adjudication</span>
            <button onClick={() => setCurrentView('guidance')} className="hover:text-slate-900">IRDAI Portal</button>
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
