import { useState, useCallback, useMemo } from 'react';
import type { CustomerInfo, PainPoint, FAQ } from '../types';
import { getCustomerInfos, saveCustomerInfos, getPainPoints, savePainPoints, getFAQs, saveFAQs } from '../store';
import { v4 as uuid } from 'uuid';
import {
  Plus, Trash2, Edit3, X, Check, Users, HelpCircle, AlertTriangle,
  ChevronDown, ChevronRight
} from 'lucide-react';

interface Props {
  projectId: string;
  onClose: () => void;
}

const emptyCustInfo = (): Omit<CustomerInfo, 'id' | 'projectId'> => ({
  attribute: '', content: '', reason: ''
});
const emptyPainPoint = (): Omit<PainPoint, 'id' | 'projectId'> => ({
  painGroup: '', pain: '', solution: ''
});
const emptyFaq = (): Omit<FAQ, 'id' | 'projectId'> => ({
  question: '', answer: ''
});

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors";
const textareaCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors resize-none";
const thCls = "px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50/80";
const tdCls = "px-4 py-3 text-sm text-gray-700 border-b border-gray-100 align-top";

export function StrategyCustomer({ projectId, onClose }: Props) {
  const [custInfos, setCustInfos] = useState<CustomerInfo[]>(() => getCustomerInfos(projectId));
  const [painPoints, setPainPoints] = useState<PainPoint[]>(() => getPainPoints(projectId));
  const [faqs, setFaqs] = useState<FAQ[]>(() => getFAQs(projectId));

  // Sub-accordion states
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set(['info', 'pain', 'faq']));
  const toggleSub = (key: string) => {
    const next = new Set(openSubs);
    next.has(key) ? next.delete(key) : next.add(key);
    setOpenSubs(next);
  };

  // Form states
  const [ciForm, setCiForm] = useState(emptyCustInfo());
  const [showCiForm, setShowCiForm] = useState(false);
  const [editingCiId, setEditingCiId] = useState<string | null>(null);

  const [ppForm, setPpForm] = useState(emptyPainPoint());
  const [showPpForm, setShowPpForm] = useState(false);
  const [editingPpId, setEditingPpId] = useState<string | null>(null);

  const [faqForm, setFaqForm] = useState(emptyFaq());
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  const persistCustInfos = useCallback((items: CustomerInfo[]) => {
    setCustInfos(items);
    saveCustomerInfos(projectId, items);
  }, [projectId]);

  const persistPainPoints = useCallback((items: PainPoint[]) => {
    setPainPoints(items);
    savePainPoints(projectId, items);
  }, [projectId]);

  const persistFaqs = useCallback((items: FAQ[]) => {
    setFaqs(items);
    saveFAQs(projectId, items);
  }, [projectId]);

  // Customer Info CRUD
  const addOrUpdateCi = () => {
    if (!ciForm.attribute.trim()) return;
    if (editingCiId) {
      persistCustInfos(custInfos.map(c => c.id === editingCiId ? { ...c, ...ciForm } : c));
      setEditingCiId(null);
    } else {
      persistCustInfos([...custInfos, { id: uuid(), projectId, ...ciForm }]);
    }
    setCiForm(emptyCustInfo());
    setShowCiForm(false);
  };

  const startEditCi = (c: CustomerInfo) => {
    setCiForm({ attribute: c.attribute, content: c.content, reason: c.reason });
    setEditingCiId(c.id);
    setShowCiForm(true);
  };

  const cancelCiForm = () => {
    setShowCiForm(false);
    setEditingCiId(null);
    setCiForm(emptyCustInfo());
  };

  // Pain Point CRUD
  const addOrUpdatePp = () => {
    if (!ppForm.painGroup.trim() && !ppForm.pain.trim()) return;
    if (editingPpId) {
      persistPainPoints(painPoints.map(p => p.id === editingPpId ? { ...p, ...ppForm } : p));
      setEditingPpId(null);
    } else {
      persistPainPoints([...painPoints, { id: uuid(), projectId, ...ppForm }]);
    }
    setPpForm(emptyPainPoint());
    setShowPpForm(false);
  };

  const startEditPp = (p: PainPoint) => {
    setPpForm({ painGroup: p.painGroup, pain: p.pain, solution: p.solution });
    setEditingPpId(p.id);
    setShowPpForm(true);
  };

  const cancelPpForm = () => {
    setShowPpForm(false);
    setEditingPpId(null);
    setPpForm(emptyPainPoint());
  };

  // FAQ CRUD
  const addOrUpdateFaq = () => {
    if (!faqForm.question.trim()) return;
    if (editingFaqId) {
      persistFaqs(faqs.map(f => f.id === editingFaqId ? { ...f, ...faqForm } : f));
      setEditingFaqId(null);
    } else {
      persistFaqs([...faqs, { id: uuid(), projectId, ...faqForm }]);
    }
    setFaqForm(emptyFaq());
    setShowFaqForm(false);
  };

  const startEditFaq = (f: FAQ) => {
    setFaqForm({ question: f.question, answer: f.answer });
    setEditingFaqId(f.id);
    setShowFaqForm(true);
  };

  const cancelFaqForm = () => {
    setShowFaqForm(false);
    setEditingFaqId(null);
    setFaqForm(emptyFaq());
  };

  // Group pain points
  const groupedPains = useMemo(() => {
    const groups: { group: string; items: PainPoint[] }[] = [];
    const groupMap = new Map<string, PainPoint[]>();
    painPoints.forEach(pp => {
      const g = pp.painGroup || 'Chưa phân nhóm';
      if (!groupMap.has(g)) {
        groupMap.set(g, []);
        groups.push({ group: g, items: groupMap.get(g)! });
      }
      groupMap.get(g)!.push(pp);
    });
    return groups;
  }, [painPoints]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors mb-2"
          >
            ← Quay lại danh sách
          </button>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            Chân Dung Khách Hàng
          </h2>
          <p className="text-gray-500 text-sm mt-1 ml-[52px]">Phân tích đối tượng khách hàng mục tiêu</p>
        </div>
      </div>

      {/* Sub-accordion 1: Thông tin khách hàng */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSub('info')}
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-800">Bảng 1: Thông tin về đối tượng khách hàng</h3>
              <p className="text-xs text-gray-500">{custInfos.length} thông tin đã nhập</p>
            </div>
          </div>
          {openSubs.has('info') ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </button>

        {openSubs.has('info') && (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => { setShowCiForm(true); setEditingCiId(null); setCiForm(emptyCustInfo()); }}
                className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2.5 rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm thông tin khách hàng
              </button>
            </div>

            {showCiForm && (
              <div className="mb-6 bg-purple-50/50 rounded-xl p-5 border border-purple-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  {editingCiId ? 'Chỉnh sửa' : 'Thêm mới'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Thông tin về đối tượng KH <span className="text-red-400">*</span></label>
                    <input
                      value={ciForm.attribute}
                      onChange={e => setCiForm({ ...ciForm, attribute: e.target.value })}
                      placeholder="VD: Độ tuổi"
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nội dung</label>
                    <input
                      value={ciForm.content}
                      onChange={e => setCiForm({ ...ciForm, content: e.target.value })}
                      placeholder="VD: 25-45 tuổi"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Lý do</label>
                    <input
                      value={ciForm.reason}
                      onChange={e => setCiForm({ ...ciForm, reason: e.target.value })}
                      placeholder="VD: Nhóm có thu nhập ổn định"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={addOrUpdateCi}
                    className="flex items-center gap-2 bg-purple-500 text-white px-5 py-2.5 rounded-lg hover:bg-purple-600 font-medium"
                  >
                    <Check className="w-4 h-4" /> {editingCiId ? 'Cập nhật' : 'Thêm'}
                  </button>
                  <button
                    onClick={cancelCiForm}
                    className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                </div>
              </div>
            )}

            {custInfos.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr>
                      <th className={`${thCls} w-10`}>#</th>
                      <th className={thCls}>Thông tin về đối tượng KH</th>
                      <th className={thCls}>Nội dung</th>
                      <th className={thCls}>Lý do</th>
                      <th className={`${thCls} w-20 text-center`}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custInfos.map((c, i) => (
                      <tr key={c.id} className={`hover:bg-purple-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className={`${tdCls} font-bold text-purple-600 text-center`}>{i + 1}</td>
                        <td className={`${tdCls} font-medium text-gray-800`}>{c.attribute}</td>
                        <td className={tdCls}><div className="bg-purple-50 rounded-lg px-3 py-2 text-purple-700 text-sm border border-purple-100">{c.content}</div></td>
                        <td className={tdCls}><div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-600 text-sm border border-gray-100">{c.reason}</div></td>
                        <td className={`${tdCls} text-center`}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => startEditCi(c)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Sửa">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => persistCustInfos(custInfos.filter(x => x.id !== c.id))} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Chưa có thông tin khách hàng nào</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-accordion 2: Nỗi đau khách hàng */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSub('pain')}
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-800">Bảng 2: Nỗi đau của khách hàng (Pain Points)</h3>
              <p className="text-xs text-gray-500">{painPoints.length} nỗi đau đã phân tích</p>
            </div>
          </div>
          {openSubs.has('pain') ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </button>

        {openSubs.has('pain') && (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => { setShowPpForm(true); setEditingPpId(null); setPpForm(emptyPainPoint()); }}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm nỗi đau
              </button>
            </div>

            {showPpForm && (
              <div className="mb-6 bg-red-50/50 rounded-xl p-5 border border-red-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  {editingPpId ? 'Chỉnh sửa' : 'Thêm mới'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nhóm nỗi đau</label>
                    <input
                      value={ppForm.painGroup}
                      onChange={e => setPpForm({ ...ppForm, painGroup: e.target.value })}
                      placeholder="VD: Vấn đề kỹ thuật"
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nỗi đau của khách hàng <span className="text-red-400">*</span></label>
                    <input
                      value={ppForm.pain}
                      onChange={e => setPpForm({ ...ppForm, pain: e.target.value })}
                      placeholder="VD: Máy bơm hay bị hỏng"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Giải pháp</label>
                    <input
                      value={ppForm.solution}
                      onChange={e => setPpForm({ ...ppForm, solution: e.target.value })}
                      placeholder="VD: Bảo hành 24 tháng"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={addOrUpdatePp}
                    className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-lg hover:bg-red-600 font-medium"
                  >
                    <Check className="w-4 h-4" /> {editingPpId ? 'Cập nhật' : 'Thêm'}
                  </button>
                  <button
                    onClick={cancelPpForm}
                    className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                </div>
              </div>
            )}

            {groupedPains.length > 0 ? (
              <div className="space-y-4">
                {groupedPains.map((group, groupIdx) => (
                  <div key={groupIdx} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 border-b border-gray-200">
                      <span className="font-semibold text-red-700 text-sm">Nhóm: {group.group}</span>
                      <span className="ml-2 text-xs text-red-500">({group.items.length} nỗi đau)</span>
                    </div>
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr>
                          <th className={`${thCls} w-10`}>#</th>
                          <th className={thCls}>Nỗi đau của khách hàng</th>
                          <th className={thCls}>Giải pháp</th>
                          <th className={`${thCls} w-20 text-center`}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((pp, i) => (
                          <tr key={pp.id} className={`hover:bg-red-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className={`${tdCls} font-bold text-red-600 text-center`}>{i + 1}</td>
                            <td className={tdCls}>
                              <div className="bg-red-50 rounded-lg px-3 py-2 text-red-700 text-sm border border-red-100">
                                {pp.pain}
                              </div>
                            </td>
                            <td className={tdCls}>
                              {pp.solution ? (
                                <div className="bg-green-50 rounded-lg px-3 py-2 text-green-700 text-sm border border-green-100">
                                  {pp.solution}
                                </div>
                              ) : <span className="text-gray-300 italic">—</span>}
                            </td>
                            <td className={`${tdCls} text-center`}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => startEditPp(pp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sửa">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => persistPainPoints(painPoints.filter(x => x.id !== pp.id))} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <AlertTriangle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Chưa có nỗi đau nào được phân tích</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-accordion 3: FAQ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSub('faq')}
          className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-gray-800">Bảng 3: Câu hỏi thường gặp (FAQ)</h3>
              <p className="text-xs text-gray-500">{faqs.length} câu hỏi đã nhập</p>
            </div>
          </div>
          {openSubs.has('faq') ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </button>

        {openSubs.has('faq') && (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => { setShowFaqForm(true); setEditingFaqId(null); setFaqForm(emptyFaq()); }}
                className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" /> Thêm FAQ
              </button>
            </div>

            {showFaqForm && (
              <div className="mb-6 bg-indigo-50/50 rounded-xl p-5 border border-indigo-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  {editingFaqId ? 'Chỉnh sửa' : 'Thêm mới'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Câu hỏi thường gặp <span className="text-red-400">*</span></label>
                    <textarea
                      value={faqForm.question}
                      onChange={e => setFaqForm({ ...faqForm, question: e.target.value })}
                      rows={2}
                      placeholder="VD: Máy bơm này có bảo hành không?"
                      className={textareaCls}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Gợi ý trả lời</label>
                    <textarea
                      value={faqForm.answer}
                      onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })}
                      rows={2}
                      placeholder="VD: Dạ có ạ, bên em bảo hành chính hãng 24 tháng, 1 đổi 1 trong 30 ngày đầu..."
                      className={textareaCls}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={addOrUpdateFaq}
                    className="flex items-center gap-2 bg-indigo-500 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-600 font-medium"
                  >
                    <Check className="w-4 h-4" /> {editingFaqId ? 'Cập nhật' : 'Thêm'}
                  </button>
                  <button
                    onClick={cancelFaqForm}
                    className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    <X className="w-4 h-4" /> Hủy
                  </button>
                </div>
              </div>
            )}

            {faqs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr>
                      <th className={`${thCls} w-10`}>#</th>
                      <th className={thCls} style={{ width: '40%' }}>Câu hỏi thường gặp</th>
                      <th className={thCls} style={{ width: '50%' }}>Gợi ý trả lời</th>
                      <th className={`${thCls} w-20 text-center`}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faqs.map((f, i) => (
                      <tr key={f.id} className={`hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className={`${tdCls} font-bold text-indigo-600 text-center`}>{i + 1}</td>
                        <td className={tdCls}>
                          <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                            <span className="font-medium text-gray-800 whitespace-pre-line">{f.question}</span>
                          </div>
                        </td>
                        <td className={tdCls}>
                          {f.answer ? (
                            <div className="bg-indigo-50 rounded-lg px-3 py-2 text-indigo-700 text-sm whitespace-pre-line border border-indigo-100">
                              💬 {f.answer}
                            </div>
                          ) : <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className={`${tdCls} text-center`}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => startEditFaq(f)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => persistFaqs(faqs.filter(x => x.id !== f.id))} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <HelpCircle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Chưa có FAQ nào</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl mx-auto flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xl font-bold text-gray-800">{custInfos.length}</p>
            <p className="text-xs text-gray-500">Thông tin KH</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-red-100 rounded-xl mx-auto flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-xl font-bold text-gray-800">{painPoints.length}</p>
            <p className="text-xs text-gray-500">Nỗi đau</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-indigo-100 rounded-xl mx-auto flex items-center justify-center mb-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-gray-800">{faqs.length}</p>
            <p className="text-xs text-gray-500">FAQ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
