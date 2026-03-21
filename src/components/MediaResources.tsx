import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import {
  Plus, Trash2, ExternalLink, Square, Check,
  ChevronDown, Globe, Edit3, X, FolderPlus,
  Link2, Video, ImageIcon, FileText, Loader2, ChevronRight
} from 'lucide-react';
// ĐÃ SỬA TẠI ĐÂY: Import đúng tên hàm từ store
import { fetchProjectData, saveProjectData } from '../store';
import { useAuth } from '../contexts/AuthContext';

// ==========================================
// ĐỊNH NGHĨA TYPES 
// ==========================================
interface FanpageCheckItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  notes?: string;
  subItems?: { id: string; label: string; checked: boolean; }[];
}

interface Fanpage {
  id: string;
  projectId: string;
  name: string;
  url: string;
  createdAt: string;
  items: FanpageCheckItem[];
}

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'caption' | 'link';
  link: string;
  description: string;
  createdAt: string;
}

interface MediaFolder {
  id: string;
  projectId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  items: MediaItem[];
  createdAt: string;
}

interface Props { 
  projectId: string; 
}

// ==========================================
// CẤU HÌNH MẶC ĐỊNH
// ==========================================
const DEFAULT_CHECKLIST_ITEMS = [
  { label: 'Tên Fanpage - URL Page', icon: '🌐', description: 'Ngắn gọn, gợi nhớ thương hiệu' },
  { label: 'Ảnh bìa (Cover)', icon: '🎨', description: 'Nội dung ảnh: 828x315 px. Nên thể hiện rõ sản phẩm/dịch vụ.' },
  { label: 'Avatar', icon: '🖼️', description: 'Kích thước lớn nhất: 2048px x 2048px.' },
  { label: 'Mô tả ngắn', icon: '📝', description: 'Cần ngắn gọn, không quá 255 ký tự.' },
  { label: 'Giới thiệu', icon: '📖', description: 'Thêm câu chuyện vào Trang.' },
  { label: 'Nút hành động (CTA)', icon: '📲', description: 'Kêu gọi khách hàng mua hàng.' },
  { label: 'Thiết lập về lĩnh vực', icon: '🏷️', description: 'Chọn Hạng mục có sẵn của Facebook.' },
  { label: 'Thông tin liên hệ', icon: '📞', description: 'Cập nhật đầy đủ các thông tin.', subItems: ['Vị trí', 'Số điện thoại', 'Email'] },
  { label: 'Huy hiệu fan cứng', icon: '🏅', description: 'Tăng uy tín, tương tác cho trang.' },
  { label: 'Ứng dụng cần kết nối', icon: '🔗', description: 'Kết nối nền tảng khác.', subItems: ['Instagram', 'Youtube'] },
  { label: 'Sắp xếp Tab', icon: '📋', description: 'Thiết lập các Tab.', subItems: ['Menu', 'Ảnh', 'Video', 'Đánh giá'] },
  { label: 'Thiết lập hộp thư', icon: '💬', description: 'Cài đặt hệ thống tin nhắn tự động.', subItems: ['Chào mừng', 'Trả lời nhanh'] },
  { label: 'Chữ ký trong post', icon: '✍️', description: 'Mô tả công ty, trụ sở, website, hotline.' },
];

const MEDIA_TYPES: { value: MediaItem['type']; label: string; icon: string }[] = [
  { value: 'image', label: 'Hình ảnh', icon: '🖼️' }, 
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'caption', label: 'Caption', icon: '📝' }, 
  { value: 'link', label: 'Link', icon: '🔗' }
];

function createDefaultChecklistItems(): FanpageCheckItem[] {
  return DEFAULT_CHECKLIST_ITEMS.map(item => ({
    id: uuid(), label: item.label, description: item.description, checked: false, notes: '',
    subItems: item.subItems ? item.subItems.map(sub => ({ id: uuid(), label: sub, checked: false })) : undefined,
  }));
}

function createDefaultFolders(projectId: string): MediaFolder[] {
  return [
    { id: uuid(), projectId, name: 'Tổng hợp Media', icon: '📂', color: 'blue', isDefault: true, items: [], createdAt: new Date().toISOString() },
    { id: uuid(), projectId, name: 'Media chạy Ads', icon: '🎬', color: 'orange', isDefault: true, items: [], createdAt: new Date().toISOString() },
  ];
}

