import { useState, useEffect } from 'react';
import type { Project, ActionPhase, ActionSubPhase, ActionTask } from '../types';
import { useSyncData } from '../store';
import {
  ChevronDown, ChevronRight, Plus, Edit3, Trash2, UserPlus,
  CheckCircle2, Clock, AlertCircle, ClipboardList, Loader2
} from 'lucide-react';

interface Props { project: Project; }

const DEFAULT_PHASES: Omit<ActionPhase, 'id'>[] = [
  {
    code: '1', name: 'KHỞI TẠO VÀ LẬP KẾ HOẠCH',
    subPhases: [
      { id: '', code: '1.1', name: 'Nghiên cứu khách hàng', tasks: [] },
      { id: '', code: '1.2', name: 'Nghiên cứu đối thủ', tasks: [] },
      { id: '', code: '1.3', name: 'Lập kế hoạch khung dự án', tasks: [] },
      { id: '', code: '1.4', name: 'Thiết lập các tài khoản', tasks: [] },
      { id: '', code: '1.5', name: 'Phân tích sản phẩm/dịch vụ, đối thủ', tasks: [] },
    ]
  },
  {
    code: '2', name: 'THIẾT KẾ QUẢNG CÁO',
    subPhases: [
      { id: '', code: '2.1', name: 'Tiến hành tối ưu Fanpage', tasks: [] },
      { id: '', code: '2.2', name: 'Sản xuất Media thực tế & Viết Caption', tasks: [] },
      { id: '', code: '2.3', name: 'Đánh giá và kiểm duyệt nội dung kỹ thuật', tasks: [] },
      { id: '', code: '2.4', name: 'Lên kịch bản Seeding (Bình luận mồi)', tasks: [] },
      { id: '', code: '2.5', name: 'Set up đối tượng quảng cáo Facebook', tasks: [] },
      { id: '', code: '2.6', name: 'Thiết lập kịch bản Chatbot', tasks: [] },
    ]
  },
  {
    code: '3', name: 'VẬN HÀNH QUẢNG CÁO',
    subPhases: [
      { id: '', code: '3.1', name: 'Set up và vận hành chiến dịch', tasks: [] },
      { id: '', code: '3.2', name: 'Theo dõi và tối ưu chiến dịch', tasks: [] },
    ]
  }
];

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2); }

function initializePhases(): ActionPhase[] {
  return DEFAULT_PHASES.map(phase => ({
    ...phase, id: generateId(),
    subPhases: phase.subPhases.map(sub => ({ ...sub, id: generateId() }))
  }));
}

