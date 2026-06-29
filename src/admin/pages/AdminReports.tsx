import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { AdminLayout } from '../components/AdminLayout';
import type { SystemUser } from '../../App';

interface AdminReportsProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

type TimePeriod = 'today' | '7days' | '30days';

interface AppointmentRecord {
  id: number;
  customer_id: number;
  barber_id: number;
  service_id: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  service?: {
    id: number;
    name: string;
    price: number;
    category_name: string;
  };
  barber?: {
    id: number;
    name: string;
  };
  customer?: {
    id: number;
    name: string;
  };
}

export const AdminReports: React.FC<AdminReportsProps> = ({ onLogout, systemUser }) => {
  const [period, setPeriod] = useState<TimePeriod>('30days');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          customer_id,
          barber_id,
          service_id,
          appointment_date,
          status,
          service:services(id, name, price, category_name),
          barber:barbers(id, name),
          customer:customers(id, name)
        `)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments((data as unknown as AppointmentRecord[]) || []);
    } catch (err: unknown) {
      console.error('Error fetching report data:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load report analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter ranges
  const { currentStart, currentEnd, priorStart, priorEnd } = useMemo(() => {
    const now = new Date();
    let cStart = new Date();
    let cEnd = new Date(now);
    let pStart = new Date();
    let pEnd = new Date();

    if (period === 'today') {
      cStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      cEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      pStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      pEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (period === '7days') {
      cEnd = new Date(now);
      cStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      pEnd = new Date(cStart.getTime() - 1);
      pStart = new Date(pEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      // 30days
      cEnd = new Date(now);
      cStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      pEnd = new Date(cStart.getTime() - 1);
      pStart = new Date(pEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { currentStart: cStart, currentEnd: cEnd, priorStart: pStart, priorEnd: pEnd };
  }, [period]);

  // Current vs Prior Appointments
  const currentAppts = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.appointment_date);
      return d >= currentStart && d <= currentEnd;
    });
  }, [appointments, currentStart, currentEnd]);

  const priorAppts = useMemo(() => {
    return appointments.filter((a) => {
      const d = new Date(a.appointment_date);
      return d >= priorStart && d <= priorEnd;
    });
  }, [appointments, priorStart, priorEnd]);

  // Earliest appointment per customer (for new client calculation)
  const customerEarliestMap = useMemo(() => {
    const map = new Map<number, Date>();
    appointments.forEach((a) => {
      const d = new Date(a.appointment_date);
      const existing = map.get(a.customer_id);
      if (!existing || d < existing) {
        map.set(a.customer_id, d);
      }
    });
    return map;
  }, [appointments]);

  // KPI Calculations
  const kpis = useMemo(() => {
    // 1. Revenue
    const currRev = currentAppts
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + (Number(a.service?.price) || 0), 0);
    const prevRev = priorAppts
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + (Number(a.service?.price) || 0), 0);
    const revDelta = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : currRev > 0 ? 100 : 0;

    // 2. Appointments (Completed + Confirmed)
    const currCount = currentAppts.filter((a) => a.status === 'Completed' || a.status === 'Confirmed').length;
    const prevCount = priorAppts.filter((a) => a.status === 'Completed' || a.status === 'Confirmed').length;
    const apptDelta = prevCount > 0 ? ((currCount - prevCount) / prevCount) * 100 : currCount > 0 ? 100 : 0;

    // 3. Unique Clients & New Clients
    const completedCurrent = currentAppts.filter((a) => a.status === 'Completed');
    const uniqueClientsCount = new Set(completedCurrent.map((a) => a.customer_id)).size;

    let newClientsCount = 0;
    customerEarliestMap.forEach((earliestDate, customerId) => {
      if (earliestDate >= currentStart && earliestDate <= currentEnd) {
        if (completedCurrent.some((a) => a.customer_id === customerId)) {
          newClientsCount++;
        }
      }
    });

    // 4. Cancellation Rate
    const currCancels = currentAppts.filter((a) => a.status === 'Cancelled').length;
    const currTotal = currentAppts.length;
    const cancRate = currTotal > 0 ? (currCancels / currTotal) * 100 : 0;

    const prevCancels = priorAppts.filter((a) => a.status === 'Cancelled').length;
    const prevTotal = priorAppts.length;
    const prevCancRate = prevTotal > 0 ? (prevCancels / prevTotal) * 100 : 0;
    const cancRateDelta = cancRate - prevCancRate; // percentage points

    return {
      currRev,
      revDelta,
      currCount,
      apptDelta,
      uniqueClientsCount,
      newClientsCount,
      cancRate,
      cancRateDelta,
    };
  }, [currentAppts, priorAppts, customerEarliestMap, currentStart, currentEnd]);

  // Bookings by Status (Donut)
  const statusCounts = useMemo(() => {
    const counts = { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 };
    currentAppts.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++;
      }
    });
    return counts;
  }, [currentAppts]);

  // Daily Appointments Chart Data (Stacked bar Completed vs Cancelled)
  const dailyChartData = useMemo(() => {
    if (period === 'today') {
      const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 8 AM to 7 PM
      return hours.map((h) => {
        const completed = currentAppts.filter((a) => {
          const d = new Date(a.appointment_date);
          return d.getHours() === h && a.status === 'Completed';
        }).length;
        const cancelled = currentAppts.filter((a) => {
          const d = new Date(a.appointment_date);
          return d.getHours() === h && a.status === 'Cancelled';
        }).length;
        const label = `${h > 12 ? h - 12 : h}${h >= 12 ? 'PM' : 'AM'}`;
        return { label, completed, cancelled };
      });
    }

    const dateMap = new Map<string, { completed: number; cancelled: number }>();
    const daysCount = period === '7days' ? 7 : 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(currentEnd.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { completed: 0, cancelled: 0 });
    }

    currentAppts.forEach((a) => {
      const key = new Date(a.appointment_date).toISOString().split('T')[0];
      if (dateMap.has(key)) {
        const entry = dateMap.get(key)!;
        if (a.status === 'Completed') entry.completed++;
        if (a.status === 'Cancelled') entry.cancelled++;
      }
    });

    return Array.from(dateMap.entries()).map(([dateStr, counts]) => {
      const d = new Date(dateStr + 'T00:00:00');
      const label = period === '7days' 
        ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
        : `${d.getMonth() + 1}/${d.getDate()}`;
      return { label, completed: counts.completed, cancelled: counts.cancelled };
    });
  }, [currentAppts, period, currentEnd]);

  // Revenue by Service Category
  const categoryRevenue = useMemo(() => {
    const map = new Map<string, { revenue: number; volume: number }>();
    currentAppts.forEach((a) => {
      if (a.status === 'Completed' && a.service) {
        const cat = a.service.category_name || 'Uncategorized';
        const existing = map.get(cat) || { revenue: 0, volume: 0 };
        map.set(cat, {
          revenue: existing.revenue + Number(a.service.price),
          volume: existing.volume + 1,
        });
      }
    });
    const totalRev = Array.from(map.values()).reduce((sum, item) => sum + item.revenue, 0);
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        volume: data.volume,
        percentage: totalRev > 0 ? (data.revenue / totalRev) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [currentAppts]);

  // Busiest Hours (8 AM to 8 PM)
  const busiestHours = useMemo(() => {
    const hours = Array.from({ length: 13 }, (_, i) => 8 + i); // 8 to 20
    const map = new Map<number, number>();
    hours.forEach((h) => map.set(h, 0));

    currentAppts.forEach((a) => {
      if (a.status === 'Completed') {
        const h = new Date(a.appointment_date).getHours();
        if (map.has(h)) {
          map.set(h, map.get(h)! + 1);
        }
      }
    });

    return hours.map((h) => ({
      hour: h,
      label: h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`,
      count: map.get(h) || 0,
    }));
  }, [currentAppts]);

  // Bookings by Day of Week (Mon - Sun)
  const dayOfWeekData = useMemo(() => {
    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    currentAppts.forEach((a) => {
      if (a.status === 'Completed') {
        const dayIdx = new Date(a.appointment_date).getDay(); // 0 is Sun
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIdx];
        counts[dayName] = (counts[dayName] || 0) + 1;
      }
    });

    return daysOrder.map((day) => ({ day, count: counts[day] }));
  }, [currentAppts]);

  // Top Services by Revenue
  const topServices = useMemo(() => {
    const map = new Map<string, { revenue: number; bookings: number }>();
    currentAppts.forEach((a) => {
      if (a.status === 'Completed' && a.service) {
        const name = a.service.name;
        const existing = map.get(name) || { revenue: 0, bookings: 0 };
        map.set(name, {
          revenue: existing.revenue + Number(a.service.price),
          bookings: existing.bookings + 1,
        });
      }
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, revenue: data.revenue, bookings: data.bookings }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [currentAppts]);

  // Barber Performance
  const barberPerformance = useMemo(() => {
    const map = new Map<string, number>();
    currentAppts.forEach((a) => {
      if (a.status === 'Completed' && a.barber) {
        const bName = a.barber.name;
        map.set(bName, (map.get(bName) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [currentAppts]);

  // CSV Export Handler
  const exportCSV = () => {
    let csv = `Foundry Barber Studio — Analytics Report (${period.toUpperCase()})\n`;
    csv += `Generated At,${new Date().toLocaleString()}\n\n`;

    csv += `KEY PERFORMANCE INDICATORS\n`;
    csv += `Metric,Value,Delta vs Prior Period\n`;
    csv += `Revenue,₱${kpis.currRev.toLocaleString('en-US', { minimumFractionDigits: 2 })},${kpis.revDelta >= 0 ? '+' : ''}${kpis.revDelta.toFixed(1)}%\n`;
    csv += `Appointments (Completed/Confirmed),${kpis.currCount},${kpis.apptDelta >= 0 ? '+' : ''}${kpis.apptDelta.toFixed(1)}%\n`;
    csv += `Unique Clients,${kpis.uniqueClientsCount},${kpis.newClientsCount} New Clients\n`;
    csv += `Cancellation Rate,${kpis.cancRate.toFixed(1)}%,${kpis.cancRateDelta >= 0 ? '+' : ''}${kpis.cancRateDelta.toFixed(1)} pp\n\n`;

    csv += `REVENUE BY SERVICE CATEGORY\n`;
    csv += `Category,Revenue (PHP),Bookings Volume,Share\n`;
    categoryRevenue.forEach((c) => {
      csv += `"${c.category}",₱${c.revenue.toFixed(2)},${c.volume},${c.percentage.toFixed(1)}%\n`;
    });
    csv += `\n`;

    csv += `TOP SERVICES BY REVENUE\n`;
    csv += `Service Name,Total Revenue (PHP),Completed Bookings\n`;
    topServices.forEach((s) => {
      csv += `"${s.name}",₱${s.revenue.toFixed(2)},${s.bookings}\n`;
    });
    csv += `\n`;

    csv += `BARBER PERFORMANCE WORKLOAD\n`;
    csv += `Barber Name,Completed Appointments\n`;
    barberPerformance.forEach((b) => {
      csv += `"${b.name}",${b.count}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `foundry_barber_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalStatusAppts = currentAppts.length;
  const donutSegments = useMemo(() => {
    if (totalStatusAppts === 0) return [];
    const colors = {
      Completed: '#10b981',
      Confirmed: '#3b82f6',
      Pending: '#f59e0b',
      Cancelled: '#ef4444',
    };

    let accumulatedAngle = 0;
    return (['Completed', 'Confirmed', 'Pending', 'Cancelled'] as const).map((st) => {
      const count = statusCounts[st] || 0;
      const pct = (count / totalStatusAppts) * 100;
      const angle = (count / totalStatusAppts) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return { status: st, count, pct, color: colors[st], startAngle, angle };
    });
  }, [statusCounts, totalStatusAppts]);

  const maxDailyVal = Math.max(
    1,
    ...dailyChartData.map((d) => d.completed + d.cancelled)
  );

  const maxHourVal = Math.max(1, ...busiestHours.map((h) => h.count));
  const maxDayVal = Math.max(1, ...dayOfWeekData.map((d) => d.count));
  const maxBarberVal = Math.max(1, ...barberPerformance.map((b) => b.count));

  return (
    <AdminLayout activeTab="reports" onLogout={onLogout} systemUser={systemUser}>
      <div className="admin-reports-page">
        {/* Header Bar */}
        <header className="reports-header">
          <div>
            <h1 className="reports-title">Reports & Analytics</h1>
            <p className="reports-subtitle">Foundry Barber Studio operations, financial performance, and staffing insights.</p>
          </div>

          <div className="reports-actions">
            {/* Time Period Selector */}
            <div className="period-selector-group">
              <button
                type="button"
                className={`period-btn ${period === 'today' ? 'active' : ''}`}
                onClick={() => setPeriod('today')}
              >
                Today
              </button>
              <button
                type="button"
                className={`period-btn ${period === '7days' ? 'active' : ''}`}
                onClick={() => setPeriod('7days')}
              >
                Last 7 days
              </button>
              <button
                type="button"
                className={`period-btn ${period === '30days' ? 'active' : ''}`}
                onClick={() => setPeriod('30days')}
              >
                Last 30 days
              </button>
            </div>

            <button type="button" className="admin-btn-secondary export-btn" onClick={exportCSV}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </header>

        {errorMsg && <div className="admin-alert error">{errorMsg}</div>}

        {isLoading ? (
          <div className="admin-loading-spinner-wrapper">
            <div className="spinner"></div>
            <span>Loading analytics metrics...</span>
          </div>
        ) : (
          <div className="reports-body-grid">
            {/* 1. KPI Row (4 Headline Cards) */}
            <section className="kpi-headline-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Revenue</span>
                  <div className="kpi-icon-badge green">₱</div>
                </div>
                <div className="kpi-value">₱{kpis.currRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className={`kpi-delta ${kpis.revDelta >= 0 ? 'positive' : 'negative'}`}>
                  {kpis.revDelta >= 0 ? '↑' : '↓'} {Math.abs(kpis.revDelta).toFixed(1)}% vs prior period
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Appointments</span>
                  <div className="kpi-icon-badge blue">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                    </svg>
                  </div>
                </div>
                <div className="kpi-value">{kpis.currCount}</div>
                <div className={`kpi-delta ${kpis.apptDelta >= 0 ? 'positive' : 'negative'}`}>
                  {kpis.apptDelta >= 0 ? '↑' : '↓'} {Math.abs(kpis.apptDelta).toFixed(1)}% vs prior period
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Unique Clients</span>
                  <div className="kpi-icon-badge purple">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>
                <div className="kpi-value">{kpis.uniqueClientsCount}</div>
                <div className="kpi-delta positive" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />
                  </svg>
                  <span>{kpis.newClientsCount} new client{kpis.newClientsCount === 1 ? '' : 's'} this period</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Cancellation Rate</span>
                  <div className="kpi-icon-badge red">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                </div>
                <div className="kpi-value">{kpis.cancRate.toFixed(1)}%</div>
                <div className={`kpi-delta ${kpis.cancRateDelta <= 0 ? 'positive' : 'negative'}`}>
                  {kpis.cancRateDelta > 0 ? '↑' : '↓'} {Math.abs(kpis.cancRateDelta).toFixed(1)} pp vs prior period
                </div>
              </div>
            </section>

            {/* Main Visual Row 1: Daily Appointments Stacked Bar & Bookings Status Donut */}
            <div className="reports-row-split-60-40">
              {/* Daily Appointments Chart */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Daily Appointments Trend</h2>
                    <p className="panel-subtitle">Stacked overlay of Completed vs Cancelled bookings.</p>
                  </div>
                  <div className="chart-legend-inline">
                    <span className="legend-item"><span className="dot emerald"></span> Completed</span>
                    <span className="legend-item"><span className="dot rose"></span> Cancelled</span>
                  </div>
                </div>

                <div className="stacked-bar-chart-container">
                  {dailyChartData.length === 0 ? (
                    <div className="empty-chart-notice">No booking activity recorded for this date range.</div>
                  ) : (
                    <div className="stacked-bars-flex">
                      {dailyChartData.map((d, idx) => {
                        const total = d.completed + d.cancelled;
                        const compPct = total > 0 ? (d.completed / total) * 100 : 0;
                        const cancPct = total > 0 ? (d.cancelled / total) * 100 : 0;
                        const barHeightPct = (total / maxDailyVal) * 100;

                        return (
                          <div key={idx} className="stacked-bar-col" title={`${d.label}: ${d.completed} Completed, ${d.cancelled} Cancelled`}>
                            <div className="bar-track" style={{ height: `${Math.max(12, barHeightPct)}%` }}>
                              {d.completed > 0 && (
                                <div className="bar-seg emerald" style={{ height: `${compPct}%` }}>
                                  {d.completed >= 3 && <span className="seg-label">{d.completed}</span>}
                                </div>
                              )}
                              {d.cancelled > 0 && (
                                <div className="bar-seg rose" style={{ height: `${cancPct}%` }}>
                                  {d.cancelled >= 3 && <span className="seg-label">{d.cancelled}</span>}
                                </div>
                              )}
                            </div>
                            <span className="col-label">{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bookings by Status Donut */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Bookings by Status</h2>
                    <p className="panel-subtitle">Distribution of queue processing state.</p>
                  </div>
                </div>

                <div className="donut-chart-wrapper">
                  <div className="donut-svg-container">
                    <svg viewBox="0 0 100 100" className="donut-svg">
                      {totalStatusAppts === 0 ? (
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                      ) : (
                        donutSegments.map((seg, i) => {
                          const radius = 35;
                          const circumference = 2 * Math.PI * radius;
                          const strokeDasharray = `${(seg.pct / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -((seg.startAngle / 360) * circumference);

                          return (
                            <circle
                              key={i}
                              cx="50"
                              cy="50"
                              r={radius}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="16"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              style={{ transition: 'stroke-dasharray 0.5s ease' }}
                            />
                          );
                        })
                      )}
                    </svg>
                    <div className="donut-center-text">
                      <span className="donut-total">{totalStatusAppts}</span>
                      <span className="donut-sub">Total</span>
                    </div>
                  </div>

                  <div className="donut-legend">
                    {(['Completed', 'Confirmed', 'Pending', 'Cancelled'] as const).map((st) => {
                      const colors = { Completed: '#10b981', Confirmed: '#3b82f6', Pending: '#f59e0b', Cancelled: '#ef4444' };
                      const count = statusCounts[st] || 0;
                      const pct = totalStatusAppts > 0 ? ((count / totalStatusAppts) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={st} className={`legend-row ${count > 0 ? 'has-count' : 'zero-count'}`}>
                          <span className="legend-color-dot" style={{ backgroundColor: colors[st] }}></span>
                          <span className="legend-name">{st}</span>
                          <span className="legend-count">{count}</span>
                          <span className={`legend-pill ${st.toLowerCase()}`}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {statusCounts.Pending > 3 && (
                  <div className="status-queue-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span><strong>{statusCounts.Pending} pending bookings</strong> awaiting processing in queue.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Visual Row 2: Revenue by Category & Busiest Hours */}
            <div className="reports-row-split-50-50">
              {/* Revenue by Service Category */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Revenue by Service Category</h2>
                    <p className="panel-subtitle">Financial revenue driver breakdown vs booking volume.</p>
                  </div>
                </div>

                <div className="category-revenue-list">
                  {categoryRevenue.length === 0 ? (
                    <div className="empty-chart-notice">No service category data recorded.</div>
                  ) : (
                    categoryRevenue.map((cat, idx) => (
                      <div key={idx} className="category-progress-item">
                        <div className="cat-meta">
                          <span className="cat-name">{cat.category}</span>
                          <span className="cat-vals">
                            <strong>₱{cat.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                            <span className="cat-vol">({cat.volume} cuts)</span>
                          </span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${Math.max(4, cat.percentage)}%` }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Busiest Hours */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Busiest Hours</h2>
                    <p className="panel-subtitle">Peak appointment demand distribution (8 AM – 8 PM).</p>
                  </div>
                </div>

                <div className="hourly-chart-container">
                  <div className="hourly-bars-flex">
                    {busiestHours.map((h, idx) => {
                      const barHeight = (h.count / maxHourVal) * 100;
                      const isPeak = h.count === maxHourVal && maxHourVal > 0;

                      return (
                        <div key={idx} className="hourly-col" title={`${h.label}: ${h.count} appointments`}>
                          <div className="hourly-bar-track">
                            <div
                              className={`hourly-bar-fill ${isPeak ? 'peak' : ''}`}
                              style={{ height: `${Math.max(8, barHeight)}%` }}
                            >
                              {h.count > 0 && <span className="hourly-val">{h.count}</span>}
                            </div>
                          </div>
                          <span className="hourly-label">{h.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Visual Row 3: Bookings by Day of Week, Top Services & Barber Performance */}
            <div className="reports-row-split-3-col">
              {/* Day of Week */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Bookings by Day</h2>
                    <p className="panel-subtitle">Mon–Sun workload analysis.</p>
                  </div>
                </div>
                <div className="dow-bars-flex">
                  {dayOfWeekData.map((d, idx) => {
                    const barHeight = (d.count / maxDayVal) * 100;
                    const isSat = d.day === 'Sat';

                    return (
                      <div key={idx} className="dow-col" title={`${d.day}: ${d.count} appointments`}>
                        <div className="dow-bar-track">
                          <div
                            className={`dow-bar-fill ${isSat ? 'sat-highlight' : ''}`}
                            style={{ height: `${Math.max(8, barHeight)}%` }}
                          >
                            {d.count > 0 && <span className="dow-val">{d.count}</span>}
                          </div>
                        </div>
                        <span className="dow-label">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Services */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Top Services</h2>
                    <p className="panel-subtitle">Highest revenue offerings.</p>
                  </div>
                </div>
                <div className="top-services-list">
                  {topServices.length === 0 ? (
                    <div className="empty-chart-notice">No service transactions.</div>
                  ) : (
                    topServices.map((s, idx) => (
                      <div key={idx} className="top-service-row">
                        <div className="service-rank">#{idx + 1}</div>
                        <div className="service-details">
                          <span className="service-name">{s.name}</span>
                          <span className="service-sub">{s.bookings} bookings</span>
                        </div>
                        <div className="service-rev">₱{s.revenue.toLocaleString('en-US')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Barber Performance */}
              <div className="report-panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Barber Workload</h2>
                    <p className="panel-subtitle">Completed appointments by staff.</p>
                  </div>
                </div>
                <div className="barber-workload-list">
                  {barberPerformance.length === 0 ? (
                    <div className="empty-chart-notice">No active staff completed cuts.</div>
                  ) : (
                    barberPerformance.map((b, idx) => {
                      const barWidth = (b.count / maxBarberVal) * 100;
                      return (
                        <div key={idx} className="barber-workload-item">
                          <div className="barber-meta">
                            <span className="barber-name">{b.name}</span>
                            <span className="barber-count">{b.count} cuts</span>
                          </div>
                          <div className="barber-bar-track">
                            <div className="barber-bar-fill" style={{ width: `${Math.max(6, barWidth)}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
