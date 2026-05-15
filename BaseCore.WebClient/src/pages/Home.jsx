import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../layouts/UserLayout";
import { API_BASE } from "../api";

const offerItems = [
  {
    title: "Giảm 20% tuyến đêm",
    desc: "Áp dụng cho các chuyến khởi hành sau 20:00 trong tuần.",
    icon: "fa-moon",
  },
  {
    title: "Hoàn xu khách mới",
    desc: "Tặng điểm thưởng cho đơn đặt vé đầu tiên trên VéXeAZ.",
    icon: "fa-gift",
  },
  {
    title: "Combo khứ hồi",
    desc: "Đặt vé đi và về cùng lúc để nhận giá tốt hơn.",
    icon: "fa-repeat",
  },
];

const popularRoutes = [
  {
    route: "Hà Nội - Đà Nẵng",
    price: "Từ 250.000đ",
    image:
      "https://vcdn1-dulich.vnecdn.net/2022/06/03/cauvang-1654247842-9403-1654247849.jpg?w=1200&h=0&q=100&dpr=1&fit=crop&s=Swd6JjpStebEzT6WARcoOA",
  },
  {
    route: "Sài Gòn - Nha Trang",
    price: "Từ 300.000đ",
    image: "https://static.vinwonders.com/2022/11/du-lich-nha-trang.jpg",
  },
  {
    route: "Hà Nội - Sa Pa",
    price: "Từ 350.000đ",
    image:
      "https://booking.muongthanh.com/upload_images/images/H%60/sa-pa-thi-tran-trong-suong.jpg",
  },
];

const reasons = [
  [
    "fa-ticket",
    "Đặt vé nhanh",
    "Tìm chuyến, giữ ghế và thanh toán trong một luồng rõ ràng.",
  ],
  [
    "fa-shield-halved",
    "Thông tin minh bạch",
    "Giá vé, giờ chạy và trạng thái ghế được hiển thị trực tiếp.",
  ],
  [
    "fa-headset",
    "Hỗ trợ 24/7",
    "Đội ngũ hỗ trợ luôn sẵn sàng khi bạn cần thay đổi lịch trình.",
  ],
];

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const navigate = useNavigate();
  const today = useMemo(() => getToday(), []);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    from: "",
    to: "",
    departureDate: today,
    isRoundTrip: false,
    returnDate: "",
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/trips/locations`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]));
  }, []);

  const updateForm = (key, value) => {
    setError("");
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "isRoundTrip" && !value) next.returnDate = "";
      return next;
    });
  };

  const validate = () => {
    const from = form.from.trim();
    const to = form.to.trim();

    if (!from) return "Vui lòng chọn điểm xuất phát.";
    if (!to) return "Vui lòng chọn điểm đến.";
    if (from.toLowerCase() === to.toLowerCase())
      return "Điểm xuất phát không được trùng điểm đến.";
    if (!form.departureDate || form.departureDate < today)
      return "Ngày đi không được nhỏ hơn ngày hiện tại.";
    if (
      form.isRoundTrip &&
      (!form.returnDate || form.returnDate < form.departureDate)
    ) {
      return "Ngày về phải lớn hơn hoặc bằng ngày đi.";
    }

    return "";
  };

  const submit = (event) => {
    event.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    const query = new URLSearchParams({
      from: form.from.trim(),
      to: form.to.trim(),
      departureDate: form.departureDate,
    });

    if (form.isRoundTrip && form.returnDate) {
      query.set("returnDate", form.returnDate);
    }

    navigate(`/search-results?${query.toString()}`);
  };

  return (
    <UserLayout>
      <section className="home-hero">
        <div className="home-hero-media" aria-hidden="true" />
        <div className="home-hero-shade" />
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-eyebrow">Nền tảng đặt vé xe khách trực tuyến</p>
            <h1>VéXeAZ</h1>
            <p>
              Chọn chuyến phù hợp, giữ ghế nhanh và quản lý vé dễ dàng cho mọi
              hành trình liên tỉnh.
            </p>
          </div>

          <form className="featured-search" onSubmit={submit}>
            <div className="featured-search-head">
              <div>
                <strong>Tìm chuyến xe</strong>
                <span>So sánh nhà xe và giá vé theo lịch trình của bạn</span>
              </div>
              <label className="round-trip-toggle">
                <input
                  type="checkbox"
                  checked={form.isRoundTrip}
                  onChange={(event) =>
                    updateForm("isRoundTrip", event.target.checked)
                  }
                />
                <span>Khứ hồi</span>
              </label>
            </div>

            <div className="featured-search-grid">
              <label className="search-field">
                <span>Điểm xuất phát</span>
                <input
                  list="home-locations"
                  value={form.from}
                  onChange={(event) => updateForm("from", event.target.value)}
                  placeholder="Ví dụ: Hà Nội"
                />
              </label>

              <label className="search-field">
                <span>Điểm đến</span>
                <input
                  list="home-locations"
                  value={form.to}
                  onChange={(event) => updateForm("to", event.target.value)}
                  placeholder="Ví dụ: Đà Nẵng"
                />
              </label>

              <label className="search-field">
                <span>Ngày đi</span>
                <input
                  type="date"
                  min={today}
                  value={form.departureDate}
                  onChange={(event) =>
                    updateForm("departureDate", event.target.value)
                  }
                />
              </label>

              {form.isRoundTrip && (
                <label className="search-field">
                  <span>Ngày về</span>
                  <input
                    type="date"
                    min={form.departureDate || today}
                    value={form.returnDate}
                    onChange={(event) =>
                      updateForm("returnDate", event.target.value)
                    }
                  />
                </label>
              )}

              <button
                type="submit"
                className="btn btn-primary featured-search-button"
              >
                <i className="fa-solid fa-magnifying-glass" />
                Tìm chuyến xe
              </button>
            </div>

            <datalist id="home-locations">
              {locations.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>

            {error && <p className="search-error">{error}</p>}
          </form>
        </div>
      </section>

      <section id="offers" className="container home-section">
        <div className="home-section-head">
          <span>Ưu đãi</span>
          <h2>Tiết kiệm hơn cho mỗi chuyến đi</h2>
        </div>
        <div className="offer-grid">
          {offerItems.map((item) => (
            <article className="offer-card" key={item.title}>
              <i className={`fa-solid ${item.icon}`} />
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container home-section">
        <div className="home-section-head">
          <span>Tuyến phổ biến</span>
          <h2>Những hành trình được chọn nhiều</h2>
        </div>
        <div className="home-route-grid">
          {popularRoutes.map((item) => (
            <article className="home-route-card" key={item.route}>
              <img src={item.image} alt={item.route} />
              <div>
                <h3>{item.route}</h3>
                <p>{item.price}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="booking-guide" className="home-reasons">
        <div className="container home-section">
          <div className="home-section-head">
            <span>Lý do nên chọn</span>
            <h2>Đặt vé rõ ràng, nhanh và an tâm</h2>
          </div>
          <div className="reason-grid">
            {reasons.map(([icon, title, desc]) => (
              <article className="reason-card" key={title}>
                <i className={`fa-solid ${icon}`} />
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </UserLayout>
  );
}
