import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Flame,
  Leaf,
  Snowflake,
  Check,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import dashboardData from '../dashboard_data.json';
import inventoryData from '../inventory_data.json';
import './CampaignPlanner.css';

const AI_SIGNALS = [
  { icon: Flame, label: 'High Search Vol', color: '#ED8936' },
  { icon: Leaf, label: 'Organic Demand', color: '#48BB78' },
  { icon: Snowflake, label: 'Aging Stock', color: '#4299E1' },
];

const STRATEGIES = [
  { label: 'Light Discount', color: '#4299E1' },
  { label: 'Protect Margin', color: '#48BB78' },
  { label: 'Clearance', color: '#E53E3E' },
];

const formatDateRange = (peakDate) => {
  if (!peakDate || peakDate === 'N/A') return '—';
  const d = new Date(peakDate);
  const start = new Date(d);
  start.setDate(start.getDate() - 3);
  const end = new Date(d);
  end.setDate(end.getDate() + 3);
  const fmt = (x) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
};

const getCategoryFilteredSkus = (items, category) => {
  if (!items || !category || category === 'All') return items;
  const normalized = String(category).toLowerCase();
  const filtered = items.filter(
    (item) => String(item?.category || '').toLowerCase() === normalized
  );
  return filtered.length ? filtered : items;
};

