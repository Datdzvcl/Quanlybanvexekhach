const STEPS = [
  { label: 'CHỌN GHẾ', icon: 'fa-couch' },
  { label: 'ĐIỂM ĐÓN/TRẢ', icon: 'fa-map-pin' },
  { label: 'THÔNG TIN', icon: 'fa-address-card' },
  { label: 'THANH TOÁN', icon: 'fa-credit-card' },
];

export default function BookingSteps({ currentStep }) {
  return (
    <div className="booking-steps-bar">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={step.label} className="booking-step-row">
            <div className="booking-step-item">
              <div className={`booking-step-circle${isDone ? ' done' : isActive ? ' active' : ''}`}>
                {isDone
                  ? <i className="fa-solid fa-check" />
                  : <i className={`fa-solid ${step.icon}`} />
                }
              </div>
              <span className={`booking-step-label${isActive ? ' active' : isDone ? ' done' : ''}`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`booking-step-connector${isDone ? ' done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
