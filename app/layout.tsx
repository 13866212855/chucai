import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e3a8a',
};

export const metadata: Metadata = {
  title: '外出事务管理 - 职场出差与公务审批',
  description: '面向职场人员的外出事务管理H5应用，记录出差、培训及外出活动，一键生成标准公务出差审批单与报账凭证。',
  openGraph: {
    title: '外出事务管理 - 职场出差与公务审批',
    description: '面向职场人员的外出事务管理H5应用，记录出差、培训及外出活动，一键生成标准公务出差审批单与报账凭证。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '外出事务管理 - 职场出差与公务审批',
    description: '面向职场人员的外出事务管理H5应用，记录出差、培训及外出活动，一键生成标准公务出差审批单与报账凭证。',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning className="bg-slate-100 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
