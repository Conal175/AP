import { useState, useEffect } from 'react';
import { getSupabase } from './lib/supabase';
import type { Project } from './types';
import { toast } from './components/ui/Toast';

// ==========================================
// 1. DỮ LIỆU DỰ ÁN CỐT LÕI
// ==========================================
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    
    // CHỐT CHẶN 1: Nếu có lỗi hoặc data bị rỗng (null), lập tức trả về mảng rỗng
    if (error || !data) return [];
    
    return data.map(p => ({ id: p.id, name: p.name, description: p.description, createdAt: p.created_at }));
  } catch (err) {
    console.error("Lỗi fetchProjects:", err);
    return []; // Trả về mảng rỗng để chống sập web
  }
};

export const insertProject = async (project: Project): Promise<boolean> => {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase.from('projects').insert([{
      id: project.id, name: project.name, description: project.description, created_at: project.createdAt
    }]);
    
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
    const { error } = await supabase.from('projects').delete().eq('id', id);
    return !error;
  } catch (err) {
    return false;
  }
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

    // CHỐT CHẶN 2: Bảo vệ dữ liệu chi tiết dự án
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
      }, { onConflict: 'project_id,data_key' }); // CỰC KỲ QUAN TRỌNG: Đã xóa khoảng trắng ở đây

    // BẮT VÀ HIỂN THỊ LỖI NẾU DB CHẶN
    if (error) {
      console.error("Supabase Save Error:", error);
      toast.error(`❌ Lỗi lưu dữ liệu: ${error.message}`);
    }

  } catch (err) {
    console.error("Lỗi saveProjectData:", err);
  }
};

// ==========================================
// 3. REACT HOOK: DÙNG CHO MỌI TRANG CON
// ==========================================
export function useSyncData<T>(projectId: string, dataKey: string, initialValue: T[] = []) {
  const [data, setData] = useState<T[]>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchProjectData<T>(projectId, dataKey).then(res => {
      if (isMounted) {
        // CHỐT CHẶN 3: Đảm bảo dữ liệu đẩy ra giao diện luôn là dạng danh sách (Array)
        const safeData = Array.isArray(res) ? res : initialValue;
        setData(safeData);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setData(initialValue);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [projectId, dataKey]);

  const syncData = async (newData: T[]) => {
    const safeData = Array.isArray(newData) ? newData : [];
    setData(safeData); 
    await saveProjectData(projectId, dataKey, safeData);
  };

  return { data, syncData, loading };
}
// ==========================================
// 4. API CHO BẢNG DAILY_LOGS (TỐI ƯU HIỆU NĂNG)
// ==========================================
import type { DailyLog } from './types';

// Lấy danh sách báo cáo
export const fetchDailyLogs = async (projectId: string): Promise<DailyLog[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Lỗi lấy báo cáo:", error);
    return [];
  }

  // Chuyển đổi format tên cột từ DB sang chuẩn Frontend
  return data.map(d => ({
    id: d.id,
    projectId: d.project_id,
    day: d.day,
    month: d.month,
    year: d.year,
    adName: d.ad_name,
    adLink: d.ad_link,
    spend: Number(d.spend),
    impressions: Number(d.impressions),
    clicks: Number(d.clicks),
    messages: Number(d.messages),
    orders: Number(d.orders),
    revenue: Number(d.revenue),
    issues: d.issues,
    optimizations: d.optimizations
  }));
};

// Thêm 1 báo cáo mới
export const insertDailyLog = async (log: Omit<DailyLog, 'id'>): Promise<DailyLog | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('daily_logs')
    .insert([{
      project_id: log.projectId,
      day: log.day,
      month: log.month,
      year: log.year,
      ad_name: log.adName,
      ad_link: log.adLink,
      spend: log.spend,
      impressions: log.impressions,
      clicks: log.clicks,
      messages: log.messages,
      orders: log.orders,
      revenue: log.revenue,
      issues: log.issues,
      optimizations: log.optimizations
    }])
    .select()
    .single();

  if (error) {
    toast.error(`Lỗi thêm báo cáo: ${error.message}`);
    return null;
  }
  
  return {
    id: data.id,
    projectId: data.project_id,
    day: data.day,
    month: data.month,
    year: data.year,
    adName: data.ad_name,
    adLink: data.ad_link,
    spend: Number(data.spend),
    impressions: Number(data.impressions),
    clicks: Number(data.clicks),
    messages: Number(data.messages),
    orders: Number(data.orders),
    revenue: Number(data.revenue),
    issues: data.issues,
    optimizations: data.optimizations
  };
};

