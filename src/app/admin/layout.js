export const metadata = {
  title: '관리자 | 한결부동산',
};

export default function AdminLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f5' }}>
      {children}
    </div>
  );
}
