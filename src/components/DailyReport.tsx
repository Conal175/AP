import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Plus, Edit2, Trash2, ChevronDown, ChevronRight, 
  TrendingUp, AlertTriangle, Zap, X, Save, DollarSign, Eye,
  MousePointer, MessageCircle, ShoppingCart, Receipt, BarChart3,
  Link as LinkIcon, ExternalLink, Loader2, Download, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DailyLog } from '../types';
import { fetchDailyLogs, insertDailyLog, updateDailyLog, deleteDailyLog } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { calculateCTR, calculateCPA, calculateCPO, calculateCR, formatCurrency, formatPercent } from '../utils/metrics';
import { toast } from './ui/Toast';

interface DailyReportProps {
  projectId: string;
}

// =========================================================
// SMART AUTO COLUMN MAPPING
// Hỗ trợ tiếng Việt, tiếng Anh, và các format xuất file phổ biến:
// Facebook Ads Manager, Google Ads, file nội bộ, v.v.
// =========================================================
const COLUMN_KEYWORDS: Record<keyof Omit<DailyLog, 'id' | 'projectId' | 'day' | 'month' | 'year'>, string[]> = {
  adName: [
    'ten bai', 'tenb', 'campaign name', 'ad name', 'ad set name', 'tên bài', 'tên quảng cáo', 'ten qc',
    'tiêu đề', 'name', 'tiêu đề qc', 'campaign', 'ad', 'bai qc', 'bài qc', 'quảng cáo'
  ],
  adLink: [
    'link', 'url', 'link qc', 'link bài', 'ad url', 'permalink', 'đường dẫn', 'link quảng cáo'
  ],
  spend: [
    'spend', 'chi phi', 'chi phí', 'ngân sách', 'ngan sach', 'amount spent', 'cost',
    'tiền chi', 'budget', 'chi tieu', 'chi tiêu', 'tiền quảng cáo'
  ],
  impressions: [
    'impres', 'hiển thị', 'hien thi', 'lượt hiển', 'reach', 'views', 'lượt xem',
    'luot hien', 'luot xem', 'lượt hiển thị'
  ],
  clicks: [
    'click', 'nhấp', 'nhap', 'lượt nhấp', 'link click', 'luot nhap',
    'outbound click', 'post click', 'cú nhấp'
  ],
  messages: [
    'message', 'msg', 'tin nhắn', 'tin nhan', 'conversation', 'inbox',
    'new message', 'messaging', 'lượt nhắn'
  ],
  orders: [
    'đơn', 'don hang', 'don', 'order', 'purchase', 'result',
    'checkout', 'sale', 'conversion', 'so don', 'số đơn', 'đơn hàng'
  ],
  revenue: [
    'doanh thu', 'revenue', 'value', 'purchase value', 'conversion value',
    'income', 'tiền về', 'thu', 'dt'
  ],
  issues: [
    'vấn đề', 'van de', 'issue', 'problem', 'lỗi', 'lưu ý', 'luu y', 'note', 'ghi chu'
  ],
  optimizations: [
    'hành động', 'hanh dong', 'optim', 'tối ưu', 'toi uu', 'action',
    'suggestion', 'ghi chú', 'note', 'fix', 'solution', 'giải pháp'
  ],
};

/** 
 * Tìm cột nào trong headers có từ khóa khớp với field.
 * So sánh lowercase + loại bỏ ký tự đặc biệt. 
 */
function autoDetectColumn(headers: string[], keywords: string[]): string | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ỹ ]/gi, ' ').replace(/\s+/g, ' ').trim();
  for (const header of headers) {
    const norm = normalize(header);
    if (keywords.some(kw => norm.includes(normalize(kw)))) {
      return header;
    }
  }
  return null;
}

/** 
 * Tự động xây dựng bản đồ từ headers của file Excel.
 * Trả về đối tượng { fieldName: 'Tên cột trong file' | null } 
 */
