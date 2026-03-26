import React, { useEffect, useMemo, useState } from 'react';
import './WarRoom.css';

const formatUsdCompact = (value) => {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `USD ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `USD ${(n / 1_000_000).toFixed(0)}K`;
  if (n >= 1_000) return `USD ${(n / 1_000).toFixed(0)}K`;
  return `USD ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const buildRelativeAgo = (isoTime) => {
  const ts = new Date(isoTime).getTime();
  const diffMs = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

const getRandomNotificationDelay = () => {
  const minDelayMs = 5_000;
  const maxDelayMs = 120_000;
  return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
};

const getActionButtonClass = (action) => {
  const normalizedAction = String(action || '').toLowerCase();
  if (normalizedAction.includes('raise price')) return 'wr-action-btn wr-action-btn--raise';
  if (normalizedAction.includes('monitor')) return 'wr-action-btn wr-action-btn--monitor';
  return 'wr-action-btn wr-action-btn--flash';
};

const WarRoom = () => {
  const [db, setDb] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [hourlyGmv, setHourlyGmv] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetch('/mockdb/war_room_db.json')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setDb(data);
        setSalesHistory(data.liveSalesHistory || []);
        setHourlyGmv(Number(data.gmv.current || 0));
        setVelocity(Number(data.velocity.currentOrdersPerMin || 0));
        setOnlineUsers(Number(data.onlineUsers || 0));
      })
      .catch(() => {
        if (!mounted) return;
        setDb({
          liveOpsLabel: 'LIVE OPS: NEW YEAR SALE',
          gmv: { target: 500000, projectionPct: 65 },
          velocity: { deltaPct: 15 },
          criticalInterventions: [],
          liveSalesHistory: [],
          oosWatchlist: [],
          onlineUsers: 12404,
        });
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    const metricsInterval = setInterval(() => {
      setHourlyGmv((prev) => Math.max(0, Math.round(prev + (Math.random() * 12000 - 2500))));
      setVelocity((prev) => Math.max(1, Math.round(prev + (Math.random() * 4 - 2))));
      setOnlineUsers((prev) => Math.max(1000, Math.round(prev + (Math.random() * 40 - 18))));
    }, 4000);

    let notificationTimeout;
    const scheduleNotification = () => {
      const watchSku = db.oosWatchlist?.[Math.floor(Math.random() * Math.max(1, db.oosWatchlist.length))];
      if (watchSku) {
        const saleItem = {
          name: watchSku.name || watchSku.sku,
          etaMins: Math.max(1, Math.round(Number(watchSku.oosMins || 30) - Math.random() * 5)),
          time: new Date().toISOString(),
        };

        setSalesHistory((prev) => [saleItem, ...prev].slice(0, 10));
      }

      notificationTimeout = setTimeout(scheduleNotification, getRandomNotificationDelay());
    };

    notificationTimeout = setTimeout(scheduleNotification, getRandomNotificationDelay());

    return () => {
      clearInterval(metricsInterval);
      clearTimeout(notificationTimeout);
    };
  }, [db]);

  const interventions = db?.criticalInterventions || [];
  const oosWatchlist = useMemo(() => db?.oosWatchlist || [], [db?.oosWatchlist]);
  const liveOpsLabel = db?.liveOpsLabel || 'LIVE OPS';
  const gmvTarget = Number(db?.gmv?.target || 0);
  const projectionPct = Number(db?.gmv?.projectionPct || 0);
  const velocityDelta = Number(db?.velocity?.deltaPct || 0);

  const stockCover = useMemo(() => {
    return oosWatchlist.map((item) => {
      const mins = Number(item.oosMins || 0);
      if (mins < 60) return `${mins}m remaining`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    });
  }, [oosWatchlist]);

  const openActionEmail = (item, coverText) => {
    const subject = `[War Room] ${item.action} | ${item.sku}`;
    const body = [
      'Hi Team,',
      '',
      'Please execute the following intervention:',
      `- Action: ${item.action}`,
      `- Product: ${item.name}`,
      `- SKU: ${item.sku}`,
      `- Stock Cover: ${coverText}`,
      `- Diagnosis: ${item.diagnosis}`,
      '',
      'Execution Notes:',
      '- Owner:',
      '- ETA:',
      '- Confirmation:',
      '',
      'Thanks,',
      'War Room',
    ].join('\n');

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const downloadCriticalSkuList = () => {
    const skuList = interventions.map((item) => item.sku).filter(Boolean);
    const blob = new Blob([skuList.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `critical_skus_${skuList.length}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!db) {
    return (
      <div className="wr-root">
        <p>Loading war room data...</p>
      </div>
    );
  }

  return (
    <div className="wr-root">
      <div className="wr-topline">
        <span className="wr-live-dot" />
        <span className="wr-live-text">{liveOpsLabel}</span>
        <span className="wr-online">Online Users: {onlineUsers.toLocaleString('en-US')}</span>
      </div>

      <div className="wr-kpi-row">
        <div className="wr-kpi-card">
          <div className="wr-kpi-label">Hourly GMV Pacing</div>
          <div className="wr-kpi-value">{formatUsdCompact(hourlyGmv)} <span>/ {formatUsdCompact(gmvTarget)} Target</span></div>
          <div className="wr-kpi-sub">AI Projection: {projectionPct}%</div>
        </div>

        <div className="wr-kpi-card">
          <div className="wr-kpi-label">Velocity (Orders/Min)</div>
          <div className="wr-kpi-value">{velocity} orders <span>▲ {velocityDelta}% vs Last Hour</span></div>
        </div>

        <div className="wr-kpi-card wr-kpi-card-danger">
          <div className="wr-kpi-label">Critical Interventions</div>
          <div className="wr-kpi-value">{interventions.length} <span>SKUs reaching OOS {'<'} 20m</span></div>
          <button type="button" className="wr-danger-btn" onClick={downloadCriticalSkuList}>VIEW LIST</button>
        </div>
      </div>

      <div className="wr-main-grid">
        <section className="wr-watchlist">
          <h3>High-Velocity Watchlist</h3>
          <p>AI-prioritized list of items requiring immediate decision.</p>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock Cover (Time)</th>
                <th>AI Diagnosis</th>
                <th>Proposed Intervention</th>
              </tr>
            </thead>
            <tbody>
              {oosWatchlist.map((item, idx) => (
                <tr key={item.sku} className={idx === 0 ? 'wr-row-critical' : ''}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.sku}</small>
                  </td>
                  <td>{stockCover[idx]}</td>
                  <td>{item.diagnosis}</td>
                  <td>
                    <button
                      type="button"
                      className={getActionButtonClass(item.action)}
                      disabled={String(item.action || '').toLowerCase().includes('monitor')}
                      onClick={() => openActionEmail(item, stockCover[idx])}
                    >
                      {item.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="wr-live-sales">
          <h4>Live Sales History</h4>
          <ul>
            {salesHistory.map((s, idx) => (
              <li key={`${s.name || s.sku}-${idx}`}>
                <span>{s.name || s.sku} sold</span>
                <small>{buildRelativeAgo(s.time)}</small>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
};

export default WarRoom;
