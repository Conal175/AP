export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'in-progress' | 'done';
  category: string;
}

// Action Plan - Task trong mỗi mục con
export interface ActionTask {
  id: string;
  name: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string;
}

// Action Plan - Mục con (1.1, 1.2, 2.1, ...)
export interface ActionSubPhase {
  id: string;
  code: string;
  name: string;
  tasks: ActionTask[];
}

// Action Plan - Giai đoạn chính (1, 2, 3)
export interface ActionPhase {
  id: string;
  code: string;
  name: string;
  subPhases: ActionSubPhase[];
}

export interface ProductAdvantage {
  id: string;
  projectId: string;
  productName: string;
  specs: string;
  competitiveAdvantage: string;
  promotions: string;
  mediaLinks: string;
}

export interface CustomerInfo {
  id: string;
  projectId: string;
  attribute: string;
  content: string;
  reason: string;
}

export interface PainPoint {
  id: string;
  projectId: string;
  painGroup: string;
  pain: string;
  solution: string;
}

export interface FAQ {
  id: string;
  projectId: string;
  question: string;
  answer: string;
}

export interface CustomerPersona {
  id: string;
  projectId: string;
  location: string;
  ageGender: string;
  segment: string;
  bestTime: string;
  painPoints: string;
  solutions: string;
  closingFactors: string;
  faqScripts: string;
}

export interface Competitor {
  id: string;
  projectId: string;
  fanpageName: string;
  adLinks: string; // Multiple links, each on new line
  productPrice: string;
  specs: string;
  salesPolicy: string;
  mediaFormat: string;
  weaknesses: string;
  strategy: string;
}

export interface DailyLog {
  id: string;
  projectId: string;
  day: number;
  month: number;
  year: number;
  adName: string; // Tên bài quảng cáo
  adLink: string; // Link bài quảng cáo
  spend: number; // Ngân sách (Spend)
  impressions: number; // Lượt hiển thị (Reach/Impressions)
  clicks: number; // Lượt nhấp chuột (Clicks)
  messages: number; // Số tin nhắn mới (New Messages)
  orders: number; // Số đơn hàng chốt thành công (Orders)
  revenue: number; // Doanh thu tạm tính (Revenue)
  issues: string; // Vấn đề phát sinh
  optimizations: string; // Hành động tối ưu
}

export interface FanpageCheckItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  notes: string;
  subItems?: { id: string; label: string; checked: boolean }[];
}

// Đã bổ sung createdAt và items để sửa lỗi Vercel
export interface Fanpage {
  id: string;
  projectId: string;
  name: string;
  url: string;
  createdAt: string; 
  items: FanpageCheckItem[];
}

export interface ContentAd {
  id: string;
  projectId: string;
  angle: string;
  caption: string;
  mediaLink: string;
  type: 'caption' | 'video';
  notes: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'caption' | 'link' | 'other';
  link: string;
  description: string;
  createdAt: string;
}

export interface MediaFolder {
  id: string;
  projectId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  items: MediaItem[];
  createdAt: string;
}

// TabKey được định nghĩa trong App.tsx (canonical). Không lặp lại ở đây.
