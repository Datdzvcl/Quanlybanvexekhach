import Header from '../components/Header';
import Footer from '../components/Footer';

export default function UserLayout({ children, simpleHeader = false, hideFooter = false }) {
  return (
    <div className="user-layout">
      <Header simple={simpleHeader} />
      <main className="user-layout-main">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
