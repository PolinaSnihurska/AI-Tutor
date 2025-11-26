import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Layout({ children, header, sidebar, footer }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {header && <header className="bg-white shadow-sm sticky top-0 z-40">{header}</header>}

      <div className="flex-1 flex">
        {sidebar && (
          <aside className="hidden lg:block w-64 bg-white border-r border-gray-200">
            {sidebar}
          </aside>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {footer && <footer className="bg-white border-t border-gray-200">{footer}</footer>}
    </div>
  );
}
