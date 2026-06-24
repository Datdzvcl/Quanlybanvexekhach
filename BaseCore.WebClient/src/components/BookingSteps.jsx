const STEPS = [
  { label: 'Chọn ghế',      icon: 'fa-couch' },
  { label: 'Điểm đón/trả',  icon: 'fa-location-dot' },
  { label: 'Thông tin',     icon: 'fa-address-card' },
  { label: 'Thanh toán',    icon: 'fa-credit-card' },
];

export default function BookingSteps({ step }) {
  return (
    <div className="booking-steps">
      {STEPS.map((s, index) => {
        const num = index + 1;
        const done    = num < step;
        const current = num === step;
        return (
          <div
            key={s.label}
            className={`booking-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}
          >
            <div className="booking-step-circle">
              {done
                ? <i className="fa-solid fa-check" />
                : <i className={`fa-solid ${s.icon}`} />}
            </div>
            <span className="booking-step-label">{s.label}</span>
            {index < STEPS.length - 1 && <div className="booking-step-line" />}
          </div>
        );
      })}
    </div>
  );
}
