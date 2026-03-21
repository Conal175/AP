import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { clearSupabaseConfig } from '../../lib/supabase';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Props {
  onResetConfig: () => void;
}

export function LoginPage({ onResetConfig }: Props) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    setLoading(true);
    setError('');

    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    if (password.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự'); return; }
    setLoading(true);
    setError('');

    const { error: err } = await signUp(email, password, fullName);
    if (err) {
      setError(err);
    } else {
      setSuccess('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.');
      setMode('login');
      reset();
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Vui lòng nhập email'); return; }
    setLoading(true);
    setError('');

    const { error: err } = await resetPassword(email);
    if (err) {
      setError(err);
    } else {
      setSuccess('Đã gửi link đặt lại mật khẩu qua email!');
    }
    setLoading(false);
  };

  const handleResetConfig = () => {
    clearSupabaseConfig();
    onResetConfig();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Project Manager</h1>
          <p className="text-blue-200/60 text-sm mt-1">Quản lý dự án Marketing</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          {/* Tab Switch */}
          {mode !== 'forgot' && (
            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode('login'); reset(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-white/50 hover:text-white/70'
                }`}
              >
                <LogIn className="w-4 h-4" /> Đăng Nhập
              </button>
              <button
                onClick={() => { setMode('register'); reset(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'register' ? 'bg-emerald-600 text-white shadow-md' : 'text-white/50 hover:text-white/70'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Đăng Ký
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <button
                onClick={() => { setMode('login'); reset(); }}
                className="flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 transition-colors mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
              </button>
              <h2 className="text-lg font-bold text-white">Quên Mật Khẩu</h2>
              <p className="text-sm text-blue-200/60 mt-1">Nhập email để nhận link đặt lại mật khẩu</p>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 flex items-center gap-2 text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-blue-200 mb-1.5">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-blue-200 mb-1.5">
                  <Lock className="w-4 h-4" /> Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" /> Đăng Nhập
                  </>
                )}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-blue-200 mb-1.5">
                  <User className="w-4 h-4" /> Họ & Tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-blue-200 mb-1.5">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-blue-200 mb-1.5">
                  <Lock className="w-4 h-4" /> Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" /> Đăng Ký Tài Khoản
                  </>
                )}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-blue-200 mb-1.5">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Gửi Link Đặt Lại Mật Khẩu'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer - Reset Config */}
        <div className="mt-6 text-center">
          <button
            onClick={handleResetConfig}
            className="inline-flex items-center gap-1.5 text-xs text-blue-300/40 hover:text-blue-300/70 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Cấu hình lại Supabase
          </button>
        </div>

        {/* Role Info */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <p className="text-xs font-medium text-blue-200/60 mb-2">Phân quyền hệ thống:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-100/50">
              <span className="w-2 h-2 bg-red-400 rounded-full" /> <b className="text-red-300">Admin</b> — Toàn quyền
            </div>
            <div className="flex items-center gap-2 text-blue-100/50">
              <span className="w-2 h-2 bg-amber-400 rounded-full" /> <b className="text-amber-300">Manager</b> — Quản lý
            </div>
            <div className="flex items-center gap-2 text-blue-100/50">
              <span className="w-2 h-2 bg-blue-400 rounded-full" /> <b className="text-blue-300">Member</b> — Thành viên
            </div>
            <div className="flex items-center gap-2 text-blue-100/50">
              <span className="w-2 h-2 bg-gray-400 rounded-full" /> <b className="text-gray-300">Viewer</b> — Chỉ xem
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
