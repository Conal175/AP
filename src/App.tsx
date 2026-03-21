import { useState, useEffect, useCallback } from 'react';
import type { Project } from './types';
import { fetchProjects, insertProject, removeProject } from './store';
import { v4 as uuid } from 'uuid';
import { useAuth } from './contexts/AuthContext';
import { SupabaseSetup } from './components/auth/SupabaseSetup';
import { LoginPage } from './components/auth/LoginPage';
import { AdminPanel } from './components/auth/AdminPanel';
import { Dashboard } from './components/Dashboard';
import ActionPlan from './components/ActionPlan';
import { ProductStrategy } from './components/ProductStrategy';
import { CustomerStrategy } from './components/CustomerStrategy';
import { CompetitorStrategy } from './components/CompetitorStrategy';
import DailyReport from './components/DailyReport';
import { MediaResources } from './components/MediaResources';
import { OrderManagement } from './components/OrderManagement';
import {
  LayoutDashboard, ListTodo, Lightbulb, BarChart3, Image, Plus,
  ArrowLeft, FolderOpen, Trash2, Menu, X, ChevronDown, ChevronRight,
  Package, Users, Swords, LogOut, UserCog, Shield, ShieldCheck, Crown, Eye,
  ShoppingBag, Moon, Sun, Search
} from 'lucide-react';

type TabKey = 'dashboard' | 'orders' | 'action-plan' | 'strategy-products' | 'strategy-customers' | 'strategy-competitors' | 'daily-report' | 'media' | 'admin';

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string; icon: typeof Crown }> = {
  admin: { label: 'Admin', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: Crown },
  manager: { label: 'Manager', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: ShieldCheck },
  member: { label: 'Member', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Shield },
  viewer: { label: 'Viewer', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: Eye },
};

export function App() {
  const auth = useAuth();
  const [configVersion, setConfigVersion] = useState(0);

  if (!auth.configured) {
    return <SupabaseSetup onComplete={() => setConfigVersion(v => v + 1)} key={configVersion} />;
  }

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-200/60">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return <LoginPage onResetConfig={() => setConfigVersion(v => v + 1)} />;
  }

  return <MainApp />;
}

const NAV_ITEMS: { tab: TabKey; label: string; keywords: string[] }[] = [
  { tab: 'dashboard', label: 'Dashboard', keywords: ['dashboard', 'tổng quan', 'kpi'] },
  { tab: 'orders', label: 'Quản Lý Đơn Hàng', keywords: ['đơn hàng', 'orders', 'quản lý đơn'] },
  { tab: 'action-plan', label: 'Action Plan', keywords: ['action plan', 'kế hoạch', 'công việc', 'task'] },
  { tab: 'strategy-products', label: 'Chi Tiết Sản Phẩm', keywords: ['sản phẩm', 'products', 'chiến lược'] },
  { tab: 'strategy-customers', label: 'Chân Dung Khách Hàng', keywords: ['khách hàng', 'customers', 'chiến lược'] },
  { tab: 'strategy-competitors', label: 'Tình Báo Đối Thủ', keywords: ['đối thủ', 'competitors', 'chiến lược'] },
  { tab: 'daily-report', label: 'Báo Cáo Doanh Thu', keywords: ['báo cáo', 'daily report', 'doanh thu'] },
  { tab: 'media', label: 'Media', keywords: ['media', 'hình ảnh', 'video'] },
];

