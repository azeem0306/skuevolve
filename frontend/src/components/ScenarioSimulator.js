import React, { useMemo, useCallback } from 'react';

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
  const getSimulatorMetrics = useCallback((sku, discountPercent) => {
    const product = products.find((p) => p.skuId === sku);
    if (!product) return null;

    const inventoryItem = inventoryData.find((item) => item.sku === sku);
    const inventoryQty = inventoryItem ? Number(inventoryItem.qty_on_hand || 0) : 0;

    // Use forecast units for demand; discount increases demand.
    const baseDemandUnits = product.forecast || 0;
    const demandMultiplier = 1 + (discountPercent / 100) * 0.5; // up to +50% demand at 30% discount
    const adjustedDemandUnits = baseDemandUnits * demandMultiplier;

    const daysWindow = 30;
    const dailyDemandUnits = adjustedDemandUnits / daysWindow;

    const stockoutDays = dailyDemandUnits > 0 ? inventoryQty / dailyDemandUnits : Infinity;

    // Calculate projected revenue using selling price (msrp)
    const avgSellingPrice = inventoryItem ? Number(inventoryItem.msrp || 0) : 0;
    const projectedRevenue = adjustedDemandUnits * avgSellingPrice;

    const riskLabel = stockoutDays <= 2 ? 'High' : stockoutDays <= 7 ? 'Medium' : 'Low';
    const recommendation = stockoutDays <= 2
      ? 'Reduce discount to preserve stock for later days.'
      : 'Stock levels look healthy for this campaign window.';

    return {
      projectedRevenue,
      stockoutDays,
      riskLabel,
      recommendation,
    };
  }, [products, inventoryData]);

  const simulatorMetrics = useMemo(
    () => selectedSku ? getSimulatorMetrics(selectedSku, discountPct) : null,
    [selectedSku, discountPct, getSimulatorMetrics]
  );

  if (!isOpen || !selectedSku || !simulatorMetrics) {
    return null;
  }

  const formatMoney = (value) =>
    value == null || Number.isNaN(value)
      ? '—'
      : `PKR ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}` ;

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
                {formatMoney(simulatorMetrics.projectedRevenue)}
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
