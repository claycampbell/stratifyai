# Quick Start Guide

Get the AI-Powered OGSM Management Platform running in under 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- OR Node.js 20+ and PostgreSQL (for local development)

## 🚀 Fastest Way: Docker (Recommended)

### 1. Start Everything

```bash
# From the project root directory
docker-compose up -d
```

This single command will:
- Start PostgreSQL database
- Build and start the backend API
- Build and start the frontend
- Initialize the database schema
- Configure networking

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### 3. Stop Everything

```bash
docker-compose down
```

## 💻 Alternative: Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## ✅ Verify Installation

1. Open http://localhost:3000
2. You should see the Dashboard
3. Try uploading a document in the Documents section
4. Chat with the AI Strategy Officer

## 🎯 First Steps

1. **Upload a Document**: Go to Documents → Upload a strategic plan
2. **View OGSM Components**: Navigate to OGSM → See extracted components
3. **Add KPIs**: Go to KPIs → Add some key metrics to track
4. **Chat with AI**: Try the AI Chat → Ask strategic questions
5. **Generate Report**: Go to Reports → Generate a progress report

## 📝 Notes

- The Gemini API key is already configured in the `.env` file
- Free tier API has usage limits
- Sample documents are in the `Fw_Documents for Phase Zero_` folder

## ⚠️ Troubleshooting

**Docker Issues?**
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild
docker-compose down
docker-compose up --build
```

**Can't connect to database?**
```bash
# Check if PostgreSQL is running
docker-compose ps
docker-compose restart postgres
```

**Frontend not loading?**
- Check if backend is running: http://localhost:5000/health
- Clear browser cache
- Check browser console for errors

## 📚 More Help

See the full [README.md](README.md) for detailed documentation.

---

**Ready to start? Run `docker-compose up -d` now!** 🎉
