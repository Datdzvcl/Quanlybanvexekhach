export default function StatusBadge({ children, className = "" }) {
  return <span className={`badge ${className}`.trim()}>{children}</span>;
}
