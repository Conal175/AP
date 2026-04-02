import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase, getSupabaseConfig, decodeJWT } from '../lib/supabase';

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';
// GỘP QUYỀN: Truy cập (Xem + Sửa) và Xóa
export type PermissionMatrix = Record<string, { access: boolean; delete: boolean }>;

export interface UserWithRole {
  user_id: string; email: string; role: UserRole; created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  projectPermissions: Record<string, PermissionMatrix>; // Lưu quyền theo từng ID dự án
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  getAllUsers: () => Promise<UserWithRole[]>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ error: string | null }>;
  checkProjectPermission: (projectId: string | null | undefined, page: string, action: 'access' | 'delete') => boolean;
  isAdmin: boolean;
  canManage: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function getRoleFromSession(session: Session | null): UserRole {
  try {
    if (!session?.access_token) return 'viewer';
    const decoded = decodeJWT(session.access_token);
    const role = decoded?.user_role as string;
    return ['admin', 'manager', 'member', 'viewer'].includes(role) ? (role as UserRole) : 'viewer';
  } catch (error) { return 'viewer'; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>('viewer');
  const [projectPermissions, setProjectPermissions] = useState<Record<string, PermissionMatrix>>({});
  const [loading, setLoading] = useState(true);
  const configured = !!getSupabaseConfig();

  const syncLiveRole = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setRole('viewer'); setProjectPermissions({});
      return;
    }

    let currentRole = getRoleFromSession(currentSession);
    const supabase = getSupabase();
    if (supabase) {
      // 1. Lấy Role Global
      const { data: roleData } = await supabase.rpc('get_my_role');
      const roleObj = Array.isArray(roleData) ? roleData[0] : roleData;
      if (roleObj && roleObj.role) currentRole = roleObj.role as UserRole;
      
      // 2. Lấy toàn bộ Ma trận Quyền trong các Dự án của User này
      const { data: permsData } = await supabase.rpc('get_my_project_permissions');
      const permsMap: Record<string, PermissionMatrix> = {};
      if (permsData) {
        permsData.forEach((row: any) => {
          permsMap[row.project_id] = row.permissions || {};
        });
      }
      setRole(currentRole);
      setProjectPermissions(permsMap);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase(); if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) { setSession(s); setUser(s?.user ?? null); syncLiveRole(s).finally(() => setLoading(false)); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) { setSession(s); setUser(s?.user ?? null); syncLiveRole(s); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [configured, syncLiveRole]);

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
    setUser(null); setSession(null); setRole('viewer'); setProjectPermissions({});
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

  // KIỂM TRA QUYỀN TRUY CẬP DỰ ÁN
  const checkProjectPermission = (projectId: string | null | undefined, page: string, action: 'access' | 'delete') => {
    if (role === 'admin') return true; // Admin có toàn quyền mọi nơi
    if (!projectId) return false;
    
    const perms = projectPermissions[projectId];
    if (!perms || !perms[page]) return false;
    return perms[page][action] === true;
  };

  return (
    <AuthContext.Provider value={{
      user, session, role, projectPermissions, loading, configured,
      signIn, signUp, signOut, getAllUsers, updateUserRole,
      checkProjectPermission, isAdmin: role === 'admin', canManage: ['admin', 'manager'].includes(role)
    }}>
      {children}
    </AuthContext.Provider>
  );
}