function MainApp() {
  const auth = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [strategyExpanded, setStrategyExpanded] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });

  // F6: Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('darkMode') === 'true');
  const toggleDark = useCallback(() => {
    setDarkMode(d => {
      localStorage.setItem('darkMode', String(!d));
      return !d;
    });
  }, []);

  // F7: Global search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects().then(data => {
      setProjects(data);
      setLoadingProjects(false);
    });
  }, []);

  // F7: Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
        setSearchQuery('');
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // F7: Search results
  const searchResults = searchQuery.trim().length >= 1 ? [
    // Projects
    ...projects
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
      .map(p => ({ type: 'project' as const, id: p.id, label: p.name, sub: p.description || 'Dự án', project: p })),
    // Nav tabs (only if inside a project)
    ...(activeProjectId ? NAV_ITEMS
      .filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.keywords.some(k => k.includes(searchQuery.toLowerCase())))
      .map(n => ({ type: 'tab' as const, id: n.tab, label: n.label, sub: 'Điều hướng nhanh', tab: n.tab }))
    : []),
  ] : [];

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    const newProject: Project = {
      id: uuid(),
      name: createForm.name,
      description: createForm.description,
      createdAt: new Date().toISOString(),
    };
    
    const success = await insertProject(newProject);
    if (success) {
      setProjects([newProject, ...projects]);
      setCreateForm({ name: '', description: '' });
      setShowCreateForm(false);
      setActiveProjectId(newProject.id);
      setActiveTab('dashboard');
    } else {
      alert('Có lỗi xảy ra khi tạo dự án!');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa dự án này?')) return;
    const success = await removeProject(id);
    if (success) {
      setProjects(projects.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    } else {
      alert('Có lỗi xảy ra khi xóa dự án. Bạn có thể không đủ quyền!');
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);
  const isStrategyTab = activeTab.startsWith('strategy-');

  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const getTabLabel = (tab: TabKey) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'orders': return 'Quản Lý Đơn Hàng';
      case 'action-plan': return 'Action Plan';
      case 'strategy-products': return 'Chi Tiết Sản Phẩm';
      case 'strategy-customers': return 'Chân Dung Khách Hàng';
      case 'strategy-competitors': return 'Tình Báo Đối Thủ';
      case 'daily-report': return 'Báo Cáo';
      case 'media': return 'Media';
      case 'admin': return 'Quản Lý Người Dùng';
      default: return '';
    }
  };

  const roleConfig = ROLE_LABELS[auth.role] || ROLE_LABELS.member;
  const RoleIcon = roleConfig.icon;
  const userEmail = auth.user?.email || '';
  const userName = auth.user?.user_metadata?.full_name || userEmail.split('@')[0];

  if (loadingProjects) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Đang đồng bộ dữ liệu hệ thống...</p>
      </div>
    );
  }

  // F7: Global Search Modal
  const GlobalSearchModal = showSearch ? (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-start justify-center pt-20 px-4" onClick={() => setShowSearch(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm dự án, tính năng... (Ctrl+K)"
            className="flex-1 outline-none text-base bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />
          <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {searchResults.length === 0 && searchQuery.trim() && (
            <p className="text-center text-gray-400 py-8">Không tìm thấy kết quả cho &ldquo;{searchQuery}&rdquo;</p>
          )}
          {searchResults.length === 0 && !searchQuery.trim() && (
            <p className="text-center text-gray-400 py-8 text-sm">Gõ để tìm kiếm dự án hoặc tính năng...</p>
          )}
          {searchResults.map((r, i) => (
            <button key={i} onClick={() => {
              if (r.type === 'project') { setActiveProjectId(r.project.id); setActiveTab('dashboard'); }
              else if (r.type === 'tab') { setActiveTab(r.tab as TabKey); setStrategyExpanded(r.tab.startsWith('strategy')); }
              setShowSearch(false); setSearchQuery('');
            }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors text-left">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                r.type === 'project' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {r.type === 'project' ? <FolderOpen className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{r.label}</p>
                <p className="text-xs text-gray-400 truncate">{r.sub}</p>
              </div>
              <span className="text-xs text-gray-300 dark:text-gray-500">{r.type === 'project' ? 'Dự án' : 'Trang'}</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">↵</kbd> Chọn</span>
          <span><kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">Esc</kbd> Đóng</span>
          <span><kbd className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">Ctrl+K</kbd> Bật/tắt</span>
        </div>
      </div>
    </div>
  ) : null;

  // ======= PROJECT LIST VIEW =======
  if (!activeProject) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${darkMode ? 'dark' : ''}`}>
        {GlobalSearchModal}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Project Manager</h1>
                <p className="text-xs text-gray-500">Quản lý dự án Marketing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* F7: Search button */}
              <button onClick={() => setShowSearch(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-500 transition-colors">
                <Search className="w-4 h-4" /> <span className="hidden sm:inline">Tìm kiếm</span>
                <kbd className="hidden sm:inline bg-white border border-gray-300 px-1.5 py-0.5 rounded text-xs">Ctrl+K</kbd>
              </button>
              {/* F6: Dark mode button */}
              <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}>
                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
              </button>
              {auth.isAdmin && (
                <button
                  onClick={() => { setActiveProjectId(null); setActiveTab('admin'); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  <UserCog className="w-4 h-4" /> Quản lý Users
                </button>
              )}

              {auth.canManage && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" /> Tạo Dự Án
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    auth.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                    auth.role === 'manager' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                    auth.role === 'member' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                    'bg-gradient-to-br from-gray-400 to-gray-500'
                  }`}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                            auth.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                            auth.role === 'manager' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                            auth.role === 'member' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                            'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}>
                            {userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 truncate">{userName}</p>
                            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${roleConfig.bg} ${roleConfig.color}`}>
                              <RoleIcon className="w-3 h-3" /> {roleConfig.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        {auth.isAdmin && (
                          <button
                            onClick={() => { setShowUserMenu(false); setActiveTab('admin'); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            <UserCog className="w-4 h-4" /> Quản lý người dùng
                          </button>
                        )}
                        <button
                          onClick={() => { setShowUserMenu(false); auth.signOut(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Đăng xuất
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {activeTab === 'admin' && auth.isAdmin && (
            <div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại danh sách dự án
              </button>
              <AdminPanel />
            </div>
          )}

          {activeTab !== 'admin' && (
            <>
              {showCreateForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateForm(false)}>
                  <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">🚀 Tạo Dự Án Mới</h2>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Tên dự án *</label>
                        <input
                          value={createForm.name}
                          onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                          placeholder="VD: Campaign Máy Bơm Q3/2026"
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Mô tả chi tiết</label>
                        <textarea
                          value={createForm.description}
                          onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                          rows={3}
                          placeholder="Mô tả mục tiêu, phạm vi dự án..."
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button
                        onClick={handleCreate}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-lg"
                      >
                        Tạo Dự Án
                      </button>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {projects.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FolderOpen className="w-12 h-12 text-gray-300" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">Chào mừng, {userName}!</h2>
                  <p className="text-gray-500 max-w-md mx-auto mb-8">
                    {auth.canManage
                      ? 'Bắt đầu bằng việc tạo dự án đầu tiên.'
                      : 'Hiện chưa có dự án nào. Liên hệ quản lý để được thêm vào dự án.'}
                  </p>
                  {auth.canManage && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg text-lg font-medium"
                    >
                      <Plus className="w-6 h-6" /> Tạo Dự Án Đầu Tiên
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group cursor-pointer overflow-hidden"
                      onClick={() => { setActiveProjectId(project.id); setActiveTab('dashboard'); }}
                    >
                      <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                          {auth.canManage && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteProject(project.id); }}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Xóa dự án"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                          Tạo ngày {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  ))}

                  {auth.canManage && (
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                      onClick={() => setShowCreateForm(true)}
                    >
                      <div className="w-14 h-14 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-3 transition-colors">
                        <Plus className="w-7 h-7 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="text-gray-500 group-hover:text-blue-600 font-medium transition-colors">Thêm Dự Án Mới</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {GlobalSearchModal}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 flex flex-col shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-gray-100">
          <button
            onClick={() => { setActiveProjectId(null); setSidebarOpen(false); setActiveTab('dashboard'); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Tất cả dự án
          </button>
          <h2 className="text-lg font-bold text-gray-800 truncate">{activeProject.name}</h2>
          {activeProject.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{activeProject.description}</p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {auth.checkPermission('dashboard', 'view') && (
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
          )}

          {auth.checkPermission('orders', 'view') && (
            <button
              onClick={() => handleTabClick('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ShoppingBag className="w-5 h-5" /> Quản Lý Đơn Hàng
            </button>
          )}

          {auth.checkPermission('action_plan', 'view') && (
            <button
              onClick={() => handleTabClick('action-plan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'action-plan' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <ListTodo className="w-5 h-5" /> Action Plan
            </button>
          )}

          {(auth.checkPermission('strategy_product', 'view') || 
            auth.checkPermission('strategy_customer', 'view') || 
            auth.checkPermission('competitors', 'view')) && (
            <div>
              <button
                onClick={() => setStrategyExpanded(!strategyExpanded)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${isStrategyTab ? 'bg-yellow-50 text-yellow-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Lightbulb className="w-5 h-5" /> Chiến Lược
                </div>
                {strategyExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {strategyExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                  {auth.checkPermission('strategy_product', 'view') && (
                    <button
                      onClick={() => handleTabClick('strategy-products')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'strategy-products' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Package className="w-4 h-4" /> Chi Tiết Sản Phẩm
                    </button>
                  )}
                  {auth.checkPermission('strategy_customer', 'view') && (
                    <button
                      onClick={() => handleTabClick('strategy-customers')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'strategy-customers' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Users className="w-4 h-4" /> Chân Dung Khách Hàng
                    </button>
                  )}
                  {auth.checkPermission('competitors', 'view') && (
                    <button
                      onClick={() => handleTabClick('strategy-competitors')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'strategy-competitors' ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      <Swords className="w-4 h-4" /> Tình Báo Đối Thủ
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {auth.checkPermission('daily_report', 'view') && (
            <button
              onClick={() => handleTabClick('daily-report')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'daily-report' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart3 className="w-5 h-5" /> Báo Cáo Doanh Thu
            </button>
          )}

          {auth.checkPermission('media', 'view') && (
            <button
              onClick={() => handleTabClick('media')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'media' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Image className="w-5 h-5" /> Media
            </button>
          )}

          {auth.isAdmin && (
            <>
              <div className="my-3 border-t border-gray-100" />
              <button
                onClick={() => handleTabClick('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <UserCog className="w-5 h-5" /> Quản Lý Users
              </button>
            </>
          )}
        </nav>

        {/* F6 + F7: Dark mode toggle + Search in sidebar footer */}
        <div className="px-3 pb-2 flex items-center gap-2">
          <button onClick={() => { setShowSearch(true); setSidebarOpen(false); }}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
            <Search className="w-4 h-4" /> <span>Tìm kiếm</span>
            <kbd className="ml-auto bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-xs">Ctrl+K</kbd>
          </button>
          <button onClick={toggleDark} className="p-2 rounded-xl hover:bg-gray-50 transition-colors shrink-0" title={darkMode ? 'Sáng' : 'Tối'}>
            {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        <div className="p-3 border-t border-gray-100">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                auth.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                auth.role === 'manager' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                auth.role === 'member' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-800 truncate">{userName}</p>
                <span className={`inline-flex items-center gap-1 text-xs ${roleConfig.color}`}>
                  <RoleIcon className="w-3 h-3" /> {roleConfig.label}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute left-0 bottom-full mb-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowUserMenu(false); auth.signOut(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {!auth.canEdit && (
            <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Bạn chỉ có quyền xem
              </p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="lg:hidden bg-white border-b border-gray-200 shrink-0 z-30 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-800 truncate">{activeProject.name}</h2>
            <p className="text-xs text-gray-400">{getTabLabel(activeTab)}</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
            auth.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
            auth.role === 'manager' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
            auth.role === 'member' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
            'bg-gradient-to-br from-gray-400 to-gray-500'
          }`}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
            {sidebarOpen ? <X className="w-5 h-5" /> : null}
          </button>
        </header>

        {/* Đã xóa max-w-7xl, cho phép phần nội dung bung kín màn hình ngang */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 w-full">
          {activeTab === 'dashboard' && auth.checkPermission('dashboard', 'view') && <Dashboard project={activeProject} />}
          {activeTab === 'orders' && auth.checkPermission('orders', 'view') && <OrderManagement projectId={activeProject.id} />}
          {activeTab === 'action-plan' && auth.checkPermission('action_plan', 'view') && <ActionPlan project={activeProject} />}
          {activeTab === 'strategy-products' && auth.checkPermission('strategy_product', 'view') && (
            <ProductStrategy
              projectId={activeProject.id}
              onBack={() => { setActiveTab('dashboard'); setStrategyExpanded(false); }}
            />
          )}
          {activeTab === 'strategy-customers' && auth.checkPermission('strategy_customer', 'view') && (
            <CustomerStrategy
              projectId={activeProject.id}
              onBack={() => { setActiveTab('dashboard'); setStrategyExpanded(false); }}
            />
          )}
          {activeTab === 'strategy-competitors' && auth.checkPermission('competitors', 'view') && (
            <CompetitorStrategy
              projectId={activeProject.id}
              onBack={() => { setActiveTab('dashboard'); setStrategyExpanded(false); }}
            />
          )}
          {activeTab === 'daily-report' && auth.checkPermission('daily_report', 'view') && <DailyReport projectId={activeProject.id} />}
          {activeTab === 'media' && auth.checkPermission('media', 'view') && <MediaResources projectId={activeProject.id} />}
          {activeTab === 'admin' && auth.isAdmin && <AdminPanel />}
        </main>
      </div>
    </div>
  );
}
