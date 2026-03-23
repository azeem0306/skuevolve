# Frontend - React Application

Production-ready React dashboard for campaign planning.

> Local-only development path (recommended): run locally with `REACT_APP_API_URL=http://localhost:5000`.

## 📦 Stack
- **Framework**: React 18.2
- **Build Tool**: Create React App
- **Deployment**: Cloudflare Pages
- **API Client**: Native Fetch API

## 🚀 Quick Start

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Test
npm test
```

## 🔧 Configuration

### Environment Variables

Create `.env.local`:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### Development Server
- Port: 3000
- Auto-reload on code changes
- Proxy API calls to backend

### Production Build
- Optimized, minified bundle
- ~190 KB JavaScript + 4 KB CSS
- Static files for Cloudflare Pages

## 📁 Project Structure

```
frontend/src/
├── api/
│   └── client.js            # API client with all endpoints
├── components/
│   ├── AppLayout.js         # Main layout wrapper
│   └── themeLight.css       # Theme styles
├── pages/
│   ├── CampaignPlanner.js   # Campaign planning interface
│   └── CampaignPlanner.css
├── context/
│   └── ThemeContext.js      # Theme management
├── App.js                   # Root component
├── index.js                 # React DOM entry point
└── setupTests.js            # Jest configuration
```

## 🎯 Key Features

### Campaign Dashboard
- Display all campaigns with forecasts
- Interactive time-series charts
- Hero products ranked by performance

### Campaign Planner
- Select campaign and category
- Filter SKUs by category
- Scenario simulation (discount, demand)
- CSV export with category metadata

### Responsive Design
- Mobile-first approach
- Responsive grid layout
- Touch-friendly inputs

## 🔌 API Integration

### API Client (`src/api/client.js`)

```javascript
import { apiClient } from './api/client';

// Load campaigns
const data = await apiClient.getCampaigns();

// Load specific campaign
const campaign = await apiClient.getCampaign(campaignId);

// Lookup inventory
const inventory = await apiClient.getInventorySku('MOBILE-001');

// Bulk lookup
const items = await apiClient.bulkInventoryLookup(['SKU1', 'SKU2']);
```

### Error Handling

```javascript
try {
  const data = await apiClient.getCampaigns();
  setError(null);
} catch (err) {
  setError(err.message);
  // Display error to user
}
```

## 🚢 Deployment

### Deploy to Cloudflare Pages

#### Option 1: GitHub Integration (Recommended)
1. Push code to GitHub
2. In Cloudflare Pages dashboard: "Connect to Git"
3. Select repository
4. **Build command**: `npm run build --prefix frontend`
5. **Build output directory**: `frontend/build`
6. **Environment variables**:
   - `REACT_APP_API_URL` = https://your-backend.onrender.com

#### Option 2: CLI Deployment
```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Deploy
wrangler pages deploy frontend/build
```

#### Option 3: GitHub Actions (see `.github/workflows/deploy.yml`)
```bash
git push
# Automatically builds and deploys to Cloudflare
```

### Environment Setup for Production
```env
REACT_APP_API_URL=https://api-pakistan-campaign.onrender.com
REACT_APP_ENV=production
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 📊 Performance Optimization

### Code Splitting
- Components lazy-loaded with `React.lazy()`
- Route-based code splitting

### Bundle Size
- Current: ~190 KB main JS, ~4 KB CSS
- No unnecessary dependencies

### Caching Strategy
- API responses cached in state
- Consider implementing `React Query` for more sophisticated caching

## 🔒 Security

- Never commit `.env.local`
- API keys stored only in environment variables
- CORS configured on backend for allowed origins
- CSP headers set by Cloudflare Pages

## 🛠️ Development Workflow

### Component Development
1. Create component in `src/components/`
2. Style with corresponding `.css` file
3. Export from component file
4. Import in parent/page component
5. Test in browser at localhost:3000

### Adding New Pages
1. Create page component in `src/pages/`
2. Add route in `App.js`
3. Update navigation in `AppLayout.js`

### API Integration
1. Add method to `src/api/client.js`
2. Import and use in component
3. Handle loading/error states
4. Cache results where appropriate

## 📝 Deployment Checklist

Before deploying to production:
- [ ] All dependencies in `package.json`
- [ ] `.env.example` updated
- [ ] No console errors in production build
- [ ] API endpoints working (test in staging)
- [ ] CORS allowed on backend
- [ ] REACT_APP_API_URL set correctly
- [ ] All routes tested
- [ ] Responsive design verified mobile
- [ ] Performance acceptable (<3s load)

## 🐛 Troubleshooting

**"Failed to fetch campaigns" error**
- Check `REACT_APP_API_URL` in `.env.local`
- Verify backend is running
- Check browser console for CORS errors
- Verify API endpoint is correct in `apiClient`

**Blank page loading**
- Check browser console for JavaScript errors
- Ensure `index.js` is loading
- Verify `App.js` renders without errors
- Check React DevTools for component tree

**Slow load times**
- Check network tab in DevTools
- Look for large bundle sizes
- Verify API response times
- Consider adding loading indicators

## 📚 Resources

- [React Documentation](https://react.dev)
- [Create React App Docs](https://create-react-app.dev)
- [Cloudflare Pages Guide](https://developers.cloudflare.com/pages/)
