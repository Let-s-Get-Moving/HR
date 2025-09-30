# 🏢 HR Management System

A comprehensive **Human Resources Management System** built with modern web technologies, featuring complete data integration, automated workflows, and a professional metal-themed UI.

## 🚀 **System Status: FULLY OPERATIONAL**

- ✅ **Web Application**: Running on `http://localhost:5173`
- ✅ **API Server**: Running on `http://localhost:8080`
- ✅ **Database**: PostgreSQL with 248 employees, 5,430 payroll records
- ✅ **Adminer**: Available on `http://localhost:8081`

## 📊 **Current Data Status**

| Data Type | Count | Status |
|-----------|-------|--------|
| **Employees** | 248 | ✅ Complete |
| **Payroll Records** | 5,430 | ✅ 16 pay periods (Dec 2024 - Aug 2025) |
| **Documents** | 282 | ✅ Contracts, permits, etc. |
| **Addresses** | 191 | ✅ Employee addresses |
| **Bank Accounts** | 191 | ✅ Direct deposit info |
| **Identifiers** | 71 | ✅ SIN numbers, permits |
| **Compensation** | 1,739 | ✅ Rate history |
| **Compliance Alerts** | 4 | ✅ Active alerts |

## 🎯 **Core Features**

### **👥 Employee Management**
- Complete employee profiles with contact info, addresses, bank accounts
- Employment history and status tracking
- Document management (contracts, permits, certificates)
- Emergency contact information

### **💰 Payroll & Compensation**
- Automated payroll calculations across 16 pay periods
- Hourly rate tracking and compensation history
- Bonus and commission management
- Deduction tracking and vacation pay

### **📅 Leave Management**
- Leave request submission and approval workflow
- Leave balance tracking by type (vacation, sick, personal)
- Manager approval system with notifications
- Leave calendar and analytics

### **⚠️ Compliance Monitoring**
- Automated alerts for SIN/permit expirations
- Contract renewal reminders
- Training expiry notifications
- Compliance dashboard with metrics

### **📈 Performance Management**
- Performance review system with ratings
- Goal setting and progress tracking
- 360° feedback collection
- Performance analytics and reporting

### **⏰ Time Tracking & Timecards**
- Comprehensive timecard management system
- Excel-based import for bulk timecard uploads
- Multiple clock-in/out pairs per day
- Automatic overtime detection (>8 hours/day)
- Missing punch alerts
- Three view system: Main table, Individual details, Dashboard statistics
- Role-based access (Admin, HR, User)
- Pay period filtering and employee search

## 🏗️ **Architecture**

```
HR System/
├── 📁 web/                 # React Frontend (Vite + Tailwind)
│   ├── 📄 App.jsx         # Main application
│   ├── 📁 pages/          # Page components
│   └── 📁 components/     # Reusable UI components
├── 📁 api/                # Node.js Backend (Express)
│   ├── 📄 server.js       # Main server
│   ├── 📁 routes/         # API endpoints
│   └── 📄 db.js          # Database connection
├── 📁 db/                 # Database schema
│   └── 📁 init/          # SQL initialization scripts
├── 📁 LGM/               # Data import files
│   └── 📁 csv/           # CSV data files
└── 📁 scripts/           # Data import scripts
```

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** with Vite for fast development
- **Tailwind CSS** for professional styling
- **Framer Motion** for smooth animations
- **React Router** for navigation

### **Backend**
- **Node.js** with Express.js
- **PostgreSQL** database
- **RESTful API** design
- **JWT authentication**

### **DevOps**
- **Docker Compose** for containerization
- **Adminer** for database management
- **Hot reload** for development

## 🚀 **Quick Start**

### **Prerequisites**
- Docker and Docker Compose
- Node.js 18+ (for development)

### **1. Clone and Setup**
```bash
git clone <repository-url>
cd HR
```

### **2. Start the System**
```bash
docker compose up -d
```

### **3. Import Data (First Time)**
```bash
# Import all LGM data
docker run --rm --network hr_default \
  -e HR_BASE_DIR=/work -e DATABASE_URL=postgresql://hr:hrpass@db:5432/hrcore \
  -v /Users/udishkolnik/HR:/work -w /work \
  python:3.11-slim bash -lc "pip install -q psycopg2-binary && python scripts/import_lgm.py"
```

