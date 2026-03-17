'use client';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition-root" style={{ position: 'relative', height: '100%' }}>
      {children}
    </div>
  );
}
