# ADO Metrics Dashboard

A comprehensive Azure DevOps metrics dashboard for tracking project health, sprint analytics, quality metrics, and team performance.

## 🚀 Features

### Executive Dashboard
- **Project Health Score** - Overall project health based on velocity, quality, and team metrics
- **Sprint Velocity** - Current and historical sprint velocity with trend analysis
- **Test Coverage** - Comprehensive test coverage metrics
- **Quality Gates** - Automated quality gate status and compliance

### Sprint Analytics
- **Burndown Charts** - Real-time sprint progress tracking
- **Velocity Tracking** - Sprint-over-sprint velocity analysis with consistency metrics
- **Scope Changes** - Track and analyze mid-sprint scope changes
- **Sprint Capacity** - Team capacity planning and utilization

### Quality Metrics
- **Test Categories** - Organized test metrics by category (Unit, Integration, E2E, etc.)
- **Bug Classification** - Environment-based bug tracking (Dev, QA, UAT, Production)
- **Test Execution** - Detailed test execution metrics and pass rates
- **Quality Gates** - Automated quality gate validation

### Team Performance
- **Individual Metrics** - Per-team-member performance tracking
- **Story Delivery** - Stories and story points delivered
- **Bug Analysis** - Bugs created vs. resolved per team member
- **Cycle Time** - Average cycle time for work items
- **Skills Matrix** - Inferred skills matrix based on work patterns

### AI-Powered Insights
- **Story Analysis** - AI-driven story content analysis
- **Sprint Summaries** - Automated sprint summary generation
- **Trend Predictions** - Predictive analytics for project trends
- **Executive Summaries** - AI-generated executive reports

## 🛠️ Setup Instructions

### Prerequisites
1. Azure DevOps organization and project access
2. Personal Access Token (PAT) with the following permissions:
   - **Work Items**: Read
   - **Project and Team**: Read
   - **Test Management**: Read
   - **Build**: Read (optional)
   - **Code**: Read (optional)

### Getting Started

1. **Open the Dashboard**
   - Open `index.html` in your web browser
   - No server setup required - runs entirely client-side

2. **Configure Azure DevOps Connection**
   - Click the configuration button or press `Ctrl+Shift+C`
   - Enter your Azure DevOps details:
     - **Organization**: Your Azure DevOps organization name
     - **Project**: Your project name
     - **PAT Token**: Your Personal Access Token

3. **Select Data Sources**
   - **Boards**: Choose which boards to track
   - **Team Members**: Select team members to include in metrics
   - **Iterations**: Select current and comparison iterations

4. **View Dashboard**
   - Navigate between sections using the sidebar
   - Data refreshes automatically based on your preferences

## 📊 Dashboard Sections

### Executive (Default)
High-level metrics for management reporting:
- Project health overview
- Key performance indicators
- Trend charts and forecasts

### Sprint Analytics
Detailed sprint tracking:
- Burndown and velocity charts
- Sprint progress indicators
- Scope change tracking

### Quality Metrics
Test and bug metrics:
- Test category breakdown
- Bug environment classification
- Quality gate status

### Team Performance
Individual and team metrics:
- Per-member performance cards
- Team collaboration metrics
- Skills and workload analysis

### AI Insights
AI-generated insights and summaries:
- Automated story analysis
- Predictive trends
- Executive summaries

### Reports
Comprehensive reporting:
- Export capabilities (Excel, PDF, CSV)
- Email report scheduling
- Custom report generation

## 🔧 Key Features

### Real-Time Data
- Automatic data refresh (configurable interval)
- Live connection status monitoring
- Real-time error handling and recovery

### Advanced Analytics
- **Sprint Burndown**: Ideal vs. actual progress tracking
- **Velocity Calculation**: 3-sprint rolling average with consistency metrics
- **Scope Change Tracking**: Work item revision history analysis
- **Bug Environment Classification**: Automatic environment detection
- **Quality Gates**: Multi-criteria quality validation

### Smart Error Handling
- Automatic retry mechanisms
- Network connectivity monitoring
- User-friendly error messages
- Graceful degradation

### Enhanced User Experience
- Responsive design for all screen sizes
- Keyboard shortcuts (`Ctrl+R` to refresh, `Ctrl+Shift+C` for config)
- Contextual tooltips and help
- Loading states and progress indicators

## 🔍 Troubleshooting

### Connection Issues
1. **Verify PAT Token**
   - Ensure token has correct permissions
   - Check token expiration date
   - Test token with Azure DevOps REST API

2. **Check Organization/Project Names**
   - Use exact names from Azure DevOps URL
   - Case sensitivity matters

3. **Network Connectivity**
   - Ensure access to `dev.azure.com`
   - Check corporate firewall settings

### Data Issues
1. **No Data Showing**
   - Verify selected boards have work items
   - Check iteration date ranges
   - Ensure team members are assigned to work items

2. **Missing Metrics**
   - Some metrics require specific work item types
   - Test data requires test cases and test runs
   - Bug metrics require bug work items

### Performance Issues
1. **Slow Loading**
   - Reduce number of selected team members
   - Limit date ranges for large projects
   - Use browser with modern JavaScript support

## 🎯 System Status

Check dashboard health with:
```javascript
// In browser console
getSystemStatus()
```

This returns:
- Configuration status
- Component availability
- Connection status
- Current section

## 📱 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🔐 Security & Privacy

- **Local Processing**: All data processing happens in your browser
- **No Server**: No backend server or data storage
- **Credentials**: PAT tokens stored locally (with basic encoding)
- **HTTPS**: Secure connections to Azure DevOps APIs

## 🆘 Getting Help

1. **Check Browser Console**: Press F12 to view detailed error messages
2. **System Status**: Use `getSystemStatus()` in console for diagnostics
3. **Error Logs**: Errors are logged locally for troubleshooting
4. **Reset Configuration**: Use "Reset Configuration" button if issues persist

## 🚀 Advanced Features

### Custom Metrics
The dashboard supports custom metric calculations by modifying the business metrics integration.

### Report Scheduling
Set up automated email reports with configurable schedules and recipients.

### Data Export
Export dashboard data in multiple formats:
- **Excel**: Full metrics with charts
- **PDF**: Formatted reports
- **CSV**: Raw data for analysis

### Predictive Analytics
AI-powered predictions for:
- Sprint completion likelihood
- Velocity trends
- Risk identification
- Resource planning

---

**Note**: This dashboard runs entirely in your browser and connects directly to Azure DevOps APIs. No server setup or deployment is required.
