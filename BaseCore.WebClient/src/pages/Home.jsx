import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../layouts/UserLayout";
import { API_BASE } from "../api";

const popularRoutes = [
  [
    "Hà Nội - Đà Nẵng",
    "Từ 250.000đ",
    "https://vcdn1-dulich.vnecdn.net/2022/06/01/CauVangDaNang-1654082224-7229-1654082320.jpg?w=0&h=0&q=100&dpr=2&fit=crop&s=MeVMb72UZA27ivcyB3s7Kg",
  ],
  [
    "Sài Gòn - Nha Trang",
    "Từ 300.000đ",
    "https://static.vinwonders.com/2022/11/du-lich-nha-trang.jpg",
  ],
  [
    "Hà Nội - Sapa",
    "Từ 350.000đ",
    "https://booking.muongthanh.com/upload_images/images/H%60/sa-pa-thi-tran-trong-suong.jpg",
  ],
];

export default function Home() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ from: "", to: "", date: today });
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/trips/locations`)
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => setForm((f) => ({ ...f, date: today })), [today]);

  const submit = (e) => {
    e.preventDefault();
    const qs = new URLSearchParams(form).toString();
    navigate(`/search?${qs}`);
  };

  const swapLocations = () => {
    setForm((prev) => ({ ...prev, from: prev.to, to: prev.from }));
  };

  return (
    <UserLayout>
      <header className="hero">
        <div className="hero-overlay" />
        <div className="hero-content container">
          <h1>Hành trình của bạn, ưu tiên của chúng tôi</h1>
          <p>
            Đặt vé xe khách trực tuyến dễ dàng, an toàn và nhanh chóng. Hơn 2000
            nhà xe trên toàn quốc.
          </p>

          {/* New Search Widget */}
          {/* <div className="search-box modern-search"> */}
          <form onSubmit={submit}>
            <div className="search-widget">
              {/* From */}
              <div className="widget-field">
                <i className="fa-solid fa-circle-dot"></i>
                <div className="widget-input">
                  <label>Nơi xuất phát</label>
                  <select
                    value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    required
                  >
                    <option value="">Chọn điểm đi</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap button */}
              <button
                type="button"
                className="widget-swap"
                onClick={swapLocations}
                aria-label="Đổi điểm đi và đến"
              >
                <i className="fa-solid fa-arrow-right-arrow-left"></i>
              </button>

              {/* To */}
              <div className="widget-field">
                <i className="fa-solid fa-location-dot"></i>
                <div className="widget-input">
                  <label>Nơi đến</label>
                  <select
                    value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    required
                  >
                    <option value="">Chọn điểm đến</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="widget-field">
                <i className="fa-regular fa-calendar"></i>
                <div className="widget-input">
                  <label>Ngày đi</label>
                  <input
                    type="date"
                    value={form.date}
                    min={today}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <button type="submit" className="btn btn-search">
                Tìm vé xe
              </button>
            </div>
          </form>
          {/* </div> */}
        </div>
      </header>

      <section className="popular-routes container section-padding">
        <h2 className="section-title">Khám Phá Tuyến Đường Phổ Biến</h2>
        <div className="grid routes-grid">
          {popularRoutes.map(([title, price, img]) => (
            <div className="route-card" key={title}>
              <div
                className="route-img"
                style={{ backgroundImage: `url(${img})` }}
              />
              <div className="route-info">
                <h3>{title}</h3>
                <p>{price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="container section-padding">
        <h2 className="section-title">Tại Sao Chọn VéXeAZ?</h2>
        <div className="grid info-grid">
          <div className="info-card">
            <i className="fa-solid fa-ticket fa-3x" />
            <h3>Hơn 2000 Nhà Xe</h3>
            <p>
              Mạng lưới phủ khắp 63 tỉnh thành, đa dạng sự lựa chọn cho chuyến
              đi của bạn.
            </p>
          </div>
          <div className="info-card">
            <i className="fa-solid fa-shield-halved fa-3x" />
            <h3>Thanh Toán An Toàn</h3>
            <p>
              Hệ thống thanh toán bảo mật với VNPay, MoMo đảm bảo giao dịch an
              toàn 100%.
            </p>
          </div>
          <div className="info-card">
            <i className="fa-solid fa-headset fa-3x" />
            <h3>Hỗ Trợ 24/7</h3>
            <p>
              Đội ngũ hỗ trợ khách hàng luôn sẵn sàng giải đáp mọi thắc mắc ngay
              lập tức.
            </p>
          </div>
        </div>
      </section>
    </UserLayout>
  );
}
