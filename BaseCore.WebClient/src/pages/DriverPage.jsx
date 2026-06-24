import { useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import DriverTrips from './Driver';

export default function DriverPage() {
  const [active, setActive] = useState('my-trips');

  const handleActiveChange = (tab) => {
    setActive(tab);
  };

  return (
    <AdminLayout active={active} onActiveChange={handleActiveChange}>
      <DriverTrips active={active} />
    </AdminLayout>
  );
}
