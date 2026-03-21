import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CONFIG_KEY = 'supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey };

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  supabaseInstance = null; // reset so next getSupabase() creates new client
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  if (!config) return null;

  supabaseInstance = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return supabaseInstance;
}

/** Decode JWT payload (base64url) to read custom claims */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** SQL script for Supabase setup */
export const SUPABASE_SQL_SETUP = `
-- =============================================
-- 1. TẠO BẢNG user_roles
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Mọi user đều đọc được role của chính mình
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admin có thể quản lý tất cả roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 2. TỰ ĐỘNG GÁN ROLE KHI ĐĂNG KÝ
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 3. CUSTOM ACCESS TOKEN HOOK (JWT Claims)
-- =============================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"member"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Cấp quyền cho supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;

-- =============================================
-- 4. RPC: Lấy danh sách users + roles (chỉ admin)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can list users';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::TEXT,
    COALESCE(r.role, 'member') AS role,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.user_roles r ON r.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. RPC: Admin cập nhật role cho user
-- =============================================
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admin can update roles';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) DO UPDATE SET role = new_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. TẠO TÀI KHOẢN ADMIN ĐẦU TIÊN
-- =============================================
-- Sau khi đăng ký tài khoản đầu tiên, chạy lệnh này
-- thay YOUR_USER_ID bằng UUID thật:
--
-- UPDATE public.user_roles
-- SET role = 'admin'
-- WHERE user_id = 'YOUR_USER_ID';
`;
