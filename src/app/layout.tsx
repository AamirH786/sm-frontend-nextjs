import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { OrganizationsProvider } from '@/context/OrganizationsContext';

export const metadata: Metadata = {
  title: 'SM Frontend',
  description: 'System Management Frontend',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <OrganizationsProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </OrganizationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

