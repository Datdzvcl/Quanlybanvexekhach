import Header from '../components/Header';
import Footer from '../components/Footer';
import SeatHoldBanner from '../components/SeatHoldBanner';

export default function UserLayout({ children, simpleHeader = false, hideFooter = false }) {
  return (
    <div className="user-layout">
      <Header simple={simpleHeader} />
      <main className="user-layout-main">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <SeatHoldBanner />
    </div>
  );
}
