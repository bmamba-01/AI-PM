import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full w-full flex-col relative">
      <div className="app-bg" />
      {children}
    </div>
  );
}
