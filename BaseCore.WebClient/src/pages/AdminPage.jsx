import { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import Admin from './Admin';

export default function AdminPage() {
  const [active, setActive] = useState('dashboard');

  return (
    <AdminLayout active={active} onActiveChange={setActive}>
      <Admin active={active} />
    </AdminLayout>
  );
}