const statusConfig = {
  pending: { label: 'Chờ xử lý', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
  in_progress: { label: 'Đang thực hiện', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
};

export default function ActionPlan({ project }: Props) {
  const { data: phases, syncData: setPhases, loading } = useSyncData<ActionPhase>(project.id, 'actionPhases', []);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedSubPhases, setExpandedSubPhases] = useState<Set<string>>(new Set());
  
  const [editingTask, setEditingTask] = useState<{ phaseId: string; subPhaseId: string; task: ActionTask | null } | null>(null);
  const [taskForm, setTaskForm] = useState<Omit<ActionTask, 'id'>>({ name: '', assignee: '', deadline: '', status: 'pending', notes: '' });

  const [editingSubPhase, setEditingSubPhase] = useState<{ phaseId: string; subPhase: ActionSubPhase | null } | null>(null);
  const [subPhaseForm, setSubPhaseForm] = useState({ code: '', name: '' });

  // F4: Overdue filter state
  type OverdueFilter = 'all' | 'overdue' | 'this_week' | 'not_done';
  const [overdueFilter, setOverdueFilter] = useState<OverdueFilter>('all');

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);

  const isOverdueTask = (task: ActionTask) =>
    !!task.deadline && new Date(task.deadline) < now && task.status !== 'completed';
  const isDueThisWeek = (task: ActionTask) =>
    !!task.deadline && new Date(task.deadline) <= endOfWeek && new Date(task.deadline) >= now && task.status !== 'completed';

  const matchesFilter = (task: ActionTask): boolean => {
    switch (overdueFilter) {
      case 'overdue': return isOverdueTask(task);
      case 'this_week': return isDueThisWeek(task);
      case 'not_done': return task.status !== 'completed';
      default: return true;
    }
  };

  useEffect(() => {
    if (!loading) {
      if (phases.length === 0) {
        const initialized = initializePhases();
        setPhases(initialized);
        setExpandedPhases(new Set(initialized.map(p => p.id)));
      } else {
        setExpandedPhases(new Set(phases.map(p => p.id)));
      }
    }
  }, [loading]);

  const togglePhase = (phaseId: string) => {
    const newSet = new Set(expandedPhases);
    newSet.has(phaseId) ? newSet.delete(phaseId) : newSet.add(phaseId);
    setExpandedPhases(newSet);
  };

  const toggleSubPhase = (subPhaseId: string) => {
    const newSet = new Set(expandedSubPhases);
    newSet.has(subPhaseId) ? newSet.delete(subPhaseId) : newSet.add(subPhaseId);
    setExpandedSubPhases(newSet);
  };

  const openAddSubPhase = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    setSubPhaseForm({ code: `${phase.code}.${phase.subPhases.length + 1}`, name: '' });
    setEditingSubPhase({ phaseId, subPhase: null });
  };

  const openEditSubPhase = (phaseId: string, subPhase: ActionSubPhase) => {
    setSubPhaseForm({ code: subPhase.code, name: subPhase.name });
    setEditingSubPhase({ phaseId, subPhase });
  };

  const saveSubPhase = async () => {
    if (!editingSubPhase || !subPhaseForm.name.trim()) return;
    const newPhases = phases.map(phase => {
      if (phase.id !== editingSubPhase.phaseId) return phase;
      if (editingSubPhase.subPhase) {
        return {
          ...phase,
          subPhases: phase.subPhases.map(sub =>
            sub.id === editingSubPhase.subPhase!.id ? { ...sub, code: subPhaseForm.code, name: subPhaseForm.name } : sub
          )
        };
      }
      return { ...phase, subPhases: [...phase.subPhases, { id: generateId(), code: subPhaseForm.code, name: subPhaseForm.name, tasks: [] }] };
    });
    await setPhases(newPhases);
    setEditingSubPhase(null);
  };

  const deleteSubPhase = async (phaseId: string, subPhaseId: string) => {
    if (!confirm('Xóa mục này và tất cả công việc bên trong?')) return;
    await setPhases(phases.map(phase => phase.id === phaseId ? { ...phase, subPhases: phase.subPhases.filter(sub => sub.id !== subPhaseId) } : phase));
  };

  const openAddTask = (phaseId: string, subPhaseId: string) => {
    setTaskForm({ name: '', assignee: '', deadline: '', status: 'pending', notes: '' });
    setEditingTask({ phaseId, subPhaseId, task: null });
  };

  const openEditTask = (phaseId: string, subPhaseId: string, task: ActionTask) => {
    setTaskForm({ name: task.name, assignee: task.assignee, deadline: task.deadline, status: task.status, notes: task.notes });
    setEditingTask({ phaseId, subPhaseId, task });
  };

  const saveTask = async () => {
    if (!editingTask || !taskForm.name.trim()) return;
    const newPhases = phases.map(phase => {
      if (phase.id !== editingTask.phaseId) return phase;
      return {
        ...phase,
        subPhases: phase.subPhases.map(sub => {
          if (sub.id !== editingTask.subPhaseId) return sub;
          if (editingTask.task) {
            return { ...sub, tasks: sub.tasks.map(t => t.id === editingTask.task!.id ? { ...t, ...taskForm } : t) };
          }
          return { ...sub, tasks: [...sub.tasks, { id: generateId(), ...taskForm }] };
        })
      };
    });
    await setPhases(newPhases);
    setEditingTask(null);
  };

  const deleteTask = async (phaseId: string, subPhaseId: string, taskId: string) => {
    if (!confirm('Xóa công việc này?')) return;
    await setPhases(phases.map(phase => phase.id === phaseId ? {
      ...phase, subPhases: phase.subPhases.map(sub => sub.id === subPhaseId ? { ...sub, tasks: sub.tasks.filter(t => t.id !== taskId) } : sub)
    } : phase));
  };

  const toggleTaskStatus = async (phaseId: string, subPhaseId: string, taskId: string) => {
    const statusOrder: ActionTask['status'][] = ['pending', 'in_progress', 'completed'];
    await setPhases(phases.map(phase => phase.id === phaseId ? {
      ...phase, subPhases: phase.subPhases.map(sub => sub.id === subPhaseId ? {
        ...sub, tasks: sub.tasks.map(t => {
          if (t.id !== taskId) return t;
          const nextIdx = (statusOrder.indexOf(t.status) + 1) % statusOrder.length;
          return { ...t, status: statusOrder[nextIdx] };
        })
      } : sub)
    } : phase));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>Đang đồng bộ Kế hoạch hành động...</p>
      </div>
    );
  }

  const stats = phases.reduce((acc, phase) => {
    phase.subPhases.forEach(sub => {
      sub.tasks.forEach(task => {
        acc.total++;
        if (task.status === 'completed') acc.completed++;
        else if (task.status === 'in_progress') acc.inProgress++;
        else acc.pending++;
      });
    });
    return acc;
  }, { total: 0, completed: 0, inProgress: 0, pending: 0 });

  const phaseColors = [
    { bg: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    { bg: 'bg-green-600', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-600" /> Action Plan - Tiến Độ Dự Án
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-gray-600" /></div><div><p className="text-2xl font-bold text-gray-900">{stats.total}</p><p className="text-sm text-gray-500">Tổng công việc</p></div></div></div>
        <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold text-green-600">{stats.completed}</p><p className="text-sm text-gray-500">Hoàn thành</p></div></div></div>
        <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Clock className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p><p className="text-sm text-gray-500">Đang thực hiện</p></div></div></div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-gray-500" /></div><div><p className="text-2xl font-bold text-gray-600">{stats.pending}</p><p className="text-sm text-gray-500">Chờ xử lý</p></div></div></div>
      </div>

      {/* F4: Filter bar - Overdue / This week / Not done */}
      {stats.total > 0 && (() => {
        const allTasks = phases.flatMap(p => p.subPhases.flatMap(s => s.tasks));
        const overdueCount = allTasks.filter(isOverdueTask).length;
        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-1">Lọc công việc:</span>
            {(['all', 'overdue', 'this_week', 'not_done'] as const).map(f => {
              const labels = { all: 'Tất cả', overdue: `🔴 Quá hạn${overdueCount > 0 ? ` (${overdueCount})` : ''}`, this_week: '🟡 Tuần này', not_done: '🔵 Chưa xong' };
              const active = overdueFilter === f;
              return (
                <button key={f} onClick={() => setOverdueFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{labels[f]}</button>
              );
            })}
          </div>
        );
      })()}

      <div className="space-y-4">
        {phases.map((phase, phaseIdx) => {
          const colors = phaseColors[phaseIdx] || phaseColors[0];
          const isExpanded = expandedPhases.has(phase.id);
          const phaseStats = phase.subPhases.reduce((acc, sub) => {
            sub.tasks.forEach(t => { acc.total++; if (t.status === 'completed') acc.completed++; }); return acc;
          }, { total: 0, completed: 0 });

          return (
            <div key={phase.id} className={`bg-white rounded-xl border ${colors.border} shadow-sm overflow-hidden`}>
              <div className={`${colors.bg} text-white px-5 py-4 cursor-pointer flex items-center justify-between`} onClick={() => togglePhase(phase.id)}>
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <span className="font-bold text-lg">{phase.code}. {phase.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{phaseStats.completed}/{phaseStats.total} hoàn thành</span>
                  <button onClick={(e) => { e.stopPropagation(); openAddSubPhase(phase.id); }} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {phase.subPhases.map(subPhase => {
                    const isSubExpanded = expandedSubPhases.has(subPhase.id);
                    const subStats = { total: subPhase.tasks.length, completed: subPhase.tasks.filter(t => t.status === 'completed').length };

                    return (
                      <div key={subPhase.id} className={`${colors.light}`}>
                        <div className="px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-white/50" onClick={() => toggleSubPhase(subPhase.id)}>
                          <div className="flex items-center gap-3">
                            {isSubExpanded ? <ChevronDown className={`w-4 h-4 ${colors.text}`} /> : <ChevronRight className={`w-4 h-4 ${colors.text}`} />}
                            <span className={`font-semibold ${colors.text}`}>{subPhase.code}. {subPhase.name}</span>
                            {subStats.total > 0 && <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-600">{subStats.completed}/{subStats.total}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openAddTask(phase.id, subPhase.id); }} className={`p-1.5 ${colors.text} hover:bg-white rounded-lg`}><UserPlus className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); openEditSubPhase(phase.id, subPhase); }} className="p-1.5 text-gray-500 hover:bg-white rounded-lg"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteSubPhase(phase.id, subPhase.id); }} className="p-1.5 text-red-500 hover:bg-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>

                        {isSubExpanded && (
                          <div className="px-5 pb-4">
                                {subPhase.tasks.filter(matchesFilter).length === 0 && overdueFilter !== 'all' ? (
                                  <div className="bg-white rounded-lg p-4 text-center text-gray-500 border border-dashed">
                                    <p>Không có công việc nào khớp bộ lọc hiện tại.</p>
                                    <button onClick={() => setOverdueFilter('all')} className="mt-2 text-sm text-indigo-600 hover:underline">Xóa bộ lọc</button>
                                  </div>
                                ) : subPhase.tasks.length === 0 ? (
                                  <div className="bg-white rounded-lg p-4 text-center text-gray-500 border border-dashed">
                                    <p>Chưa có công việc nào</p>
                                    <button onClick={() => openAddTask(phase.id, subPhase.id)} className={`mt-2 text-sm ${colors.text} hover:underline`}>+ Thêm công việc</button>
                                  </div>
                                ) : (
                                  <div className="bg-white rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 border-b">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-gray-600">#</th>
                                          <th className="px-4 py-2 text-left text-gray-600">Công việc</th>
                                          <th className="px-4 py-2 text-left text-gray-600">Phân công</th>
                                          <th className="px-4 py-2 text-left text-gray-600">Deadline</th>
                                          <th className="px-4 py-2 text-left text-gray-600">Trạng thái</th>
                                          <th className="px-4 py-2 text-left text-gray-600">Ghi chú</th>
                                          <th className="px-4 py-2 text-center text-gray-600">Thao tác</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {subPhase.tasks.filter(matchesFilter).map((task, idx) => {
                                          const StatusIcon = statusConfig[task.status].icon;
                                          const isOverdue = isOverdueTask(task);
                                          const isDueWeek = isDueThisWeek(task);
                                          
                                          return (
                                            <tr key={task.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isDueWeek ? 'bg-yellow-50' : ''}`}>
                                              <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                                              <td className="px-4 py-2 font-medium">
                                                <div className="flex items-center gap-2">
                                                  {task.name}
                                                  {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">⚠ Quá hạn</span>}
                                                  {isDueWeek && !isOverdue && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold">📅 Tuần này</span>}
                                                </div>
                                              </td>
                                              <td className="px-4 py-2">{task.assignee || <span className="text-gray-400 italic">Chưa có</span>}</td>
                                              <td className={`px-4 py-2 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>{task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '-'}</td>
                                              <td className="px-4 py-2">
                                                <button onClick={() => toggleTaskStatus(phase.id, subPhase.id, task.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig[task.status].color}`}>
                                                  <StatusIcon className="w-3 h-3" /> {statusConfig[task.status].label}
                                                </button>
                                              </td>
                                              <td className="px-4 py-2 text-gray-600">{task.notes}</td>
                                              <td className="px-4 py-2">
                                                <div className="flex items-center justify-center gap-1">
                                                  <button onClick={() => openEditTask(phase.id, subPhase.id, task)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                                                  <button onClick={() => deleteTask(phase.id, subPhase.id, task.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals Add/Edit */}
      {editingSubPhase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingSubPhase.subPhase ? 'Sửa mục' : 'Thêm mục'}</h3>
            <div className="space-y-4">
              <input value={subPhaseForm.code} onChange={(e) => setSubPhaseForm({ ...subPhaseForm, code: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Mã (VD: 1.6)" />
              <input value={subPhaseForm.name} onChange={(e) => setSubPhaseForm({ ...subPhaseForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Tên mục" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingSubPhase(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Hủy</button>
              <button onClick={saveSubPhase} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">{editingTask.task ? 'Sửa công việc' : 'Thêm công việc'}</h3>
            <div className="space-y-4">
              <input value={taskForm.name} onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Tên công việc" />
              <div className="grid grid-cols-2 gap-4">
                <input value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Người thực hiện" />
                <input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as ActionTask['status'] })} className="w-full px-4 py-2 border rounded-lg">
                <option value="pending">Chờ xử lý</option>
                <option value="in_progress">Đang thực hiện</option>
                <option value="completed">Hoàn thành</option>
              </select>
              <textarea value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Ghi chú" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">Hủy</button>
              <button onClick={saveTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