// ==========================================
// COMPONENT CHÍNH
// ==========================================
export function MediaResources({ projectId }: Props) {
  const { checkPermission } = useAuth();
  const canEdit = checkPermission('media', 'edit');
  const canDelete = checkPermission('media', 'delete');

  const [fanpages, setFanpages] = useState<Fanpage[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // States Giao diện
  const [tab, setTab] = useState<'checklist' | 'library'>('checklist');
  const [showAddFanpage, setShowAddFanpage] = useState(false);
  const [fanpageForm, setFanpageForm] = useState({ name: '', url: '' });
  const [expandedFanpages, setExpandedFanpages] = useState<Set<string>>(new Set());

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: '', icon: '📁', color: 'blue' });
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Omit<MediaItem, 'id' | 'createdAt'>>({ name: '', type: 'image', link: '', description: '' });

  // ================= LOAD DATA & AUTO REPAIR =================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // ĐÃ SỬA TẠI ĐÂY: Dùng fetchProjectData
        const savedFanpages = await fetchProjectData(projectId, 'fanpages');
        let savedFolders = await fetchProjectData(projectId, 'mediaFolders');
        
        // TỰ ĐỘNG VÁ LỖI: Kiểm tra và bơm Checklist vào các Fanpage bị lỗi cấu trúc
        if (savedFanpages && Array.isArray(savedFanpages)) {
          const repairedFanpages = savedFanpages.map((fp: any) => ({
            ...fp,
            url: fp.url || fp.link || '', // Vá lỗi đồng bộ tên biến url
            items: (fp.items && Array.isArray(fp.items) && fp.items.length > 0) 
                   ? fp.items 
                   : createDefaultChecklistItems()
          }));
          setFanpages(repairedFanpages);
        }
        
        if (!savedFolders || savedFolders.length === 0) {
          savedFolders = createDefaultFolders(projectId);
          // ĐÃ SỬA TẠI ĐÂY: Dùng saveProjectData
          await saveProjectData(projectId, 'mediaFolders', savedFolders);
        }
        setFolders(savedFolders);
      } catch (error) {
        console.error("Lỗi tải dữ liệu Media:", error);
      }
      setLoading(false);
    };
    loadData();
  }, [projectId]);

  // Hàm Sync Data 
  const persistFanpages = async (newData: Fanpage[]) => {
    setFanpages(newData);
    // ĐÃ SỬA TẠI ĐÂY: Dùng saveProjectData
    await saveProjectData(projectId, 'fanpages', newData);
  };

  const persistFolders = async (newData: MediaFolder[]) => {
    setFolders(newData);
    // ĐÃ SỬA TẠI ĐÂY: Dùng saveProjectData
    await saveProjectData(projectId, 'mediaFolders', newData);
  };

  // ================= FANPAGE HANDLERS =================
  const addFanpage = async () => {
    if (!fanpageForm.name.trim() || !canEdit) return;
    const newFanpage: Fanpage = { 
      id: uuid(), projectId, 
      name: fanpageForm.name.trim(), url: fanpageForm.url.trim(), 
      createdAt: new Date().toISOString(), items: createDefaultChecklistItems() 
    };
    await persistFanpages([...fanpages, newFanpage]);
    setFanpageForm({ name: '', url: '' }); 
    setShowAddFanpage(false); 
    setExpandedFanpages(prev => new Set([...prev, newFanpage.id]));
  };

  const deleteFanpage = async (id: string) => {
    if (!canDelete) return;
    if(confirm('Xóa Fanpage này và toàn bộ checklist?')) {
      await persistFanpages(fanpages.filter(f => f.id !== id));
    }
  };

  const toggleExpandFanpage = (id: string) => setExpandedFanpages(prev => { 
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; 
  });

  const toggleCheckItem = async (fanpageId: string, itemId: string) => {
    if (!canEdit) return;
    await persistFanpages(fanpages.map(f => f.id === fanpageId ? { 
      ...f, items: f.items.map(i => { 
        if (i.id !== itemId) return i; 
        const newChecked = !i.checked; 
        return { 
          ...i, checked: newChecked, 
          subItems: i.subItems?.map(sub => ({ ...sub, checked: newChecked })) 
        }; 
      }) 
    } : f));
  };

  // ================= FOLDER & MEDIA HANDLERS =================
  const addFolder = async () => { 
    if (!folderForm.name.trim() || !canEdit) return; 
    await persistFolders([...folders, { 
      id: uuid(), projectId, name: folderForm.name.trim(), icon: folderForm.icon, 
      color: folderForm.color, isDefault: false, items: [], createdAt: new Date().toISOString() 
    }]); 
    setFolderForm({ name: '', icon: '📁', color: 'blue' }); setShowAddFolder(false); 
  };

  const deleteFolder = async (id: string) => { 
    if (!canDelete) return;
    const folder = folders.find(f => f.id === id); 
    if (folder?.isDefault) { 
      if (!confirm('Xóa toàn bộ file bên trong thư mục mặc định này?')) return; 
      await persistFolders(folders.map(f => f.id === id ? { ...f, items: [] } : f)); 
    } else { 
      if (!confirm('Xóa thư mục và toàn bộ file bên trong?')) return; 
      await persistFolders(folders.filter(f => f.id !== id)); setActiveFolderId(null); 
    } 
  };

  const addMediaItem = async () => {
    if (!activeFolderId || (!itemForm.name.trim() && !itemForm.link.trim()) || !canEdit) return;
    const newItem: MediaItem = { 
      id: editingItem || uuid(), ...itemForm, name: itemForm.name.trim(), 
      link: itemForm.link.trim(), description: itemForm.description.trim(), createdAt: new Date().toISOString() 
    };
    
    if (editingItem) {
      await persistFolders(folders.map(f => f.id === activeFolderId ? { ...f, items: f.items.map(i => i.id === editingItem ? newItem : i) } : f));
    } else {
      await persistFolders(folders.map(f => f.id === activeFolderId ? { ...f, items: [...f.items, newItem] } : f));
    }
    setItemForm({ name: '', type: 'image', link: '', description: '' }); setShowAddItem(false); setEditingItem(null);
  };

  const deleteMediaItem = async (folderId: string, itemId: string) => {
    if (!canDelete) return;
    if (confirm('Xóa file này khỏi thư mục?')) {
      await persistFolders(folders.map(f => f.id === folderId ? { ...f, items: f.items.filter(i => i.id !== itemId) } : f));
    }
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-teal-500" />
        <p>Đang tải tài nguyên Media...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Quản Lý Tài Nguyên Media</h2>
      </div>
      
      <div className="flex gap-2">
        <button onClick={() => setTab('checklist')} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'checklist' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Checklist Fanpage</button>
        <button onClick={() => { setTab('library'); setActiveFolderId(null); }} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'library' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Thư Viện Media</button>
      </div>

      {/* ================= TAB 1: CHECKLIST ================= */}
      {tab === 'checklist' && (
        <div className="space-y-4">
          {canEdit && (
            <button onClick={() => setShowAddFanpage(true)} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 flex items-center gap-2 font-medium transition-colors shadow-sm">
              <Plus className="w-5 h-5"/> Thêm Fanpage Mới
            </button>
          )}
          
          {showAddFanpage && (
            <div className="bg-white rounded-xl p-6 border-2 border-teal-200 shadow-sm animate-in fade-in">
              <input value={fanpageForm.name} autoFocus onChange={e => setFanpageForm({ ...fanpageForm, name: e.target.value })} placeholder="Tên Fanpage *" className="w-full border border-gray-300 p-3 rounded-xl mb-3 focus:ring-2 focus:ring-teal-500 outline-none" />
              <input value={fanpageForm.url} onChange={e => setFanpageForm({ ...fanpageForm, url: e.target.value })} placeholder="Link URL" className="w-full border border-gray-300 p-3 rounded-xl mb-3 focus:ring-2 focus:ring-teal-500 outline-none" />
              <div className="flex gap-2">
                <button onClick={addFanpage} disabled={!fanpageForm.name.trim()} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">Lưu Fanpage</button>
                <button onClick={() => setShowAddFanpage(false)} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors">Hủy</button>
              </div>
            </div>
          )}

          {fanpages.length === 0 && !showAddFanpage ? (
             <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white">Chưa có Fanpage nào được thiết lập.</div>
          ) : fanpages.map(fp => (
            <div key={fp.id} className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm transition-all">
              <div className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors" onClick={() => toggleExpandFanpage(fp.id)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg"><Globe className="w-6 h-6 text-teal-600" /></div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{fp.name}</h3>
                    {fp.url && <a href={fp.url} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-0.5"><Link2 className="w-3.5 h-3.5"/> Truy cập trang</a>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canDelete && <button onClick={(e) => { e.stopPropagation(); deleteFanpage(fp.id); }} className="text-gray-400 p-2 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>}
                  {expandedFanpages.has(fp.id) ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </div>
              </div>
              
              {expandedFanpages.has(fp.id) && (
                <div className="mt-2 space-y-2 border-t border-gray-100 pt-4 px-2 pb-2">
                  {fp.items.map((item) => (
                    <div key={item.id} className={`flex gap-3 items-start border p-3.5 rounded-xl transition-colors ${item.checked ? 'bg-green-50/50 border-green-200' : 'hover:bg-gray-50 border-gray-100 shadow-sm'}`}>
                      <button onClick={() => toggleCheckItem(fp.id, item.id)} disabled={!canEdit} className="mt-0.5 shrink-0 disabled:opacity-50">
                        {item.checked ? <Check className="w-6 h-6 text-green-500" /> : <Square className="w-6 h-6 text-gray-300 hover:text-gray-400" />}
                      </button>
                      <div className="flex-1">
                        <span className={`text-base font-semibold ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.label}</span>
                        <p className={`text-sm mt-0.5 ${item.checked ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                        
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {item.subItems.map(sub => (
                              <span key={sub.id} className={`text-xs px-2.5 py-1 rounded-md border ${item.checked || sub.checked ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {sub.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 2: THƯ VIỆN MEDIA ================= */}
      {tab === 'library' && !activeFolderId && (
        <div className="space-y-6">
          {canEdit && (
            <button onClick={() => setShowAddFolder(true)} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 flex items-center gap-2 font-medium transition-colors shadow-sm">
              <FolderPlus className="w-5 h-5"/> Thêm Thư Mục
            </button>
          )}
          
          {showAddFolder && (
            <div className="bg-white rounded-xl p-6 border-2 border-teal-200 shadow-sm animate-in fade-in">
              <input value={folderForm.name} autoFocus onChange={e => setFolderForm({ ...folderForm, name: e.target.value })} placeholder="Tên thư mục *" className="w-full border border-gray-300 p-3 rounded-xl mb-3 focus:ring-2 focus:ring-teal-500 outline-none" />
              <div className="flex gap-2">
                <button onClick={addFolder} disabled={!folderForm.name.trim()} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">Lưu thư mục</button>
                <button onClick={() => setShowAddFolder(false)} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors">Hủy</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {folders.map(folder => (
              <div key={folder.id} className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-teal-300 transition-all relative group" onClick={() => setActiveFolderId(folder.id)}>
                <div className="text-4xl mb-4 opacity-90">{folder.icon}</div>
                <h3 className="font-bold text-gray-800 text-lg">{folder.name}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">{folder.items.length} tài nguyên</p>
                {canDelete && (
                  <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHI TIẾT THƯ MỤC MEDIA */}
      {tab === 'library' && activeFolderId && activeFolder && (
        <div className="space-y-4 animate-in slide-in-from-right-2">
          <button onClick={() => setActiveFolderId(null)} className="text-gray-500 mb-2 inline-flex items-center gap-1.5 hover:text-teal-600 font-medium transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180"/> Quay lại danh sách thư mục
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">{activeFolder.icon} {activeFolder.name}</h3>
            {canEdit && (
              <button onClick={() => { setShowAddItem(true); setEditingItem(null); setItemForm({ name: '', type: 'image', link: '', description: '' }); }} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 flex items-center gap-2 font-medium shadow-sm transition-colors">
                <Plus className="w-5 h-5"/> Thêm File
              </button>
            )}
          </div>

          {showAddItem && (
            <div className="bg-white rounded-2xl p-6 border-2 border-teal-200 shadow-sm animate-in fade-in">
              <h3 className="font-bold text-lg mb-4 text-gray-800">{editingItem ? 'Sửa thông tin File' : 'Thêm File Mới'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên file *</label>
                  <input value={itemForm.name} autoFocus onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="w-full border border-gray-300 p-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Định dạng</label>
                  <select value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value as MediaItem['type'] })} className="w-full border border-gray-300 p-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white">
                    {MEDIA_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link liên kết (URL)</label>
                  <input value={itemForm.link} onChange={e => setItemForm({ ...itemForm, link: e.target.value })} placeholder="https://..." className="w-full border border-gray-300 p-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm</label>
                  <textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} className="w-full border border-gray-300 p-2.5 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-none" rows={2} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addMediaItem} disabled={!itemForm.name.trim()} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">{editingItem ? 'Lưu thay đổi' : 'Thêm vào thư mục'}</button>
                <button onClick={() => setShowAddItem(false)} className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors">Hủy</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Tên tài nguyên</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Định dạng</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Liên kết</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeFolder.items.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-500 font-medium">Thư mục này trống.</td></tr>
                  ) : activeFolder.items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{item.description}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {MEDIA_TYPES.find(m => m.value === item.type)?.icon} {MEDIA_TYPES.find(m => m.value === item.type)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.link ? (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                            <ExternalLink className="w-4 h-4"/> Xem nội dung
                          </a>
                        ) : <span className="text-gray-400 italic text-sm">Chưa có link</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          {canEdit && <button onClick={() => { setEditingItem(item.id); setItemForm({ name: item.name, type: item.type, link: item.link, description: item.description }); setShowAddItem(true); }} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4"/></button>}
                          {canDelete && <button onClick={() => confirm('Xóa file này?') && deleteMediaItem(activeFolder.id, item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
