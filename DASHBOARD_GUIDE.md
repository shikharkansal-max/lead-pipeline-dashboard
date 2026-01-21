# Lead Pipeline Dashboard - User Guide

## 🎯 Overview
A professional, dynamic dashboard that visualizes your lead pipeline data from Google Sheets in real-time with comprehensive filtering and analytics.

## ✨ Features

### 📊 Key Metrics (Top Cards)
- **Total Deals**: Count of all deals in the pipeline
- **Pipeline Value**: Total potential revenue across all deals
- **Avg Deal Size**: Average value per deal
- **Win Rate**: Percentage of closed deals that were won

### 🔍 Filters
Filter your pipeline data by:
- **Account Executive (AE)**: View individual AE performance
- **Region**: US, India, SEA, MENA, Europe, Other
- **Stage**: Deal Won, Proposal, Contract, Solutioning, etc.
- **Industry**: BFSI, Retail, Real Estate, Education, etc.

### 📈 Visualizations

1. **Deal Pipeline Stages**
   - Visual breakdown with progress bars
   - Shows deal count and value per stage
   - Percentage distribution across pipeline

2. **Account Executive Performance**
   - Individual AE metrics cards
   - Total value, average deal size, win rate
   - Top performer badge
   - Visual win rate progress bar

3. **Regional Distribution**
   - Pipeline breakdown by geography
   - Regional share percentages
   - Average deal size per region

4. **All Deals Table**
   - Complete list of all deals
   - Color-coded stage and confidence badges
   - Sortable columns

## 🔄 Syncing Data from Google Sheets

### Your Google Sheet
**Sheet ID**: `1sCF9c4A0rartzBdJMo8bYQbKkAyHqcJsIZOlANDcbn4`

### How to Sync
1. Click the **"Sync Data"** button in the top-right corner
2. The dashboard will fetch the latest data from your Google Sheet
3. All metrics and visualizations will update automatically
4. Last sync time is displayed below the title

### Auto-Sync on Sheet Updates
The dashboard is connected to your Google Sheet. Whenever you:
- Add new deals
- Update deal stages
- Change AE assignments
- Modify deal values

Simply click "Sync Data" to refresh the dashboard with the latest information.

## 🔐 Google Sheet Requirements

Your Google Sheet must be:
- **Publicly accessible** with "Anyone with the link" can view
- Contains columns: Stage, Deal, AE, Geo, Industry, Amount, Potential Deal Size, Confidence, Date

### To Make Your Sheet Public:
1. Open your Google Sheet
2. Click **Share** (top right)
3. Change "Restricted" to **"Anyone with the link"**
4. Set permission to **"Viewer"**
5. Click **Done**

## 🎨 Dashboard Features

### Professional Design
- Clean, corporate aesthetic with Inter font
- Card-based layout for easy scanning
- Color-coded stages and confidence levels
- Smooth transitions and hover effects

### Dynamic Updates
- Real-time data sync from Google Sheets
- Instant filter application
- Responsive metrics recalculation

### Performance Insights
- Identify top-performing AEs
- Track deals by stage
- Monitor regional performance
- Analyze win rates and trends

## 🚀 Technical Details

### Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (for caching)
- **Integration**: Google Sheets API (CSV export)

### API Endpoints
- `POST /api/sheets/sync` - Sync data from Google Sheets
- `GET /api/deals` - Get deals with filters
- `GET /api/analytics/pipeline` - Pipeline metrics
- `GET /api/analytics/ae-performance` - AE performance data
- `GET /api/analytics/regional` - Regional breakdown
- `GET /api/sync-status` - Last sync status

## 📝 Notes

- The dashboard caches data in MongoDB for fast performance
- Sync data regularly to see the latest updates
- Filters are applied instantly without page reload
- All currency values are displayed in USD format

## 🎯 Next Steps

To enhance your dashboard further, consider:
1. **Scheduled Auto-Sync**: Set up automatic syncing every hour/day
2. **Email Reports**: Generate weekly pipeline reports
3. **Trend Analysis**: Add historical data tracking and trend charts
4. **Deal Aging**: Show how long deals have been in each stage
5. **Custom Targets**: Set and track AE/regional targets
6. **Export Reports**: Download dashboard data as PDF/Excel

---

**Need Help?** The dashboard automatically shows helpful messages when:
- No data is loaded (prompts you to sync)
- Filters return no results
- Sync fails (with error details)
