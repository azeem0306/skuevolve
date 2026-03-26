import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, ShoppingBag, Share2, AlertTriangle, Bell, Trash2 } from 'lucide-react';

import dashboardData from './dashboard_data.json';
import inventoryData from './inventory_data.json';
import ScenarioSimulator from './components/ScenarioSimulator';
import PushNotificationOverlay from './components/PushNotificationOverlay';
import { useAuth } from './context/AuthContext';
import './campaignDashboard.css';

const PLANNED_CAMPAIGNS_KEY = 'planned_campaigns';
const NON_DELETABLE_CAMPAIGN = 'New Year';

const getPlannedCampaigns = () => {
  const stored = JSON.parse(localStorage.getItem(PLANNED_CAMPAIGNS_KEY) || '[]');
  return stored.length ? stored : ['New Year'];
};

const formatCompactMoney = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return 'Insufficient data';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const CampaignDashboard = () => {
  const { permissions } = useAuth();
  const [campaignData, setCampaignData] = useState(null);
  const [plannedCampaignNames, setPlannedCampaignNames] = useState(getPlannedCampaigns());
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorSku, setSimulatorSku] = useState(null);
  const [discountPct, setDiscountPct] = useState(15);

  const [pushNotificationOpen, setPushNotificationOpen] = useState(false);
  const [pushNotificationSku, setPushNotificationSku] = useState(null);

  const deletePlannedCampaign = (campaignName) => {
    if (!permissions.canDeleteCampaign) return;
    if (!campaignName || campaignName === NON_DELETABLE_CAMPAIGN) return;
    setPlannedCampaignNames((prev) => {
      const next = prev.filter((name) => name !== campaignName);
      const persisted = next.length ? next : [NON_DELETABLE_CAMPAIGN];
      localStorage.setItem(PLANNED_CAMPAIGNS_KEY, JSON.stringify(persisted));
      return persisted;
    });
  };

  useEffect(() => {
    if (!dashboardData || !dashboardData.Campaigns) return;

    const defaultName = plannedCampaignNames[0] || 'New Year';
    const campaignData = dashboardData.Campaigns[defaultName] || dashboardData.Campaigns[Object.keys(dashboardData.Campaigns)[0]];
    if (campaignData) {
      setCampaignData(campaignData);
    }
  }, [plannedCampaignNames]);

  useEffect(() => {
    const syncPlanned = () => setPlannedCampaignNames(getPlannedCampaigns());
    window.addEventListener('storage', syncPlanned);
    window.addEventListener('focus', syncPlanned);
    return () => {
      window.removeEventListener('storage', syncPlanned);
      window.removeEventListener('focus', syncPlanned);
    };
  }, []);

  if (!campaignData) {
    return (
      <div className="dashboard-root dashboard-root--loading" role="status" aria-live="polite">
        <p className="dashboard-loading-text">Loading AI forecasts…</p>
      </div>
    );
  }

  const themeColor = '#48BB78'; // Global campaign default color

  const topMoversDate = campaignData.peak_date && campaignData.peak_date !== 'N/A'
    ? campaignData.peak_date
    : '2018-11-23';

  const getItemDisplayName = (skuOrProduct, index) => {
    const sku = typeof skuOrProduct === 'string' ? skuOrProduct : skuOrProduct?.sku;
    const explicitName = typeof skuOrProduct === 'object' ? skuOrProduct?.name : null;
    if (explicitName && String(explicitName).trim()) {
      return String(explicitName).trim();
    }
    const withSpaces = String(sku ?? '').replace(/_/g, ' ').trim();
    // Always show the SKU name (converted to readable text) rather than generic "Product 01" labels.
    return withSpaces || `Product ${String(index + 1).padStart(2, '0')}`;
  };

  const calculateStockoutRisk = () => {
    if (!campaignData?.hero_products) return 0;

    let atRiskCount = 0;
    campaignData.hero_products.forEach((product) => {
      const sku = product?.sku;
      const inventoryItem = inventoryData.find((item) => item.sku === sku);
      const stockoutDays = Number(product?.metrics?.stockout_days);
      const leadTimeDays = Number(product?.metrics?.lead_time_days);
      const stockPressure = Number(product?.metrics?.stock_pressure);
      const qtyOnHand = Number(inventoryItem?.qty_on_hand || NaN);
      const reorderPoint = Number(inventoryItem?.reorder_point || NaN);

      const lowStockByDays = Number.isFinite(stockoutDays) && (
        (Number.isFinite(leadTimeDays) && stockoutDays < leadTimeDays) || stockoutDays < 14
      );
      const lowStockByPressure = Number.isFinite(stockPressure) && stockPressure <= 0.25;
      const lowStockByQty = Number.isFinite(qtyOnHand) && Number.isFinite(reorderPoint) && qtyOnHand <= reorderPoint;

      if (lowStockByDays || lowStockByPressure || lowStockByQty) {
        atRiskCount++;
      }
    });

    return atRiskCount;
  };

  const stockoutRiskCount = calculateStockoutRisk();

  const sortedPlannedCampaignNames = plannedCampaignNames
    .filter((campaignName) => Boolean(dashboardData.Campaigns[campaignName]))
    .sort((a, b) => {
      if (a === NON_DELETABLE_CAMPAIGN && b !== NON_DELETABLE_CAMPAIGN) return -1;
      if (b === NON_DELETABLE_CAMPAIGN && a !== NON_DELETABLE_CAMPAIGN) return 1;

      const aDate = Date.parse(dashboardData.Campaigns[a]?.peak_date || '');
      const bDate = Date.parse(dashboardData.Campaigns[b]?.peak_date || '');
      const aValid = Number.isFinite(aDate);
      const bValid = Number.isFinite(bDate);

      if (aValid && bValid) return aDate - bDate;
      if (aValid) return -1;
      if (bValid) return 1;
      return String(a).localeCompare(String(b));
    });

  return (
    <div className="dashboard-root">
      <main className="dashboard-main">
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
            <p className="dashboard-card-label">Projected GMV (USD)</p>
            <h2 className="dashboard-card-value">
              {formatCompactMoney(campaignData.projected_volume)}
            </h2>
            <div className="dashboard-progress">
              <div
                className="dashboard-progress-fill"
                style={{ backgroundColor: themeColor, width: '82%' }}
              />
            </div>
            <p className="dashboard-card-footnote">
              Lift planned {campaignData.campaign_lift_multiplier ?? '—'}x
              {campaignData.observed_lift_multiplier != null
                ? ` | observed ${campaignData.observed_lift_multiplier}x`
                : ''}
            </p>
          </article>

          <article
            className="dashboard-card dashboard-card--accent-border"
            style={{ borderLeftColor: themeColor }}
          >
            <p className="dashboard-card-label">Stockout Risk</p>
            <h2 className="dashboard-card-value">{stockoutRiskCount} SKUs</h2>
            <p className="dashboard-card-footnote dashboard-card-footnote--row">
              <AlertTriangle size={14} className="dashboard-card-footnote-icon" />
              Products near OOS (days, stock pressure, or reorder threshold)
            </p>
          </article>
        </section>

        {/* Main layout */}
        <section className="dashboard-layout">
          <section className="dashboard-layout-main">
            <div className="dashboard-panel dashboard-panel--main">
              <h3 className="dashboard-panel-title dashboard-panel-title--row">
                <span className="dashboard-panel-title-icon">
                  <ShoppingBag size={16} style={{ color: themeColor }} />
                </span>
                Top Movers Today ({topMoversDate})
              </h3>
              <p className="dashboard-side-copy">
                AI allocated volume to these SKUs based on global market
                insights and historical campaign lift.
              </p>

              <div className="dashboard-product-list">
                {campaignData.hero_products.slice(0, 5).map((product, index) => (
                  <div key={typeof product === 'string' ? product : product?.sku || index} className="dashboard-product-row-extended">
                    <div className="dashboard-product-rank">
                      {`${index + 1}`.padStart(2, '0')}
                    </div>
                    <div className="dashboard-product-main">
                      <p className="dashboard-product-name">{getItemDisplayName(product, index)}</p>
                      <p className="dashboard-product-meta">
                        {typeof product === 'object' && product?.ai_signal
                          ? product.ai_signal
                          : 'Campaign SKU'}
                      </p>
                    </div>
                    <div className="dashboard-product-tools">
                      <button
                        type="button"
                        className="dashboard-tool-btn"
                        aria-label="View scenario simulator"
                        title="Scenario Simulator"
                        disabled={!permissions.canUseScenarioSimulator}
                        onClick={() => {
                          if (!permissions.canUseScenarioSimulator) return;
                          const sku = typeof product === 'string' ? product : product.sku;
                          setSimulatorSku(sku);
                          setDiscountPct(15);
                          setSimulatorOpen(true);
                        }}
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="dashboard-tool-btn"
                        aria-label="Create push notification"
                        title="Push Notification"
                        onClick={() => {
                          const sku = typeof product === 'string' ? product : product.sku;
                          setPushNotificationSku(sku);
                          setPushNotificationOpen(true);
                        }}
                      >
                        <Bell size={14} />
                      </button>
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
          </section>

          <aside className="dashboard-layout-side">
            <div className="dashboard-panel dashboard-panel--side">
              <h3 className="dashboard-panel-title dashboard-panel-title--row">
                <span className="dashboard-panel-title-icon">
                  <Calendar size={16} style={{ color: themeColor }} />
                </span>
                Planned Campaigns
              </h3>
              <p className="dashboard-side-copy">
                Campaign schedule and key dates for this event.
              </p>

              <div className="dashboard-campaigns-list">
                {sortedPlannedCampaignNames.map((campaignName, index) => {
                    const campaignInfo = dashboardData.Campaigns[campaignName];
                  const canDelete = permissions.canDeleteCampaign && campaignName !== NON_DELETABLE_CAMPAIGN;
                    return (
                  <div key={campaignName} className="dashboard-campaign-item">
                    <div className="dashboard-campaign-rank">
                      {`${index + 1}`.padStart(2, '0')}
                    </div>
                    <div className="dashboard-campaign-content">
                      <p className="dashboard-campaign-title">
                        {campaignName}
                      </p>
                      <p className="dashboard-campaign-date">
                        {campaignInfo.peak_date && campaignInfo.peak_date !== 'N/A'
                          ? campaignInfo.peak_date
                          : '—'}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        className="dashboard-campaign-delete-btn"
                        onClick={() => deletePlannedCampaign(campaignName)}
                        aria-label={`Delete ${campaignName} from planned campaigns`}
                        title="Delete campaign"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                    );
                  })}
              </div>
            </div>
          </aside>
        </section>

      </main>

      <ScenarioSimulator
        isOpen={simulatorOpen}
        selectedSku={simulatorSku}
        discountPct={discountPct}
        products={campaignData?.hero_products.slice(0, 5).map((product) => {
          const sku = typeof product === 'string' ? product : product.sku;
          const demandVelocity = Number(product?.metrics?.demand_velocity || 0.5);
          const baseUnits = Number(campaignData?.avg_units_per_product_baseline || 100);
          const lift = Number(campaignData?.campaign_lift_multiplier || 1);
          return {
            skuId: sku,
            forecast: Math.round(baseUnits * lift * (0.8 + demandVelocity * 0.4)),
          };
        }) || []}
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
        products={campaignData?.hero_products.slice(0, 5).map((product) => {
          const sku = typeof product === 'string' ? product : product.sku;
          const name = typeof product === 'object' ? (product?.name || sku.replace(/_/g, ' ')) : sku.replace(/_/g, ' ');
          const category = typeof product === 'object' ? (product?.category || 'Campaign Product') : 'Campaign Product';
          return {
            skuId: sku,
            name,
            category,
          };
        }) || []}
      />
    </div>
  );
};

export default CampaignDashboard;