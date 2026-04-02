import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabase } from './lib/supabase';
import type { Project, DailyLog } from './types';
import { toast } from './components/ui/Toast';

// ==========================================
// 1. DỮ LIỆU DỰ ÁN CỐT LÕI (ĐÃ ÁP DỤNG PHÂN QUYỀN ĐA KHÔNG GIAN)
// ==========================================
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    
    // Sử dụng hàm RPC để chỉ lấy dự án mà user này được cấp quyền (hoặc lấy tất cả nếu là admin)
    const { data, error } = await supabase.rpc('get_my_projects');
    
    if (error || !data) return [];
    
    return data.map((p: any) => ({ 
      id: p.id, 
      name: p.name, 
      description: p.description, 
      createdAt: p.created_at 
    }));
  } catch (err) {
    console.error("Lỗi fetchProjects:", err);
    return [];
  }
};

export const insertProject = async (project: Project, creatorId?: string): Promise<boolean> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase.from('projects').insert([{
      id: project.id, name: project.name, description: project.description, created_at: project.createdAt
    }]);
    
    // Tự động gán quyền cao nhất cho người tạo dự án (nếu không phải admin tối cao)
    if (!error && creatorId) {
      const fullPerms = {
        dashboard: { access: true, delete: true }, 
        orders: { access: true, delete: true },
        action_plan: { access: true, delete: true }, 
        strategy_product: { access: true, delete: true },
        strategy_customer: { access: true, delete: true }, 
        competitors: { access: true, delete: true },
        daily_report: { access: true, delete: true }, 
        media: { access: true, delete: true }
      };
      await supabase.from('project_members').insert({ 
        project_id: project.id, 
        user_id: creatorId, 
        permissions: fullPerms 
      });
    }

    if (error) {
      toast.error(`Lỗi tạo dự án từ DB: ${error.message}`);
    }
    return !error;
  } catch (err) {
    return false;
  }
};

export const removeProject = async (id: string): Promise<boolean> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    
    // Xóa mềm: đánh dấu dự án này là đã xóa
    const { error } = await supabase.from('projects').update({ is_deleted: true }).eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
};

// ==========================================
// 1.5. API QUẢN LÝ THÀNH VIÊN DỰ ÁN (MỚI)
// ==========================================
export interface ProjectMember { 
  user_id: string; 
  email: string; 
  permissions: any; 
}

export const fetchProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const supabase = getSupabase(); 
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_project_members', { p_id: projectId });
  return error ? [] : data;
};

export const saveProjectMember = async (projectId: string, userId: string, permissions: any) => {
  const supabase = getSupabase(); 
  if (!supabase) return;
  await supabase.from('project_members').upsert({ 
    project_id: projectId, 
    user_id: userId, 
    permissions 
  });
};

export const removeProjectMember = async (projectId: string, userId: string) => {
  const supabase = getSupabase(); 
  if (!supabase) return;
  await supabase.from('project_members').delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
};

// ==========================================
// 2. HỆ THỐNG ĐỒNG BỘ CLOUD TỰ ĐỘNG (JSONB)
// ==========================================
export const fetchProjectData = async <T>(pid: string, key: string): Promise<T[] | null> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('project_data')
      .select('data_value')
      .eq('project_id', pid)
      .eq('data_key', key)
      .single();

    if (error || !data || !data.data_value) return null;
    return data.data_value as T[];
  } catch (err) {
    return null;
  }
};

export const saveProjectData = async <T>(pid: string, key: string, items: T[]) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    
    const { error } = await supabase
      .from('project_data')
      .upsert({
        project_id: pid,
        data_key: key,
        data_value: items,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id,data_key' });

    if (error) {
      console.error("Supabase Save Error:", error);
      toast.error(`❌ Lỗi lưu dữ liệu: ${error.message}`);
    }
  } catch (err) {
    console.error("Lỗi saveProjectData:", err);
  }
};

