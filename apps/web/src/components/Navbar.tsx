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
      <header className="pt-4 sm:pt-6 pb-2 px-4 sm:px-8 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          {/* Left Brand + Pill Navigation Menu */}
          <div className="flex items-center bg-white rounded-full p-1.5 shadow-sm border border-black/5">
            {/* Circular Logo Icon */}
            <div 
              onClick={() => onNavigate('landing')} 
              className="w-10 h-10 rounded-full bg-[#397783] hover:bg-[#2B5E68] text-white flex items-center justify-center cursor-pointer transition shadow-inner flex-shrink-0"
              title="ClaimClarity Home"
            >
              <Shield className="w-5 h-5" />
            </div>

            {/* Pill Navigation Links */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5 pl-2 sm:pl-3 pr-1 text-xs sm:text-sm font-medium">
              <button
                onClick={() => onNavigate('landing')}
                className={`px-3.5 py-1.5 rounded-full transition ${
                  currentView === 'landing'
                    ? 'bg-[#171717] text-white font-semibold shadow-sm'
                    : 'text-[#171717]/70 hover:text-[#171717] hover:bg-black/5'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('how_it_works')}
                className={`px-3.5 py-1.5 rounded-full transition ${
                  currentView === 'how_it_works'
                    ? 'bg-[#171717] text-white font-semibold shadow-sm'
                    : 'text-[#171717]/70 hover:text-[#171717] hover:bg-black/5'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => onNavigate('guidance')}
                className={`hidden md:inline-flex px-3.5 py-1.5 rounded-full transition ${
                  currentView === 'guidance'
                    ? 'bg-[#171717] text-white font-semibold shadow-sm'
                    : 'text-[#171717]/70 hover:text-[#171717] hover:bg-black/5'
                }`}
              >
                IRDAI Rules
              </button>
              <button
                onClick={() => onNavigate('privacy')}
                className={`hidden lg:inline-flex px-3.5 py-1.5 rounded-full transition ${
                  currentView === 'privacy'
                    ? 'bg-[#171717] text-white font-semibold shadow-sm'
                    : 'text-[#171717]/70 hover:text-[#171717] hover:bg-black/5'
                }`}
              >
                Privacy
              </button>
              {user && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`px-3.5 py-1.5 rounded-full transition ${
                    currentView === 'dashboard' || currentView === 'case_workspace'
                      ? 'bg-[#171717] text-white font-semibold shadow-sm'
                      : 'text-[#171717]/70 hover:text-[#171717] hover:bg-black/5'
                  }`}
                >
                  My Cases
                </button>
              )}
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <div className="flex items-center space-x-2 bg-white rounded-full p-1 shadow-sm border border-black/5">
                <button
                  onClick={() => setShowAuthModal(true)}
                  title={user.isDemo ? "Switch Synthetic Demo User" : "Account Profile"}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-[#daf0ee] text-[#264f59] hover:bg-[#b7d2d0] transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[90px] truncate">{user.displayName.split(' ')[0]}</span>
                  {user.isDemo && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">Demo</span>
                  )}
                </button>
                <button
                  onClick={() => onNavigate('new_case')}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-[#397783] hover:bg-[#2B5E68] text-white shadow-sm transition flex items-center space-x-1.5"
                >
                  <span>Analyze Claim</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('guidance')}
                  className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium text-[#171717]/80 hover:text-[#171717] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>IRDAI Guidance</span>
                </button>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-full bg-white hover:bg-slate-50 text-[#171717] shadow-sm border border-black/5 transition flex items-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4 text-[#397783]" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onNavigate('new_case')}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-full bg-[#171717] hover:bg-black text-white shadow-sm transition flex items-center space-x-1.5"
                >
                  <span>Analyze Claim</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
