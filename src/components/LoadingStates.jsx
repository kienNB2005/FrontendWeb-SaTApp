const DEFAULT_WIDTHS = ['54%', '72%', '46%', '62%', '38%', '58%', '44%', '50%'];

export function SkeletonLine({
  width = '100%',
  height = 12,
  radius = 6,
  className = '',
  style,
}) {
  return (
    <span
      aria-hidden="true"
      className={`sk-line ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function ButtonSpinner({ size = 14, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`btn-spinner ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  columnWidths,
  withAvatar = false,
  className = '',
}) {
  const widths = columnWidths || DEFAULT_WIDTHS.slice(0, columns);
  const template = withAvatar
    ? `36px ${widths.map(() => 'minmax(70px, 1fr)').join(' ')}`
    : widths.map(() => 'minmax(70px, 1fr)').join(' ');

  return (
    <div className={`sk-table ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="sk-table-row"
          style={{ gridTemplateColumns: template }}
        >
          {withAvatar && <SkeletonLine width={30} height={30} radius="50%" />}
          {widths.map((width, colIndex) => (
            <SkeletonLine
              key={colIndex}
              width={width}
              height={colIndex === 0 ? 14 : 12}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }) {
  return (
    <div className="sg sk-stat-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="sc sk-stat-card">
          <SkeletonLine width="42%" height={12} />
          <SkeletonLine width="34%" height={28} radius={8} />
          <SkeletonLine width="58%" height={11} />
        </div>
      ))}
    </div>
  );
}

export function ReportSkeleton({ rows = 7, columns = 6 }) {
  return (
    <>
      <StatGridSkeleton />
      <div className="card sk-report-card" aria-hidden="true">
        <div className="card-h">
          <div>
            <SkeletonLine width={150} height={14} />
            <SkeletonLine width={220} height={11} style={{ marginTop: 8 }} />
          </div>
          <SkeletonLine width={190} height={32} radius={8} />
        </div>
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    </>
  );
}

export function ScheduleSkeleton({ days = 6, rows = 5 }) {
  return (
    <div className="sk-schedule" aria-hidden="true">
      <div
        className="sk-schedule-head"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(120px, 1fr))` }}
      >
        {Array.from({ length: days }).map((_, index) => (
          <SkeletonLine key={index} width="70%" height={14} />
        ))}
      </div>
      <div
        className="sk-schedule-grid"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(120px, 1fr))` }}
      >
        {Array.from({ length: days * rows }).map((_, index) => (
          <div key={index} className="sk-schedule-cell">
            <SkeletonLine width="72%" height={12} />
            <SkeletonLine width="48%" height={10} />
            <SkeletonLine width="58%" height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}