const CampaignPlanner = () => {
  const [selectedCampaign, setSelectedCampaign] = useState('11-11');
  const [campaignSet, setCampaignSet] = useState('mega'); // 'mega' | 'flash'
  const [campaignData, setCampaignData] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [skuList, setSkuList] = useState([]);

  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorSku, setSimulatorSku] = useState(null);
  const [discountPct, setDiscountPct] = useState(15);

  useEffect(() => {
    if (!dashboardData?.Campaigns) return;
    const data = dashboardData.Campaigns[selectedCampaign];
    if (data) {
      setCampaignData(data);
      setSelectedCategory('All');
      setSkuList((data.hero_products || []).filter((item) => item?.sku));
    } else {
      const first = Object.keys(dashboardData.Campaigns)[0];
      setSelectedCampaign(first);
      const firstData = dashboardData.Campaigns[first];
      setCampaignData(firstData);
      setSelectedCategory('All');
      setSkuList((firstData?.hero_products || []).filter((item) => item?.sku));
    }
  }, [selectedCampaign]);

  const downloadCsv = useCallback(() => {
    if (!campaignData) return;
    const headers = [
      'Campaign',
      'Peak Date',
      'Projected Volume (PKR)',
      'Category',
      'Strategy',
      'Action Item',
      'Rank',
      'SKU',
    ];
    const rows = skuList.map((item, i) => [
      selectedCampaign,
      campaignData.peak_date,
      campaignData.projected_volume,
      item?.category ?? 'Unknown',
      campaignData.strategy,
      campaignData.action_item,
      i + 1,
      item?.sku ?? '',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sku-list-${selectedCampaign.replace(/\s*\/\s*/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedCampaign, campaignData, skuList]);

  if (!campaignData) {
    return (
      <div className="cp-loading">
        <p>Loading campaign data…</p>
      </div>
    );
  }

  const dateRange = formatDateRange(campaignData.peak_date);

  const products = skuList.map((item, index) => {
    const sku = String(item?.sku ?? '');
    const name = sku.replace(/_/g, ' ').replace(/\s*-\s*[A-Z0-9-]+$/i, '') || sku;
    const count = Math.max(1, skuList.length);
    return {
      sku,
      name,
      skuId: sku,
      category: item?.category || 'Unknown',
      forecast: Math.round(
        (campaignData.projected_volume / count / 1000) * (0.8 + Math.random() * 0.4)
      ),
      aiSignal: AI_SIGNALS[index % AI_SIGNALS.length],
      strategy: STRATEGIES[index % STRATEGIES.length],
    };
  });

  const getSimulatorMetrics = (sku, discountPercent) => {
    const product = products.find((p) => p.skuId === sku);
    if (!product) return null;

    const inventoryItem = inventoryData.find((item) => item.sku === sku);
    const inventoryValue = inventoryItem
      ? Number(inventoryItem.qty_on_hand || 0) * Number(inventoryItem.cost_price || 0)
      : 0;

    // Treat forecast as thousands of units; convert into rough expected revenue.
    const baseRevenue = (product.forecast || 0) * 1000;
    const daysWindow = 30;
    const demandMultiplier = 1 + (discountPercent / 100) * 0.5; // up to +50% demand at 100% discount

    const adjustedRevenue = baseRevenue * (1 - discountPercent / 100) * demandMultiplier;
    const dailyRevenue = (adjustedRevenue / daysWindow) || 0;
    const stockoutDays = dailyRevenue > 0 ? inventoryValue / dailyRevenue : Infinity;

    const riskLabel = stockoutDays <= 2 ? 'High' : stockoutDays <= 7 ? 'Medium' : 'Low';
    const recommendation = stockoutDays <= 2
      ? 'Reduce discount to preserve stock for later days.'
      : 'Stock levels look healthy for this campaign window.';

    return {
      inventoryValue,
      adjustedRevenue,
      stockoutDays,
      riskLabel,
      recommendation,
    };
  };

  const simulatorMetrics = simulatorSku
    ? getSimulatorMetrics(simulatorSku, discountPct)
    : null;

  const formatMoney = (value) =>
    value == null || Number.isNaN(value)
      ? '—'
      : `PKR ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const formatDays = (value) =>
    value === Infinity || Number.isNaN(value)
      ? '—'
      : `${Math.max(0, Math.round(value))}`;

  const stockoutLabel = (days) => {
    const formatted = formatDays(days);
    return formatted === '—' ? '—' : `Day ${formatted}`;
  };

  return (
    <div className="cp-root">
      <div className="cp-setup-card">
        <h2 className="cp-setup-title">Campaign Setup</h2>
        <div className="cp-setup-fields">
          <div className="cp-field">
            <label className="cp-field-label">NAME</label>
            <select
              className="cp-field-input"
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
          <div className="cp-field">
            <label className="cp-field-label">DATES</label>
            <div className="cp-field-input cp-field-input--readonly">{dateRange}</div>
          </div>
          <div className="cp-field">
            <label className="cp-field-label">CATEGORY</label>
            <select
              className="cp-field-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All</option>
              {Array.from(
                new Set(
                  (campaignData?.hero_products || [])
                    .map((item) => item.category)
                    .filter(Boolean)
                )
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="cp-setup-actions">
          <button
            type="button"
            className="cp-btn cp-btn--primary"
            onClick={() =>
              setSkuList([
                ...getCategoryFilteredSkus(campaignData?.hero_products || [], selectedCategory),
              ])
            }
          >
            Generate SKU Mix
          </button>
          <button type="button" className="cp-btn cp-btn--secondary">
            Launch Campaign
          </button>
          <button
            type="button"
            className="cp-download-btn"
            onClick={downloadCsv}
            title="Download SKU list (CSV)"
            aria-label="Download SKU list as CSV"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="cp-tabs">
        <button
          type="button"
          className={`cp-tab ${campaignSet === 'mega' ? 'cp-tab--active' : ''}`}
          onClick={() => setCampaignSet('mega')}
        >
          Mega Deals (Daily)
        </button>
        <button
          type="button"
          className={`cp-tab ${campaignSet === 'flash' ? 'cp-tab--active' : ''}`}
          onClick={() => setCampaignSet('flash')}
        >
          Flash Sales (Hourly)
        </button>
      </div>

      <div className="cp-table-wrap">
        <table className="cp-table">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>FORECAST</th>
              <th>AI SIGNAL</th>
              <th>STRATEGY</th>
              <th>TOOLS</th>
            </tr>
          </thead>
          <tbody>
            {products.map((row, i) => {
              const SignalIcon = row.aiSignal.icon;
              return (
                <tr key={row.skuId}>
                  <td>
                    <div className="cp-cell-product">
                      <div className="cp-cell-product-img" />
                      <div>
                        <div className="cp-cell-product-name">{row.name}</div>
                        <div className="cp-cell-product-sku">SKU: {row.skuId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cp-cell-forecast">
                      {row.forecast.toLocaleString()} Units
                    </span>
                  </td>
                  <td>
                    <span
                      className="cp-cell-signal"
                      style={{ color: row.aiSignal.color }}
                    >
                      <SignalIcon size={16} />
                      {row.aiSignal.label}
                    </span>
                  </td>
                  <td>
                    <span
                      className="cp-cell-strategy"
                      style={{
                        backgroundColor: `${row.strategy.color}22`,
                        color: row.strategy.color,
                        borderColor: row.strategy.color,
                      }}
                    >
                      <Check size={14} />
                      {row.strategy.label}
                    </span>
                  </td>
                  <td>
                    <div className="cp-cell-tools">
                      <button
                        type="button"
                        className="cp-tool-btn"
                        aria-label="Scenario Simulator"
                        onClick={() => {
                          setSimulatorSku(row.skuId);
                          setDiscountPct(15);
                          setSimulatorOpen(true);
                        }}
                      >
                        <Share2 size={16} />
                      </button>
                      <button type="button" className="cp-tool-btn" aria-label="Alert">
                        <AlertTriangle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {simulatorOpen && simulatorSku && simulatorMetrics && (
        <div
          className="cp-simulator-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Scenario Simulator"
          onClick={() => setSimulatorOpen(false)}
        >
          <div className="cp-simulator-modal" onClick={(e) => e.stopPropagation()}>
            <header className="cp-simulator-header">
              <div>
                <h3 className="cp-simulator-title">Strategy Simulator</h3>
                <p className="cp-simulator-subtitle">
                  Adjust the discount slider to see impact on projected revenue and stockout risk.
                </p>
              </div>
              <button
                className="cp-simulator-close"
                aria-label="Close simulator"
                onClick={() => setSimulatorOpen(false)}
              >
                ✕
              </button>
            </header>

            <div className="cp-simulator-body">
              <div className="cp-simulator-control">
                <label className="cp-simulator-label" htmlFor="discount-range">
                  Discount depth
                </label>
                <div className="cp-simulator-slider-row">
                  <input
                    id="discount-range"
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={discountPct}
                    onChange={(e) => setDiscountPct(Number(e.target.value))}
                  />
                  <span className="cp-simulator-slider-value">{discountPct}%</span>
                </div>
              </div>

              <div className="cp-simulator-metrics">
                <div className="cp-simulator-metric-card">
                  <div className="cp-simulator-metric-label">Projected revenue</div>
                  <div className="cp-simulator-metric-value">
                    {formatMoney(simulatorMetrics.adjustedRevenue)}
                  </div>
                </div>
                <div className="cp-simulator-metric-card">
                  <div className="cp-simulator-metric-label">Stockout risk</div>
                  <div className="cp-simulator-metric-value">
                    {stockoutLabel(simulatorMetrics.stockoutDays)}
                  </div>
                  <div className="cp-simulator-metric-subtext">
                    Risk: {simulatorMetrics.riskLabel}
                  </div>
                </div>
              </div>

              <div className="cp-simulator-recommendation">
                <strong>AI Recommendation</strong>
                <p>{simulatorMetrics.recommendation}</p>
              </div>

              <div className="cp-simulator-actions">
                <button
                  type="button"
                  className="cp-btn cp-btn--primary"
                  onClick={() => setSimulatorOpen(false)}
                >
                  Apply Strategy
                </button>
                <button
                  type="button"
                  className="cp-btn cp-btn--secondary"
                  onClick={() => setDiscountPct(15)}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPlanner;
