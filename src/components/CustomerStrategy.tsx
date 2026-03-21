import { useState } from 'react';
import type { CustomerInfo, PainPoint, FAQ } from '../types';
import { useSyncData } from '../store';
import { v4 as uuid } from 'uuid';
import { Plus, Edit2, Trash2, Users, MessageCircleQuestion, HeartCrack, ArrowLeft, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface Props { projectId: string; onBack: () => void; }

export function CustomerStrategy({ projectId, onBack }: Props) {
  const { data: customerInfos, syncData: setCustomerInfos, loading: load1 } = useSyncData<CustomerInfo>(projectId, 'customerInfos', []);
  const { data: painPoints, syncData: setPainPoints, loading: load2 } = useSyncData<PainPoint>(projectId, 'painPoints', []);
  const { data: faqs, syncData: setFAQs, loading: load3 } = useSyncData<FAQ>(projectId, 'faqs', []);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['info', 'pain', 'faq']));
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showPainForm, setShowPainForm] = useState(false);
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [infoForm, setInfoForm] = useState({ attribute: '', content: '', reason: '' });
  const [painForm, setPainForm] = useState({ painGroup: '', pain: '', solution: '' });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });

  if (load1 || load2 || load3) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" /><p>Đang tải dữ liệu khách hàng...</p></div>
  );

  const toggleSection = (key: string) => {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  };

  const handleSaveInfo = async () => {
    if (!infoForm.attribute.trim()) return;
    if (editingId) await setCustomerInfos(customerInfos.map(c => c.id === editingId ? { ...c, ...infoForm } : c));
    else await setCustomerInfos([...customerInfos, { id: uuid(), projectId, ...infoForm }]);
    setShowInfoForm(false); setEditingId(null); setInfoForm({ attribute: '', content: '', reason: '' });
  };

  const handleSavePain = async () => {
    if (!painForm.painGroup.trim() || !painForm.pain.trim()) return;
    if (editingId) await setPainPoints(painPoints.map(p => p.id === editingId ? { ...p, ...painForm } : p));
    else await setPainPoints([...painPoints, { id: uuid(), projectId, ...painForm }]);
    setShowPainForm(false); setEditingId(null); setPainForm({ painGroup: '', pain: '', solution: '' });
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question.trim()) return;
    if (editingId) await setFAQs(faqs.map(f => f.id === editingId ? { ...f, ...faqForm } : f));
    else await setFAQs([...faqs, { id: uuid(), projectId, ...faqForm }]);
    setShowFaqForm(false); setEditingId(null); setFaqForm({ question: '', answer: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-800">Chân Dung Khách Hàng</h1></div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <button onClick={() => toggleSection('info')} className="w-full flex justify-between px-6 py-4 bg-purple-50">
          <div className="flex items-center gap-3"><Users className="w-5 h-5 text-purple-600" /><span className="font-bold text-purple-800">Bảng 1: Thông tin đối tượng</span></div>
          {expandedSections.has('info') ? <ChevronDown className="w-5 h-5 text-purple-600" /> : <ChevronRight className="w-5 h-5 text-purple-600" />}
        </button>
        {expandedSections.has('info') && (
          <div className="p-4">
            <button onClick={() => setShowInfoForm(true)} className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm flex gap-2"><Plus className="w-4 h-4"/> Thêm</button>
            <table className="w-full text-left"><thead className="border-b"><tr className="text-sm font-bold text-purple-800"><th className="p-3">Thuộc tính</th><th className="p-3">Nội dung</th><th className="p-3">Lý do</th><th className="p-3 text-center">Thao tác</th></tr></thead>
            <tbody>{customerInfos.map(c => (
              <tr key={c.id} className="border-b hover:bg-purple-50/30">
                <td className="p-3 font-medium">{c.attribute}</td><td className="p-3 text-sm">{c.content}</td><td className="p-3 text-sm">{c.reason}</td>
                <td className="p-3 text-center">
                  <button onClick={() => {setInfoForm(c); setEditingId(c.id); setShowInfoForm(true)}} className="p-2 text-purple-600"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => confirm('Xóa?') && setCustomerInfos(customerInfos.filter(x => x.id !== c.id))} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}</tbody></table>
          </div>
        )}
      </div>

      {/* Pain Section */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <button onClick={() => toggleSection('pain')} className="w-full flex justify-between px-6 py-4 bg-red-50">
          <div className="flex items-center gap-3"><HeartCrack className="w-5 h-5 text-red-600" /><span className="font-bold text-red-800">Bảng 2: Nỗi đau KH</span></div>
          {expandedSections.has('pain') ? <ChevronDown className="w-5 h-5 text-red-600" /> : <ChevronRight className="w-5 h-5 text-red-600" />}
        </button>
        {expandedSections.has('pain') && (
          <div className="p-4">
            <button onClick={() => setShowPainForm(true)} className="mb-4 bg-red-600 text-white px-4 py-2 rounded-xl text-sm flex gap-2"><Plus className="w-4 h-4"/> Thêm</button>
            <table className="w-full text-left"><thead className="border-b"><tr className="text-sm font-bold text-red-800"><th className="p-3">Nhóm</th><th className="p-3">Nỗi đau</th><th className="p-3 text-green-800">Giải pháp</th><th className="p-3 text-center">Thao tác</th></tr></thead>
            <tbody>{painPoints.map(p => (
              <tr key={p.id} className="border-b hover:bg-red-50/30">
                <td className="p-3 font-medium">{p.painGroup}</td><td className="p-3 text-sm text-red-700">{p.pain}</td><td className="p-3 text-sm text-green-700">{p.solution}</td>
                <td className="p-3 text-center">
                  <button onClick={() => {setPainForm(p); setEditingId(p.id); setShowPainForm(true)}} className="p-2 text-red-600"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => confirm('Xóa?') && setPainPoints(painPoints.filter(x => x.id !== p.id))} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}</tbody></table>
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <button onClick={() => toggleSection('faq')} className="w-full flex justify-between px-6 py-4 bg-indigo-50">
          <div className="flex items-center gap-3"><MessageCircleQuestion className="w-5 h-5 text-indigo-600" /><span className="font-bold text-indigo-800">Bảng 3: FAQ</span></div>
          {expandedSections.has('faq') ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-indigo-600" />}
        </button>
        {expandedSections.has('faq') && (
          <div className="p-4">
            <button onClick={() => setShowFaqForm(true)} className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm flex gap-2"><Plus className="w-4 h-4"/> Thêm</button>
            <table className="w-full text-left"><thead className="border-b"><tr className="text-sm font-bold text-indigo-800"><th className="p-3">Câu hỏi</th><th className="p-3">Trả lời</th><th className="p-3 text-center">Thao tác</th></tr></thead>
            <tbody>{faqs.map(f => (
              <tr key={f.id} className="border-b hover:bg-indigo-50/30">
                <td className="p-3 font-medium">{f.question}</td><td className="p-3 text-sm">{f.answer}</td>
                <td className="p-3 text-center">
                  <button onClick={() => {setFaqForm(f); setEditingId(f.id); setShowFaqForm(true)}} className="p-2 text-indigo-600"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => confirm('Xóa?') && setFAQs(faqs.filter(x => x.id !== f.id))} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}</tbody></table>
          </div>
        )}
      </div>

      {/* Forms Modal (Abridged logic) */}
      {showInfoForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Sửa' : 'Thêm'} Thuộc tính KH</h3>
            <input value={infoForm.attribute} onChange={e => setInfoForm({...infoForm, attribute: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Thuộc tính KH" />
            <textarea value={infoForm.content} onChange={e => setInfoForm({...infoForm, content: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Nội dung" />
            <textarea value={infoForm.reason} onChange={e => setInfoForm({...infoForm, reason: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Lý do" />
            <div className="flex gap-2"><button onClick={handleSaveInfo} className="bg-purple-600 text-white px-4 py-2 rounded-xl">Lưu</button><button onClick={() => setShowInfoForm(false)} className="bg-gray-100 px-4 py-2 rounded-xl">Hủy</button></div>
          </div>
        </div>
      )}

      {showPainForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Sửa' : 'Thêm'} Nỗi đau</h3>
            <input value={painForm.painGroup} onChange={e => setPainForm({...painForm, painGroup: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Nhóm nỗi đau" />
            <textarea value={painForm.pain} onChange={e => setPainForm({...painForm, pain: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Nỗi đau" />
            <textarea value={painForm.solution} onChange={e => setPainForm({...painForm, solution: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Giải pháp" />
            <div className="flex gap-2"><button onClick={handleSavePain} className="bg-red-600 text-white px-4 py-2 rounded-xl">Lưu</button><button onClick={() => setShowPainForm(false)} className="bg-gray-100 px-4 py-2 rounded-xl">Hủy</button></div>
          </div>
        </div>
      )}

      {showFaqForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold mb-4">{editingId ? 'Sửa' : 'Thêm'} FAQ</h3>
            <textarea value={faqForm.question} onChange={e => setFaqForm({...faqForm, question: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Câu hỏi" />
            <textarea value={faqForm.answer} onChange={e => setFaqForm({...faqForm, answer: e.target.value})} className="w-full border p-3 rounded-xl mb-3" placeholder="Trả lời" />
            <div className="flex gap-2"><button onClick={handleSaveFaq} className="bg-indigo-600 text-white px-4 py-2 rounded-xl">Lưu</button><button onClick={() => setShowFaqForm(false)} className="bg-gray-100 px-4 py-2 rounded-xl">Hủy</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
