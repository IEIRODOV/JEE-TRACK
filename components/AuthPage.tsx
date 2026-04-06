import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signInAnonymously, RecaptchaVerifier, signInWithPhoneNumber } from '@/src/firebase';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Sparkles, ArrowLeft, Send, Phone, ShieldCheck, UserCircle, Zap } from 'lucide-react';

interface AuthPageProps {
  onBack?: () => void;
}

const AuthPage = ({ onBack }: AuthPageProps) => {
  const [authMode, setAuthMode] = useState<'email' | 'phone' | 'guest'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authMode === 'phone' && !verificationId) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          console.log('recaptcha resolved');
        }
      });
    }
  }, [authMode, verificationId]);

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth error:", err.code, err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in cancelled. Please try again.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError("Only one sign-in popup can be open at a time.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setVerificationId(confirmation);
      setMessage("OTP sent to your phone!");
    } catch (err: any) {
      setError(err.message);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Phone authentication is not enabled in Firebase Console.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verificationId.confirm(otp);
    } catch (err: any) {
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
      setIsResetting(false);
    } catch (err: any) {
      console.error("Reset error:", err.code, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err.code, err.message);
      const errorCode = err.code;
      
      if (errorCode === 'auth/user-not-found') {
        setError("No account found with this email. Please sign up first.");
      } else if (errorCode === 'auth/wrong-password') {
        setError("Incorrect password. Please try again.");
      } else if (errorCode === 'auth/invalid-email') {
        setError("The email address is not valid.");
      } else if (errorCode === 'auth/weak-password') {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (errorCode === 'auth/email-already-in-use') {
        setError("This email is already registered. Try signing in instead.");
      } else if (errorCode === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is not enabled in the Firebase Console. Please use Google Sign-In or enable it in your settings.");
      } else if (errorCode === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "An unexpected authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden">
      <div id="recaptcha-container"></div>
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute -top-12 left-0 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hub
          </button>
        )}
        <div className="glass p-8 rounded-[32px] border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex p-1 bg-white/5 rounded-2xl mb-6 border border-white/5">
            <button 
              onClick={() => { setAuthMode('email'); setIsResetting(false); setError(''); setMessage(''); }}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authMode === 'email' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              <Mail className="w-3 h-3" />
              Email
            </button>
            <button 
              onClick={() => { setAuthMode('phone'); setIsResetting(false); setError(''); setMessage(''); }}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authMode === 'phone' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              <Phone className="w-3 h-3" />
              OTP
            </button>
            <button 
              onClick={() => { setAuthMode('guest'); setIsResetting(false); setError(''); setMessage(''); }}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authMode === 'guest' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              <UserCircle className="w-3 h-3" />
              Guest
            </button>
          </div>

          {authMode === 'email' && (
            <div className="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5">
              <button 
                onClick={() => { setIsLogin(true); setIsResetting(false); setError(''); setMessage(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin && !isResetting ? 'bg-purple-500/50 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setIsLogin(false); setIsResetting(false); setError(''); setMessage(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin && !isResetting ? 'bg-purple-500/50 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Mission Control</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-heading">
              {authMode === 'guest' ? 'Guest Access' : authMode === 'phone' ? (verificationId ? 'Verify OTP' : 'Phone Login') : isResetting ? 'Reset Access' : isLogin ? 'Welcome Back' : 'Join Mission'}
            </h1>
          </div>

          {authMode === 'email' && (
            <form onSubmit={isResetting ? handleResetPassword : handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all"
                    placeholder="commander@mission.com"
                  />
                </div>
              </div>

              {!isResetting && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Password</label>
                    {isLogin && (
                      <button 
                        type="button"
                        onClick={() => setIsResetting(true)}
                        className="text-[8px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400"
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                  
                  {error.includes("not enabled") && (
                    <div className="flex flex-col gap-3">
                      <div className="text-[9px] font-medium normal-case text-white/60 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                        <p className="font-bold text-purple-400 mb-2 uppercase tracking-widest text-[8px]">Troubleshooting Checklist:</p>
                        <ul className="space-y-1.5 list-disc pl-3">
                          <li>Did you click the <span className="text-white font-bold">"Save"</span> button in the Firebase Console?</li>
                          <li>Is <span className="text-white font-bold">"Email/Password"</span> toggled to Enabled?</li>
                          <li>Try clicking <span className="text-white font-bold">"Refresh App"</span> below to clear cache.</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="flex-1 text-[9px] font-black uppercase tracking-widest bg-purple-500/20 hover:bg-purple-500/30 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-3 h-3" alt="Google" />
                          Try Google
                        </button>
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="flex-1 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 py-2 rounded-lg transition-all"
                        >
                          Refresh App
                        </button>
                      </div>
                    </div>
                  )}

                  {error.includes("No account found") && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setError('');
                      }}
                      className="text-[9px] font-black uppercase tracking-widest bg-red-500/20 hover:bg-red-500/30 py-2 rounded-lg transition-all"
                    >
                      Create Account Instead
                    </button>
                  )}

                  {error.includes("already registered") && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setError('');
                      }}
                      className="text-[9px] font-black uppercase tracking-widest bg-red-500/20 hover:bg-red-500/30 py-2 rounded-lg transition-all"
                    >
                      Switch to Sign In
                    </button>
                  )}
                </motion.div>
              )}

              {message && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Sparkles className="w-4 h-4" />
                  {message}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isResetting ? <Send className="w-4 h-4" /> : isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isResetting ? 'Send Reset Link' : isLogin ? 'Access Dashboard' : 'Initialize Account'}
                  </>
                )}
              </button>

              {isResetting && (
                <button
                  type="button"
                  onClick={() => setIsResetting(false)}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              )}

              {!isResetting && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest">
                      <span className="bg-[#0a0a0a] px-4 text-white/20">or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-3"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                    Sign in with Google
                  </button>
                </>
              )}
            </form>
          )}

          {authMode === 'phone' && (
            <form onSubmit={verificationId ? handleVerifyOTP : handlePhoneSignIn} className="space-y-4">
              {!verificationId ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all"
                      placeholder="+1234567890"
                    />
                  </div>
                  <p className="text-[8px] text-white/20 ml-1 italic">Include country code (e.g. +91 for India)</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Verification Code</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all text-center tracking-[0.5em] font-black"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {verificationId ? <ShieldCheck className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {verificationId ? 'Verify Code' : 'Send OTP'}
                  </>
                )}
              </button>

              {verificationId && (
                <button
                  type="button"
                  onClick={() => { setVerificationId(null); setOtp(''); setError(''); setMessage(''); }}
                  className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  Change Number
                </button>
              )}
            </form>
          )}

          {authMode === 'guest' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <UserCircle className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Access the dashboard instantly without creating an account. Your data will be saved locally but won't sync across devices.
                </p>
                <button
                  onClick={handleGuestSignIn}
                  disabled={loading}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-400" />
                      Enter as Guest
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