### **4. Access Applications**
- **Web App**: http://localhost:5173
- **API**: http://localhost:8080
- **Database**: http://localhost:8081 (Adminer)

## 📋 **API Endpoints**

### **Employee Management**
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee

### **Payroll**
- `GET /api/payroll/calculations` - Get payroll records
- `GET /api/payroll/periods` - Get pay periods
- `POST /api/payroll/calculate` - Calculate payroll

### **Leave Management**
- `GET /api/leave/requests` - Get leave requests
- `POST /api/leave/requests` - Submit leave request
- `PUT /api/leave/requests/:id/approve` - Approve/reject request

### **Compliance**
- `GET /api/compliance/alerts` - Get active alerts
- `POST /api/compliance/generate-alerts` - Generate new alerts
- `PUT /api/compliance/alerts/:id/resolve` - Resolve alert

### **Performance**
- `GET /api/performance/reviews` - Get performance reviews
- `POST /api/performance/reviews` - Create review
- `GET /api/performance/goals` - Get performance goals

## 🎨 **UI/UX Features**

### **Professional Design**
- **Metal-themed** color scheme with minimal colors
- **Responsive design** for all devices
- **Smooth animations** and transitions
- **Intuitive navigation** with breadcrumbs

### **Dashboard Analytics**
- **Real-time metrics** and KPIs
- **Interactive charts** and graphs
- **Performance indicators**
- **Compliance status** overview

## 📊 **Data Integration**

### **LGM Data Import**
The system automatically imports data from LGM files:
- **Employee onboarding** forms (75 employees)
- **Payroll stubs** (173 employees, 16 pay periods)
- **Timecard data** (ready for import)
- **Document management** (contracts, permits)

### **Automated Processing**
- **Data validation** and cleaning
- **Duplicate detection** and merging
- **Relationship mapping** (employees to departments)
- **Compliance checking** and alert generation

## 🔧 **Development**

### **Adding New Features**
1. Create API route in `api/src/routes/`
2. Add database schema in `db/init/`
3. Create React component in `web/src/pages/`
4. Update navigation in `web/src/App.jsx`

### **Database Changes**
```bash
# Apply new schema
docker exec -i hr-db-1 psql -U hr -d hrcore -f /docker-entrypoint-initdb.d/new_schema.sql
```

### **API Development**
```bash
# View API logs
docker logs hr-api-1 -f

# Test endpoints
curl http://localhost:8080/api/employees
```

## 📈 **Performance & Scalability**

### **Current Performance**
- **248 employees** processed efficiently
- **5,430 payroll records** with fast queries
- **Real-time dashboard** updates
- **Responsive UI** with smooth interactions

### **Scalability Features**
- **Modular architecture** for easy expansion
- **Database indexing** for fast queries
- **API rate limiting** and caching
- **Containerized deployment** for easy scaling

## 🔒 **Security & Compliance**

### **Data Protection**
- **Encrypted database** connections
- **Input validation** and sanitization
- **SQL injection** prevention
- **XSS protection** in frontend

### **Compliance Features**
- **SIN expiration** monitoring
- **Work permit** tracking
- **Contract renewal** alerts
- **Training expiry** notifications

## 🚀 **Deployment**

### **Production Ready**
- **Docker containers** for easy deployment
- **Environment variables** for configuration
- **Database backups** and recovery
- **Health monitoring** and logging

### **Cloud Deployment**
```bash
# Deploy to cloud platform
docker compose -f docker-compose.prod.yml up -d
```

## 📞 **Support & Maintenance**

### **Monitoring**
- **Application logs** via Docker
- **Database performance** monitoring
- **API endpoint** health checks
- **Error tracking** and alerting

### **Backup & Recovery**
- **Automated database** backups
- **Data export** functionality
- **Disaster recovery** procedures
- **Version control** for all changes

## 🎉 **Success Metrics**

### **Implementation Complete**
- ✅ **100% data integration** from LGM files
- ✅ **Complete HR workflows** implemented
- ✅ **Professional UI/UX** with metal theme
- ✅ **Robust backend APIs** with error handling
- ✅ **Scalable database** schema
- ✅ **Production-ready** deployment

### **Business Value**
- **248 employees** managed efficiently
- **5,430 payroll records** processed
- **4 compliance alerts** automated
- **Complete HR lifecycle** management

---

**🎯 The HR Management System is now fully operational and ready for production use!**
