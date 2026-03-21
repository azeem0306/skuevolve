import React, { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { Calendar, TrendingUp, ShoppingBag, Zap } from 'lucide-react';

import dashboardData from './dashboard_data.json';
import './campaignDashboard.css';

const CampaignDashboard = () => {
  const [selectedCampaign, setSelectedCampaign] = useState('11-11');
  const [campaignData, setCampaignData] = useState(null);

  useEffect(() => {
    if (!dashboardData || !dashboardData.Campaigns) return;

    const next = dashboardData.Campaigns[selectedCampaign];

    if (next) {
      setCampaignData(next);
    } else {
      const firstKey = Object.keys(dashboardData.Campaigns)[0];
      setSelectedCampaign(firstKey);
      setCampaignData(dashboardData.Campaigns[firstKey]);
    }
  }, [selectedCampaign]);

  if (!campaignData) {
    return (
      <div className="dashboard-root dashboard-root--loading">
        <p className="dashboard-loading-text">Loading AI forecasts…</p>
      </div>
    );
  }

  const getThemeColor = () => {
    switch (selectedCampaign) {
      case '11.11':
        return '#ED8936';
      case 'Black Friday':
        return '#EF4444';
      case 'Eid/Ramadan':
        return '#48BB78';
      default:
        return '#3182CE';
    }
  };

  const themeColor = getThemeColor();

  const topMoversDate = campaignData.peak_date && campaignData.peak_date !== 'N/A'
    ? campaignData.peak_date
    : '2018-11-23';

  const getItemDisplayName = (skuOrProduct, index) => {
    const sku = typeof skuOrProduct === 'string' ? skuOrProduct : skuOrProduct?.sku;
    const withSpaces = String(sku ?? '').replace(/_/g, ' ').trim();
    // Always show the SKU name (converted to readable text) rather than generic "Product 01" labels.
    return withSpaces || `Product ${String(index + 1).padStart(2, '0')}`;
  };

  return (
    <div className="dashboard-root">
      <main className="dashboard-main">
        <div className="dashboard-toolbar">
          <div className="dashboard-selector">
            <label className="dashboard-selector-label">Event</label>
            <select
              className="dashboard-selector-input"
              style={{ borderColor: themeColor }}
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              {Object.keys(dashboardData.Campaigns).map((key) => (
                <option key={key} value={key}>
                  {key === '11-11' ? '11.11' : key}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Top row cards */}
        <section className="dashboard-kpi-row">
          <article className="dashboard-card dashboard-card--primary">
            <div className="dashboard-card-body">
              <p className="dashboard-card-label">Predicted peak traffic</p>
              <h2 className="dashboard-card-value">{campaignData.peak_date}</h2>
              <p
                className="dashboard-card-pill"
                style={{ color: themeColor, borderColor: themeColor }}
              >
                <Calendar size={12} className="dashboard-card-pill-icon" />
                {campaignData.peak_date === 'N/A'
                  ? 'No data for this window'
                  : 'High confidence AI signal'}
              </p>
            </div>
            <TrendingUp className="dashboard-card-bg-icon" />
          </article>

          <article className="dashboard-card">
            <p className="dashboard-card-label">Projected GMV (PKR)</p>
            <h2 className="dashboard-card-value">
              {campaignData.projected_volume > 0
                ? `${(campaignData.projected_volume / 1_000_000).toFixed(1)}M`
                : 'Insufficient data'}
            </h2>
            <div className="dashboard-progress">
              <div
                className="dashboard-progress-fill"
                style={{ backgroundColor: themeColor, width: '82%' }}
              />
            </div>
            <p className="dashboard-card-footnote">AI confidence: 94.2%</p>
          </article>

          <article
            className="dashboard-card dashboard-card--accent-border"
            style={{ borderLeftColor: themeColor }}
          >
            <p className="dashboard-card-label">Recommended action</p>
            <h2 className="dashboard-card-value dashboard-card-value--sm">
              {campaignData.action_item}
            </h2>
            <p className="dashboard-card-footnote dashboard-card-footnote--row">
              <Zap size={14} className="dashboard-card-footnote-icon" />
              Strategy: {campaignData.strategy}
            </p>
          </article>
        </section>

        {/* Main layout */}
        <section className="dashboard-layout">
          <section className="dashboard-layout-main">
            <div className="dashboard-panel dashboard-panel--main">
              <div className="dashboard-panel-header">
                <h3 className="dashboard-panel-title">Market demand curve</h3>
                <div className="dashboard-legend">
                  <span className="dashboard-legend-item">
                    <span className="dashboard-legend-dot dashboard-legend-dot--muted" />
                    Historical
                  </span>
                  <span className="dashboard-legend-item">
                    <span
                      className="dashboard-legend-dot"
                      style={{ backgroundColor: themeColor }}
                    />
                    AI forecast
                  </span>
                </div>
              </div>

              <div className="dashboard-chart-wrapper">
                <ResponsiveContainer>
                  <AreaChart data={dashboardData.graph_data.slice(-200)}>
                    <defs>
                      <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={themeColor} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={themeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#2D3748"
                    />
                    <XAxis
                      dataKey="ds"
                      stroke="#4A5568"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        try {
                          const d = new Date(val);
                          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        } catch {
                          return val;
                        }
                      }}
                    />
                    <YAxis
                      stroke="#4A5568"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      label={{
                        value: 'Volume (K)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fontSize: 12, fill: '#4A5568' },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A202C',
                        color: '#E2E8F0',
                        border: 'none',
                        borderRadius: 10,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      }}
                      labelStyle={{ color: '#A0AEC0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="yhat"
                      stroke={themeColor}
                      strokeWidth={2}
                      fill="url(#curveFill)"
                    />
                    {campaignData.peak_date !== 'N/A' && (
                      <ReferenceLine
                        x={campaignData.peak_date}
                        stroke="#FC8181"
                        strokeDasharray="3 3"
                        label={{
                          position: 'top',
                          value: 'PEAK',
                          fill: '#FC8181',
                          fontSize: 11,
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <aside className="dashboard-layout-side">
            <div className="dashboard-panel dashboard-panel--side">
              <h3 className="dashboard-panel-title dashboard-panel-title--row">
                <span className="dashboard-panel-title-icon">
                  <ShoppingBag size={16} style={{ color: themeColor }} />
                </span>
                Top Movers Today ({topMoversDate})
              </h3>
              <p className="dashboard-side-copy">
                AI allocated volume to these SKUs based on Pakistan market
                history and campaign lift.
              </p>

              <div className="dashboard-product-list">
                {campaignData.hero_products.map((product, index) => (
                  <div key={product} className="dashboard-product-row">
                    <div className="dashboard-product-rank">
                      {`${index + 1}`.padStart(2, '0')}
                    </div>
                    <div className="dashboard-product-main">
                      <p className="dashboard-product-name">{getItemDisplayName(product, index)}</p>
                      <p className="dashboard-product-meta">High velocity SKU</p>
                    </div>
                  </div>
                ))}

                {campaignData.hero_products.length === 0 && (
                  <div className="dashboard-empty-state">
                    No SKU allocation data for this event window.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>

      </main>
    </div>
  );
};

export default CampaignDashboard;