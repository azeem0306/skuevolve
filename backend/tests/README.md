# Backend Tests

## Prophet Forecast Accuracy

`test_prophet_accuracy.py` evaluates how well the Prophet model forecasts 2014 GMV when trained only on 2011–2013 historical data.

### Run

```bash
cd backend
python tests/test_prophet_accuracy.py
```

### What it does

1. Loads the Global Superstore dataset via KaggleHub (same path as production pipeline).
2. Splits into train (2011–2013) and test (2014) by date.
3. Trains a Prophet model on the train split with identical settings to `build_dashboard.py`:
   - yearly seasonality on
   - daily seasonality off
   - 95% confidence interval
4. Forecasts the full test year (2014).
5. Computes and prints four metrics:

| Metric | What it means |
|--------|--------------|
| MAE ($) | Average absolute error in dollars per day |
| RMSE ($) | Penalises large misses more than MAE |
| MAPE (%) | Error as a % of actual — scale-independent |
| Coverage (%) | % of days where actual falls inside 95% CI |

6. Breaks down the same metrics for each of the four campaign holiday windows in 2014.

### Output

Results are written to `backend/tests/accuracy_results.json` after each run.

### Interpreting results

- MAPE < 20% → good for a daily GMV series
- MAPE 20–35% → acceptable, typical for noisy retail data
- MAPE > 35% → consider adding more training data or adding regressor variables
- Coverage ≥ 90% → confidence intervals are well-calibrated
- Coverage < 80% → model is over-confident; consider wider intervals

### Dependencies

All packages are already in `backend/requirements.txt`. No additional installs needed.
