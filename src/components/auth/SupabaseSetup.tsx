import { useState } from 'react';
import { saveSupabaseConfig, SUPABASE_SQL_SETUP } from '../../lib/supabase';
import { Database, Key, Globe, Copy, Check, ChevronDown, ChevronRight, AlertTriangle, Zap } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export function SupabaseSetup({ onComplete }: Props) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);

  const handleCopySQL = async () => {
    await navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setError('Vui lòng nhập đầy đủ URL và Anon Key');
      return;
    }

    setTesting(true);
    setError('');

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(url.trim(), anonKey.trim());
      
      // Simple health check - try to reach auth endpoint
      const { error: authError } = await client.auth.getSession();
      if (authError) throw new Error(authError.message);

      // Save config and proceed
      saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
      onComplete();
    } catch (err: any) {
      setError(`Kết nối thất bại: ${err.message || 'Kiểm tra lại URL và Key'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Database className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cấu Hình Supabase</h1>
          <p className="text-blue-200/70">Kết nối dự án Supabase để sử dụng hệ thống xác thực</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'
              }`}>{s}</div>
              <span className={`text-sm ${step >= s ? 'text-white' : 'text-white/40'}`}>
                {s === 1 ? 'SQL Setup' : s === 2 ? 'Kết nối' : 'Hoàn tất'}
              </span>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* Step 1: SQL Setup */}
          {step === 1 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 1: Chạy SQL trên Supabase</h2>
                  <p className="text-sm text-blue-200/60">Cần chạy trước khi kết nối</p>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                <ol className="space-y-3 text-sm text-blue-100/80">
                  <li className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold mt-0.5">1</span>
                    Vào <span className="text-white font-medium">Supabase Dashboard → SQL Editor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold mt-0.5">2</span>
                    Copy và chạy đoạn SQL bên dưới
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold mt-0.5">3</span>
                    Vào <span className="text-white font-medium">Authentication → Hooks → Add Hook</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold mt-0.5">4</span>
                    Chọn <span className="text-white font-medium">Custom access token hook → public.custom_access_token_hook</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold mt-0.5">5</span>
                    Vào <span className="text-white font-medium">Authentication → URL Configuration</span> → thêm Site URL
                  </li>
                </ol>
              </div>

              {/* SQL Collapse */}
              <div className="border border-white/10 rounded-xl overflow-hidden mb-6">
                <button
                  onClick={() => setSqlOpen(!sqlOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
                >
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    SQL Script - Custom JWT Claims
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopySQL(); }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Đã copy!' : 'Copy SQL'}
                    </button>
                    {sqlOpen ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
                  </div>
                </button>
                {sqlOpen && (
                  <div className="max-h-80 overflow-y-auto">
                    <pre className="p-4 text-xs text-green-300/80 font-mono whitespace-pre-wrap bg-slate-900/80">
                      {SUPABASE_SQL_SETUP}
                    </pre>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all"
              >
                Đã chạy SQL xong → Tiếp tục
              </button>
            </div>
          )}

          {/* Step 2: Connect */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Bước 2: Nhập thông tin kết nối</h2>
                  <p className="text-sm text-blue-200/60">Lấy từ Supabase Dashboard → Settings → API</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-blue-200 mb-2">
                    <Globe className="w-4 h-4" /> Project URL
                  </label>
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://xxxxx.supabase.co"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-blue-200 mb-2">
                    <Key className="w-4 h-4" /> Anon / Public Key
                  </label>
                  <input
                    value={anonKey}
                    onChange={e => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
                  >
                    ← Quay lại
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {testing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang kiểm tra...
                      </>
                    ) : (
                      'Kết nối & Tiếp tục'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-blue-300/30 mt-6">
          Thông tin được lưu trong trình duyệt (localStorage). Không gửi đến bên thứ ba.
        </p>
      </div>
    </div>
  );
}
