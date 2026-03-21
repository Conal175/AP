import React, { useEffect, useState } from 'react';
import { useAuth, UserWithRole, UserRole, PermissionMatrix } from '../../contexts/AuthContext';
import { Shield, Users, ChevronDown, Check, X, Settings2, Eye, Edit, Trash2 } from 'lucide-react';

// Module definitions grouped by category
const MODULE_GROUPS = [
  {
    label: '📊 Xem & Phân tích',
    modules: [
      { id: 'dashboard', name: 'Dashboard' },
      { id: 'daily_report', name: 'Báo cáo Hàng ngày' },
    ]
  },
  {
    label: '⚙️ Vận hành',
    modules: [
      { id: 'orders', name: 'Quản lý Đơn hàng' },
      { id: 'action_plan', name: 'Action Plan' },
      { id: 'media', name: 'Media' },
    ]
  },
  {
    label: '🎯 Chiến lược',
    modules: [
      { id: 'strategy_product', name: 'Chiến lược Sản phẩm' },
      { id: 'strategy_customer', name: 'Chiến lược Khách hàng' },
      { id: 'competitors', name: 'Phân tích Đối thủ' },
    ]
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);
const TOTAL_MODULES = ALL_MODULES.length;

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; border: string; dot: string }> = {
  admin:   { label: 'Admin',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-500' },
  manager: { label: 'Manager', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' },
  member:  { label: 'Member',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  viewer:  { label: 'Viewer',  color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200',   dot: 'bg-gray-400' },
};

// Avatar initials + color
const AVATAR_BG: Record<UserRole, string> = {
  admin: 'bg-red-500', manager: 'bg-orange-500', member: 'bg-blue-500', viewer: 'bg-gray-400'
};

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

// Count how many modules the user can VIEW
function countViewable(permissions: PermissionMatrix) {
  return ALL_MODULES.filter(m => permissions?.[m.id]?.view).length;
}

// Toggle Switch component
function ToggleSwitch({ checked, onChange, color = 'blue' }: { checked: boolean; onChange: () => void; color?: string }) {
  const colors: Record<string, string> = {
    blue:  'bg-blue-500',
    green: 'bg-green-500',
    red:   'bg-red-500',
  };
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${checked ? colors[color] : 'bg-gray-200'}`}
      aria-pressed={checked}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function AdminPanel() {
  const { getAllUsers, updateUserRole, updateUserPermissions, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Permission matrix modal
  const [matrixUser, setMatrixUser] = useState<UserWithRole | null>(null);
  const [tempMatrix, setTempMatrix] = useState<PermissionMatrix>({});
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Role dropdown open state per user
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => {
    const close = () => setOpenRoleDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setOpenRoleDropdown(null);
    await updateUserRole(userId, newRole);
    loadUsers();
  };

  const openMatrix = (user: UserWithRole) => {
    setMatrixUser(user);
    const init = { ...user.permissions };
    ALL_MODULES.forEach(mod => {
      if (!init[mod.id]) init[mod.id] = { view: false, edit: false, delete: false };
    });
    setTempMatrix(init);
  };

  const togglePermission = (moduleId: string, action: 'view' | 'edit' | 'delete') => {
    setTempMatrix(prev => {
      const cur = prev[moduleId] || { view: false, edit: false, delete: false };
      const newVal = !cur[action];
      if (action === 'view' && !newVal) return { ...prev, [moduleId]: { view: false, edit: false, delete: false } };
      if ((action === 'edit' || action === 'delete') && newVal) return { ...prev, [moduleId]: { ...cur, [action]: true, view: true } };
      return { ...prev, [moduleId]: { ...cur, [action]: newVal } };
    });
  };

  // Grant all / revoke all for a module
  const grantAll = (moduleId: string) => setTempMatrix(p => ({ ...p, [moduleId]: { view: true, edit: true, delete: true } }));
  const revokeAll = (moduleId: string) => setTempMatrix(p => ({ ...p, [moduleId]: { view: false, edit: false, delete: false } }));

  // Count in tempMatrix
  const tempViewable = ALL_MODULES.filter(m => tempMatrix?.[m.id]?.view).length;

  const saveMatrix = async () => {
    if (!matrixUser) return;
    setSavingMatrix(true);
    await updateUserPermissions(matrixUser.user_id, tempMatrix);
    setSavingMatrix(false);
    setMatrixUser(null);
    loadUsers();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm">Đang tải danh sách người dùng...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quản lý Tài khoản & Phân quyền</h2>
            <p className="text-sm text-gray-500">Cấp quyền truy cập và tùy chỉnh module cho từng nhân sự</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          <span>{users.length} tài khoản</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} font-medium`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map(u => {
          const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer;
          const viewable = countViewable(u.permissions || {});
          const isMe = u.user_id === currentUser?.id;

          return (
            <div key={u.user_id} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${isMe ? 'ring-2 ring-indigo-400' : 'border-gray-200'}`}>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl ${AVATAR_BG[u.role]} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                  {getInitials(u.email)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate text-sm">{u.email}</p>
                    {isMe && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Bạn</span>}
                  </div>

                  {/* Role Badge + Dropdown */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => !isMe && setOpenRoleDropdown(openRoleDropdown === u.user_id ? null : u.user_id)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} ${isMe ? 'cursor-not-allowed opacity-60' : 'hover:opacity-80 cursor-pointer'} transition-opacity`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                        {!isMe && <ChevronDown className="w-3 h-3" />}
                      </button>

                      {openRoleDropdown === u.user_id && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[150px]">
                          {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG['admin']][]).map(([role, rcfg]) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(u.user_id, role)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${role === u.role ? 'font-semibold' : ''}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${rcfg.dot}`} />
                              <span className={rcfg.color}>{rcfg.label}</span>
                              {role === u.role && <Check className="w-3 h-3 ml-auto text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Module count pill */}
                    {u.role !== 'admin' ? (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {viewable}/{TOTAL_MODULES} module
                      </span>
                    ) : (
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Toàn quyền</span>
                    )}
                  </div>
                </div>

                {/* Permission button */}
                <button
                  onClick={() => openMatrix(u)}
                  disabled={u.role === 'admin'}
                  title={u.role === 'admin' ? 'Admin đã có toàn quyền' : 'Thiết lập quyền chi tiết'}
                  className={`p-2 rounded-xl transition-colors shrink-0 ${
                    u.role === 'admin'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* === PERMISSION MATRIX MODAL === */}
      {matrixUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setMatrixUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${AVATAR_BG[matrixUser.role]} flex items-center justify-center text-white font-bold`}>
                  {getInitials(matrixUser.email)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Ma trận phân quyền</h3>
                  <p className="text-sm text-gray-500">{matrixUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  {tempViewable}/{TOTAL_MODULES} module
                </span>
                <button onClick={() => setMatrixUser(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Matrix Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {MODULE_GROUPS.map(group => (
                <div key={group.label}>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group.label}</h4>
                  <div className="space-y-2">
                    {group.modules.map(mod => {
                      const perms = tempMatrix[mod.id] || { view: false, edit: false, delete: false };
                      const allGranted = perms.view && perms.edit && perms.delete;
                      return (
                        <div key={mod.id} className={`flex items-center px-4 py-3 rounded-xl border transition-colors ${perms.view ? 'bg-indigo-50/50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
                          {/* Module name */}
                          <span className="flex-1 font-medium text-gray-800 text-sm">{mod.name}</span>

                          {/* Toggles */}
                          <div className="flex items-center gap-6">
                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                              <span className="text-xs text-gray-400 flex items-center gap-0.5"><Eye className="w-3 h-3" /> Xem</span>
                              <ToggleSwitch checked={perms.view} onChange={() => togglePermission(mod.id, 'view')} color="blue" />
                            </label>
                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                              <span className="text-xs text-gray-400 flex items-center gap-0.5"><Edit className="w-3 h-3" /> Sửa</span>
                              <ToggleSwitch checked={perms.edit} onChange={() => togglePermission(mod.id, 'edit')} color="green" />
                            </label>
                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                              <span className="text-xs text-red-400 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Xóa</span>
                              <ToggleSwitch checked={perms.delete} onChange={() => togglePermission(mod.id, 'delete')} color="red" />
                            </label>
                            {/* Preset button */}
                            <button
                              onClick={() => allGranted ? revokeAll(mod.id) : grantAll(mod.id)}
                              className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${allGranted ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                            >
                              {allGranted ? 'Thu hồi' : 'Full'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                💡 <strong>Logic thông minh:</strong> Bật "Sửa" hoặc "Xóa" sẽ tự động bật "Xem". Tắt "Xem" sẽ tắt cả Sửa và Xóa.
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setMatrixUser(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={saveMatrix}
                disabled={savingMatrix}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {savingMatrix ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</> : <><Check className="w-4 h-4" /> Lưu quyền</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
