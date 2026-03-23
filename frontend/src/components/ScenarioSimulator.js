import React, { useMemo } from 'react';

const ScenarioSimulator = ({
  isOpen,
  selectedSku,
  discountPct,
  products,
  inventoryData,
  onClose,
  onDiscountChange,
  onApply,
  onReset,
}) => {
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

  const simulatorMetrics = useMemo(
    () => selectedSku ? getSimulatorMetrics(selectedSku, discountPct) : null,
    [selectedSku, discountPct, products, inventoryData]
  );

  if (!isOpen || !selectedSku || !simulatorMetrics) {
    return null;
  }

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

  if (!simulatorMetrics) {
    return null;
  }

  return (
    <div
      className="cp-simulator-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Scenario Simulator"
      onClick={onClose}
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
            onClick={onClose}
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
                onChange={(e) => onDiscountChange(Number(e.target.value))}
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
              onClick={onApply}
            >
              Apply Strategy
            </button>
            <button
              type="button"
              className="cp-btn cp-btn--secondary"
              onClick={onReset}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSimulator;
