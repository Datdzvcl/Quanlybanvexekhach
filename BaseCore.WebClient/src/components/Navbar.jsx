import { Link } from 'react-router-dom';

const navItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Tìm chuyến', to: '/search' },
  { label: 'Ưu đãi', to: '/#offers' },
  { label: 'Hướng dẫn đặt vé', to: '/#booking-guide' },
  { label: 'Liên hệ', to: '/#contact' },
];

export default function Navbar({ onNavigate }) {
  return (
    <nav className="site-nav" aria-label="Điều hướng chính">
      {navItems.map((item) => (
        item.to.includes('#') ? (
          <a key={item.label} href={item.to} onClick={onNavigate}>
            {item.label}
          </a>
        ) : (
          <Link key={item.label} to={item.to} onClick={onNavigate}>
            {item.label}
          </Link>
        )
      ))}
    </nav>
  );
}
