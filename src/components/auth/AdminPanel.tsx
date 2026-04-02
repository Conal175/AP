import React, { useState, useEffect } from 'react';
import { Users, Loader2, User, ShieldAlert } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { toast } from '../ui/Toast';

interface UserData {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    // Gọi hàm RPC chuẩn để lấy danh sách người dùng thay vì select trực tiếp
    const { data, error } = await supabase.rpc('get_all_users_with_roles');

    if (error) {
      toast.error("Không thể tải danh sách thành viên: " + error.message);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Gọi hàm RPC cập nhật quyền (bỏ qua khóa bảo mật RLS một cách an toàn)
    const { error } = await supabase.rpc('update_user_role', {
      target_user_id: targetUserId,
      new_role: newRole
    });

    if (error) {
      toast.error(`Cập nhật thất bại: ${error.message}`);
      // Lấy lại danh sách từ DB để reset trạng thái của thanh chọn
      loadUsers();
    } else {
      toast.success("Đã cập nhật quyền thành công!");
      // Cập nhật giao diện ngay lập tức mà không cần load lại trang
      setUsers(users.map(u => u.user_id === targetUserId ? { ...u, role: newRole } : u));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in fade-in">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <Users className="w-7 h-7 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-800">Quản lý Thành Viên</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm w-1/3">Người Dùng (Email)</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Ngày Đăng Ký</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-sm text-right">Quyền Hạn</th>
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
                <td className="px-4 py-4 text-right">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    className={`border rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors shadow-sm ${
                      user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                      user.role === 'manager' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      user.role === 'member' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Quản lý</option>
                    <option value="member">Nhân viên</option>
                    <option value="viewer">Người xem</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <p>
          <strong>Lưu ý quan trọng:</strong> Sau khi bạn thay đổi quyền, người được cấp quyền cần phải <strong>Đăng xuất và Đăng nhập lại</strong> thì hệ thống mới bắt đầu nhận diện mức phân quyền mới.
        </p>
      </div>
    </div>
  );
}
