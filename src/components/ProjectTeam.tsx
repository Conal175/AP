import React, { useState, useEffect } from 'react';
import { Users, Loader2, Save, X, Plus, Trash2, CheckCircle, Shield } from 'lucide-react';
import { useAuth, type PermissionMatrix } from '../contexts/AuthContext';
import { fetchProjectMembers, saveProjectMember, removeProjectMember, type ProjectMember } from '../store';
import { toast } from './ui/Toast';

const APP_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Quản Lý Đơn Hàng' },
  { id: 'action_plan', label: 'Action Plan' },
  { id: 'strategy_product', label: 'Sản Phẩm' },
  { id: 'strategy_customer', label: 'Khách Hàng' },
  { id: 'competitors', label: 'Đối Thủ' },
  { id: 'daily_report', label: 'Báo Cáo' },
  { id: 'media', label: 'Media' }
];

export function ProjectTeam({ projectId }: { projectId: string }) {
  const auth = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<ProjectMember | null>(null);
  const [tempPerms, setTempPerms] = useState<PermissionMatrix>({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNewUserId, setSelectedNewUserId] = useState('');

  useEffect(() => { loadData(); }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    const [mems, users] = await Promise.all([ fetchProjectMembers(projectId), auth.getAllUsers() ]);
    setMembers(mems); setAllUsers(users);
    setLoading(false);
  };

  const openPermissionModal = (member: ProjectMember) => {
    setSelectedUser(member);
    const initialPerms: PermissionMatrix = {};
    APP_MODULES.forEach(mod => {
      initialPerms[mod.id] = { access: member.permissions[mod.id]?.access || false, delete: member.permissions[mod.id]?.delete || false };
    });
    setTempPerms(initialPerms);
  };

  const togglePerm = (moduleId: string, action: 'access' | 'delete') => {
    setTempPerms(prev => {
      const updated = { ...prev };
      if (action === 'delete' && !updated[moduleId].delete) updated[moduleId].access = true; // Xóa thì mặc định phải có Access
      if (action === 'access' && updated[moduleId].access) updated[moduleId].delete = false; // Bỏ Access thì mất luôn Xóa
      updated[moduleId][action] = !updated[moduleId][action];
      return updated;
    });
  };

  const handleSavePerms = async () => {
    if (!selectedUser) return;
    await saveProjectMember(projectId, selectedUser.user_id, tempPerms);
    toast.success("Đã lưu quyền thành công!");
    setSelectedUser(null);
    loadData();
  };

  const handleRemoveMember = async (userId: string) => {
    if(confirm('Chắc chắn muốn xóa thành viên này khỏi dự án?')) {
      await removeProjectMember(projectId, userId);
      loadData();
    }
  };

  const handleAddMember = async () => {
    if (!selectedNewUserId) return;
    const initialPerms: PermissionMatrix = {};
    APP_MODULES.forEach(mod => { initialPerms[mod.id] = { access: true, delete: false }; }); // Mặc định cho Access
    await saveProjectMember(projectId, selectedNewUserId, initialPerms);
    setShowAddModal(false);
    loadData();
  };

  const usersNotInProject = allUsers.filter(u => !members.find(m => m.user_id === u.user_id) && u.role !== 'admin');

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users /> Đội Ngũ Dự Án</h2>
          <p className="text-sm text-gray-500">Phân quyền Truy cập và Xóa cho từng cá nhân trong dự án này.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-medium">
          <Plus className="w-4 h-4" /> Thêm Thành Viên
        </button>
      </div>

      <table className="w-full text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-sm font-semibold text-gray-600">Email</th>
            <th className="p-3 text-sm font-semibold text-gray-600 text-center">Tùy Chỉnh Quyền</th>
            <th className="p-3 text-sm font-semibold text-gray-600 text-center">Xóa Khỏi Dự Án</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map(m => (
            <tr key={m.user_id} className="hover:bg-gray-50">
              <td className="p-3 font-medium text-gray-800">{m.email}</td>
              <td className="p-3 text-center">
                <button onClick={() => openPermissionModal(m)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 font-medium">
                  Cấu hình quyền
                </button>
              </td>
              <td className="p-3 text-center">
                <button onClick={() => handleRemoveMember(m.user_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal Cấu Hình Quyền */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><Shield className="text-indigo-600"/> Phân Quyền: {selectedUser.email}</h3>
              <button onClick={() => setSelectedUser(null)}><X className="text-gray-400 hover:text-red-500"/></button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm text-gray-600">
                    <th className="pb-2 text-left">Trang Chức Năng</th>
                    <th className="pb-2 text-center text-blue-600">Truy Cập (Xem & Sửa)</th>
                    <th className="pb-2 text-center text-red-600">Quyền Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {APP_MODULES.map(mod => (
                    <tr key={mod.id}>
                      <td className="py-3 font-medium text-gray-700">{mod.label}</td>
                      <td className="py-3 text-center"><input type="checkbox" checked={tempPerms[mod.id]?.access} onChange={() => togglePerm(mod.id, 'access')} className="w-5 h-5 cursor-pointer accent-blue-600"/></td>
                      <td className="py-3 text-center"><input type="checkbox" checked={tempPerms[mod.id]?.delete} onChange={() => togglePerm(mod.id, 'delete')} className="w-5 h-5 cursor-pointer accent-red-600"/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setSelectedUser(null)} className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleSavePerms} className="px-5 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Lưu Lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Thành Viên */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Thêm Thành Viên Vào Dự Án</h3>
            <select value={selectedNewUserId} onChange={(e) => setSelectedNewUserId(e.target.value)} className="w-full border p-3 rounded-xl mb-6 outline-none focus:border-indigo-500">
              <option value="">-- Chọn Nhân Viên --</option>
              {usersNotInProject.map(u => <option key={u.user_id} value={u.user_id}>{u.email}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleAddMember} disabled={!selectedNewUserId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
