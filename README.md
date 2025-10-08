# AI-Powered OGSM Management Platform

An intelligent strategic planning and management platform powered by Google Gemini AI. This system helps organizations manage their strategic plans using the OGSM (Objectives, Goals, Strategies, Measures) framework with AI-powered insights and recommendations.

## 🎯 Overview

The AI-Powered OGSM Management Platform is designed for Robert Morris University Athletics to streamline strategic operations, anticipate trends, and amplify strategic capacity. It serves as an AI Chief Strategy Officer that assists with:

- **Strategic Planning & Execution**: Manage OGSM components with AI-powered extraction and analysis
- **Document Processing**: Automatically extract strategic insights from uploaded documents
- **KPI Tracking**: Monitor and visualize key performance indicators
- **AI-Powered Chat**: Get real-time strategic guidance and recommendations
- **Report Generation**: Automatically generate 30/60/90-day progress reports

## 🚀 Features

### Phase Zero (Current Release)

1. **Document Management**
   - Upload strategic plans, KPI trackers, and meeting agendas
   - AI-powered extraction of OGSM components from documents
   - Support for DOCX, XLSX, TXT, and MD formats

2. **OGSM Framework Management**
   - Create and manage Objectives, Goals, Strategies, and Measures
   - View hierarchical relationships between components
   - AI-assisted component extraction from documents

3. **KPI Tracking & Analytics**
   - Track key performance indicators with targets and current values
   - Visual progress indicators and status tracking
   - Historical data tracking for trend analysis

4. **AI Chief Strategy Officer**
   - Interactive chat interface for strategic guidance
   - Context-aware responses based on your organization's data
   - Strategic alignment analysis
   - Automated recommendations

5. **Report Generation**
   - AI-generated progress reports (30/60/90-day, weekly, custom)
   - Markdown-formatted professional reports
   - Historical report archive

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL database
- Google Gemini AI (gemini-1.5-flash)
- Document processing (mammoth, xlsx)

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- TailwindCSS for styling
- React Query for state management
- React Router for navigation

**Infrastructure:**
- Docker & Docker Compose
- Nginx for frontend serving
- PostgreSQL containerized database

## 📋 Prerequisites

- Node.js 20+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## 🛠️ Installation & Setup

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ogsm_manager
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/health

5. **Stop the application**
   ```bash
   docker-compose down
   ```

### Option 2: Local Development Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database and API credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ogsm_manager
   DB_USER=postgres
   DB_PASSWORD=postgres
   GEMINI_API_KEY=your_actual_api_key_here
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=uploads
   ```

4. **Set up PostgreSQL database**
   - Install PostgreSQL if not already installed
   - Create database: `createdb ogsm_manager`
   - The schema will be auto-initialized on first run

5. **Start the backend server**
   ```bash
   npm run dev
   ```

   Backend will run on http://localhost:5000

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   Frontend will run on http://localhost:3000

## 📚 Usage Guide

### 1. Upload Documents

1. Navigate to the **Documents** page
2. Click "Upload Document" and select your file
3. Supported formats: DOCX, XLSX, TXT, MD
4. The AI will automatically process and extract OGSM components

### 2. Manage OGSM Components

1. Go to the **OGSM** page
2. View all components or filter by type (Objectives, Goals, Strategies, Measures)
3. Click "Add Component" to create new entries
4. Edit or delete existing components as needed

### 3. Track KPIs

1. Navigate to the **KPIs** page
2. Click "Add KPI" to create a new key performance indicator
3. Set target values, current values, and tracking frequency
4. Monitor progress with visual indicators
5. KPIs are automatically categorized as: On Track, At Risk, or Off Track

### 4. Chat with AI Strategy Officer

1. Go to the **AI Chat** page
2. Ask questions about your strategic plan
3. Request analysis, recommendations, or insights
4. The AI has context of all your uploaded data and OGSM components

### 5. Generate Reports

1. Navigate to the **Reports** page
2. Click "Generate Report"
3. Select report type (30/60/90-day, weekly, custom)
4. Provide a title and optional timeframe
5. AI generates a comprehensive progress report
6. View, download, or delete reports as needed

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | ogsm_manager |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | postgres |
| `PORT` | Backend server port | 5000 |
| `NODE_ENV` | Environment mode | development |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 10485760 (10MB) |
| `VITE_API_URL` | Backend API URL (frontend) | http://localhost:5000/api |

### API Key Setup

The platform uses Google Gemini AI for all AI-powered features. To get your API key:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env` file

**Note**: The provided API key in the requirements is a free tier key with usage limits.

