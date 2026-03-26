"""
Prophet Forecast Accuracy Test
================================
Train window : 2011-01-01 to 2013-12-31
Test window  : 2014-01-01 to 2014-12-31

Data granularity : WEEKLY (7-day sums) — avoids MAPE inflation from near-zero daily values

Metrics reported:
  MAE  – Mean Absolute Error  (same units as weekly sales $)
  RMSE – Root Mean Squared Error
  MAPE – Mean Absolute Percentage Error  (%)
  Coverage – % of actual weeks that fall inside the 95% confidence interval

Run from repo root:
    python backend/tests/test_prophet_accuracy.py

Or from backend/:
    python tests/test_prophet_accuracy.py
"""

import sys
import os
import io
from pathlib import Path
import json
import warnings

# Force UTF-8 output on Windows so Unicode print chars in dependencies don't crash.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import numpy as np
import pandas as pd
from prophet import Prophet

warnings.filterwarnings("ignore")   # suppress Stan/Prophet verbose output

# ---------------------------------------------------------------------------
# Path helpers – resolve regardless of working directory
# ---------------------------------------------------------------------------
THIS_DIR = Path(__file__).resolve().parent          # backend/tests/
SCRIPTS_DIR = THIS_DIR.parent / "scripts"           # backend/scripts/
sys.path.insert(0, str(SCRIPTS_DIR))

from build_dashboard import load_and_clean_data     # reuse existing loader


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
TRAIN_START = "2011-01-01"
TRAIN_END   = "2013-12-31"
TEST_START  = "2014-01-01"
TEST_END    = "2014-12-31"

# Campaign holiday windows to evaluate separately (month, day, +/-window days)
CAMPAIGNS = {
    "New Year":      dict(month=1,  day=1,  window=7),
    "Valentine's":   dict(month=2,  day=14, window=7),
    "Halloween":     dict(month=10, day=31, window=7),
    "Christmas":     dict(month=12, day=25, window=14),
}


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------
def mae(actual, predicted):
    return float(np.mean(np.abs(actual - predicted)))

def rmse(actual, predicted):
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))

def mape(actual, predicted):
    mask = actual != 0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)

