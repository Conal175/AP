import { useState } from 'react';
import type { Competitor } from '../types';
import { useSyncData } from '../store';
import { v4 as uuid } from 'uuid';
import { Plus, Edit2, Trash2, Swords, ArrowLeft, Loader2 } from 'lucide-react';

interface Props { projectId: string; onBack: () => void; }

export function CompetitorStrategy({ projectId, onBack }: Props) {
  const { data: competitors, syncData: setCompetitors, loading } = useSyncData<Competitor>(projectId, 'competitors', []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ fanpageName: '', adLinks: '', productPrice: '', specs: '', salesPolicy: '', mediaFormat: '', weaknesses: '', strategy: '' });

  const resetForm = () => { 
    setForm({ fanpageName: '', adLinks: '', productPrice: '', specs: '', salesPolicy: '', mediaFormat: '', weaknesses: '', strategy: '' }); 
    setShowForm(false); 
    setEditingId(null); 
  };

  const handleSave = async () => {
    if (!form.fanpageName.trim()) return;
    if (editingId) {
      await setCompetitors(competitors.map(c => c.id === editingId ? { ...c, ...form } : c));
    } else {
      await setCompetitors([...competitors, { id: uuid(), projectId, ...form }]);
    }
    resetForm();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500">
      <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
      <p>Đang tải dữ liệu đối thủ...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center"><Swords className="w-6 h-6 text-white" /></div>
            <h1 className="text-2xl font-bold text-gray-800">Tình Báo Đối Thủ</h1>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 transition-colors"><Plus className="w-5 h-5" /> Thêm đối thủ</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-5">{editingId ? 'Sửa' : 'Thêm'} Đối Thủ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><input value={form.fanpageName} onChange={e => setForm({...form, fanpageName: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Tên Fanpage *" /></div>
              <div><textarea value={form.adLinks} onChange={e => setForm({...form, adLinks: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Link quảng cáo" rows={2}/></div>
              <div><textarea value={form.productPrice} onChange={e => setForm({...form, productPrice: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Sản phẩm & Giá" rows={2}/></div>
              <div><textarea value={form.specs} onChange={e => setForm({...form, specs: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Thông số KT" rows={2}/></div>
              <div><textarea value={form.salesPolicy} onChange={e => setForm({...form, salesPolicy: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Chính sách bán hàng" rows={2}/></div>
              <div><input value={form.mediaFormat} onChange={e => setForm({...form, mediaFormat: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Định dạng Media" /></div>
              <div className="md:col-span-2"><textarea value={form.weaknesses} onChange={e => setForm({...form, weaknesses: e.target.value})} className="w-full border-red-200 bg-red-50 p-3 rounded-xl outline-none" placeholder="⚠️ Điểm yếu" rows={2}/></div>
              <div className="md:col-span-2"><textarea value={form.strategy} onChange={e => setForm({...form, strategy: e.target.value})} className="w-full border-green-200 bg-green-50 p-3 rounded-xl outline-none" placeholder="✅ Chiến lược ứng phó" rows={2}/></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-colors">Lưu thay đổi</button>
              <button onClick={resetForm} className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200">Hủy</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-red-50 border-b border-red-100">
              <tr>
                <th className="p-4 text-xs font-bold text-red-800 uppercase tracking-wider">Fanpage</th>
                <th className="p-4 text-xs font-bold text-red-800 bg-red-100 uppercase tracking-wider">Điểm yếu</th>
                <th className="p-4 text-xs font-bold text-green-800 bg-green-50 uppercase tracking-wider">Chiến lược ứng phó</th>
                <th className="p-4 text-center text-xs font-bold text-red-800 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold text-gray-800">{c.fanpageName}</td>
                  <td className="p-4 bg-red-50/50 text-red-700 text-sm whitespace-pre-line">{c.weaknesses}</td>
                  <td className="p-4 bg-green-50/50 text-green-700 text-sm whitespace-pre-line">{c.strategy}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => {setForm(c); setEditingId(c.id); setShowForm(true);}} className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={async () => { if(confirm('Xóa đối thủ này?')) await setCompetitors(competitors.filter(x => x.id !== c.id)) }} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
