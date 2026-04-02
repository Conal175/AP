import React, { useState, useEffect } from 'react';
import { Users, Loader2, User, ShieldAlert, Settings, X, Check, Shield } from 'lucide-react';
import { useAuth, type UserWithRole, type PermissionMatrix } from '../../contexts/AuthContext';
import { toast } from '../ui/Toast';

const APP_MODULES = [
  { id: 'dashboard', label: 'Dashboard Tổng Quan' },
  { id: 'orders', label: 'Quản Lý Đơn Hàng' },
  { id: 'action_plan', label: 'Action Plan (Công Việc)' },
  { id: 'strategy_product', label: 'Chiến Lược Sản Phẩm' },
  { id: 'strategy_customer', label: 'Chân Dung Khách Hàng' },
  { id: 'competitors', label: 'Tình Báo Đối Thủ' },
  { id: 'daily_report', label: 'Báo Cáo Doanh Thu' },
  { id: 'media', label: 'Media & Tài Nguyên' }
];

export function AdminPanel() {
  const auth = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [tempPermissions, setTempPermissions] = useState<PermissionMatrix>({});
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await auth.getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'admin' | 'manager' | 'member' | 'viewer') => {
    const { error } = await auth.updateUserRole(targetUserId, newRole);
    if (error) {
      toast.error(`Cập nhật thất bại: ${error}`);
      loadUsers();
    } else {
      toast.success("Đã cập nhật cấp bậc thành công!");
      setUsers(users.map(u => u.user_id === targetUserId ? { ...u, role: newRole } : u));
    }
  };

  // Mở Modal chỉnh quyền
  const openPermissionModal = (user: UserWithRole) => {
    if (user.role === 'admin') {
      toast.error('Tài khoản Admin mặc định có toàn quyền. Không cần cấu hình chi tiết.');
      return;
    }
    setSelectedUser(user);
    // Copy quyền hiện tại hoặc tạo mới
    const perms = user.permissions || {};
    const initialPerms: PermissionMatrix = {};
    APP_MODULES.forEach(mod => {
      initialPerms[mod.id] = {
        view: perms[mod.id]?.view || false,
        edit: perms[mod.id]?.edit || false,
        delete: perms[mod.id]?.delete || false
      };
    });
    setTempPermissions(initialPerms);
  };

  const togglePermission = (moduleId: string, action: 'view' | 'edit' | 'delete') => {
    setTempPermissions(prev => {
      const updated = { ...prev };
      // Nếu cấp quyền Edit/Delete thì tự động cấp luôn quyền View
      if ((action === 'edit' || action === 'delete') && !updated[moduleId][action]) {
        updated[moduleId].view = true;
      }
      // Nếu bỏ quyền View thì tự động bỏ luôn Edit/Delete
      if (action === 'view' && updated[moduleId].view) {
        updated[moduleId].edit = false;
        updated[moduleId].delete = false;
      }
      updated[moduleId][action] = !updated[moduleId][action];
      return updated;
    });
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setIsSavingPerms(true);
    
    const { error } = await auth.updateUserPermissions(selectedUser.user_id, tempPermissions);
    
    if (error) {
      toast.error(`Lưu phân quyền thất bại: ${error}`);
    } else {
      toast.success(`Đã cập nhật phân quyền cho ${selectedUser.email}`);
      setUsers(users.map(u => u.user_id === selectedUser.user_id ? { ...u, permissions: tempPermissions } : u));
      setSelectedUser(null);
    }
    setIsSavingPerms(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in fade-in relative">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <Users className="w-7 h-7 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-800">Quản lý Thành Viên & Phân Quyền</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Người Dùng (Email)</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Ngày Đăng Ký</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Cấp Bậc (Role)</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm text-center">Quyền Truy Cập</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => (
              <tr key={user.user_id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="px-4 py-4 text-gray-800 font-medium flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  {user.email}
                </td>
                <td className="px-4 py-4 text-gray-500 text-sm">
                  {new Date(user.created_at).toLocaleDateString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value as any)}
                    className={`border rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors shadow-sm ${
                      user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                      user.role === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      user.role === 'member' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    <option value="admin">Admin (Toàn quyền)</option>
                    <option value="manager">Manager</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-4 py-4 text-center">
                  <button 
                    onClick={() => openPermissionModal(user)}
                    disabled={user.role === 'admin'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      user.role === 'admin' 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    <Settings className="w-4 h-4" /> Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <p>
          <strong>Lưu ý quan trọng:</strong> Hệ thống sẽ tự động đăng xuất thành viên nếu phát hiện quyền hạn của họ bị thay đổi, để đảm bảo bảo mật dữ liệu.
        </p>
      </div>

      {/* ================= MODAL PHÂN QUYỀN CHI TIẾT ================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-indigo-600" /> Cấu Hình Quyền: {selectedUser.email}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-gray-600 text-sm">
                    <th className="pb-3 font-semibold">Tính năng / Trang</th>
                    <th className="pb-3 text-center font-semibold text-blue-600">👁️ Xem (View)</th>
                    <th className="pb-3 text-center font-semibold text-amber-600">✏️ Sửa (Edit)</th>
                    <th className="pb-3 text-center font-semibold text-red-600">🗑️ Xóa (Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {APP_MODULES.map(mod => (
                    <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-medium text-gray-700">{mod.label}</td>
                      <td className="py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={tempPermissions[mod.id]?.view || false} 
                          onChange={() => togglePermission(mod.id, 'view')}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={tempPermissions[mod.id]?.edit || false} 
                          onChange={() => togglePermission(mod.id, 'edit')}
                          className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 cursor-pointer" 
                        />
                      </td>
                      <td className="py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={tempPermissions[mod.id]?.delete || false} 
                          onChange={() => togglePermission(mod.id, 'delete')}
                          className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer" 
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setSelectedUser(null)} className="px-6 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-sm">
                Hủy Bỏ
              </button>
              <button onClick={savePermissions} disabled={isSavingPerms} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-all disabled:opacity-50">
                {isSavingPerms ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Lưu Phân Quyền
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