def coverage(actual, yhat_lower, yhat_upper):
    inside = ((actual >= yhat_lower) & (actual <= yhat_upper)).sum()
    return float(inside / len(actual) * 100)


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------
def run_accuracy_test():
    print("=" * 60)
    print("  SKUEvolve – Prophet Forecast Accuracy Test")
    print(f"  Train: {TRAIN_START}  to  {TRAIN_END}")
    print(f"  Test : {TEST_START}  to  {TEST_END}")
    print("=" * 60)

    # 1. Load data -----------------------------------------------------------
    print("\n[1/4] Loading Global Superstore dataset ...")
    daily_sales, full_df = load_and_clean_data()
    if daily_sales is None:
        print("[ERROR] Could not load data. Aborting.")
        sys.exit(1)

    total_rows = len(daily_sales)
    date_min = daily_sales["ds"].min().date()
    date_max = daily_sales["ds"].max().date()
    print(f"       {total_rows} daily rows  |  {date_min}  ->  {date_max}")

    # Aggregate to weekly sums (resample by week-ending Sunday)
    daily_sales["ds"] = pd.to_datetime(daily_sales["ds"])
    weekly_sales = (
        daily_sales
        .set_index("ds")
        .resample("W")          # label = last day of week (Sunday)
        .sum()
        .reset_index()
    )
    total_weeks = len(weekly_sales)
    wk_min = weekly_sales["ds"].min().date()
    wk_max = weekly_sales["ds"].max().date()
    print(f"       {total_weeks} weekly rows  |  {wk_min}  ->  {wk_max}  (after resampling)")

    # 2. Split ---------------------------------------------------------------
    print("\n[2/4] Splitting into train / test ...")
    train = weekly_sales[
        (weekly_sales["ds"] >= TRAIN_START) & (weekly_sales["ds"] <= TRAIN_END)
    ].copy()
    test = weekly_sales[
        (weekly_sales["ds"] >= TEST_START) & (weekly_sales["ds"] <= TEST_END)
    ].copy()

    if train.empty or test.empty:
        print(f"[ERROR] Train weeks={len(train)}, Test weeks={len(test)}")
        print("        The dataset may not cover 2011-2014. Check date range above.")
        sys.exit(1)

    print(f"       Train weeks: {len(train)}  |  {train['ds'].min().date()} -> {train['ds'].max().date()}")
    print(f"       Test weeks : {len(test)}   |  {test['ds'].min().date()} -> {test['ds'].max().date()}")

    # 3. Train Prophet -------------------------------------------------------
    print("\n[3/4] Training Prophet on 2011-2013 (weekly series) ...")
    m = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,   # no sub-weekly pattern in weekly data
        daily_seasonality=False,
        interval_width=0.95,
    )
    m.fit(train)

    # Build future dataframe covering the test period only (~52 weeks ahead)
    future = m.make_future_dataframe(periods=52, freq="W")   # includes all train + 52 weekly steps
    forecast = m.predict(future)

    # Keep only test-window rows
    forecast_test = forecast[
        (forecast["ds"] >= TEST_START) & (forecast["ds"] <= TEST_END)
    ][["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()

    # Merge actuals into forecast
    test = test.rename(columns={"y": "actual"})
    merged = forecast_test.merge(test, on="ds", how="inner")

    if merged.empty:
        print("[ERROR] No overlapping dates between forecast and actuals.")
        sys.exit(1)

    n = len(merged)
    print(f"       Forecast matched {n} weeks with actuals in 2014.")

    # 4. Overall metrics -----------------------------------------------------
    print("\n[4/4] Results")
    print("-" * 60)

    actual    = merged["actual"].values
    predicted = merged["yhat"].values
    lower     = merged["yhat_lower"].values
    upper     = merged["yhat_upper"].values

    overall = {
        "MAE ($)":       round(mae(actual, predicted), 2),
        "RMSE ($)":      round(rmse(actual, predicted), 2),
        "MAPE (%)":      round(mape(actual, predicted), 2),
        "Coverage (%)":  round(coverage(actual, lower, upper), 1),
        "Test weeks":    n,
    }

    print("\n  OVERALL (full 2014, weekly):")
    for k, v in overall.items():
        print(f"    {k:<20} {v}")

    # 5. Per-campaign-window metrics -----------------------------------------
    print("\n  PER-CAMPAIGN WINDOW (2014 holiday dates only, weekly):")
    print(f"  {'Campaign':<16} {'Weeks':>5}  {'MAE ($)':>10}  {'RMSE ($)':>10}  {'MAPE (%)':>9}  {'Coverage (%)':>13}")
    print(f"  {'-'*16} {'-'*5}  {'-'*10}  {'-'*10}  {'-'*9}  {'-'*13}")

    campaign_results = {}
    for name, cfg in CAMPAIGNS.items():
        from datetime import datetime, timedelta
        # Build the 2014 holiday date
        hd = datetime(2014, cfg["month"], cfg["day"]).date()
        window_start = hd - timedelta(days=cfg["window"])
        window_end   = hd + timedelta(days=1)

        # For weekly rows (each labeled with week-end Sunday, covering 7 days),
        # expand the match window by 6 days so any week overlapping the campaign is included.
        mask = (
            (merged["ds"].dt.date >= (window_start - timedelta(days=6))) &
            (merged["ds"].dt.date <= (window_end   + timedelta(days=6)))
        )
        w = merged[mask]

        if len(w) < 2:
            print(f"  {name:<16} {'n/a':>5}  (fewer than 2 matched weeks in window)")
            continue

        wa = w["actual"].values
        wp = w["yhat"].values
        wl = w["yhat_lower"].values
        wu = w["yhat_upper"].values

        res = {
            "weeks":    len(w),
            "MAE":      round(mae(wa, wp), 2),
            "RMSE":     round(rmse(wa, wp), 2),
            "MAPE":     round(mape(wa, wp), 2),
            "Coverage": round(coverage(wa, wl, wu), 1),
        }
        campaign_results[name] = res
        print(
            f"  {name:<16} {res['weeks']:>5}  {res['MAE']:>10.2f}  "
            f"{res['RMSE']:>10.2f}  {res['MAPE']:>9.2f}  {res['Coverage']:>13.1f}"
        )

    # 6. Save results to JSON ------------------------------------------------
    results_path = THIS_DIR / "accuracy_results.json"
    output = {
        "train_window": {"start": TRAIN_START, "end": TRAIN_END},
        "test_window":  {"start": TEST_START,  "end": TEST_END},
        "overall":      overall,
        "per_campaign": campaign_results,
    }
    with open(results_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  Results saved → {results_path.relative_to(THIS_DIR.parent.parent)}")
    print("=" * 60)
    print("  Done.")
    print("=" * 60)


if __name__ == "__main__":
    run_accuracy_test()
