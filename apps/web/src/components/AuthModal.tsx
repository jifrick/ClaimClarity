import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginDemo, loginEmail, signUpEmail, isSupabaseConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'demo'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUpEmail(email, password, name);
        setSignupSuccess(true);
      } else {
        await loginEmail(email, password);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (userId?: string, displayName?: string) => {
    loginDemo(userId, displayName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === 'signup' ? 'Create Policyholder Account' : 'Sign in to ClaimClarity'}
            </h3>
            <p className="text-xs text-slate-500">
              {isSupabaseConfigured 
                ? 'Secured with Supabase Auth & Row Level Security' 
                : 'Local Evaluation Mode (Synthetic Authentication)'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {signupSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Verification Email Sent</h4>
            <p className="text-xs text-slate-500">
              Please check your inbox at <strong>{email}</strong> to verify your account, or sign in directly if email verification is disabled in your Supabase project.
            </p>
            <button
              onClick={() => {
                setSignupSuccess(false);
                setMode('signin');
              }}
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {isSupabaseConfigured ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="policyholder@example.in"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <strong>Local Evaluation Mode:</strong> Select a synthetic policyholder profile to test multi-tenant case isolation, evidence review, and deletion.
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleDemoLogin('00000000-0000-0000-0000-000000000001', 'Rajesh Sharma (Primary)')}
                    className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">Rajesh Sharma</p>
                      <p className="text-[11px] text-slate-500">Appendectomy rejection case (Star Care)</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      User A
                    </span>
                  </button>

                  <button
                    onClick={() => handleDemoLogin('99999999-9999-9999-9999-999999999999', 'Priya Patel (Secondary)')}
                    className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">Priya Patel</p>
                      <p className="text-[11px] text-slate-500">Cardiac surgery claim (HDFC ERGO)</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      User B
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              {isSupabaseConfigured ? (
                <>
                  <span>
                    {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                  </span>
                  <button
                    onClick={() => {
                      setError(null);
                      setMode(mode === 'signup' ? 'signin' : 'signup');
                    }}
                    className="font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Connect Supabase credentials in .env to activate live email & OAuth authentication.
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
