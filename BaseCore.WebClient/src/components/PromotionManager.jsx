import { useEffect, useMemo, useState } from 'react';
import { formatVND, pick } from '../api';
import { promotionApi } from '../services/promotionApi';

const EMPTY_PROMOTION = {
  promotionID: null,
  code: '',
  description: '',
  discountType: '1',
  discountValue: '',
  minOrderValue: '',
  maxDiscount: '',
  usageLimit: '',
  startDate: '',
  endDate: '',
  isActive: true,
  isPublic: true,
};

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapPromotionToForm(item) {
  return {
    promotionID: pick(item, ['promotionID', 'PromotionID'], null),
    code: pick(item, ['code', 'Code'], ''),
    description: pick(item, ['description', 'Description'], ''),
    discountType: String(pick(item, ['discountType', 'DiscountType'], 1)),
    discountValue: String(pick(item, ['discountValue', 'DiscountValue'], '')),
    minOrderValue: String(pick(item, ['minOrderValue', 'MinOrderValue'], '')),
    maxDiscount: String(pick(item, ['maxDiscount', 'MaxDiscount'], '')),
    usageLimit: String(pick(item, ['usageLimit', 'UsageLimit'], '')),
    startDate: toDateTimeLocal(pick(item, ['startDate', 'StartDate'], '')),
    endDate: toDateTimeLocal(pick(item, ['endDate', 'EndDate'], '')),
    isActive: Boolean(pick(item, ['isActive', 'IsActive'], true)),
    isPublic: Boolean(pick(item, ['isPublic', 'IsPublic'], true)),
  };
}

