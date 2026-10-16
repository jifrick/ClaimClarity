import React, { useState } from 'react';
import { Shield, FileText, CheckCircle2, AlertTriangle, ExternalLink, HelpCircle, User, LogOut, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout, isSupabaseConfigured } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Claim<span className="text-brand-600">Clarity</span></span>
              <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">India Health InsurTech</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
            <button 
              onClick={() => onNavigate('landing')}
              className={`transition hover:text-slate-900 ${currentView === 'landing' ? 'text-brand-600 font-semibold' : ''}`}
            >
              Overview
            </button>
            <button 
              onClick={() => onNavigate('how_it_works')}
              className={`transition hover:text-slate-900 ${currentView === 'how_it_works' ? 'text-brand-600 font-semibold' : ''}`}
            >
              How It Works
            </button>
            <button 
              onClick={() => onNavigate('guidance')}
              className={`transition hover:text-slate-900 ${currentView === 'guidance' ? 'text-brand-600 font-semibold' : ''}`}
            >
              IRDAI Grievance Rules
            </button>
            <button 
              onClick={() => onNavigate('privacy')}
              className={`transition hover:text-slate-900 ${currentView === 'privacy' ? 'text-brand-600 font-semibold' : ''}`}
            >
              Privacy & Security
            </button>
            {user && (
              <button 
                onClick={() => onNavigate('dashboard')}
                className={`transition hover:text-slate-900 ${currentView === 'dashboard' || currentView === 'case_workspace' ? 'text-brand-600 font-semibold' : ''}`}
              >
                My Claim Cases
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button 
                  onClick={() => setShowAuthModal(true)}
                  title={user.isDemo ? "Switch Synthetic Demo User" : "Account Profile"}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[100px] truncate">{user.displayName.split(' ')[0]}</span>
                  {user.isDemo && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-mono">Demo</span>
                  )}
                </button>
                <button
                  onClick={() => onNavigate('new_case')}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition flex items-center space-x-1.5"
                >
                  <span>Analyze Claim</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition flex items-center space-x-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};
