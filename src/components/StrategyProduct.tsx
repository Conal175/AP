import { useState, useCallback } from 'react';
import type { ProductAdvantage } from '../types';
import { getAdvantages, saveAdvantages } from '../store';
import { v4 as uuid } from 'uuid';
import {
  Plus, Trash2, Edit3, X, Check, Link2, Package,
  ExternalLink
} from 'lucide-react';

interface Props {
  projectId: string;
  onClose: () => void;
}

const emptyProduct = (): Omit<ProductAdvantage, 'id' | 'projectId'> => ({
  productName: '', specs: '', competitiveAdvantage: '', promotions: '', mediaLinks: ''
});

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors";
const textareaCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors resize-none";
const thCls = "px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50/80";
const tdCls = "px-4 py-3 text-sm text-gray-700 border-b border-gray-100 align-top";

export function StrategyProduct({ projectId, onClose }: Props) {
  const [products, setProducts] = useState<ProductAdvantage[]>(() => getAdvantages(projectId));
  const [prodForm, setProdForm] = useState(emptyProduct());
  const [showProdForm, setShowProdForm] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  const persistProducts = useCallback((items: ProductAdvantage[]) => {
    setProducts(items);
    saveAdvantages(projectId, items);
  }, [projectId]);

  const addOrUpdateProd = () => {
    if (!prodForm.productName.trim()) return;
    if (editingProdId) {
      persistProducts(products.map(p => p.id === editingProdId ? { ...p, ...prodForm } : p));
      setEditingProdId(null);
    } else {
      persistProducts([...products, { id: uuid(), projectId, ...prodForm }]);
    }
    setProdForm(emptyProduct());
    setShowProdForm(false);
  };

  const startEditProd = (p: ProductAdvantage) => {
    setProdForm({
      productName: p.productName,
      specs: p.specs,
      competitiveAdvantage: p.competitiveAdvantage,
      promotions: p.promotions,
      mediaLinks: p.mediaLinks
    });
    setEditingProdId(p.id);
    setShowProdForm(true);
  };

  const cancelProdForm = () => {
    setShowProdForm(false);
    setEditingProdId(null);
    setProdForm(emptyProduct());
  };

  const renderSpecsBullets = (specs: string) => {
    if (!specs) return <span className="text-gray-300 italic">—</span>;
    const lines = specs.split('\n').filter(l => l.trim());
    return (
      <ul className="list-none space-y-1">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-1.5 text-sm">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
            <span>{line.trim()}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderMediaLinks = (links: string) => {
    if (!links) return <span className="text-gray-300 italic">—</span>;
    const lines = links.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-1.5">
        {lines.map((link, i) => {
          const isUrl = link.trim().startsWith('http');
          return isUrl ? (
            <a key={i} href={link.trim()} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs break-all group">
              <ExternalLink className="w-3 h-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="underline">{link.trim().length > 50 ? link.trim().substring(0, 50) + '...' : link.trim()}</span>
            </a>
          ) : (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <Link2 className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span>{link.trim()}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header với nút quay lại */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 transition-colors mb-2"
          >
            ← Quay lại danh sách
          </button>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            Chi Tiết Sản Phẩm
          </h2>
          <p className="text-gray-500 text-sm mt-1 ml-[52px]">Quản lý thông tin sản phẩm và tài nguyên media</p>
        </div>
        <button
          onClick={() => { setShowProdForm(true); setEditingProdId(null); setProdForm(emptyProduct()); }}
          className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm sản phẩm
        </button>
      </div>

      {/* Form */}
      {showProdForm && (
        <div className="bg-amber-50/50 rounded-xl p-6 border border-amber-200">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" />
            {editingProdId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tên sản phẩm <span className="text-red-400">*</span></label>
              <input
                value={prodForm.productName}
                onChange={e => setProdForm({ ...prodForm, productName: e.target.value })}
                placeholder="VD: Máy bơm nước ABC-500"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chương trình ưu đãi</label>
              <input
                value={prodForm.promotions}
                onChange={e => setProdForm({ ...prodForm, promotions: e.target.value })}
                placeholder="VD: Giảm 15% khi mua combo, tặng phụ kiện 500k"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Bộ thông số kỹ thuật <span className="text-gray-400 font-normal">(mỗi dòng = 1 gạch đầu dòng)</span>
              </label>
              <textarea
                value={prodForm.specs}
                onChange={e => setProdForm({ ...prodForm, specs: e.target.value })}
                rows={4}
                placeholder="Công suất 750W\nLưu lượng 45L/phút\nCột áp 25m\nĐiện áp 220V/50Hz"
                className={textareaCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Điểm khác biệt / Lợi thế cạnh tranh</label>
              <textarea
                value={prodForm.competitiveAdvantage}
                onChange={e => setProdForm({ ...prodForm, competitiveAdvantage: e.target.value })}
                rows={4}
                placeholder="VD: Công suất mạnh nhất phân khúc, tiết kiệm điện 30%, bảo hành 24 tháng..."
                className={textareaCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Tài nguyên Media <span className="text-gray-400 font-normal">(mỗi dòng = 1 link đính kèm)</span>
                </span>
              </label>
              <textarea
                value={prodForm.mediaLinks}
                onChange={e => setProdForm({ ...prodForm, mediaLinks: e.target.value })}
                rows={3}
                placeholder="https://drive.google.com/video-test-1\nhttps://drive.google.com/anh-san-pham\nhttps://youtube.com/review-sp"
                className={textareaCls}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={addOrUpdateProd}
              className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg hover:bg-amber-600 font-medium"
            >
              <Check className="w-4 h-4" /> {editingProdId ? 'Cập nhật' : 'Thêm'}
            </button>
            <button
              onClick={cancelProdForm}
              className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
            >
              <X className="w-4 h-4" /> Hủy
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {products.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className={`${thCls} w-10`}>#</th>
                  <th className={thCls}>Tên sản phẩm</th>
                  <th className={thCls}>Bộ thông số kỹ thuật</th>
                  <th className={thCls}>Điểm khác biệt / LTCT</th>
                  <th className={thCls}>Chương trình ưu đãi</th>
                  <th className={thCls}>Tài nguyên Media</th>
                  <th className={`${thCls} w-20 text-center`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className={`hover:bg-amber-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className={`${tdCls} font-bold text-amber-600 text-center`}>{i + 1}</td>
                    <td className={`${tdCls} font-semibold text-gray-800 min-w-[150px]`}>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        {p.productName}
                      </div>
                    </td>
                    <td className={`${tdCls} min-w-[200px]`}>
                      {renderSpecsBullets(p.specs)}
                    </td>
                    <td className={`${tdCls} min-w-[200px]`}>
                      {p.competitiveAdvantage ? (
                        <div className="bg-blue-50 rounded-lg px-3 py-2 text-blue-800 text-sm whitespace-pre-line border border-blue-100">
                          {p.competitiveAdvantage}
                        </div>
                      ) : <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className={`${tdCls} min-w-[150px]`}>
                      {p.promotions ? (
                        <div className="bg-green-50 rounded-lg px-3 py-2 text-green-700 text-sm whitespace-pre-line border border-green-100">
                          {p.promotions}
                        </div>
                      ) : <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className={`${tdCls} min-w-[200px]`}>
                      {renderMediaLinks(p.mediaLinks)}
                    </td>
                    <td className={`${tdCls} text-center`}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEditProd(p)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => persistProducts(products.filter(x => x.id !== p.id))}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium text-lg">Chưa có sản phẩm nào</p>
          <p className="text-gray-400 text-sm mt-1">Bấm "Thêm sản phẩm" để bắt đầu</p>
        </div>
      )}
    </div>
  );
}
