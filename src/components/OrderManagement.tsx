import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingBag, Download, Upload, Loader2, Plus, Edit2, Trash2, X, 
  Save, Search, Filter, RefreshCcw, Check, LayoutPanelLeft,
  AlertTriangle, CheckCircle, DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Order, fetchOrders, insertOrder, updateOrder, deleteOrder, deleteOrdersBySheet } from '../store';
import { useAuth } from '../contexts/AuthContext';

interface Props { projectId: string; }

const STATUS_OPTIONS = [
  'Chưa xử lý', 'Đang giao hàng', 'Phát thành công', 'Đang hoàn', 'Hủy'
];

export function OrderManagement({ projectId }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Đã thêm canManage (dành riêng cho Admin và Manager)
  const { checkPermission, isAdmin, canManage } = useAuth(); 
  const canEdit = checkPermission('orders', 'edit');
  const canDelete = checkPermission('orders', 'delete');

  // ================= QUẢN LÝ CÁC BẢNG (SHEETS) =================
  const [localNewSheets, setLocalNewSheets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`custom_sheets_${projectId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const saveLocalSheets = (sheets: string[]) => {
    setLocalNewSheets(sheets);
    localStorage.setItem(`custom_sheets_${projectId}`, JSON.stringify(sheets));
  };

  const allSheetsFromData = Array.from(new Set(orders.map(o => o.sheetName || 'Bảng chung').filter(s => s !== 'Bảng chung')));
  const combinedSheets = Array.from(new Set([...allSheetsFromData, ...localNewSheets]));
  
  const allTabs = isAdmin ? ['Bảng chung', ...combinedSheets] : combinedSheets;
  const [activeSheet, setActiveSheet] = useState<string>(allTabs[0] || '');

  useEffect(() => {
    if (allTabs.length > 0 && !allTabs.includes(activeSheet)) {
      setActiveSheet(allTabs[0]);
    }
  }, [allTabs, activeSheet]);

  // ================= XỬ LÝ NGÀY THÁNG =================
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayString = getLocalDateString(today);
  const firstDayOfMonth = getLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDayOfMonth = getLocalDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: firstDayOfMonth, dateTo: lastDayOfMonth, 
    source: '', customer: '', product: '', tracking: '', status: ''
  });

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [addFormData, setAddFormData] = useState<Omit<Order, 'id' | 'projectId'>>({
    sheetName: '', orderDate: todayString, source: '', customerInfo: '', address: '',
    productName: '', quantity: 1, price: 0, total: 0, notes: '', shippingDate: '', trackingCode: '', status: 'Chưa xử lý', shippingFee: 0
  });

  // ================= STATE SỬA TRỰC TIẾP =================
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null); 
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({});
  const [focusedField, setFocusedField] = useState<keyof Order | null>(null); 
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  useEffect(() => { loadOrders(); }, [projectId]);

  const loadOrders = async () => {
    setLoading(true);
    const data = await fetchOrders(projectId, 1, 5000); 
    setOrders(data);
    setLoading(false);
  };

  // ================= LỌC DỮ LIỆU HIỂN THỊ =================
  const currentSheetOrders = activeSheet === 'Bảng chung' ? orders : orders.filter(o => (o.sheetName || 'Bảng chung') === activeSheet);

  const filteredOrders = currentSheetOrders.filter(o => {
    const matchDateFrom = !filters.dateFrom || o.orderDate >= filters.dateFrom;
    const matchDateTo = !filters.dateTo || o.orderDate <= filters.dateTo;
    const matchSource = !filters.source || o.source.toLowerCase().includes(filters.source.toLowerCase());
    const matchCustomer = !filters.customer || o.customerInfo.toLowerCase().includes(filters.customer.toLowerCase());
    const matchProduct = !filters.product || o.productName.toLowerCase().includes(filters.product.toLowerCase());
    const matchTracking = !filters.tracking || o.trackingCode.toLowerCase().includes(filters.tracking.toLowerCase());
    const matchStatus = !filters.status || o.status.toLowerCase().includes(filters.status.toLowerCase());
    return matchDateFrom && matchDateTo && matchSource && matchCustomer && matchProduct && matchTracking && matchStatus;
  });

  const clearFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', source: '', customer: '', product: '', tracking: '', status: '' });
  };

  // ================= THỐNG KÊ TRẠNG THÁI & DOANH SỐ =================
  const statTotal = filteredOrders.length;
  const statUnprocessed = filteredOrders.filter(o => o.status === 'Chưa xử lý').length;
  const statDelivering = filteredOrders.filter(o => o.status === 'Đang giao hàng').length;
  const statSuccess = filteredOrders.filter(o => o.status === 'Phát thành công').length;
  const statReturning = filteredOrders.filter(o => o.status === 'Đang hoàn').length;
  const statCancelled = filteredOrders.filter(o => o.status === 'Hủy').length;
  const returnRate = statTotal > 0 ? ((statReturning + statCancelled) / statTotal * 100).toFixed(1) : '0';

  const revenueMetrics = useMemo(() => {
    let chot = 0; let thanhCong = 0; let hoanHuy = 0;
    filteredOrders.forEach(o => {
      const val = Number(o.total) || 0;
      const status = (o.status || '').toLowerCase().trim();
      
      chot += val; 

      if (status.includes('hủy') || status.includes('hoàn') || status.includes('boom') || status.includes('cancel')) {
        hoanHuy += val;
      } else if (status.includes('thành công') || status.includes('đã giao') || status.includes('hoàn thành') || status.includes('success') || status.includes('đã nhận')) {
        thanhCong += val;
      }
    });
    return { chot, thanhCong, hoanHuy };
  }, [filteredOrders]);

  const formatMoney = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

  // ================= TẠO BẢNG & XÓA BẢNG =================
  const handleAddNewSheet = () => {
    // Chỉ Admin và Manager mới có quyền tạo
    if (!canManage) return;

    const sheetName = prompt('Nhập tên Bảng quản lý mới (VD: Đơn Tháng 3, Team A...):');
    if (sheetName && sheetName.trim()) {
      const cleanName = sheetName.trim();
      if (!allTabs.includes(cleanName)) {
        saveLocalSheets([...localNewSheets, cleanName]);
      }
      setActiveSheet(cleanName);
    }
  };

  const handleDeleteSheet = async () => {
    // Chỉ Admin và Manager mới có quyền xóa bảng
    if (!canManage) return;
    
    const isAll = activeSheet === 'Bảng chung';
    
    // Nếu là Manager, có thể cảnh báo thêm khi xóa Bảng chung, Admin thì thoải mái
    if (isAll && !isAdmin) {
      alert('Chỉ tài khoản Admin mới có quyền xóa "Bảng chung" (Tất cả đơn hàng của dự án).');
      return;
    }

    const confirmDelete = window.confirm(
      isAll 
      ? `⚠️ CẢNH BÁO NGUY HIỂM TỘT ĐỘ:\n\nBạn đang ở "Bảng chung". Việc xóa sẽ XÓA SẠCH TOÀN BỘ ĐƠN HÀNG của TẤT CẢ CÁC BẢNG trong dự án này!\n\nHành động này KHÔNG THỂ HOÀN TÁC! Bạn có chắc chắn không?`
      : `⚠️ CẢNH BÁO NGUY HIỂM:\n\nBạn có chắc chắn muốn xóa TOÀN BỘ đơn hàng trong bảng "${activeSheet}" không?\n\nHành động này KHÔNG THỂ HOÀN TÁC!`
    );
    
    if (confirmDelete) {
      const success = await deleteOrdersBySheet(projectId, isAll ? 'ALL_SHEETS' : activeSheet);
      if (success) {
        if (isAll) {
          setOrders([]); saveLocalSheets([]);
        } else {
          setOrders(orders.filter(o => (o.sheetName || 'Bảng chung') !== activeSheet));
          saveLocalSheets(localNewSheets.filter(s => s !== activeSheet));
          setActiveSheet('Bảng chung');
        }
      }
    }
  };

  // ================= XỬ LÝ THÊM MỚI (MODAL) =================
  const openAddModal = () => {
    const targetSheet = activeSheet === 'Bảng chung' ? combinedSheets[0] || '' : activeSheet;
    setAddFormData({
      sheetName: targetSheet, orderDate: todayString, source: '', customerInfo: '', address: '',
      productName: '', quantity: 1, price: 0, total: 0, notes: '', shippingDate: '', trackingCode: '', status: 'Chưa xử lý', shippingFee: 0
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    setAddFormData(prev => ({ ...prev, total: prev.quantity * prev.price }));
  }, [addFormData.quantity, addFormData.price]);

  const handleSaveAdd = async () => {
    if (!addFormData.customerInfo.trim() || !canEdit) return;
    setIsSavingAdd(true);
    const finalSheetName = addFormData.sheetName || (canManage ? 'Bảng chung' : 'Bảng Mặc định');
    
    const newOrder = await insertOrder({ projectId, ...addFormData, sheetName: finalSheetName });
    if (newOrder) {
      setOrders([newOrder, ...orders]);
      if (!allTabs.includes(finalSheetName) && finalSheetName !== 'Bảng chung') {
        saveLocalSheets([...localNewSheets, finalSheetName]);
      }
      setShowAddModal(false);
    }
    setIsSavingAdd(false);
  };

  // ================= XỬ LÝ SỬA TRỰC TIẾP VỚI AUTOFOCUS =================
  useEffect(() => {
    if (editingRowId && editFormData.quantity !== undefined && editFormData.price !== undefined) {
      setEditFormData(prev => ({ ...prev, total: (prev.quantity || 0) * (prev.price || 0) }));
    }
  }, [editFormData.quantity, editFormData.price, editingRowId]);

  const startInlineEdit = (order: Order, field: keyof Order | null = null) => {
    if (!canEdit) return;
    setEditingRowId(order.id);
    setEditFormData({ ...order });
    setFocusedField(field);
    setSelectedRowId(order.id);
    if (field) {
      setTimeout(() => {
        const el = inputRefs.current[field];
        if (el) el.focus();
      }, 50);
    }
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null); setEditFormData({}); setFocusedField(null);
  };

  const saveInlineEdit = async () => {
    if (!editingRowId || !canEdit) return;
    setIsSavingEdit(true);
    const success = await updateOrder(editingRowId, editFormData);
    if (success) {
      setOrders(orders.map(o => o.id === editingRowId ? { ...o, ...editFormData } : o));
      setEditingRowId(null); setFocusedField(null);
    }
    setIsSavingEdit(false);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
      const success = await deleteOrder(id);
      if (success) setOrders(orders.filter(o => o.id !== id));
    }
  };

  // ================= XUẤT / NHẬP EXCEL =================
  const handleExportExcel = () => {
    const exportData = filteredOrders.map(o => ({
      'Ngày': o.orderDate, 'Nguồn': o.source, 'Tên khách hàng': o.customerInfo, 'Địa Chỉ': o.address,
      'Tên sp': o.productName, 'Số Lượng': o.quantity, 'Giá Bán': o.price, 'TỔNG ĐƠN': o.total,
      'ghi chú': o.notes, 'Ngày Lên Đơn': o.shippingDate, 'Mã Vận Đơn': o.trackingCode,
      'Trạng thái đơn hàng': o.status, 'phí vc': o.shippingFee
    }));

    if (exportData.length === 0) {
      exportData.push({ 'Ngày': '', 'Nguồn': '', 'Tên khách hàng': 'File Mẫu', 'Địa Chỉ': '', 'Tên sp': '', 'Số Lượng': 1, 'Giá Bán': 0, 'TỔNG ĐƠN': 0, 'ghi chú': '', 'Ngày Lên Đơn': '', 'Mã Vận Đơn': '', 'Trạng thái đơn hàng': '', 'phí vc': 0 });
    }
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const validSheetName = activeSheet.substring(0, 31).replace(/[\\/?*\[\]]/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, validSheetName);
    XLSX.writeFile(workbook, `Danh_Sach_Don_${validSheetName}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    if (activeSheet === 'Bảng chung') {
      alert('Vui lòng chọn một Bảng con cụ thể (VD: Team 1) để nhập dữ liệu Excel!');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          if (rawData[i] && rawData[i].some(cell => typeof cell === 'string' && cell.toLowerCase().includes('tên khách hàng'))) {
            headerRowIndex = i; break;
          }
        }
        if (headerRowIndex === -1) { alert('❌ Không tìm thấy cột "Tên khách hàng"!'); setIsImporting(false); return; }

        const headers = rawData[headerRowIndex].map(h => h ? String(h).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() : '');
        const parseNumber = (val: any) => { if (!val) return 0; if (typeof val === 'number') return val; return Number(String(val).replace(/[^0-9]/g, '')) || 0; };
        const parseDate = (val: any) => {
          if (!val) return '';
          if (val instanceof Date) return getLocalDateString(val);
          const str = String(val).trim(); const parts = str.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          return str.split(' ')[0]; 
        };

        let successCount = 0;
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const rowArray = rawData[i];
          if (!rowArray || rowArray.length === 0) continue;
          const row: any = {};
          headers.forEach((h, index) => { if (h) row[h] = rowArray[index]; });

          if (row['tên khách hàng']) {
            await insertOrder({
              projectId, 
              sheetName: activeSheet,
              orderDate: parseDate(row['ngày']), source: row['nguồn'] ? String(row['nguồn']) : '',
              customerInfo: String(row['tên khách hàng']), address: row['địa chỉ'] ? String(row['địa chỉ']) : '',
              productName: row['tên sp'] || row['tên sản phẩm'] ? String(row['tên sp'] || row['tên sản phẩm']) : '',
              quantity: parseNumber(row['số lượng']) || 1, price: parseNumber(row['giá bán']) || 0, total: parseNumber(row['tổng đơn']) || 0,
              notes: row['ghi chú'] ? String(row['ghi chú']) : '', shippingDate: parseDate(row['ngày lên đơn']),
              trackingCode: row['mã vận đơn'] ? String(row['mã vận đơn']) : '',
              status: row['trạng thái đơn hàng'] || row['trạng thái'] ? String(row['trạng thái đơn hàng'] || row['trạng thái']) : 'Chưa xử lý',
              shippingFee: parseNumber(row['phí vc'] || row['phí vận chuyển']) || 0
            });
            successCount++;
          }
        }
        alert(`✅ Đã nhập thành công ${successCount} đơn hàng vào ${activeSheet}!`);
        loadOrders();
      } catch (error) { alert('❌ Lỗi định dạng file!'); } 
      finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 w-full">
      
      {/* === STATS PANEL === */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 flex-none">
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-gray-800">{statTotal}</div>
          <div className="text-xs text-gray-500 mt-0.5">Tổng đơn</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-amber-600">{statUnprocessed}</div>
          <div className="text-xs text-amber-700 mt-0.5">Chưa xử lý</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-blue-600">{statDelivering}</div>
          <div className="text-xs text-blue-700 mt-0.5">Đang giao</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-green-600">{statSuccess}</div>
          <div className="text-xs text-green-700 mt-0.5">Thành công</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-3 shadow-sm text-center">
          <div className="text-2xl font-bold text-red-600">{statCancelled}</div>
          <div className="text-xs text-red-700 mt-0.5">Hủy</div>
        </div>
        <div className={`rounded-xl border p-3 shadow-sm text-center ${parseFloat(returnRate) > 20 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`text-2xl font-bold ${parseFloat(returnRate) > 20 ? 'text-red-600' : 'text-gray-700'}`}>{returnRate}%</div>
          <div className="text-xs text-gray-500 mt-0.5">Tỷ lệ hoàn/hủy</div>
        </div>
      </div>

      {/* === DOANH SỐ THEO BẢNG & BỘ LỌC === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-none">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-sm flex justify-between items-center border border-blue-400">
          <div>
            <p className="text-blue-100 text-xs font-semibold mb-1 uppercase tracking-wider">Tổng Doanh Số Chốt</p>
            <p className="text-2xl font-extrabold">{formatMoney(revenueMetrics.chot)}đ</p>
          </div>
          <DollarSign className="w-10 h-10 text-white opacity-40" />
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-sm flex justify-between items-center border border-green-400">
          <div>
            <p className="text-emerald-100 text-xs font-semibold mb-1 uppercase tracking-wider">Doanh Số Thành Công</p>
            <p className="text-2xl font-extrabold">{formatMoney(revenueMetrics.thanhCong)}đ</p>
          </div>
          <CheckCircle className="w-10 h-10 text-white opacity-40" />
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white shadow-sm flex justify-between items-center border border-red-400">
          <div>
            <p className="text-red-100 text-xs font-semibold mb-1 uppercase tracking-wider">Doanh Số Hoàn / Hủy</p>
            <p className="text-2xl font-extrabold">{formatMoney(revenueMetrics.hoanHuy)}đ</p>
          </div>
          <AlertTriangle className="w-10 h-10 text-white opacity-40" />
        </div>
      </div>
      
      {/* THIẾT KẾ CÁC TAB / BẢNG (SHEETS) */}
      <div className="flex-none bg-white rounded-t-2xl shadow-sm border border-gray-100 px-4 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <LayoutPanelLeft className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
        {allTabs.map(sheet => (
          <button
            key={sheet}
            onClick={() => setActiveSheet(sheet)}
            className={`px-5 py-2.5 rounded-t-xl font-semibold text-sm whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeSheet === sheet 
              ? 'bg-indigo-50/80 text-indigo-700 border-indigo-600' 
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-transparent'
            }`}
          >
            {sheet === 'Bảng chung' && <ShoppingBag className="w-4 h-4" />}
            {sheet}
          </button>
        ))}
        {/* CHỈ ADMIN/MANAGER ĐƯỢC TẠO BẢNG */}
        {canManage && (
          <button 
            onClick={handleAddNewSheet} 
            className="p-2 ml-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
            title="Tạo bảng/tab mới"
          >
            <Plus className="w-5 h-5"/>
          </button>
        )}
      </div>

      {/* GIAO DIỆN TRỐNG (NẾU CHƯA CÓ BẢNG NÀO) */}
      {allTabs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-b-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Hiện chưa có thông tin</h2>
          <p className="text-gray-500 mb-6">Chưa có bảng dữ liệu đơn hàng nào được tạo.</p>
          {canManage && (
            <button onClick={handleAddNewSheet} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-medium shadow-md transition-all">
              <Plus className="w-5 h-5" /> Tạo Bảng Mới Ngay
            </button>
          )}
        </div>
      ) : (
        <>
          {/* HEADER & TOP CONTROLS */}
          <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-b-2xl shadow-sm border border-gray-100 mt-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                Đang xem: <span className="text-indigo-600">{activeSheet}</span>
                {/* CHỈ ADMIN/MANAGER ĐƯỢC XÓA BẢNG */}
                {canManage && (
                  <button 
                    onClick={handleDeleteSheet} 
                    className="p-1.5 ml-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={`Xóa toàn bộ dữ liệu của ${activeSheet === 'Bảng chung' ? 'TẤT CẢ CÁC BẢNG' : 'bảng này'}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Tìm thấy {filteredOrders.length} đơn hàng trong bộ lọc này</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <Filter className="w-4 h-4" /> Bộ lọc {(filters.customer || filters.product || filters.tracking || filters.status) && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
              </button>
              <div className="w-px h-8 bg-gray-200 mx-1"></div>
              <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 rounded-xl border border-transparent hover:border-green-200">
                <Download className="w-4 h-4" /> Xuất
              </button>
              {canEdit && (
                <>
                  <button onClick={() => fileInputRef.current?.click()} disabled={isImporting || activeSheet === 'Bảng chung'} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-transparent transition-colors ${activeSheet === 'Bảng chung' ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-blue-700 hover:bg-blue-50 hover:border-blue-200 disabled:opacity-50'}`} title={activeSheet === 'Bảng chung' ? 'Bạn phải chọn một bảng cụ thể để nhập file' : 'Nhập file Excel'}>
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Nhập
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls, .csv" className="hidden" />
                  
                  <button onClick={openAddModal} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2 rounded-xl hover:from-indigo-700 hover:to-blue-700 font-medium shadow-md transition-all">
                    <Plus className="w-4 h-4" /> Thêm Đơn
                  </button>
                </>
              )}
            </div>
          </div>

          {/* FILTER PANEL */}
          {showFilters && (
            <div className="flex-none bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Filter className="w-4 h-4" /> Lọc tìm kiếm chi tiết</h3>
                <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Xem tất cả</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-sm">
                <div><label className="block text-xs text-gray-500 mb-1">Từ ngày</label><input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Đến ngày</label><input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Tên khách / SĐT</label><input type="text" placeholder="Tìm..." value={filters.customer} onChange={e => setFilters({...filters, customer: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Mã vận đơn</label><input type="text" placeholder="Tìm..." value={filters.tracking} onChange={e => setFilters({...filters, tracking: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Nguồn (Page...)</label><input type="text" placeholder="Tìm..." value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Sản phẩm</label><input type="text" placeholder="Tìm..." value={filters.product} onChange={e => setFilters({...filters, product: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none" /></div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
                  <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 outline-none bg-white">
                    <option value="">Tất cả trạng thái</option>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* KHUNG BẢNG CHÍNH */}
          <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col w-full">
            <div className="flex-1 overflow-auto relative w-full">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-max">
                <thead className="sticky top-0 z-10 bg-gray-100 text-gray-700 font-semibold shadow-sm border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-3 w-10 text-center border-r border-gray-200">#</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[100px]">Ngày HĐ</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[120px]">Nguồn</th>
                    {activeSheet === 'Bảng chung' && <th className="px-2 py-3 border-r border-gray-200 min-w-[120px] text-indigo-700">Thuộc Bảng</th>}
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[200px]">Khách hàng (Tên-SĐT)</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[250px]">Địa chỉ giao</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[200px]">Sản phẩm</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[60px] text-center">SL</th>
                    <th className="px-2 py-3 border-r border-gray-200 text-right min-w-[100px]">Đơn giá</th>
                    <th className="px-2 py-3 border-r border-gray-200 text-right min-w-[110px]">Tổng thu</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[120px]">Mã VĐ</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[140px]">Trạng thái</th>
                    <th className="px-2 py-3 border-r border-gray-200 text-right min-w-[100px]">Phí Ship</th>
                    <th className="px-2 py-3 border-r border-gray-200 min-w-[200px]">Ghi chú</th>
                    {(canEdit || canDelete) && <th className="px-2 py-3 text-center sticky right-0 bg-gray-100 shadow-[-5px_0_10px_rgba(0,0,0,0.05)]">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={15} className="px-4 py-12 text-center text-gray-500 font-medium">Không có dữ liệu trong bộ lọc hiện tại.</td></tr>
                  ) : filteredOrders.map((order, index) => {
                    const isEditing = editingRowId === order.id;
                    const isSelected = selectedRowId === order.id;

                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedRowId(order.id)} 
                        className={`transition-colors border-b border-gray-50 cursor-default ${
                          isEditing ? 'bg-yellow-50' : 
                          isSelected ? 'bg-indigo-50/70' : 'hover:bg-blue-50/40'
                        }`}
                      >
                        <td className="px-2 py-2 text-center text-gray-400 border-r border-gray-100">{index + 1}</td>
                        
                        {isEditing ? (
                          <>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['orderDate'] = el; }} type="date" value={editFormData.orderDate || ''} onChange={e => setEditFormData({...editFormData, orderDate: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['source'] = el; }} type="text" value={editFormData.source || ''} onChange={e => setEditFormData({...editFormData, source: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Nguồn" /></td>
                            {activeSheet === 'Bảng chung' && (
                              <td className="px-1 py-1 border-r border-gray-100">
                                <select ref={el => { if(el) inputRefs.current['sheetName'] = el; }} value={editFormData.sheetName || ''} onChange={e => setEditFormData({...editFormData, sheetName: e.target.value})} className="w-full border border-purple-300 rounded p-1.5 text-xs font-medium text-purple-700 outline-none bg-purple-50">
                                  {combinedSheets.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                            )}
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['customerInfo'] = el; }} type="text" value={editFormData.customerInfo || ''} onChange={e => setEditFormData({...editFormData, customerInfo: e.target.value})} className="w-full border border-blue-500 rounded p-1.5 text-xs outline-none" placeholder="Tên - SĐT *"/></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['address'] = el; }} type="text" value={editFormData.address || ''} onChange={e => setEditFormData({...editFormData, address: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Địa chỉ"/></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['productName'] = el; }} type="text" value={editFormData.productName || ''} onChange={e => setEditFormData({...editFormData, productName: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Tên SP"/></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['quantity'] = el; }} type="number" value={editFormData.quantity || 0} onChange={e => setEditFormData({...editFormData, quantity: Number(e.target.value)})} className="w-full border border-gray-300 rounded p-1.5 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['price'] = el; }} type="number" value={editFormData.price || 0} onChange={e => setEditFormData({...editFormData, price: Number(e.target.value)})} className="w-full border border-gray-300 rounded p-1.5 text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input type="number" value={editFormData.total || 0} onChange={e => setEditFormData({...editFormData, total: Number(e.target.value)})} className="w-full border border-gray-300 bg-gray-100 rounded p-1.5 text-xs text-right font-bold text-green-700" readOnly title="Tự động tính"/></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['trackingCode'] = el; }} type="text" value={editFormData.trackingCode || ''} onChange={e => setEditFormData({...editFormData, trackingCode: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Mã VĐ"/></td>
                            <td className="px-1 py-1 border-r border-gray-100">
                              <select ref={el => { if(el) inputRefs.current['status'] = el; }} value={editFormData.status || ''} onChange={e => setEditFormData({...editFormData, status: e.target.value})} className="w-full border border-blue-400 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-white font-medium text-blue-800">
                                <option value="">Chọn trạng thái...</option>
                                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['shippingFee'] = el; }} type="number" value={editFormData.shippingFee || 0} onChange={e => setEditFormData({...editFormData, shippingFee: Number(e.target.value)})} className="w-full border border-gray-300 rounded p-1.5 text-xs text-right focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                            <td className="px-1 py-1 border-r border-gray-100"><input ref={el => { if(el) inputRefs.current['notes'] = el; }} type="text" value={editFormData.notes || ''} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ghi chú"/></td>
                          </>
                        ) : (
                          <>
                            <td onDoubleClick={() => startInlineEdit(order, 'orderDate')} className="px-2 py-2 text-gray-700 border-r border-gray-100">{order.orderDate}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'source')} className="px-2 py-2 text-gray-500 truncate max-w-[120px] border-r border-gray-100" title={order.source}>{order.source}</td>
                            {activeSheet === 'Bảng chung' && (
                              <td onDoubleClick={() => startInlineEdit(order, 'sheetName')} className="px-2 py-2 font-semibold text-purple-600 border-r border-gray-100 bg-purple-50/20 cursor-pointer hover:bg-purple-100 transition-colors" title="Click đúp để chuyển đơn sang bảng khác">{order.sheetName || 'Bảng chung'}</td>
                            )}
                            <td onDoubleClick={() => startInlineEdit(order, 'customerInfo')} className="px-2 py-2 font-semibold text-indigo-700 truncate max-w-[200px] border-r border-gray-100" title={order.customerInfo}>{order.customerInfo}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'address')} className="px-2 py-2 text-gray-600 truncate max-w-[250px] border-r border-gray-100" title={order.address}>{order.address}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'productName')} className="px-2 py-2 text-gray-800 font-medium truncate max-w-[200px] border-r border-gray-100" title={order.productName}>{order.productName}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'quantity')} className="px-2 py-2 text-center font-medium border-r border-gray-100">{order.quantity}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'price')} className="px-2 py-2 text-right text-gray-600 border-r border-gray-100">{formatMoney(order.price)}</td>
                            <td className="px-2 py-2 text-right font-bold text-green-600 bg-green-50/50 border-r border-green-100">{formatMoney(order.total)}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'trackingCode')} className="px-2 py-2 font-mono text-blue-600 border-r border-gray-100">{order.trackingCode}</td>
                            
                            <td 
                              onClick={(e) => { e.stopPropagation(); setSelectedRowId(order.id); startInlineEdit(order, 'status'); }} 
                              className="px-2 py-2 border-r border-gray-100 cursor-pointer hover:bg-blue-100 transition-colors"
                              title="Click để đổi trạng thái"
                            >
                              <span className={`px-2 py-1 text-[11px] font-medium rounded-full border ${
                                order.status === 'Phát thành công' ? 'bg-green-50 text-green-700 border-green-200' :
                                order.status === 'Đang hoàn' || order.status === 'Hủy' ? 'bg-red-50 text-red-700 border-red-200' :
                                order.status === 'Đang giao hàng' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-gray-50 text-gray-600 border-gray-200'
                              }`}>
                                {order.status || 'Chưa xử lý'}
                              </span>
                            </td>
                            
                            <td onDoubleClick={() => startInlineEdit(order, 'shippingFee')} className="px-2 py-2 text-right text-gray-500 border-r border-gray-100">{formatMoney(order.shippingFee)}</td>
                            <td onDoubleClick={() => startInlineEdit(order, 'notes')} className="px-2 py-2 text-gray-500 truncate max-w-[200px] border-r border-gray-100" title={order.notes}>{order.notes}</td>
                          </>
                        )}

                        {(canEdit || canDelete) && (
                          <td className={`px-2 py-2 text-center sticky right-0 shadow-[-5px_0_10px_rgba(0,0,0,0.03)] border-l border-gray-200 ${isEditing ? 'bg-yellow-50' : isSelected ? 'bg-indigo-50/90' : 'bg-white'}`}>
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={(e) => { e.stopPropagation(); saveInlineEdit(); }} disabled={isSavingEdit} className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-sm" title="Lưu lại"><Check className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); cancelInlineEdit(); }} className="p-1.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg" title="Hủy"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                {canEdit && <button onClick={(e) => { e.stopPropagation(); startInlineEdit(order, 'customerInfo'); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Chỉnh sửa"><Edit2 className="w-4 h-4" /></button>}
                                {canDelete && <button onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Xóa"><Trash2 className="w-4 h-4" /></button>}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL THÊM ĐƠN HÀNG MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <Plus className="w-6 h-6 text-indigo-600" /> Thêm Đơn Mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-full shadow-sm hover:bg-red-50 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Chỉ ADMIN và MANAGER mới được chọn Bảng khi lưu */}
                {canManage && (
                  <div className="lg:col-span-4 bg-purple-50 p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                    <label className="text-sm font-semibold text-purple-800 shrink-0">Lưu vào bảng:</label>
                    <select value={addFormData.sheetName} onChange={e => setAddFormData({...addFormData, sheetName: e.target.value})} className="border border-purple-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none text-purple-900 font-medium">
                      {combinedSheets.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Khách hàng (Tên & SĐT) <span className="text-red-500">*</span></label>
                  <input type="text" autoFocus value={addFormData.customerInfo} onChange={e => setAddFormData({...addFormData, customerInfo: e.target.value})} placeholder="VD: Anh Nam - 0987654321" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Địa chỉ giao hàng</label>
                  <input type="text" value={addFormData.address} onChange={e => setAddFormData({...addFormData, address: e.target.value})} placeholder="Số nhà, đường, xã, huyện, tỉnh..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên Sản phẩm</label>
                  <input type="text" value={addFormData.productName} onChange={e => setAddFormData({...addFormData, productName: e.target.value})} placeholder="Bơm 12v, Bếp..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số lượng</label>
                  <input type="number" value={addFormData.quantity || ''} onChange={e => setAddFormData({...addFormData, quantity: Number(e.target.value)})} min="1" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-center" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Đơn giá (VNĐ)</label>
                  <input type="number" value={addFormData.price || ''} onChange={e => setAddFormData({...addFormData, price: Number(e.target.value)})} placeholder="0" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-right" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-700 mb-1.5">Tổng tiền (Tự tính)</label>
                  <input type="text" value={formatMoney(addFormData.total)} readOnly className="w-full border border-green-300 bg-green-50 text-green-700 font-bold rounded-xl px-4 py-2.5 outline-none shadow-inner text-right" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày lên đơn</label>
                  <input type="date" value={addFormData.orderDate} onChange={e => setAddFormData({...addFormData, orderDate: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mã Vận Đơn</label>
                  <input type="text" value={addFormData.trackingCode} onChange={e => setAddFormData({...addFormData, trackingCode: e.target.value})} placeholder="VD: VN123456" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-mono uppercase transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trạng thái</label>
                  <select value={addFormData.status} onChange={e => setAddFormData({...addFormData, status: e.target.value})} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm bg-white font-medium text-gray-700 transition-all">
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nguồn Đơn</label>
                  <input type="text" value={addFormData.source} onChange={e => setAddFormData({...addFormData, source: e.target.value})} placeholder="Page ABC..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phí Vận Chuyển</label>
                  <input type="number" value={addFormData.shippingFee || ''} onChange={e => setAddFormData({...addFormData, shippingFee: Number(e.target.value)})} placeholder="0" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-right" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú thêm</label>
                  <input type="text" value={addFormData.notes} onChange={e => setAddFormData({...addFormData, notes: e.target.value})} placeholder="Nhắc shipper giao giờ hành chính..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" />
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-sm">
                Hủy Bỏ
              </button>
              <button onClick={handleSaveAdd} disabled={isSavingAdd || !addFormData.customerInfo.trim()} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all">
                {isSavingAdd ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Lưu Đơn Hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