// Cập nhật 1 báo cáo
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

  const { error } = await supabase
    .from('daily_logs')
    .update(updates)
    .eq('id', id);

  if (error) {
    toast.error(`Lỗi cập nhật báo cáo: ${error.message}`);
    return false;
  }
  return true;
};

// Xóa 1 báo cáo
export const deleteDailyLog = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from('daily_logs')
    .delete()
    .eq('id', id);

  if (error) {
    toast.error(`Lỗi xóa báo cáo: ${error.message}`);
    return false;
  }
  return true;
};
// ==========================================
// 5. API CHO BẢNG ORDERS (QUẢN LÝ ĐƠN HÀNG)
// ==========================================
export interface Order {
  id: string;
  projectId: string;
  sheetName: string; // <-- Đã thêm
  orderDate: string;
  source: string;
  customerInfo: string;
  address: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  notes: string;
  shippingDate: string;
  trackingCode: string;
  status: string;
  shippingFee: number;
}

export const fetchOrders = async (projectId: string): Promise<Order[]> => {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('project_id', projectId)
    .order('order_date', { ascending: false });

  if (error) return [];

  return data.map(d => ({
    id: d.id, projectId: d.project_id,
    sheetName: d.sheet_name || 'Bảng chung', // <-- Đã thêm
    orderDate: d.order_date || '', source: d.source || '',
    customerInfo: d.customer_info || '', address: d.address || '',
    productName: d.product_name || '', quantity: Number(d.quantity),
    price: Number(d.price), total: Number(d.total),
    notes: d.notes || '', shippingDate: d.shipping_date || '',
    trackingCode: d.tracking_code || '', status: d.status || '',
    shippingFee: Number(d.shipping_fee)
  }));
};

export const insertOrder = async (order: Omit<Order, 'id'>): Promise<Order | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('orders').insert([{
    project_id: order.projectId, 
    sheet_name: order.sheetName || 'Bảng chung', // <-- Đã thêm
    order_date: order.orderDate || null,
    source: order.source, customer_info: order.customerInfo,
    address: order.address, product_name: order.productName,
    quantity: order.quantity, price: order.price, total: order.total,
    notes: order.notes, shipping_date: order.shippingDate || null,
    tracking_code: order.trackingCode, status: order.status, shipping_fee: order.shippingFee
  }]).select().single();

  if (error) { toast.error(`Lỗi thêm đơn: ${error.message}`); return null; }
  
  return {
    id: data.id, projectId: data.project_id, 
    sheetName: data.sheet_name || 'Bảng chung', // <-- Đã thêm
    orderDate: data.order_date || '',
    source: data.source || '', customerInfo: data.customer_info || '', address: data.address || '',
    productName: data.product_name || '', quantity: Number(data.quantity), price: Number(data.price),
    total: Number(data.total), notes: data.notes || '', shippingDate: data.shipping_date || '',
    trackingCode: data.tracking_code || '', status: data.status || '', shippingFee: Number(data.shipping_fee)
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
  
  // ĐÃ SỬA LỖI CHÍNH TẢ Ở DÒNG NÀY (Chuyển trackingCode thành tracking_code)
  if (order.trackingCode !== undefined) updates.tracking_code = order.trackingCode; 
  
  if (order.status !== undefined) updates.status = order.status;
  if (order.shippingFee !== undefined) updates.shipping_fee = order.shippingFee;

  const { error } = await supabase.from('orders').update(updates).eq('id', id);
  
  // Thêm cảnh báo nếu Database báo lỗi để dễ dàng gỡ rối
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

// Xóa toàn bộ Bảng (Sheet) cùng các đơn hàng bên trong
export const deleteOrdersBySheet = async (projectId: string, sheetName: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  
  let query = supabase.from('orders').delete().eq('project_id', projectId);
  
  // Nếu lệnh truyền vào không phải là ALL_SHEETS, thì chỉ xóa bảng được chỉ định
  if (sheetName !== 'ALL_SHEETS') {
    query = query.eq('sheet_name', sheetName);
  }

  const { error } = await query;

  if (error) {
    toast.error(`Lỗi xóa bảng: ${error.message}`);
    return false;
  }
  return true;
};
