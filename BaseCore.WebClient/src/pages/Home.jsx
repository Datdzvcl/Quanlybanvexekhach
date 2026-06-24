import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../layouts/UserLayout";
import { API_BASE } from "../api";
import { promotionApi } from "../services/promotionApi";

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
  {
    route: "Sài Gòn - Đà Lạt",
    price: "Từ 220.000đ",
    image:
      "https://kenh14cdn.com/2016/12662627-1265391450144557-7741251277725824130-n-1-1454160360419.jpg",
  },
  {
    route: "Hà Nội - Hạ Long",
    price: "Từ 180.000đ",
    image:
      "https://cdn-media.sforum.vn/storage/app/media/anh-vinh-ha-long-28.jpg",
  },
  {
    route: "Đà Nẵng - Huế",
    price: "Từ 150.000đ",
    image:
      "https://static-images.vnncdn.net/files/publish/2022/8/24/emag-cover-desk-240.jpg?width=0&s=G6YvaRqM9_6S67asebgCXQ",
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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getPromotionValue(item, keys, fallback = "") {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
  }
  return fallback;
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatPromotionDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getPromotionTitle(item) {
  const type = Number(
    getPromotionValue(item, ["discountType", "DiscountType"], 1),
  );
  const value = Number(
    getPromotionValue(item, ["discountValue", "DiscountValue"], 0),
  );
  const maxDiscount = Number(
    getPromotionValue(item, ["maxDiscount", "MaxDiscount"], 0),
  );

  if (type === 1) {
    return `Giảm ${value}%${maxDiscount > 0 ? ` tối đa ${formatMoney(maxDiscount)}` : ""}`;
  }

  return `Giảm ${formatMoney(value)}`;
}

function getPromotionRules(item) {
  const minOrder = Number(
    getPromotionValue(item, ["minOrderValue", "MinOrderValue"], 0),
  );
  const remainingUses = getPromotionValue(
    item,
    ["remainingUses", "RemainingUses"],
    null,
  );
  const endDate = getPromotionValue(item, ["endDate", "EndDate"]);
  const rules = [];

  if (minOrder > 0) rules.push(`Đơn tối thiểu ${formatMoney(minOrder)}`);
  rules.push(
    remainingUses === null
      ? "Không giới hạn lượt dùng"
      : `Còn ${remainingUses} lượt`,
  );
  rules.push(`Hạn dùng đến ${formatPromotionDate(endDate)}`);
  return rules;
}

function getPromotionDescription(item) {
  return (
    getPromotionValue(item, ["description", "Description"], "") ||
    "Áp dụng theo điều kiện của chương trình ưu đãi."
  );
}

function getVisibleItems(items, start, size = 3) {
  if (!items.length) return [];
  return Array.from(
    { length: Math.min(size, items.length) },
    (_, index) => items[(start + index) % items.length],
  );
}

// function LocationPicker({
//   label,
//   value,
//   onChange,
//   options,
//   icon,
//   accentClass,
//   placeholder,
// }) {
//   const [open, setOpen] = useState(false);
//   const [isTyping, setIsTyping] = useState(false);
//   const filteredOptions = useMemo(() => {
//     const keyword = isTyping ? normalizeText(value) : "";
//     const source = keyword
//       ? options.filter((item) => normalizeText(item).includes(keyword))
//       : options;
//     return source.slice(0, 12);
//   }, [isTyping, options, value]);

//   const selectLocation = (location) => {
//     onChange(location);
//     setIsTyping(false);
//     setOpen(false);
//   };

//   return (
//     <div className={`home-location-picker ${open ? "open" : ""}`}>
//       <i className={`fa-solid ${icon} ${accentClass}`} />
//       <label>
//         <span>{label}</span>
//         <input
//           value={value}
//           placeholder={placeholder}
//           onFocus={() => {
//             setIsTyping(false);
//             setOpen(true);
//           }}
//           onChange={(event) => {
//             onChange(event.target.value);
//             setIsTyping(true);
//             setOpen(true);
//           }}
//           onBlur={() =>
//             window.setTimeout(() => {
//               setIsTyping(false);
//               setOpen(false);
//             }, 120)
//           }
//         />
//       </label>

//       {open && (
//         <div className="home-location-menu">
//           <strong>Địa điểm phổ biến</strong>
//           {filteredOptions.length > 0 ? (
//             filteredOptions.map((location) => (
//               <button
//                 type="button"
//                 key={location}
//                 onMouseDown={(event) => event.preventDefault()}
//                 onClick={() => selectLocation(location)}
//               >
//                 <i className="fa-solid fa-location-dot" />
//                 <span>{location}</span>
//               </button>
//             ))
//           ) : (
//             <p>Không có gợi ý phù hợp. Bạn có thể nhập tay.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
function LocationPicker({
  label,
  value,
  onChange,
  options,
  icon,
  accentClass,
  placeholder,
}) {
  const [open, setOpen] = useState(false);

  const selectLocation = (location) => {
    onChange(location);
    setOpen(false);
  };

  const filteredOptions = useMemo(() => {
    return options.slice(0, 12);
  }, [options]);

  return (
    <div className={`home-location-picker ${open ? "open" : ""}`}>
      <i className={`fa-solid ${icon} ${accentClass}`} />
      <label>
        <span>{label}</span>
        <input
          value={value}
          placeholder={placeholder}
          readOnly           // ← không cho gõ tay
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        />
      </label>

      {open && (
        <div className="home-location-menu">
          <strong>Địa điểm phổ biến</strong>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((location) => (
              <button
                type="button"
                key={location}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectLocation(location)}
              >
                <i className="fa-solid fa-location-dot" />
                <span>{location}</span>
              </button>
            ))
          ) : (
            <p>Không có gợi ý.</p>
          )}
        </div>
      )}
    </div>
  );
}