## 🏢 Project Context

This platform was developed for **Robert Morris University Athletics** as part of the "AI Chief Strategy Officer" project. Key documents that inform this system:

- RMU Athletics FY26 Strategic Plan of Action
- FY26 Athletics Cabinet Master Tracker
- Weekly Athletics Cabinet Strategy Tracker
- 30/60/90 Day Report Templates
- Athletics Cabinet Meeting Agenda Instructions

The platform supports Phase Zero objectives:
- Strategic and operational planning
- Leadership efficiency
- Operational excellence
- Integration with Asana (future phase)
- Compliance management capabilities

## 📁 Project Structure

```
ogsm_manager/
├── backend/                  # Node.js/Express backend
│   ├── src/
│   │   ├── config/          # Database and Gemini AI config
│   │   ├── database/        # SQL schema and migrations
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (Gemini service)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # File processing utilities
│   │   └── server.ts        # Express server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # API client
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml        # Docker orchestration
├── .env.example              # Environment template
├── context.md                # Project context and requirements
└── README.md                 # This file
```

## 🔌 API Endpoints

### Documents
- `POST /api/documents/upload` - Upload and process document
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get document by ID
- `DELETE /api/documents/:id` - Delete document

### OGSM Components
- `GET /api/ogsm` - Get all OGSM components
- `GET /api/ogsm/:id` - Get component by ID
- `POST /api/ogsm` - Create new component
- `PUT /api/ogsm/:id` - Update component
- `DELETE /api/ogsm/:id` - Delete component
- `GET /api/ogsm/hierarchy/tree` - Get hierarchical view

### KPIs
- `GET /api/kpis` - Get all KPIs
- `GET /api/kpis/:id` - Get KPI by ID
- `POST /api/kpis` - Create new KPI
- `PUT /api/kpis/:id` - Update KPI
- `DELETE /api/kpis/:id` - Delete KPI
- `POST /api/kpis/:id/history` - Add KPI history entry
- `GET /api/kpis/:id/history` - Get KPI history
- `GET /api/kpis/:id/stats` - Get KPI statistics

### AI
- `POST /api/ai/chat` - Chat with AI Strategy Officer
- `GET /api/ai/chat/:session_id` - Get chat history
- `POST /api/ai/analyze` - Analyze strategic alignment
- `POST /api/ai/reports/generate` - Generate progress report
- `GET /api/ai/reports` - Get all reports
- `GET /api/ai/reports/:id` - Get report by ID
- `DELETE /api/ai/reports/:id` - Delete report
- `POST /api/ai/recommendations` - Get AI recommendations

## 🐛 Troubleshooting

### Docker Issues

**Problem**: Containers fail to start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Restart services
docker-compose restart

# Rebuild containers
docker-compose down
docker-compose up --build
```

**Problem**: Database connection errors
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres

# View database logs
docker-compose logs postgres
```

### Local Development Issues

**Problem**: Backend fails to connect to database
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if database exists: `psql -l`

**Problem**: Frontend can't connect to backend
- Verify backend is running on port 5000
- Check `VITE_API_URL` in frontend `.env`
- Ensure CORS is properly configured

**Problem**: AI features not working
- Verify `GEMINI_API_KEY` is set correctly
- Check API key is valid at [Google AI Studio](https://makersuite.google.com/)
- Review backend logs for API errors

## 🚀 Cloud Deployment

The application is containerized and ready for cloud deployment on:

- **AWS**: ECS, EKS, or EC2 with Docker
- **Google Cloud**: Cloud Run, GKE, or Compute Engine
- **Azure**: Container Instances, AKS, or App Service
- **DigitalOcean**: App Platform or Droplets

### Deployment Steps

1. Build and push Docker images to a container registry
2. Set up PostgreSQL database (RDS, Cloud SQL, etc.)
3. Configure environment variables in cloud platform
4. Deploy containers using docker-compose or Kubernetes
5. Set up load balancer and SSL certificates
6. Configure monitoring and logging

## 📈 Future Enhancements

- Integration with Asana for project management
- Integration with Sprout Social for social media tracking
- Advanced analytics and data visualizations
- Role-based access control (RBAC)
- Student-athlete and donor data security features
- Compliance management tools
- Mobile application
- Real-time collaboration features

## 🤝 Contributing

This is a Phase Zero implementation. Future phases will expand functionality based on user feedback and requirements.

## 📄 License

MIT License - See LICENSE file for details

## 📧 Support

For issues, questions, or feature requests, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for RMU Athletics**

*AI-Powered Strategic Planning Made Simple*