function formatDateTime(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function discountLabel(item) {
  const type = Number(pick(item, ['discountType', 'DiscountType'], 1));
  const value = Number(pick(item, ['discountValue', 'DiscountValue'], 0));
  return type === 1 ? `${value}%` : formatVND(value);
}

export default function PromotionManager({
  mode = 'operator',
  ModalComponent = null,
}) {
  const canEdit = mode === 'operator';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_PROMOTION);

  const title = mode === 'admin' ? 'Quản lý khuyến mãi' : 'Quản lý mã giảm giá';
  const subtitle = mode === 'admin'
    ? 'Danh sách toàn bộ chương trình khuyến mãi trong hệ thống.'
    : 'Tạo và quản lý mã giảm giá áp dụng cho khách đặt vé.';

  const load = async () => {
    setLoading(true);
    try {
      const data = await promotionApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || 'Không tải được danh sách mã giảm giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_PROMOTION);
    setShowForm(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description.trim() || null,
        discountType: Number(form.discountType),
        discountValue: Number(form.discountValue || 0),
        minOrderValue: form.minOrderValue === '' ? null : Number(form.minOrderValue),
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        startDate: fromDateTimeLocal(form.startDate),
        endDate: fromDateTimeLocal(form.endDate),
        isActive: Boolean(form.isActive),
        isPublic: Boolean(form.isPublic),
      };

      if (form.promotionID) {
        await promotionApi.update(form.promotionID, payload);
      } else {
        await promotionApi.create(payload);
      }

      resetForm();
      await load();
    } catch (err) {
      alert(err.message || 'Không lưu được mã giảm giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const activeCount = items.filter((item) => pick(item, ['isActive', 'IsActive'], false)).length;
    const publicCount = items.filter((item) => pick(item, ['isPublic', 'IsPublic'], false)).length;
    return { total: items.length, activeCount, publicCount };
  }, [items]);

  const table = (
    <div className="admin-card">
      <div className="admin-section-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="promotion-manager-actions">
          <button className="btn btn-outline" type="button" onClick={load}>
            <i className="fa-solid fa-rotate" /> Tải lại
          </button>
          {canEdit && ModalComponent && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setForm(EMPTY_PROMOTION);
                setShowForm(true);
              }}
            >
              <i className="fa-solid fa-plus" /> Thêm mã
            </button>
          )}
        </div>
      </div>

      <div className="promotion-summary-grid">
        <div><b>{summary.total}</b><span>Tổng mã</span></div>
        <div><b>{summary.activeCount}</b><span>Đang bật</span></div>
        <div><b>{summary.publicCount}</b><span>Công khai</span></div>
      </div>

      {loading ? (
        <div className="admin-empty">Đang tải dữ liệu...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty">Chưa có mã giảm giá nào.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Giảm</th>
                <th>Điều kiện</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                {mode === 'admin' && <th>Chủ mã</th>}
                {canEdit && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const id = pick(item, ['promotionID', 'PromotionID']);
                const isActive = Boolean(pick(item, ['isActive', 'IsActive'], false));
                const isPublic = Boolean(pick(item, ['isPublic', 'IsPublic'], false));
                return (
                  <tr key={id}>
                    <td>
                      <strong>{pick(item, ['code', 'Code'], '--')}</strong>
                      <div className="promotion-table-sub">
                        {pick(item, ['description', 'Description'], 'Không có mô tả')}
                      </div>
                    </td>
                    <td>{discountLabel(item)}</td>
                    <td>
                      Tối thiểu {formatVND(pick(item, ['minOrderValue', 'MinOrderValue'], 0))}
                      <div className="promotion-table-sub">
                        Tối đa {formatVND(pick(item, ['maxDiscount', 'MaxDiscount'], 0))} •
                        Còn {pick(item, ['remainingUses', 'RemainingUses'], '--')} lượt
                      </div>
                    </td>
                    <td>
                      {formatDateTime(pick(item, ['startDate', 'StartDate']))}
                      <div className="promotion-table-sub">
                        đến {formatDateTime(pick(item, ['endDate', 'EndDate']))}
                      </div>
                    </td>
                    <td>
                      <span className={`promotion-status-chip ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Đang bật' : 'Đã tắt'}
                      </span>
                      <div className="promotion-table-sub">{isPublic ? 'Công khai' : 'Riêng tư'}</div>
                    </td>
                    {mode === 'admin' && (
                      <td>{pick(item, ['ownerName'], '--')}</td>
                    )}
                    {canEdit && (
                      <td>
                        <div className="admin-table-actions">
                          <button
                            className="btn btn-outline"
                            type="button"
                            onClick={() => {
                              setForm(mapPromotionToForm(item));
                              setShowForm(true);
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('Tắt mã giảm giá này?')) return;
                              try {
                                await promotionApi.disable(id);
                                await load();
                              } catch (err) {
                                alert(err.message || 'Không tắt được mã giảm giá.');
                              }
                            }}
                          >
                            Tắt
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (!canEdit || !ModalComponent) return table;

  return (
    <>
      {table}
      {showForm && (
        <ModalComponent
          title={form.promotionID ? 'Cập nhật mã giảm giá' : 'Thêm mã giảm giá'}
          subtitle="Popup được căn giữa màn hình và chặn tương tác nền."
          size="wide"
          onClose={resetForm}
        >
          <form className="admin-form-grid admin-form-grid-modal" onSubmit={submit}>
            <input
              placeholder="Mã giảm giá"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              required
            />
            <select
              value={form.discountType}
              onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
            >
              <option value="1">Giảm theo %</option>
              <option value="2">Giảm số tiền cố định</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Giá trị giảm"
              value={form.discountValue}
              onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Đơn tối thiểu"
              value={form.minOrderValue}
              onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: event.target.value }))}
            />
            <input
              type="number"
              min="0"
              placeholder="Giảm tối đa"
              value={form.maxDiscount}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
            />
            <input
              type="number"
              min="1"
              placeholder="Giới hạn lượt dùng"
              value={form.usageLimit}
              onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))}
            />
            <input
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              required
            />
            <input
              type="datetime-local"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              required
            />
            <textarea
              className="admin-form-span-2"
              rows="4"
              placeholder="Mô tả điều kiện áp dụng"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <label className="promotion-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span>Đang bật</span>
            </label>
            <label className="promotion-toggle">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => setForm((prev) => ({ ...prev, isPublic: event.target.checked }))}
              />
              <span>Mã công khai</span>
            </label>
            <div className="admin-form-actions admin-form-span-2">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu mã'}
              </button>
              <button className="btn btn-outline" type="button" onClick={resetForm}>
                Hủy
              </button>
            </div>
          </form>
        </ModalComponent>
      )}
    </>
  );
}
