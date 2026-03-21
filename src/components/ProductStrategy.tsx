import { useState } from 'react';
import type { ProductAdvantage } from '../types';
import { useSyncData } from '../store';
import { v4 as uuid } from 'uuid';
import { Plus, Edit2, Trash2, Save, X, Package, Link as LinkIcon, ArrowLeft, Loader2 } from 'lucide-react';

interface Props { projectId: string; onBack: () => void; }

export function ProductStrategy({ projectId, onBack }: Props) {
  const { data: products, syncData: setProducts, loading } = useSyncData<ProductAdvantage>(projectId, 'productAdvantages', []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ productName: '', specs: '', competitiveAdvantage: '', promotions: '', mediaLinks: '' });

  const resetForm = () => {
    setForm({ productName: '', specs: '', competitiveAdvantage: '', promotions: '', mediaLinks: '' });
    setShowForm(false); setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.productName.trim()) return;
    if (editingId) {
      await setProducts(products.map(p => p.id === editingId ? { ...p, ...form } : p));
    } else {
      await setProducts([...products, { id: uuid(), projectId, ...form }]);
    }
    resetForm();
  };

  const handleEdit = (p: ProductAdvantage) => {
    setForm({ productName: p.productName, specs: p.specs, competitiveAdvantage: p.competitiveAdvantage, promotions: p.promotions, mediaLinks: p.mediaLinks });
    setEditingId(p.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa sản phẩm này?')) await setProducts(products.filter(p => p.id !== id));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" /><p>Đang tải dữ liệu sản phẩm...</p></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-2xl font-bold text-gray-800">Chi Tiết Sản Phẩm</h1></div>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl hover:bg-amber-600"><Plus className="w-5 h-5" /> Thêm sản phẩm</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-5">{editingId ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm'}</h3>
            <div className="space-y-4">
              <input value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} placeholder="Tên sản phẩm *" className="w-full border p-3 rounded-xl" />
              <textarea value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })} placeholder="Thông số kỹ thuật" rows={3} className="w-full border p-3 rounded-xl" />
              <textarea value={form.competitiveAdvantage} onChange={e => setForm({ ...form, competitiveAdvantage: e.target.value })} placeholder="Lợi thế cạnh tranh" rows={2} className="w-full border p-3 rounded-xl" />
              <textarea value={form.promotions} onChange={e => setForm({ ...form, promotions: e.target.value })} placeholder="Chương trình ưu đãi" rows={2} className="w-full border p-3 rounded-xl" />
              <textarea value={form.mediaLinks} onChange={e => setForm({ ...form, mediaLinks: e.target.value })} placeholder="Link Media (Mỗi dòng 1 link)" rows={2} className="w-full border p-3 rounded-xl" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-medium">Lưu</button>
              <button onClick={resetForm} className="px-6 py-3 bg-gray-100 rounded-xl">Hủy</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-amber-50 border-b">
            <tr>
              <th className="px-4 py-4 text-xs font-bold text-amber-800">Tên SP</th>
              <th className="px-4 py-4 text-xs font-bold text-amber-800">Thông số</th>
              <th className="px-4 py-4 text-xs font-bold text-amber-800">Lợi thế</th>
              <th className="px-4 py-4 text-xs font-bold text-amber-800">Ưu đãi</th>
              <th className="px-4 py-4 text-center text-xs font-bold text-amber-800">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-amber-50/30">
                <td className="px-4 py-4 font-semibold">{p.productName}</td>
                <td className="px-4 py-4 text-sm whitespace-pre-line">{p.specs}</td>
                <td className="px-4 py-4 text-sm whitespace-pre-line">{p.competitiveAdvantage}</td>
                <td className="px-4 py-4 text-sm whitespace-pre-line">{p.promotions}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleEdit(p)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