function buildColumnMap(headers: string[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
    map[field] = autoDetectColumn(headers, keywords);
  }
  return map;
}

const DailyReport: React.FC<DailyReportProps> = ({ projectId }) => {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { checkPermission } = useAuth(); 
  const canEdit = checkPermission('daily_report', 'edit');
  const canDelete = checkPermission('daily_report', 'delete');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedDays, setExpandedDays] = useState<number[]>([new Date().getDate()]);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isAdding, setIsAdding] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    adName: '', adLink: '', spend: 0, impressions: 0, clicks: 0,
    messages: 0, orders: 0, revenue: 0, issues: '', optimizations: ''
  });

  useEffect(() => {
    loadLogs();
  }, [projectId]);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchDailyLogs(projectId);
    setLogs(data);
    setLoading(false);
  };

  const getLogsForDay = (day: number) => {
    return logs.filter(l => l.day === day && l.month === selectedMonth && l.year === selectedYear);
  };

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  };

  const toggleDay = (day: number) => {
    if (expandedDays.includes(day)) {
      setExpandedDays(expandedDays.filter(d => d !== day));
    } else {
      setExpandedDays([...expandedDays, day]);
    }
  };



  const resetForm = () => {
    setFormData({
      adName: '', adLink: '', spend: 0, impressions: 0, clicks: 0,
      messages: 0, orders: 0, revenue: 0, issues: '', optimizations: ''
    });
  };

  const handleAddLog = (day: number) => {
    if (!canEdit) return;
    setIsAdding(day);
    setEditingLog(null);
    resetForm();
  };

  const handleEditLog = (log: DailyLog) => {
    if (!canEdit) return;
    setEditingLog(log);
    setIsAdding(null);
    setFormData({
      adName: log.adName, adLink: log.adLink || '', spend: log.spend, impressions: log.impressions, clicks: log.clicks,
      messages: log.messages, orders: log.orders, revenue: log.revenue, issues: log.issues, optimizations: log.optimizations
    });
  };

  const handleSave = async (day: number) => {
    if (!formData.adName.trim() || !canEdit || isSaving) return;
    setIsSaving(true);

    if (editingLog) {
      const success = await updateDailyLog(editingLog.id, formData);
      if (success) {
        setLogs(logs.map(l => l.id === editingLog.id ? { ...l, ...formData } : l));
      }
    } else {
      const newLogData = { projectId, day, month: selectedMonth, year: selectedYear, ...formData };
      const insertedLog = await insertDailyLog(newLogData);
      if (insertedLog) {
        setLogs([...logs, insertedLog]);
      }
    }
    
    setIsSaving(false);
    setIsAdding(null);
    setEditingLog(null);
    resetForm();
  };

  const handleDelete = async (logId: string) => {
    if (!canDelete) return;
    if (confirm('Bạn có chắc muốn xóa báo cáo này?')) {
      const success = await deleteDailyLog(logId);
      if (success) {
        setLogs(logs.filter(l => l.id !== logId));
      }
    }
  };

  // ==========================================
  // XỬ LÝ NHẬP / XUẤT EXCEL
  // ==========================================
  const handleExportExcel = () => {
    // Lấy dữ liệu của tháng hiện tại
    const currentMonthLogs = logs.filter(l => l.month === selectedMonth && l.year === selectedYear);
    
    // Tạo cấu trúc dữ liệu cho Excel
    const exportData = currentMonthLogs.map(log => ({
      'Ngày': log.day,
      'Tháng': log.month,
      'Năm': log.year,
      'Tên bài QC': log.adName,
      'Link QC': log.adLink || '',
      'Ngân sách (VNĐ)': log.spend,
      'Hiển thị': log.impressions,
      'Clicks': log.clicks,
      'Tin nhắn': log.messages,
      'Đơn hàng': log.orders,
      'Doanh thu (VNĐ)': log.revenue,
      'Vấn đề phát sinh': log.issues || '',
      'Hành động tối ưu': log.optimizations || ''
    }));

    // Nếu chưa có dữ liệu, tạo một dòng mẫu rỗng để người dùng biết cách điền
    if (exportData.length === 0) {
      exportData.push({
        'Ngày': new Date().getDate(),
        'Tháng': selectedMonth,
        'Năm': selectedYear,
        'Tên bài QC': 'Mẫu bài QC 1',
        'Link QC': 'https://...',
        'Ngân sách (VNĐ)': 0,
        'Hiển thị': 0,
        'Clicks': 0,
        'Tin nhắn': 0,
        'Đơn hàng': 0,
        'Doanh thu (VNĐ)': 0,
        'Vấn đề phát sinh': '',
        'Hành động tối ưu': ''
      });
    }

    // Khởi tạo file Excel và tải xuống
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Thang_${selectedMonth}`);
    XLSX.writeFile(workbook, `Bao_Cao_Thang_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        if (data.length === 0) {
          toast.warning('File Excel trống hoặc không có dữ liệu.');
          return;
        }

        // Lấy danh sách cột từ dòng đầu tiên
        const headers = Object.keys(data[0]);
        
        // Tự động xây dựng column map
        const colMap = buildColumnMap(headers);
        
        // Kiểm tra trường bắt buộc
        if (!colMap.adName) {
          toast.error(
            `Không tìm thấy cột Tên bài QC trong file.\nCác cột hiện có: ${headers.join(', ')}`
          );
          return;
        }

        // Danh sách các trường đã được map thành công
        const mappedFields = Object.entries(colMap)
          .filter(([, col]) => col !== null)
          .map(([field]) => field);
        const skippedFields = Object.entries(colMap)
          .filter(([, col]) => col === null)
          .map(([field]) => field);

        let successCount = 0;
        let skipCount = 0;

        for (const row of data) {
          const rawName = colMap.adName ? row[colMap.adName] : null;
          if (!rawName) { skipCount++; continue; }

          const num = (key: string | null) => key ? Number(row[key]) || 0 : 0;
          const str = (key: string | null) => key && row[key] ? String(row[key]) : '';

          const newLog = {
            projectId,
            day: new Date().getDate(), // Mặc định ngày hôm nay; user có thể sửa sau
            month: selectedMonth,
            year: selectedYear,
            adName: str(colMap.adName),
            adLink: str(colMap.adLink),
            spend: num(colMap.spend),
            impressions: num(colMap.impressions),
            clicks: num(colMap.clicks),
            messages: num(colMap.messages),
            orders: num(colMap.orders),
            revenue: num(colMap.revenue),
            issues: str(colMap.issues),
            optimizations: str(colMap.optimizations),
          };

          await insertDailyLog(newLog);
          successCount++;
        }

        // Thông báo kết quả chi tiết
        if (successCount > 0) {
          const mappedSummary = mappedFields.join(', ');
          const skippedSummary = skippedFields.length > 0 ? ` (Đố sang 0 do không tìm được: ${skippedFields.join(', ')})` : '';
          toast.success(`Nhập ${successCount} báo cáo thành công! Cột đã map: ${mappedSummary}.${skippedSummary}`, 7000);
        }
        if (skipCount > 0) {
          toast.warning(`Bỏ qua ${skipCount} dòng do không có Tên bài QC.`);
        }

        loadLogs();
      } catch (error) {
        console.error('Lỗi đọc file Excel:', error);
        toast.error('Lỗi đọc file Excel. Kiểm tra lại định dạng file (.xlsx / .xls).');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };



  const getDaySummary = (dayLogs: DailyLog[]) => {
    const totalSpend = dayLogs.reduce((s, l) => s + l.spend, 0);
    const totalImpressions = dayLogs.reduce((s, l) => s + l.impressions, 0);
    const totalClicks = dayLogs.reduce((s, l) => s + l.clicks, 0);
    const totalMessages = dayLogs.reduce((s, l) => s + l.messages, 0);
    const totalOrders = dayLogs.reduce((s, l) => s + l.orders, 0);
    const totalRevenue = dayLogs.reduce((s, l) => s + l.revenue, 0);
    
    return {
      spend: totalSpend, impressions: totalImpressions, clicks: totalClicks, messages: totalMessages, orders: totalOrders, revenue: totalRevenue,
      ctr: calculateCTR(totalClicks, totalImpressions), cpa: calculateCPA(totalSpend, totalMessages), cpo: calculateCPO(totalSpend, totalOrders), cr: calculateCR(totalOrders, totalMessages)
    };
  };

  const monthSummary = getDaySummary(logs.filter(l => l.month === selectedMonth && l.year === selectedYear));
  const uniqueDaysCount = new Set(logs.filter(l => l.month === selectedMonth && l.year === selectedYear).map(l => l.day)).size;

  // So sánh kỳ trước (tháng trước)
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevMonthSummary = getDaySummary(logs.filter(l => l.month === prevMonth && l.year === prevYear));

  // Helper: hiển thị badge so sánh
  const deltaBadge = (current: number, prev: number, lowerIsBetter = false) => {
    if (prev === 0) return null;
    const pct = ((current - prev) / prev * 100).toFixed(1);
    const up = current >= prev;
    const good = lowerIsBetter ? !up : up;
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${good ? 'bg-white/20' : 'bg-black/20'}`}>
        {up ? '▲' : '▼'} {Math.abs(parseFloat(pct))}% vs T{prevMonth}
      </span>
    );
  };

  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Đang tải báo cáo ngày...</p>
      </div>
    );
  }

  const renderFormFields = (colorScheme: 'indigo' | 'amber') => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Tên bài quảng cáo *</label><input type="text" value={formData.adName} onChange={(e) => setFormData({...formData, adName: e.target.value})} placeholder="VD: Camp 1 - Video máy bơm" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1"><LinkIcon className="w-3 h-3 inline mr-1" />Link bài quảng cáo</label><input type="url" value={formData.adLink} onChange={(e) => setFormData({...formData, adLink: e.target.value})} placeholder="https://www.facebook.com/ads/..." className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        
        <div><label className="block text-sm font-medium text-gray-700 mb-1"><DollarSign className="w-3 h-3 inline" /> Ngân sách (Spend)</label><input type="number" value={formData.spend || ''} onChange={(e) => setFormData({...formData, spend: Number(e.target.value)})} placeholder="0" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Eye className="w-3 h-3 inline" /> Lượt hiển thị</label><input type="number" value={formData.impressions || ''} onChange={(e) => setFormData({...formData, impressions: Number(e.target.value)})} placeholder="0" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1"><MousePointer className="w-3 h-3 inline" /> Lượt nhấp (Clicks)</label><input type="number" value={formData.clicks || ''} onChange={(e) => setFormData({...formData, clicks: Number(e.target.value)})} placeholder="0" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1"><MessageCircle className="w-3 h-3 inline" /> Tin nhắn mới</label><input type="number" value={formData.messages || ''} onChange={(e) => setFormData({...formData, messages: Number(e.target.value)})} placeholder="0" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        
        <div><label className="block text-sm font-medium text-gray-700 mb-1"><ShoppingCart className="w-3 h-3 inline" /> Đơn hàng</label><input type="number" value={formData.orders || ''} onChange={(e) => setFormData({...formData, orders: Number(e.target.value)})} placeholder="0" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        
        <div><label className="block text-sm font-medium text-gray-700 mb-1"><Receipt className="w-3 h-3 inline" /> Doanh thu (VNĐ)</label><input type="number" value={formData.revenue || ''} onChange={(e) => setFormData({...formData, revenue: Number(e.target.value)})} placeholder="0" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        
        <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1"><AlertTriangle className="w-3 h-3 inline text-red-500" /> Vấn đề phát sinh</label><textarea value={formData.issues} onChange={(e) => setFormData({...formData, issues: e.target.value})} rows={2} placeholder="VD: Chạy đắt, khách boom hàng..." className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
        <div className="lg:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1"><Zap className="w-3 h-3 inline text-green-500" /> Hành động tối ưu</label><textarea value={formData.optimizations} onChange={(e) => setFormData({...formData, optimizations: e.target.value})} rows={2} placeholder="VD: Đã tắt nhóm tuổi 18-24..." className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-${colorScheme}-500`} /></div>
      </div>
      <div className="mt-3 p-3 bg-white rounded-lg border">
        <div className="text-sm text-gray-600 mb-2 font-medium">📊 Chỉ số tự động tính:</div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><span className="text-gray-500">CTR:</span><span className="ml-2 font-semibold text-purple-600">{formatPercent(calculateCTR(formData.clicks, formData.impressions))}</span></div>
          <div><span className="text-gray-500">CPA:</span><span className="ml-2 font-semibold text-blue-600">{formatCurrency(calculateCPA(formData.spend, formData.messages))}đ</span></div>
          <div><span className="text-gray-500">Tỷ lệ chốt:</span><span className="ml-2 font-semibold text-green-600">{formatPercent(calculateCR(formData.orders, formData.messages))}</span></div>
        </div>
      </div>
    </>
  );

  const renderAdName = (log: DailyLog) => {
    if (log.adLink) {
      return (
        <a href={log.adLink} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 group" title={log.adLink}>
          {log.adName} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      );
    }
    return <span className="font-medium text-gray-800">{log.adName}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="w-7 h-7 text-indigo-600" /> Báo Cáo & Nhật Ký Vận Hành</h2>
          <p className="text-gray-500 mt-1">Theo dõi hiệu quả quảng cáo hàng ngày</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Cụm chức năng Excel */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-xl shadow-sm">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 rounded-lg transition-colors"
              title="Tải xuống file mẫu hoặc dữ liệu tháng này"
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
            
            {canEdit && (
              <>
                <div className="w-px h-5 bg-gray-200 mx-1"></div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Nhập dữ liệu hàng loạt từ file mẫu"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                  {isImporting ? 'Đang tải...' : 'Nhập Excel'}
                </button>
                {/* Input ẩn dùng để mở hộp thoại chọn file */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportExcel} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
              </>
            )}
          </div>

          <div className="h-8 w-px bg-gray-300 hidden md:block"></div>

          {/* Chọn tháng/năm */}
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium">
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-100 text-sm"><DollarSign className="w-4 h-4" /> Chi phí QC</div>
            {deltaBadge(monthSummary.spend, prevMonthSummary.spend, true)}
          </div>
          <div className="text-xl font-bold mt-1">{formatCurrency(monthSummary.spend)}đ</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-100 text-sm"><ShoppingCart className="w-4 h-4" /> Đơn hàng</div>
            {deltaBadge(monthSummary.orders, prevMonthSummary.orders)}
          </div>
          <div className="text-xl font-bold mt-1">{monthSummary.orders}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-100 text-sm"><Eye className="w-4 h-4" /> Hiển thị</div>
            {deltaBadge(monthSummary.impressions, prevMonthSummary.impressions)}
          </div>
          <div className="text-xl font-bold mt-1">{formatCurrency(monthSummary.impressions)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border shadow-sm"><div className="flex items-center gap-2 text-gray-500 text-sm"><MousePointer className="w-4 h-4" /> Clicks</div><div className="text-xl font-bold text-cyan-600 mt-1">{formatCurrency(monthSummary.clicks)}</div></div>
        <div className="bg-white rounded-xl p-4 border shadow-sm"><div className="flex items-center gap-2 text-gray-500 text-sm"><MessageCircle className="w-4 h-4" /> Tin nhắn</div><div className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(monthSummary.messages)}</div></div>
        <div className="bg-white rounded-xl p-4 border shadow-sm"><div className="text-gray-500 text-sm">CTR</div><div className="text-xl font-bold text-purple-600 mt-1">{formatPercent(monthSummary.ctr)}</div></div>
        <div className="bg-white rounded-xl p-4 border shadow-sm"><div className="text-gray-500 text-sm">CPA</div><div className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(monthSummary.cpa)}đ</div></div>
        <div className="bg-white rounded-xl p-4 border shadow-sm"><div className="text-gray-500 text-sm">Tỷ lệ chốt</div><div className="text-xl font-bold text-green-600 mt-1">{formatPercent(monthSummary.cr)}</div></div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => {
          const dayLogs = getLogsForDay(day);
          const isExpanded = expandedDays.includes(day);
          const hasLogs = dayLogs.length > 0;
          const daySummary = hasLogs ? getDaySummary(dayLogs) : null;
          const hasIssues = dayLogs.some(l => l.issues);

          return (
            <div key={day} className={`bg-white rounded-xl border overflow-hidden ${isToday(day) ? 'ring-2 ring-indigo-500' : ''}`}>
              <div onClick={() => toggleDay(day)} className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${hasLogs ? 'bg-gradient-to-r from-indigo-50 to-white hover:from-indigo-100' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className={`w-5 h-5 ${isToday(day) ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={`font-semibold ${isToday(day) ? 'text-indigo-600' : 'text-gray-700'}`}>Ngày {day}</span>
                    {isToday(day) && <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">Hôm nay</span>}
                    {hasLogs && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{dayLogs.length} bài QC</span>}
                    {hasIssues && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Có vấn đề</span>}
                  </div>
                </div>
                {daySummary && (
                  <div className="hidden lg:flex items-center gap-4 text-sm">
                    <span className="text-blue-600 font-medium">{formatCurrency(daySummary.spend)}đ CP</span>
                    <span className="text-green-600">{daySummary.orders} đơn</span>
                    <span className="text-purple-600">{daySummary.messages} msg</span>
                  </div>
                )}
                {canEdit && (
                  <button onClick={(e) => { e.stopPropagation(); handleAddLog(day); }} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ml-2 shrink-0"><Plus className="w-4 h-4" /></button>
                )}
              </div>

              {isExpanded && (
                <div className="border-t">
                  {isAdding === day && canEdit && (
                    <div className="p-4 bg-indigo-50 border-b">
                      <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Thêm báo cáo mới - Ngày {day}</h4>
                      {renderFormFields('indigo')}
                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => { setIsAdding(null); resetForm(); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 inline mr-1" /> Hủy</button>
                        <button onClick={() => handleSave(day)} disabled={!formData.adName.trim() || isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                          {isSaving ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}
                          {isSaving ? 'Đang lưu...' : 'Lưu báo cáo'}
                        </button>
                      </div>
                    </div>
                  )}

                  {editingLog && getLogsForDay(day).some(l => l.id === editingLog.id) && canEdit && (
                    <div className="p-4 bg-amber-50 border-b">
                      <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Sửa báo cáo - {editingLog.adName}</h4>
                      {renderFormFields('amber')}
                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => { setEditingLog(null); resetForm(); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 inline mr-1" /> Hủy</button>
                        <button onClick={() => handleSave(day)} disabled={!formData.adName.trim() || isSaving} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
                          {isSaving ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}
                          {isSaving ? 'Đang lưu...' : 'Cập nhật'}
                        </button>
                      </div>
                    </div>
                  )}

                  {dayLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Bài QC</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">Ngân sách</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">Hiển thị</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">Clicks</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">Tin nhắn</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">Đơn</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">CTR</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">CPA</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">Tỷ lệ chốt</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Vấn đề</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Hành động</th>
                            {(canEdit || canDelete) && (
                              <th className="px-3 py-2 text-center font-semibold text-gray-600 whitespace-nowrap">Thao tác</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {dayLogs.map((log, idx) => (
                            <tr key={log.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50/50`}>
                              <td className="px-3 py-2.5 min-w-[180px]"><div className="flex flex-col">{renderAdName(log)}</div></td>
                              <td className="px-3 py-2.5 text-right text-blue-600 font-medium">{formatCurrency(log.spend)}đ</td>
                              <td className="px-3 py-2.5 text-right text-purple-600">{formatCurrency(log.impressions)}</td>
                              <td className="px-3 py-2.5 text-right text-cyan-600">{formatCurrency(log.clicks)}</td>
                              <td className="px-3 py-2.5 text-right text-amber-600">{log.messages}</td>
                              <td className="px-3 py-2.5 text-right text-green-600 font-medium">{log.orders}</td>
                              <td className="px-3 py-2.5 text-right text-purple-600">{formatPercent(calculateCTR(log.clicks, log.impressions))}</td>
                              <td className="px-3 py-2.5 text-right text-blue-600">{formatCurrency(calculateCPA(log.spend, log.messages))}đ</td>
                              <td className="px-3 py-2.5 text-right text-green-600 font-medium">{formatPercent(calculateCR(log.orders, log.messages))}</td>
                              <td className="px-3 py-2.5 max-w-[150px]">{log.issues && <div className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">{log.issues}</div>}</td>
                              <td className="px-3 py-2.5 max-w-[150px]">{log.optimizations && <div className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">{log.optimizations}</div>}</td>
                              {(canEdit || canDelete) && (
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-center gap-1">
                                    {canEdit && <button onClick={() => handleEditLog(log)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>}
                                    {canDelete && <button onClick={() => handleDelete(log.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                          {dayLogs.length > 1 && daySummary && (
                            <tr className="bg-indigo-50 font-semibold">
                              <td className="px-3 py-2 text-indigo-800">📊 Tổng ngày {day}</td>
                              <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(daySummary.spend)}đ</td>
                              <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(daySummary.impressions)}</td>
                              <td className="px-3 py-2 text-right text-cyan-700">{formatCurrency(daySummary.clicks)}</td>
                              <td className="px-3 py-2 text-right text-amber-700">{daySummary.messages}</td>
                              <td className="px-3 py-2 text-right text-green-700">{daySummary.orders}</td>
                              <td className="px-3 py-2 text-right text-purple-700">{formatPercent(daySummary.ctr)}</td>
                              <td className="px-3 py-2 text-right text-blue-700">{formatCurrency(daySummary.cpa)}đ</td>
                              <td className="px-3 py-2 text-right text-green-700">{formatPercent(daySummary.cr)}</td>
                              <td colSpan={(canEdit || canDelete) ? 3 : 2}></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    isAdding !== day && (
                      <div className="p-8 text-center text-gray-400">
                        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Chưa có báo cáo cho ngày này</p>
                        {canEdit && (
                          <button onClick={() => handleAddLog(day)} className="mt-2 text-indigo-600 font-medium">+ Thêm báo cáo đầu tiên</button>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4">📊 Tổng kết Tháng {selectedMonth}/{selectedYear}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><div className="text-indigo-200 text-sm">Ngày có báo cáo</div><div className="text-2xl font-bold">{uniqueDaysCount} ngày</div></div>
          <div><div className="text-indigo-200 text-sm">Tổng chi tiêu</div><div className="text-2xl font-bold">{formatCurrency(monthSummary.spend)}đ</div></div>
          <div><div className="text-indigo-200 text-sm">Tổng đơn hàng</div><div className="text-2xl font-bold">{monthSummary.orders} đơn</div></div>
        </div>
      </div>
    </div>
  );
};

export default DailyReport;
