import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Flame,
  Leaf,
  Snowflake,
  Check,
  Share2,
  Bell,
} from 'lucide-react';
import dashboardData from '../dashboard_data.json';
import inventoryData from '../inventory_data.json';
import ScenarioSimulator from '../components/ScenarioSimulator';
import PushNotificationOverlay from '../components/PushNotificationOverlay';
import { useAuth } from '../context/AuthContext';
import './CampaignPlanner.css';

const PLANNED_CAMPAIGNS_KEY = 'planned_campaigns';

const launchCampaign = (campaignName) => {
  if (!campaignName) return;
  const existing = JSON.parse(localStorage.getItem(PLANNED_CAMPAIGNS_KEY) || '[]');
  const next = Array.from(new Set([...existing, campaignName]));
  localStorage.setItem(PLANNED_CAMPAIGNS_KEY, JSON.stringify(next));
};


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
  const { permissions } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState('New Year');
  const [campaignData, setCampaignData] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [skuList, setSkuList] = useState([]);
  const [isSkuMixGenerated, setIsSkuMixGenerated] = useState(false);

  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorSku, setSimulatorSku] = useState(null);
  const [discountPct, setDiscountPct] = useState(15);

  const [pushNotificationOpen, setPushNotificationOpen] = useState(false);
  const [pushNotificationSku, setPushNotificationSku] = useState(null);

  useEffect(() => {
    if (!dashboardData?.Campaigns) return;
    const data = dashboardData.Campaigns[selectedCampaign];
    if (data) {
      setCampaignData(data);
      setSelectedCategory('All');
      setSkuList([]);
      setIsSkuMixGenerated(false);
    } else {
      const first = Object.keys(dashboardData.Campaigns)[0];
      setSelectedCampaign(first);
      const firstData = dashboardData.Campaigns[first];
      setCampaignData(firstData);
      setSelectedCategory('All');
      setSkuList([]);
      setIsSkuMixGenerated(false);
    }
  }, [selectedCampaign]);

  const downloadCsv = useCallback(() => {
    if (!campaignData) return;
    const headers = [
      'Campaign',
      'Peak Date',
      'Projected Volume (USD)',
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
      <div className="cp-loading" role="status" aria-live="polite">
        <p>Loading campaign data…</p>
      </div>
    );
  }

  const dateRange = formatDateRange(campaignData.peak_date);

  const products = skuList.map((item, index) => {
    const sku = String(item?.sku ?? '');
    const name = item?.name || sku;
    const campaignLift = campaignData.campaign_lift_multiplier || 2.8;
    const baselineUnits = campaignData.avg_units_per_product_baseline || 100;
    const demandVelocity = item?.metrics?.demand_velocity || 0.75;
    const discountBoost = 1.2; // 15% discount increases demand ~20%
    
    // Base boost adjusted by demand, with variance
    const forecast = Math.round(
      baselineUnits * campaignLift * discountBoost * (0.8 + demandVelocity * 0.4)
    );
    
    // Get AI Signal from data
    const aiSignalLabel = item?.ai_signal || 'Organic Demand';
    const signalColorMap = {
      'Stockout Risk': '#E53E3E',
      'Margin Watch': '#805AD5',
      'Trending': '#ED8936',
      'Aging Stock': '#4299E1',
      'Organic Demand': '#48BB78',
      'High Search Vol': '#ED8936',
    };
    const signalIconMap = {
      'Stockout Risk': Bell,
      'Margin Watch': Snowflake,
      'Trending': Flame,
      'Aging Stock': Snowflake,
      'Organic Demand': Leaf,
      'High Search Vol': Flame,
    };

    const signalStrategyMap = {
      'Stockout Risk':  { label: 'Urgent Replenish', color: '#E53E3E' },
      'Margin Watch':   { label: 'Protect Margin', color: '#805AD5' },
      'Trending':       { label: 'Boost Visibility', color: '#D69E2E' },
      'Aging Stock':     { label: 'Clearance',      color: '#E53E3E' },
      'Organic Demand':  { label: 'Protect Margin',  color: '#48BB78' },
      'High Search Vol': { label: 'Light Discount', color: '#4299E1' },
    };

    
    return {
      sku,
      name,
      skuId: sku,
      category: item?.category || 'Unknown',
      forecast,
      aiSignal: {
        icon: signalIconMap[aiSignalLabel] || Flame,
        label: aiSignalLabel,
        color: signalColorMap[aiSignalLabel] || '#ED8936'
      },
      strategy: signalStrategyMap[aiSignalLabel] ?? signalStrategyMap['Organic Demand'],
      metrics: item?.metrics || {}
    };
  });

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
                  {key}
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
            onClick={() => {
              setSkuList([
                ...getCategoryFilteredSkus(campaignData?.hero_products || [], selectedCategory),
              ]);
              setIsSkuMixGenerated(true);
            }}
          >
            Generate SKU Mix
          </button>
          <button
            type="button"
            className="cp-btn cp-btn--secondary"
            onClick={() => {
              if (!permissions.canLaunchCampaign) return;
              launchCampaign(selectedCampaign);
            }}
            disabled={!permissions.canLaunchCampaign}
            title={permissions.canLaunchCampaign ? 'Launch Campaign' : 'Only manager/admin can launch campaigns'}
          >
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

      <div className="cp-tabs" aria-label="Top deals section">
        <p className="cp-tabs-label">Top Deals (Daily)</p>
      </div>

      {!isSkuMixGenerated ? (
        <div className="cp-table-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#a0aec0' }}>
          <p style={{ margin: 0, fontSize: '14px', textAlign: 'center' }}>
            Select a campaign and category, then click <strong>Generate SKU Mix</strong> to see products.
          </p>
        </div>
      ) : (
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
                        disabled={!permissions.canUseScenarioSimulator}
                        title={permissions.canUseScenarioSimulator ? 'Scenario Simulator' : 'No access to Scenario Simulator'}
                        onClick={() => {
                          if (!permissions.canUseScenarioSimulator) return;
                          setSimulatorSku(row.skuId);
                          setDiscountPct(15);
                          setSimulatorOpen(true);
                        }}
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="cp-tool-btn"
                        aria-label="Create push notification"
                        onClick={() => {
                          setPushNotificationSku(row.skuId);
                          setPushNotificationOpen(true);
                        }}
                      >
                        <Bell size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <ScenarioSimulator
        isOpen={simulatorOpen}
        selectedSku={simulatorSku}
        discountPct={discountPct}
        products={products}
        inventoryData={inventoryData}
        onClose={() => setSimulatorOpen(false)}
        onDiscountChange={setDiscountPct}
        onApply={() => setSimulatorOpen(false)}
        onReset={() => setDiscountPct(15)}
      />

      <PushNotificationOverlay
        isOpen={pushNotificationOpen}
        onClose={() => {
          setPushNotificationOpen(false);
          setPushNotificationSku(null);
        }}
        selectedSku={pushNotificationSku}
        products={products}
      />
    </div>
  );
};

export default CampaignPlanner;