// ==========================================
// 3. REACT HOOK: DÙNG CHO MỌI TRANG CON (REALTIME + DEBOUNCE CHỐNG SPAM API)
// ==========================================
export function useSyncData<T>(projectId: string, dataKey: string, initialValue: T[] = []) {
  const [data, setData] = useState<T[]>(initialValue);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();
    setLoading(true);

    // 1. Lấy dữ liệu lần đầu
    fetchProjectData<T>(projectId, dataKey).then(res => {
      if (isMounted) {
        setData(Array.isArray(res) ? res : initialValue);
        setLoading(false);
      }
    });

    // 2. Bật kênh lắng nghe Realtime (Ai sửa máy kia sẽ tự update)
    if (!supabase) return;
    const channel = supabase.channel(`sync_${projectId}_${dataKey}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'project_data', 
        filter: `project_id=eq.${projectId}` 
      }, (payload) => {
        if (payload.new.data_key === dataKey && isMounted) {
          setData(payload.new.data_value as T[]);
        }
      }).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [projectId, dataKey]);

  const syncData = useCallback((newData: T[]) => {
    const safeData = Array.isArray(newData) ? newData : [];
    setData(safeData); // Cập nhật local lập tức

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Lưu sau 1 giây ngừng gõ để báo cho các máy khác
    timeoutRef.current = setTimeout(async () => {
      await saveProjectData(projectId, dataKey, safeData);
    }, 1000);
  }, [projectId, dataKey]);

  return { data, syncData, loading };
}

// ==========================================
// 4. API CHO BẢNG DAILY_LOGS (ĐÃ THÊM LIMIT)
// ==========================================
export const fetchDailyLogs = async (projectId: string): Promise<DailyLog[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(365);

  if (error) {
    console.error("Lỗi lấy báo cáo:", error);
    return [];
  }

  return data.map(d => ({
    id: d.id, projectId: d.project_id, day: d.day, month: d.month, year: d.year,
    adName: d.ad_name, adLink: d.ad_link, spend: Number(d.spend), impressions: Number(d.impressions),
    clicks: Number(d.clicks), messages: Number(d.messages), orders: Number(d.orders),
    revenue: Number(d.revenue), issues: d.issues, optimizations: d.optimizations
  }));
};

export const insertDailyLog = async (log: Omit<DailyLog, 'id'>): Promise<DailyLog | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('daily_logs').insert([{
    project_id: log.projectId, day: log.day, month: log.month, year: log.year,
    ad_name: log.adName, ad_link: log.adLink, spend: log.spend, impressions: log.impressions,
    clicks: log.clicks, messages: log.messages, orders: log.orders, revenue: log.revenue,
    issues: log.issues, optimizations: log.optimizations
  }]).select().single();

  if (error) { toast.error(`Lỗi thêm báo cáo: ${error.message}`); return null; }
  
  return {
    id: data.id, projectId: data.project_id, day: data.day, month: data.month, year: data.year,
    adName: data.ad_name, adLink: data.ad_link, spend: Number(data.spend), impressions: Number(data.impressions),
    clicks: Number(data.clicks), messages: Number(data.messages), orders: Number(data.orders),
    revenue: Number(data.revenue), issues: data.issues, optimizations: data.optimizations
  };
};

export const updateDailyLog = async (id: string, log: Partial<DailyLog>): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;

  const updates: any = {};
  if (log.adName !== undefined) updates.ad_name = log.adName;
  if (log.adLink !== undefined) updates.ad_link = log.adLink;
  if (log.spend !== undefined) updates.spend = log.spend;
  if (log.impressions !== undefined) updates.impressions = log.impressions;
  if (log.clicks !== undefined) updates.clicks = log.clicks;
  if (log.messages !== undefined) updates.messages = log.messages;
  if (log.orders !== undefined) updates.orders = log.orders;
  if (log.revenue !== undefined) updates.revenue = log.revenue;
  if (log.issues !== undefined) updates.issues = log.issues;
  if (log.optimizations !== undefined) updates.optimizations = log.optimizations;

  const { error } = await supabase.from('daily_logs').update(updates).eq('id', id);
  if (error) { toast.error(`Lỗi cập nhật báo cáo: ${error.message}`); return false; }
  return true;
};

export const deleteDailyLog = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('daily_logs').delete().eq('id', id);
  if (error) { toast.error(`Lỗi xóa báo cáo: ${error.message}`); return false; }
  return true;
};

// ==========================================
// 5. API CHO BẢNG ORDERS (ĐÃ THÊM PHÂN TRANG)
// ==========================================
export interface Order {
  id: string; projectId: string; sheetName: string; orderDate: string; source: string; customerInfo: string;
  address: string; productName: string; quantity: number; price: number; total: number; notes: string;
  shippingDate: string; trackingCode: string; status: string; shippingFee: number;
}

export const fetchOrders = async (projectId: string, page: number = 1, pageSize: number = 5000): Promise<Order[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('project_id', projectId)
    .order('order_date', { ascending: false })
    .range(from, to);

  if (error) return [];

  return data.map(d => ({
    id: d.id, projectId: d.project_id, sheetName: d.sheet_name || 'Bảng chung', orderDate: d.order_date || '',
    source: d.source || '', customerInfo: d.customer_info || '', address: d.address || '', productName: d.product_name || '',
    quantity: Number(d.quantity), price: Number(d.price), total: Number(d.total), notes: d.notes || '',
    shippingDate: d.shipping_date || '', trackingCode: d.tracking_code || '', status: d.status || '', shippingFee: Number(d.shipping_fee)
  }));
};

export const insertOrder = async (order: Omit<Order, 'id'>): Promise<Order | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('orders').insert([{
    project_id: order.projectId, sheet_name: order.sheetName || 'Bảng chung', order_date: order.orderDate || null,
    source: order.source, customer_info: order.customerInfo, address: order.address, product_name: order.productName,
    quantity: order.quantity, price: order.price, total: order.total, notes: order.notes, shipping_date: order.shippingDate || null,
    tracking_code: order.trackingCode, status: order.status, shipping_fee: order.shippingFee
  }]).select().single();

  if (error) { toast.error(`Lỗi thêm đơn: ${error.message}`); return null; }
  
  return {
    id: data.id, projectId: data.project_id, sheetName: data.sheet_name || 'Bảng chung', orderDate: data.order_date || '',
    source: data.source || '', customerInfo: data.customer_info || '', address: data.address || '', productName: data.product_name || '',
    quantity: Number(data.quantity), price: Number(data.price), total: Number(data.total), notes: data.notes || '',
    shippingDate: data.shipping_date || '', trackingCode: data.tracking_code || '', status: data.status || '', shippingFee: Number(data.shipping_fee)
  };
};

export const updateOrder = async (id: string, order: Partial<Order>): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  
  const updates: any = {};
  if (order.sheetName !== undefined) updates.sheet_name = order.sheetName;
  if (order.orderDate !== undefined) updates.order_date = order.orderDate || null;
  if (order.source !== undefined) updates.source = order.source;
  if (order.customerInfo !== undefined) updates.customer_info = order.customerInfo;
  if (order.address !== undefined) updates.address = order.address;
  if (order.productName !== undefined) updates.product_name = order.productName;
  if (order.quantity !== undefined) updates.quantity = order.quantity;
  if (order.price !== undefined) updates.price = order.price;
  if (order.total !== undefined) updates.total = order.total;
  if (order.notes !== undefined) updates.notes = order.notes;
  if (order.shippingDate !== undefined) updates.shipping_date = order.shippingDate || null;
  if (order.trackingCode !== undefined) updates.tracking_code = order.trackingCode; 
  if (order.status !== undefined) updates.status = order.status;
  if (order.shippingFee !== undefined) updates.shipping_fee = order.shippingFee;

  const { error } = await supabase.from('orders').update(updates).eq('id', id);
  if (error) {
    console.error("Lỗi khi lưu đơn hàng:", error);
    toast.error(`Không thể lưu thay đổi: ${error.message}`);
    return false;
  }
  return true;
};

export const deleteOrder = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('orders').delete().eq('id', id);
  return !error;
};

export const deleteOrdersBySheet = async (projectId: string, sheetName: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  let query = supabase.from('orders').delete().eq('project_id', projectId);
  if (sheetName !== 'ALL_SHEETS') { query = query.eq('sheet_name', sheetName); }
  const { error } = await query;
  if (error) { toast.error(`Lỗi xóa bảng: ${error.message}`); return false; }
  return true;
};
