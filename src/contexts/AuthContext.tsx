import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase, getSupabaseConfig, decodeJWT } from '../lib/supabase';

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export type PermissionMatrix = Record<string, { view: boolean; edit: boolean; delete: boolean }>;

export interface UserWithRole {
  user_id: string;
  email: string;
  role: UserRole;
  permissions: PermissionMatrix;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  permissions: PermissionMatrix;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  getAllUsers: () => Promise<UserWithRole[]>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ error: string | null }>;
  updateUserPermissions: (userId: string, newPermissions: PermissionMatrix) => Promise<{ error: string | null }>;
  checkPermission: (page: string, action: 'view' | 'edit' | 'delete') => boolean;
  canEdit: boolean;
  canManage: boolean;
  isAdmin: boolean;
  refreshRole: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// BẢO HIỂM 1: Đọc quyền gốc từ Token để đề phòng DB bị trống
function getRoleFromSession(session: Session | null): UserRole {
  try {
    if (!session?.access_token) return 'viewer';
    const decoded = decodeJWT(session.access_token);
    if (!decoded) return 'viewer'; 
    const role = decoded.user_role as string;
    if (['admin', 'manager', 'member', 'viewer'].includes(role)) return role as UserRole;
    return 'viewer';
  } catch (error) {
    return 'viewer';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, _setRole] = useState<UserRole>('viewer');
  const [permissions, _setPermissions] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const configured = !!getSupabaseConfig();

  const roleRef = useRef<UserRole>('viewer');
  const permsRef = useRef<PermissionMatrix>({});
  const isRoleSynced = useRef(false);

  const setRoleData = useCallback((newRole: UserRole, newPerms: PermissionMatrix) => {
    _setRole(newRole);
    _setPermissions(newPerms);
    roleRef.current = newRole;
    permsRef.current = newPerms;
  }, []);

  const handleRoleChangedForceLogout = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    alert('⚠️ THÔNG BÁO HỆ THỐNG ⚠️\n\nQuyền truy cập của bạn vừa được cập nhật. Hệ thống sẽ tiến hành đăng xuất để đồng bộ dữ liệu.\n\nVui lòng đăng nhập lại!');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoleData('viewer', {});
    isRoleSynced.current = false;
    window.location.reload();
  }, [setRoleData]);

  // HÀM LẤY QUYỀN (ĐÃ FIX LỖI GIÁNG CẤP OAN)
  const syncLiveRole = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setRoleData('viewer', {});
      isRoleSynced.current = true;
      return;
    }

    // Luôn lấy Token làm gốc bảo hiểm
    let currentRole = getRoleFromSession(currentSession);
    let currentPerms: PermissionMatrix = {};

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        // Chỉ ghi đè quyền khi DB thực sự trả về dữ liệu (Fix lỗi mất quyền Admin)
        if (!error && data && data.role) {
          currentRole = data.role as UserRole;
          currentPerms = data.permissions || {};
        }
      } catch (err) {
        console.error("Lỗi khi fetch live role:", err);
      }
    }
    
    setRoleData(currentRole, currentPerms);
    isRoleSynced.current = true;
  }, [setRoleData]);

  const refreshRole = useCallback(() => {
    syncLiveRole(session);
  }, [session, syncLiveRole]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) {
        setSession(s);
        setUser(s?.user ?? null);
        syncLiveRole(s).finally(() => { if (mounted) setLoading(false); });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) {
        setSession(s);
        setUser(s?.user ?? null);
        syncLiveRole(s);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured, syncLiveRole]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !user?.id) return;

    const roleSubscription = supabase.channel(`role-update-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` },
        () => handleRoleChangedForceLogout()
      ).subscribe();

    const intervalId = setInterval(async () => {
      if (!isRoleSynced.current) return;
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        // Chỉ kích hoạt force logout nếu data thực sự tồn tại
        if (!error && data && data.role) {
          if (data.role !== roleRef.current || JSON.stringify(data.permissions || {}) !== JSON.stringify(permsRef.current)) {
            handleRoleChangedForceLogout();
          }
        }
      } catch (e) {}
    }, 30000); // Giảm từ 3s → 30s: Realtime subscription đã xử lý real-time, interval chỉ là backup

    return () => {
      supabase.removeChannel(roleSubscription);
      clearInterval(intervalId);
    };
  }, [user?.id, handleRoleChangedForceLogout]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase(); if (!supabase) return { error: 'Lỗi' };
    const { error } = await supabase.auth.signInWithPassword({ email, password }); return { error: error?.message || null };
  };
  const signUp = async (email: string, password: string, fullName: string) => {
    const supabase = getSupabase(); if (!supabase) return { error: 'Lỗi' };
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } }}); return { error: error?.message || null };
  };
  const signOut = async () => {
    const supabase = getSupabase(); if (supabase) await supabase.auth.signOut();
    setUser(null); setSession(null); setRoleData('viewer', {}); isRoleSynced.current = false;
  };
  const resetPassword = async (email: string) => {
    const supabase = getSupabase(); if (!supabase) return { error: 'Lỗi' };
    const { error } = await supabase.auth.resetPasswordForEmail(email); return { error: error?.message || null };
  };

  const getAllUsers = async (): Promise<UserWithRole[]> => {
    const supabase = getSupabase(); if (!supabase) return [];
    const { data, error } = await supabase.rpc('get_all_users_with_roles');
    return error ? [] : (data || []) as UserWithRole[];
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    const supabase = getSupabase(); if (!supabase) return { error: 'Lỗi cấu hình' };
    const { error } = await supabase.rpc('update_user_role', { target_user_id: userId, new_role: newRole });
    return { error: error?.message || null };
  };

  const updateUserPermissions = async (userId: string, newPermissions: PermissionMatrix) => {
    const supabase = getSupabase(); if (!supabase) return { error: 'Lỗi cấu hình' };
    const { error } = await supabase.rpc('update_user_permissions', { target_user_id: userId, new_permissions: newPermissions });
    return { error: error?.message || null };
  };

  const checkPermission = (page: string, action: 'view' | 'edit' | 'delete') => {
    if (role === 'admin') return true; 
    if (!permissions[page]) return false; 
    return permissions[page][action] === true;
  };

  return (
    <AuthContext.Provider value={{
      user, session, role, permissions, loading, configured,
      signIn, signUp, signOut, resetPassword,
      getAllUsers, updateUserRole, updateUserPermissions,
      checkPermission,
      canEdit: ['admin', 'manager', 'member'].includes(role),
      canManage: ['admin', 'manager'].includes(role),
      isAdmin: role === 'admin',
      refreshRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
