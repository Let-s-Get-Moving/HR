# Dashboard Page

> **Source**: `web/src/pages/Dashboard.jsx`

The main landing page showing key metrics, charts, and quick actions.

## Overview

The Dashboard provides an at-a-glance view of:
- Workforce statistics
- Attendance metrics
- Compliance status
- Payroll summary
- Recent activity

## Role Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Manager | Full access |
| User | Basic view (limited metrics) |

## API Calls

| Endpoint | Purpose |
|----------|---------|
| GET /api/analytics/dashboard | Main metrics |
| GET /api/analytics/recent-activity | Activity feed |

## Components Used

- `Greeting` - Time-based greeting with user name
- `MetricCard` - Individual metric display
- `Donut` - Donut chart visualization
- `SkeletonLoader` - Loading placeholders

## UI Sections

### Greeting Header

Displays personalized greeting based on time of day:
- Morning (5am-12pm)
- Afternoon (12pm-5pm)
- Evening (5pm-9pm)
- Night (9pm-5am)

### Metric Cards

Top row of key metrics:
- Total Employees
- Active Employees
- Pending Leave Requests
- Compliance Alerts

### Charts Section

Visual representations:
- Workforce breakdown by employment type
- Department distribution
- Attendance overview

### Quick Actions

Buttons for common tasks:
- Add Employee → Navigates to Employees
- View Bonuses → Navigates to BonusesCommissions (if permitted)
- View Compliance → Navigates to Compliance
- View Payroll → Navigates to PayrollV2

### Recent Activity

Timeline of recent actions:
- New hires
- Leave requests
- Status changes

## State

```jsx
const [analytics, setAnalytics] = useState(null);    // Main analytics data
const [wf, setWf] = useState(null);                  // Workforce breakdown
const [att, setAtt] = useState(null);                // Attendance metrics
const [cmp, setCmp] = useState(null);                // Compliance stats
const [payroll, setPayroll] = useState(null);        // Payroll summary
const [recentActivity, setRecentActivity] = useState([]); // Activity feed
const [loading, setLoading] = useState(true);
const [selectedTimeRange, setSelectedTimeRange] = useState('month');
```

## Time Range Filter

Filter metrics by time period:
- Week
- Month (default)
- Quarter
- Year

## Features

### Refresh Button

Manual refresh of all dashboard data.

### Responsive Layout

- Desktop: 4-column grid for metrics
- Tablet: 2-column grid
- Mobile: Single column stack

### Animations

Framer Motion animations:
- Fade-in on load
- Hover effects on cards
- Smooth transitions

## Example Data Flow

```
1. Component mounts
2. loadData() called
3. Parallel API calls:
   - /api/analytics/dashboard
   - /api/analytics/recent-activity
4. State updated with responses
5. UI renders with data
```

## Related

- [Analytics API](../../backend/routes/analytics.md)
- [MetricCard Component](../components/metric-card.md)

---

*Last verified: January 2026*