function DatePickerField({ label, value, min, onChange, icon, emptyText }) {
  const inputRef = useRef(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

  return (
    <button type="button" className="home-date-field" onClick={openPicker}>
      <i className={`fa-solid ${icon}`} />
      <span>{label}</span>
      <strong>{value ? formatDateLabel(value) : emptyText}</strong>
      <input
        ref={inputRef}
        type="date"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      />
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const today = useMemo(() => getToday(), []);
  // const [locations, setLocations] = useState([]);
  const [departureOptions, setDepartureOptions] = useState([]);
  const [arrivalOptions, setArrivalOptions] = useState([]);
  const [publicPromotions, setPublicPromotions] = useState([]);
  const [routeIndex, setRouteIndex] = useState(0);
  const [promotionIndex, setPromotionIndex] = useState(0);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    from: "",
    to: "",
    departureDate: today,
    isRoundTrip: false,
    returnDate: "",
  });

  // const locationOptions = useMemo(() => {
  //   return Array.from(
  //     new Set(
  //       locations.map((item) => String(item || "").trim()).filter(Boolean),
  //     ),
  //   ).sort((a, b) => a.localeCompare(b, "vi"));
  // }, [locations]);
  const visibleRoutes = useMemo(
    () => getVisibleItems(popularRoutes, routeIndex),
    [routeIndex],
  );
  const visiblePromotions = useMemo(
    () => getVisibleItems(publicPromotions, promotionIndex),
    [publicPromotions, promotionIndex],
  );

  // useEffect(() => {
  //   fetch(`${API_BASE}/api/trips/locations`)
  //     .then((response) => (response.ok ? response.json() : []))
  //     .then((data) => setLocations(Array.isArray(data) ? data : []))
  //     .catch(() => setLocations([]));
  // }, []);
  useEffect(() => {
  fetch(`${API_BASE}/api/trips/locations`)
    .then((response) => response.json())
    .then((data) => {
      setDepartureOptions(data.departures || []);
      setArrivalOptions(data.arrivals || []);
    })
    .catch(() => {
      setDepartureOptions([]);
      setArrivalOptions([]);
    });
}, []);

  useEffect(() => {
    promotionApi
      .publicList()
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setPublicPromotions(items);
        setSelectedPromotion(items[0] || null);
      })
      .catch(() => setPublicPromotions([]));
  }, []);

  const updateForm = (key, value) => {
    setError("");
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "isRoundTrip" && !value) next.returnDate = "";
      return next;
    });
  };

  const swapLocations = () => {
    setError("");
    setForm((current) => ({
      ...current,
      from: current.to,
      to: current.from,
    }));
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

    localStorage.setItem("lastTripSearchQuery", query.toString());
    navigate(`/search-results?${query.toString()}`);
  };

  const copyPromotionCode = async (code) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const input = document.createElement("input");
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  };

  const moveCarousel = (setter, total, step) => {
    if (total <= 3) return;
    setter((current) => (current + step + total) % total);
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

          <form
            className="featured-search modern-home-search"
            onSubmit={submit}
          >
            <div className="home-search-widget">
              {/* <LocationPicker  */}
                {/* label="Nơi xuất phát"
                value={form.from}
                onChange={(value) => updateForm("from", value)}
                options={locationOptions}
                icon="fa-circle-dot"
                accentClass="from"
                placeholder="Chọn điểm đi"
              /> */}
              <LocationPicker
                label="Nơi xuất phát"
                value={form.from}
                onChange={(value) => updateForm("from", value)}
                options={departureOptions}
                icon="fa-circle-dot"
                accentClass="from"
                placeholder="Chọn điểm đi"
              />
              <button
                type="button"
                className="home-swap-button"
                onClick={swapLocations}
                aria-label="Đổi điểm đi và điểm đến"
              >
                <i className="fa-solid fa-right-left" />
              </button>

              {/* <LocationPicker
                label="Nơi đến"
                value={form.to}
                onChange={(value) => updateForm("to", value)}
                options={locationOptions}
                icon="fa-location-dot"
                accentClass="to"
                placeholder="Chọn điểm đến"
              /> */}
              <LocationPicker
                label="Nơi đến"
                value={form.to}
                onChange={(value) => updateForm("to", value)}
                options={arrivalOptions}
                icon="fa-location-dot"
                accentClass="to"
                placeholder="Chọn điểm đến"
              />
              <DatePickerField
                label="Ngày đi"
                value={form.departureDate}
                min={today}
                onChange={(value) => updateForm("departureDate", value)}
                icon="fa-calendar-days"
                emptyText="Chọn ngày đi"
              />

              {/* {form.isRoundTrip ? (
                <DatePickerField
                  label="Ngày về"
                  value={form.returnDate}
                  min={form.departureDate || today}
                  onChange={(value) => updateForm("returnDate", value)}
                  icon="fa-calendar-plus"
                  emptyText="Chọn ngày về"
                />
              ) : (
                <button
                  type="button"
                  className="home-return-button"
                  onClick={() => updateForm("isRoundTrip", true)}
                >
                  <i className="fa-solid fa-plus" />
                  Thêm ngày về
                </button>
              )} */}
              {form.isRoundTrip ? (
              <div className="return-date-wrapper">
                <DatePickerField
                  label="Ngày về"
                  value={form.returnDate}
                  min={form.departureDate || today}
                  onChange={(value) => updateForm("returnDate", value)}
                  icon="fa-calendar-plus"
                  emptyText="Chọn ngày về"
                />
                <button
                  type="button"
                  className="remove-return-date-btn"
                  onClick={() => {
                    updateForm("returnDate", null);
                    updateForm("isRoundTrip", false);
                  }}
                  title="Bỏ ngày về"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="home-return-button"
                onClick={() => updateForm("isRoundTrip", true)}
              >
                <i className="fa-solid fa-plus" />
                Thêm ngày về
              </button>
            )}

              <button type="submit" className="home-search-button">
                Tìm kiếm
              </button>
            </div>

            {error && <p className="search-error">{error}</p>}
          </form>
        </div>
      </section>

      <section className="container home-section">
        <div className="home-section-row">
          <div className="home-section-head">
            <span>Tuyến phổ biến</span>
            <h2>Những hành trình được chọn nhiều</h2>
          </div>
          <div className="home-carousel-actions">
            <button
              type="button"
              onClick={() =>
                moveCarousel(setRouteIndex, popularRoutes.length, -1)
              }
              aria-label="Xem hành trình trước"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button
              type="button"
              onClick={() =>
                moveCarousel(setRouteIndex, popularRoutes.length, 1)
              }
              aria-label="Xem hành trình tiếp theo"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
        <div className="home-route-grid">
          {visibleRoutes.map((item) => (
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

      <section id="offers" className="container home-section">
        <div className="home-section-row">
          <div className="home-section-head">
            <span>Ưu đãi</span>
            <h2>Tiết kiệm hơn cho mỗi chuyến đi</h2>
          </div>
          {publicPromotions.length > 3 && (
            <div className="home-carousel-actions">
              <button
                type="button"
                onClick={() =>
                  moveCarousel(setPromotionIndex, publicPromotions.length, -1)
                }
                aria-label="Xem mã trước"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button
                type="button"
                onClick={() =>
                  moveCarousel(setPromotionIndex, publicPromotions.length, 1)
                }
                aria-label="Xem mã tiếp theo"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          )}
        </div>
        {publicPromotions.length > 0 ? (
          <>
            <div className="promotion-showcase-grid">
              {visiblePromotions.map((item) => {
                const code = getPromotionValue(item, ["code", "Code"]);
                const selected =
                  selectedPromotion &&
                  getPromotionValue(selectedPromotion, ["code", "Code"]) ===
                    code;
                return (
                  <article
                    className={`promotion-showcase-card ${selected ? "selected" : ""}`}
                    key={code}
                  >
                    <button
                      type="button"
                      className="promotion-showcase-select"
                      onClick={() => setSelectedPromotion(item)}
                    >
                      <div className="promotion-showcase-top">
                        <i className="fa-solid fa-ticket" />
                        <span>Mã ưu đãi</span>
                      </div>
                      <h3>{getPromotionTitle(item)}</h3>
                      <div className="promotion-code-line">
                        <strong>{code}</strong>
                        <span>Bấm để xem chi tiết</span>
                      </div>
                      <ul>
                        {getPromotionRules(item).map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </button>
                    <button
                      type="button"
                      className="promotion-copy-button"
                      onClick={() => copyPromotionCode(code)}
                    >
                      Sao chép
                    </button>
                  </article>
                );
              })}
            </div>
            {selectedPromotion && (
              <div className="promotion-detail-panel">
                <span>Chi tiết mã</span>
                <h3>
                  {getPromotionValue(selectedPromotion, ["code", "Code"])}
                </h3>
                <p>{getPromotionDescription(selectedPromotion)}</p>
                <ul>
                  {getPromotionRules(selectedPromotion).map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="offer-grid">
            {offerItems.map((item) => (
              <article className="offer-card" key={item.title}>
                <i className={`fa-solid ${item.icon}`} />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        )}
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
