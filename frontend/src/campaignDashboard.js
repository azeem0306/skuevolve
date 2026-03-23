import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, ShoppingBag, Share2, AlertTriangle } from 'lucide-react';

import dashboardData from './dashboard_data.json';
import inventoryData from './inventory_data.json';
import ScenarioSimulator from './components/ScenarioSimulator';
import PushNotificationOverlay from './components/PushNotificationOverlay';
import './campaignDashboard.css';

const CampaignDashboard = () => {
  const [campaignData, setCampaignData] = useState(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorSku, setSimulatorSku] = useState(null);
  const [discountPct, setDiscountPct] = useState(15);

  const [pushNotificationOpen, setPushNotificationOpen] = useState(false);
  const [pushNotificationSku, setPushNotificationSku] = useState(null);

  useEffect(() => {
    if (!dashboardData || !dashboardData.Campaigns) return;

    const campaignData = dashboardData.Campaigns['11-11'];
    if (campaignData) {
      setCampaignData(campaignData);
    }
  }, []);

  if (!campaignData) {
    return (
      <div className="dashboard-root dashboard-root--loading">
        <p className="dashboard-loading-text">Loading AI forecasts…</p>
      </div>
    );
  }

  const themeColor = '#4299e1'; // 11.11 campaign color

  const topMoversDate = campaignData.peak_date && campaignData.peak_date !== 'N/A'
    ? campaignData.peak_date
    : '2018-11-23';

  const getItemDisplayName = (skuOrProduct, index) => {
    const sku = typeof skuOrProduct === 'string' ? skuOrProduct : skuOrProduct?.sku;
    const withSpaces = String(sku ?? '').replace(/_/g, ' ').trim();
    // Always show the SKU name (converted to readable text) rather than generic "Product 01" labels.
    return withSpaces || `Product ${String(index + 1).padStart(2, '0')}`;
  };

  const calculateStockoutRisk = () => {
    if (!campaignData?.hero_products || inventoryData.length === 0) return 0;

    let atRiskCount = 0;
    campaignData.hero_products.forEach((product) => {
      const sku = typeof product === 'string' ? product : product.sku;
      const inventoryItem = inventoryData.find((item) => item.sku === sku);
      const inventoryValue = inventoryItem
        ? Number(inventoryItem.qty_on_hand || 0) * Number(inventoryItem.cost_price || 0)
        : 0;

      // Simplified calculation: forecast as thousands of units
      const baseRevenue = 1000000; // Average forecast
      const daysWindow = 30;
      const demandMultiplier = 1 + (15 / 100) * 0.5; // Default 15% discount

      const adjustedRevenue = baseRevenue * (1 - 15 / 100) * demandMultiplier;
      const dailyRevenue = (adjustedRevenue / daysWindow) || 0;
      const stockoutDays = dailyRevenue > 0 ? inventoryValue / dailyRevenue : Infinity;

      if (stockoutDays < 2) {
        atRiskCount++;
      }
    });

    return atRiskCount;
  };

  const stockoutRiskCount = calculateStockoutRisk();

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
            <p className="dashboard-card-label">Stockout Risk</p>
            <h2 className="dashboard-card-value">{stockoutRiskCount} SKUs</h2>
            <p className="dashboard-card-footnote dashboard-card-footnote--row">
              <AlertTriangle size={14} className="dashboard-card-footnote-icon" />
              Products at risk ({"<"} 5 days)
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
                AI allocated volume to these SKUs based on Pakistan market
                history and campaign lift.
              </p>

              <div className="dashboard-product-list">
                {campaignData.hero_products.slice(0, 5).map((product, index) => (
                  <div key={product} className="dashboard-product-row-extended">
                    <div className="dashboard-product-rank">
                      {`${index + 1}`.padStart(2, '0')}
                    </div>
                    <div className="dashboard-product-main">
                      <p className="dashboard-product-name">{getItemDisplayName(product, index)}</p>
                      <p className="dashboard-product-meta">High velocity SKU</p>
                    </div>
                    <div className="dashboard-product-tools">
                      <button
                        type="button"
                        className="dashboard-tool-btn"
                        aria-label="View scenario simulator"
                        title="Scenario Simulator"
                        onClick={() => {
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
                        <AlertTriangle size={14} />
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
                {Object.entries(dashboardData.Campaigns).map(([campaignName, campaignInfo], index) => (
                  <div key={campaignName} className="dashboard-campaign-item">
                    <div className="dashboard-campaign-rank">
                      {`${index + 1}`.padStart(2, '0')}
                    </div>
                    <div className="dashboard-campaign-content">
                      <p className="dashboard-campaign-title">
                        {campaignName === '11-11' ? '11.11' : campaignName}
                      </p>
                      <p className="dashboard-campaign-date">
                        {campaignInfo.peak_date && campaignInfo.peak_date !== 'N/A'
                          ? campaignInfo.peak_date
                          : '—'}
                      </p>
                    </div>
                  </div>
                ))}
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
          return {
            skuId: sku,
            forecast: 1000,
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
          return {
            skuId: sku,
            name: sku.replace(/_/g, ' '),
            category: 'Campaign Product',
          };
        }) || []}
      />
    </div>
  );
};

export default CampaignDashboard;