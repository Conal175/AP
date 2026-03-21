import React, { useState, useMemo, useEffect } from 'react';
import type { Project, DailyLog, ActionPhase } from '../types';
import { useSyncData, fetchDailyLogs } from '../store';
import { calculateCTR, calculateCPA, calculateCPO, calculateCR } from '../utils/metrics';
import { 
  TrendingUp, 
  BarChart3, 
  MessageSquare, 
  ShoppingCart, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Rocket,
  Calendar,
  Eye,
  MousePointer,
  Receipt,
  DollarSign,
  Loader2,
  Filter
} from 'lucide-react';

interface Props {
  project: Project;
}


export function Dashboard({ project }: Props) {
  // FIX: Dùng fetchDailyLogs (bảng daily_logs) thay vì useSyncData sai bảng
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const { data: actionPlan, loading: planLoading } = useSyncData<ActionPhase>(project.id, 'actionPhases', []);

  useEffect(() => {
    let mounted = true;
    setLogsLoading(true);
    fetchDailyLogs(project.id).then(data => {
      if (mounted) {
        setLogs(data);
        setLogsLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [project.id]);

  // State cho bộ lọc thời gian (Mặc định: Từ đầu tháng đến hiện tại)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // F5: KPI Targets — persisted per project in localStorage
  const storageKey = `kpiTargets_${project.id}`;
  const [kpiTargets, setKpiTargets] = useState<{ spend: number; orders: number; messages: number; revenue: number }>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });
  const [showTargetEdit, setShowTargetEdit] = useState(false);
  const [targetDraft, setTargetDraft] = useState({ ...kpiTargets });

  const saveTargets = () => {
    localStorage.setItem(storageKey, JSON.stringify(targetDraft));
    setKpiTargets(targetDraft);
    setShowTargetEdit(false);
  };

  const progressBar = (actual: number, target: number) => {
    if (!target) return null;
    const pct = Math.min(100, Math.round(actual / target * 100));
    const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Thực tế: {actual.toLocaleString('vi-VN')}</span>
          <span className={pct >= 80 ? 'text-green-600 font-bold' : pct >= 50 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-gray-400 mt-1">Mục tiêu: {target.toLocaleString('vi-VN')}</div>
      </div>
    );
  };

  // Lọc logs dựa trên khoảng thời gian
  const filteredLogs = useMemo(() => {
    if (!startDate || !endDate) return logs;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return logs.filter(log => {
      const logDate = new Date(log.year, log.month - 1, log.day);
      return logDate >= start && logDate <= end;
    });
  }, [logs, startDate, endDate]);

  if (logsLoading || planLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>Đang tải dữ liệu tổng quan dự án...</p>
      </div>
    );
  }

  // Task Stats (Giữ nguyên toàn bộ project)
  const allTasks = actionPlan.flatMap(phase => phase.subPhases.flatMap(sp => sp.tasks));
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // KPI Stats (Tính trên filteredLogs)
  const totalSpend = filteredLogs.reduce((s, l) => s + (l.spend || 0), 0);
  const totalImpressions = filteredLogs.reduce((s, l) => s + (l.impressions || 0), 0);
  const totalClicks = filteredLogs.reduce((s, l) => s + (l.clicks || 0), 0);
  const totalMessages = filteredLogs.reduce((s, l) => s + (l.messages || 0), 0);
  const totalOrders = filteredLogs.reduce((s, l) => s + (l.orders || 0), 0);
  const totalRevenue = filteredLogs.reduce((s, l) => s + (l.revenue || 0), 0);

  const avgCTR = calculateCTR(totalClicks, totalImpressions);
  const avgCPA = calculateCPA(totalSpend, totalMessages);
  const avgCPO = calculateCPO(totalSpend, totalOrders);
  const avgCloseRate = calculateCR(totalOrders, totalMessages);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const createdDate = new Date(project.createdAt);
  const now = new Date();
  const daysSinceCreated = Math.max(0, Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="w-8 h-8 text-yellow-300" />
              <h1 className="text-3xl font-bold">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-blue-100 text-lg mb-6 max-w-3xl">{project.description}</p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-pink-300" />
              <div>
                <p className="text-blue-200 text-sm">Ngày Tạo Dự Án</p>
                <p className="text-xl font-bold">{createdDate.toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-300" />
              <div>
                <p className="text-blue-200 text-sm">Đã Hoạt Động</p>
                <p className="text-xl font-bold">{daysSinceCreated} ngày</p>
              </div>
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-yellow-300" />
              <div>
                <p className="text-blue-200 text-sm">Tổng Số Báo Cáo</p>
                <p className="text-xl font-bold">{logs.length} ngày</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BỘ LỌC THỜI GIAN */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold">
          <Filter className="w-5 h-5" />
          <span>Lọc chỉ số quảng cáo theo khoảng thời gian:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Từ</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Đến</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="ml-auto text-sm text-gray-500">
            Tìm thấy <strong className="text-indigo-600">{filteredLogs.length}</strong> báo cáo
          </div>
        </div>
      </div>

      {/* F5: KPI Targets */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Mục Tiêu KPI Tháng
          </h3>
          <button onClick={() => { setTargetDraft({ ...kpiTargets }); setShowTargetEdit(!showTargetEdit); }}
            className="text-sm px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100">
            {showTargetEdit ? 'Hủy' : '✏ Chỉnh mục tiêu'}
          </button>
        </div>
        {showTargetEdit && (
          <div className="mb-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {(['spend','orders','messages','revenue'] as const).map(k => (
                <div key={k}>
                  <label className="text-xs font-medium text-gray-600 capitalize block mb-1">
                    {k === 'spend' ? 'Chi phí (VNĐ)' : k === 'orders' ? 'Đơn hàng' : k === 'messages' ? 'Tin nhắn' : 'Doanh thu (VNĐ)'}
                  </label>
                  <input type="number" value={targetDraft[k] || ''} placeholder="0"
                    onChange={e => setTargetDraft(d => ({ ...d, [k]: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              ))}
            </div>
            <button onClick={saveTargets} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Lưu mục tiêu</button>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-700">Chi phí QC</p>
            <p className="text-xl font-bold text-blue-900 mt-1">{totalSpend.toLocaleString('vi-VN')}đ</p>
            {progressBar(totalSpend, kpiTargets.spend || 0)}
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm font-medium text-green-700">Đơn hàng</p>
            <p className="text-xl font-bold text-green-900 mt-1">{totalOrders}</p>
            {progressBar(totalOrders, kpiTargets.orders || 0)}
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm font-medium text-purple-700">Tin nhắn</p>
            <p className="text-xl font-bold text-purple-900 mt-1">{totalMessages}</p>
            {progressBar(totalMessages, kpiTargets.messages || 0)}
          </div>
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-700">Doanh thu</p>
            <p className="text-xl font-bold text-emerald-900 mt-1">{totalRevenue.toLocaleString('vi-VN')}đ</p>
            {progressBar(totalRevenue, kpiTargets.revenue || 0)}
          </div>
        </div>
      </div>

      {/* TOP 3 KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Receipt className="w-8 h-8 text-emerald-200" />
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">DOANH SỐ</span>
          </div>
          <p className="text-3xl font-extrabold mt-2">{totalRevenue.toLocaleString('vi-VN')}đ</p>
          <p className="text-emerald-100 text-sm mt-1">Doanh thu tạm tính</p>
          {roas > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 text-sm">
              <span className="text-emerald-200">ROAS: </span>
              <span className="font-bold text-lg">{roas.toFixed(2)}x</span>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-blue-200" />
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">CHI PHÍ QC</span>
          </div>
          <p className="text-3xl font-extrabold mt-2">{totalSpend.toLocaleString('vi-VN')}đ</p>
          <p className="text-blue-100 text-sm mt-1">Tổng chi phí quảng cáo</p>
          {totalMessages > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 text-sm">
              <span className="text-blue-200">CPA: </span>
              <span className="font-bold text-lg">{Math.round(avgCPA).toLocaleString('vi-VN')}đ</span>
              <span className="text-blue-200 ml-1">/tin nhắn</span>
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-8 h-8 text-amber-200" />
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">CPO</span>
          </div>
          <p className="text-3xl font-extrabold mt-2">{Math.round(avgCPO).toLocaleString('vi-VN')}đ</p>
          <p className="text-amber-100 text-sm mt-1">Chi phí trên 1 đơn</p>
          <div className="mt-3 pt-3 border-t border-white/20 text-sm">
            <span className="text-amber-200">Tổng đơn: </span>
            <span className="font-bold text-lg">{totalOrders}</span>
            <span className="text-amber-200 ml-1">đơn hàng</span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <Eye className="w-6 h-6 text-purple-500" />
            <span className="text-xs font-medium text-purple-500 bg-purple-50 px-2 py-1 rounded-full">Hiển thị</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalImpressions.toLocaleString('vi-VN')}</p>
          <p className="text-sm text-gray-500 mt-1">Lượt hiển thị</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <MousePointer className="w-6 h-6 text-cyan-500" />
            <span className="text-xs font-medium text-cyan-500 bg-cyan-50 px-2 py-1 rounded-full">Clicks</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalClicks.toLocaleString('vi-VN')}</p>
          <p className="text-sm text-gray-500 mt-1">Lượt nhấp</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Tin nhắn</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{totalMessages.toLocaleString('vi-VN')}</p>
          <p className="text-sm text-gray-500 mt-1">Tổng tin nhắn</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-6 h-6 text-purple-500" />
            <span className="text-xs font-medium text-purple-500 bg-purple-50 px-2 py-1 rounded-full">CTR</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{avgCTR.toFixed(2)}%</p>
          <p className="text-sm text-gray-500 mt-1">Click-Through Rate</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="text-xs font-medium text-green-500 bg-green-50 px-2 py-1 rounded-full">Tỷ lệ chốt</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{avgCloseRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">Đơn/Tin nhắn</p>
        </div>
      </div>

      {/* Task Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-indigo-500" />
          Tổng Quan Action Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-800">{totalTasks}</p>
            <p className="text-sm text-gray-500">Tổng công việc</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{doneTasks}</p>
            <p className="text-sm text-gray-500">Hoàn thành</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{inProgressTasks}</p>
            <p className="text-sm text-gray-500">Đang làm</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{pendingTasks}</p>
            <p className="text-sm text-gray-500">Chờ xử lý</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-gradient-to-r from-indigo-400 to-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-sm text-gray-500 mt-2 text-right">{progress}% hoàn thành</p>
      </div>

      {/* Phase Progress */}
      {actionPlan.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Tiến Độ Theo Giai Đoạn</h3>
          <div className="space-y-4">
            {actionPlan.map((phase, index) => {
              const phaseTasks = phase.subPhases.flatMap(sp => sp.tasks);
              const phaseTotal = phaseTasks.length;
              const phaseDone = phaseTasks.filter(t => t.status === 'completed').length;
              const phaseProgress = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;
              const colors = ['blue', 'orange', 'green'][index] || 'gray';
              
              return (
                <div key={phase.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{phase.code}. {phase.name}</span>
                    <span className="text-sm text-gray-500">{phaseDone}/{phaseTotal} ({phaseProgress}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        colors === 'blue' ? 'bg-blue-500' : 
                        colors === 'orange' ? 'bg-orange-500' : 
                        'bg-green-500'
                      }`} 
                      style={{ width: `${phaseProgress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Issues */}
      {filteredLogs.filter(l => l.issues).length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Vấn Đề Gần Đây (Trong khoảng thời gian lọc)
          </h3>
          <div className="space-y-3">
            {filteredLogs.filter(l => l.issues).slice(-5).reverse().map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded whitespace-nowrap">
                  Ngày {log.day}/{log.month}
                </span>
                <div className="flex-1">
                  {log.adName && (
                    <p className="text-xs text-gray-500 mb-1">📢 {log.adName}</p>
                  )}
                  <p className="text-sm text-gray-700"><strong>Vấn đề:</strong> {log.issues}</p>
                  {log.optimizations && (
                    <p className="text-sm text-green-700 mt-1"><strong>Hành động:</strong> {log.optimizations}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalTasks === 0 && logs.length === 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Dự án mới được tạo!</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Bắt đầu bằng việc thêm công việc trong <strong>Action Plan</strong>, 
            cập nhật thông tin trong <strong>Chiến Lược</strong>, 
            và ghi nhận hoạt động hàng ngày trong <strong>Báo Cáo</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
