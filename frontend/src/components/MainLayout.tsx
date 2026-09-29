import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { BotonWhatsApp } from './Contacto';

export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <BotonWhatsApp />
    </div>
  );
}
