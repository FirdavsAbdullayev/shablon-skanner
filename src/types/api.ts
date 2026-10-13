/** API bilan almashinadigan ma'lumot turlari (server javoblariga mos) */

export type Role = 'ADMIN' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'CARD' | 'QR';

export type Store = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  lowStockThreshold: number;
};

export type User = {
  id: string;
  name: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  store?: Store;
  salesCount?: number;
};

export type Product = {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  costPrice: number | null;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaleItem = {
  id: string;
  productId: string | null;
  productName: string;
  barcode: string | null;
  unit: string;
  quantity: number;
  price: number;
  unitCost: number;
  lineTotal: number;
  lineProfit: number;
};

export type Sale = {
  id: string;
  totalAmount: number;
  profitAmount: number;
  itemCount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number | null;
  changeAmount: number | null;
  note: string | null;
  clientRef: string | null;
  createdAt: string;
  cashier: { id: string; name: string; username: string } | null;
  items: SaleItem[];
};

export type LoginResponse = { token: string; user: User };
export type MeResponse = { user: User };

export type ProductListResponse = {
  total: number;
  page: number;
  limit: number;
  pages: number;
  threshold: number;
  items: Product[];
};

export type ProductByBarcodeResponse = { product: Product };

export type ProductsResponse = { items: Product[] };
export type UsersResponse = { items: User[] };
export type CreateUserResponse = {
  user: User;
  generatedPassword: string | null;
  credentials: { username: string; password: string };
};
export type ResetPasswordResponse = {
  ok: boolean;
  username: string;
  generatedPassword: string;
  message: string;
};

export type SaleResponse = { sale: Sale; duplicated: boolean; message: string };
export type SaleDetailResponse = { sale: Sale; receiptStore: Omit<Store, 'id' | 'lowStockThreshold'> };

export type SalesListResponse = {
  total: number;
  page: number;
  limit: number;
  pages: number;
  summary: { revenue: number; profit: number; itemsSold: number; salesCount: number };
  items: Sale[];
};

export type DashboardStats = {
  today: { revenue: number; profit: number; itemsSold: number; salesCount: number };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    threshold: number;
    lowStockItems: Product[];
  };
  totals: { salesCount: number };
  week: { date: string; label: string; revenue: number; profit: number; itemsSold: number }[];
  payments: { method: PaymentMethod; label: string; total: number; count: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  store: Store | null;
};

export type ReportRow = {
  key: string;
  label: string;
  revenue?: number;
  profit?: number;
  count?: number;
  quantity?: number;
};

export type SalesReportResponse = {
  summary: { revenue: number; profit: number; itemsSold: number; salesCount: number };
  rows: ReportRow[];
};
