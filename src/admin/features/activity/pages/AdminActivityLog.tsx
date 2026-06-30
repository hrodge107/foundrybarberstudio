import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AdminLayout } from '../../layout/components/AdminLayout';
import { getActivityLogs } from '../../../services/activityLogs';
import type { ActivityLogItem } from '../../../../shared/types/log';
import type { SystemUser } from '../../../../shared/types/user';
import '../../../styles/AdminActivityLog.css';

interface AdminActivityLogProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CATEGORIES = ['All', 'Appointments', 'Barbers', 'Services', 'Schedule'] as const;

function CategoryGlidingTabs({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const el = refs.current[selectedCategory];
    if (el) {
      setIndicatorStyle({
        left: `${el.offsetLeft}px`,
        width: `${el.offsetWidth}px`,
      });
    }
  }, [selectedCategory]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '9999px',
        padding: '3px',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          bottom: '3px',
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          background: '#000000',
          borderRadius: '9999px',
          transition: 'left 0.4s cubic-bezier(0.65, 0, 0.35, 1), width 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
          zIndex: 1,
        }}
      />
      {CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat;
        return (
          <button
            key={cat}
            ref={(el) => { refs.current[cat] = el; }}
            type="button"
            onClick={() => onSelectCategory(cat)}
            style={{
              position: 'relative',
              zIndex: 2,
              background: 'transparent',
              border: 'none',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: isActive ? '#ffffff' : '#000000',
              cursor: 'pointer',
              borderRadius: '9999px',
              transition: 'color 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

export const AdminActivityLog: React.FC<AdminActivityLogProps> = ({ onLogout, systemUser }) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Month selector YYYY-MM, defaulting to current year & month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    const y = parseInt(selectedMonth.split('-')[0], 10);
    return isNaN(y) ? new Date().getFullYear() : y;
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsMonthPopoverOpen(false);
      }
    };
    if (isMonthPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthPopoverOpen]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter logs by selected month and category
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      const itemYearMonth = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      
      const matchesMonth = selectedMonth ? itemYearMonth === selectedMonth : true;
      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : item.category.toLowerCase() === selectedCategory.toLowerCase().slice(0, -1) ||
            item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesMonth && matchesCategory;
    });
  }, [logs, selectedMonth, selectedCategory]);

  // Group filtered logs by Day header
  const groupedLogs = useMemo(() => {
    const groups: { [dayKey: string]: { headerTitle: string; items: ActivityLogItem[] } } = {};
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredLogs.forEach((item) => {
      if (!item.created_at) return;
      const d = new Date(item.created_at);
      const dateStr = d.toDateString();

      let headerTitle = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (dateStr === todayStr) {
        headerTitle = `Today — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else if (dateStr === yesterdayStr) {
        headerTitle = `Yesterday — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }

      if (!groups[dateStr]) {
        groups[dateStr] = { headerTitle, items: [] };
      }
      groups[dateStr].items.push(item);
    });

    return Object.values(groups);
  }, [filteredLogs]);

  const getActionBadgeClass = (actionType: string) => {
    const act = actionType.toLowerCase();
    if (act.includes('booking') || act.includes('add') || act.includes('create')) return 'act-badge add';
    if (act.includes('confirm') || act.includes('finish') || act.includes('complete')) return 'act-badge complete';
    if (act.includes('cancel') || act.includes('delete') || act.includes('remove')) return 'act-badge danger';
    return 'act-badge edit';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'appointment':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case 'barber':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        );
      case 'service':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
          </svg>
        );
      case 'schedule':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  const formattedMonthLabel = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const mIndex = parseInt(mStr, 10) - 1;
    if (mIndex >= 0 && mIndex < 12) {
      return `${FULL_MONTH_NAMES[mIndex]} ${yStr}`;
    }
    return selectedMonth;
  }, [selectedMonth]);

  const handleSelectMonth = (monthIdx: number) => {
    const mStr = String(monthIdx + 1).padStart(2, '0');
    setSelectedMonth(`${pickerYear}-${mStr}`);
    setIsMonthPopoverOpen(false);
  };

  const [currSelYear, currSelMonth] = useMemo(() => {
    const parts = selectedMonth.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [selectedMonth]);

  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="activity">
      <div className="admin-page-container">
        {/* Top Sticky Dashboard Control Header */}
        <div className="admin-top-toolbar">
          <div className="toolbar-left">
            <h1 className="admin-page-title">Activity Log</h1>
            <span className="admin-page-subtitle">Simple audit of system & appointment changes</span>
          </div>

          <div className="toolbar-right">
            <div className="custom-month-selector-container" ref={popoverRef}>
              <button
                type="button"
                className={`month-trigger-btn ${isMonthPopoverOpen ? 'active' : ''}`}
                onClick={() => {
                  setPickerYear(currSelYear || new Date().getFullYear());
                  setIsMonthPopoverOpen(!isMonthPopoverOpen);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="trigger-label">Month: <strong>{formattedMonthLabel}</strong></span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`chevron-icon ${isMonthPopoverOpen ? 'open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isMonthPopoverOpen && (
                <div className="month-popover-card">
                  <div className="popover-year-header">
                    <button
                      type="button"
                      className="year-nav-btn"
                      onClick={() => setPickerYear((prev) => prev - 1)}
                      title="Previous Year"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span className="popover-year-text">{pickerYear}</span>
                    <button
                      type="button"
                      className="year-nav-btn"
                      onClick={() => setPickerYear((prev) => prev + 1)}
                      title="Next Year"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>

                  <div className="popover-month-grid">
                    {MONTH_NAMES.map((mName, idx) => {
                      const isSelected = pickerYear === currSelYear && idx + 1 === currSelMonth;
                      return (
                        <button
                          key={mName}
                          type="button"
                          className={`month-grid-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectMonth(idx)}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Pills & Refresh Bar */}
        <div className="admin-sub-toolbar">
          <CategoryGlidingTabs
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <button type="button" className="btn-secondary-sm" onClick={fetchLogs} title="Refresh Logs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Main Content Area */}
        <div className="admin-content-viewport">
          {isLoading ? (
            <div className="admin-loading-state">
              <p>Loading activity records...</p>
            </div>
          ) : groupedLogs.length === 0 ? (
            <div className="admin-empty-state">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <circle cx="11.5" cy="14.5" r="2.5" />
                  <line x1="13.25" y1="16.25" x2="16" y2="19" />
                </svg>
              </div>
              <h3>No Activity Logs Found</h3>
              <p>There are no recorded actions matching the selected filters.</p>
            </div>
          ) : (
            <div className="activity-timeline-container">
              {groupedLogs.map((group, gIdx) => (
                <div key={gIdx} className="activity-day-group">
                  <div className="day-group-header">
                    <h3>{group.headerTitle}</h3>
                    <span className="day-count-badge">{group.items.length} {group.items.length === 1 ? 'change' : 'changes'}</span>
                  </div>

                  <div className="day-items-list">
                    {group.items.map((item, iIdx) => {
                      const timeStr = item.created_at
                        ? new Date(item.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '';

                      return (
                        <div key={item.id || iIdx} className="activity-log-card">
                          <div className="log-card-left">
                            <div className={`log-cat-icon ${item.category}`}>
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="log-info">
                              <div className="log-header-line">
                                <span className={getActionBadgeClass(item.action_type)}>
                                  {item.action_type.toUpperCase()}
                                </span>
                                <span className="log-cat-tag">{item.category}</span>
                              </div>
                              <p className="log-desc">{item.description}</p>
                            </div>
                          </div>

                          <div className="log-card-right">
                            <span className="log-user">By {item.performed_by || 'System'}</span>
                            <span className="log-time">{timeStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

