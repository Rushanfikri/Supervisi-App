
import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user && user.email) {
        if (user.email.toLowerCase().endsWith('@gmail.com')) {
          onLogin();
        } else {
          // Reject and sign out immediately
          await signOut(auth);
          setError('Akses ditolak. Hanya akun Gmail (@gmail.com) yang diizinkan.');
        }
      } else {
        setError('Gagal mendapatkan informasi email dari akun Google.');
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Proses masuk dibatalkan.');
      } else if (err.code === 'auth/configuration-not-found' || (err.message && err.message.includes('configuration-not-found'))) {
        setError('Google Sign-In belum diaktifkan di Firebase Console. Silakan buka Firebase Console > Authentication > Sign-in method, lalu aktifkan metode "Google".');
      } else if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        setError(`Domain ini (${window.location.hostname}) belum diizinkan di Firebase Authentication. Silakan tambahkan domain ini ke daftar "Authorized domains" di Firebase Console agar Google Sign-In dapat berfungsi.`);
      } else if (err.message && (err.message.includes('api-key-not-valid') || err.message.includes('API key'))) {
        setError('Firebase API Key belum diatur atau salah. Silakan masukkan API Key valid untuk proyek "farmasi-rsup" di Settings > Environment Variables dengan nama VITE_FIREBASE_API_KEY.');
      } else {
        setError('Gagal masuk dengan Google. Pastikan API Key di konfigurasi benar dan Google Sign-In sudah diaktifkan di Firebase Console.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4 transform transition-transform hover:scale-105">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">SUPERVISI <span className="text-blue-500">PRO</span></h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Inventory Management System</p>
          </div>

          <div className="space-y-6 text-center">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                Silakan masuk menggunakan akun Google / Gmail Anda untuk mengakses dashboard manajemen inventaris rumah sakit.
              </p>
              <p className="text-[10px] font-black text-blue-650 dark:text-blue-400 uppercase tracking-widest mt-2">
                KHUSUS DOMAIN @GMAIL.COM
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium text-left">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.136 4.113-3.414 0-6.182-2.768-6.182-6.182s2.768-6.182 6.182-6.182c1.481 0 2.831.523 3.89 1.501l3.076-3.078C18.995 2.072 15.823 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.898 0 10.846-4.246 10.846-11.24 0-.74-.066-1.454-.19-2.14L12.24 10.285z"
                  />
                </svg>
              )}
              <span>{loading ? 'Menghubungkan...' : 'Masuk dengan Google / Gmail'}</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">© 2024 SUPERVISI PRO • SECURITY VERIFIED</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

