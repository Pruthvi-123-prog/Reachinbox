<<<<<<< HEAD
# IMAP Email Management Application

[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?logo=react\&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933.svg?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-000000.svg?logo=express\&logoColor=white)](https://expressjs.com/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.11-005571.svg?logo=elasticsearch\&logoColor=white)](https://www.elastic.co/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg?logo=docker\&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack email management system with backend-first architecture. It provides real-time synchronization, AI-powered classification, search capabilities with Elasticsearch, and integration with external services such as Slack and webhooks.

---

## Table of Contents

* [Backend Features](#backend-features)
* [Architecture](#architecture)
* [Technology Stack](#technology-stack)
* [Prerequisites](#prerequisites)
* [Quick Start](#quick-start)
* [API Documentation](#api-documentation)
* [Configuration](#configuration)
* [Development](#development)
* [Email Categories](#email-categories)
* [Search Features](#search-features)
* [Monitoring & Analytics](#monitoring--analytics)
* [System Requirements](#system-requirements)
* [Security Considerations](#security-considerations)
* [Troubleshooting](#troubleshooting)
* [Deployment](#deployment)
* [Email Analytics & Reporting](#email-analytics--reporting)
* [License](#license)
* [Contributing](#contributing)
* [Support](#support)

---

## Backend Features

* **Real-time Email Synchronization**: IMAP IDLE connections for instant updates.
* **AI-Powered Categorization**: OpenAI integration for automated classification with rule-based fallback.
* **Elasticsearch Integration**: Full-text search and advanced indexing.
* **Slack Notifications**: Automated alerts for specific events.
* **Webhook Integration**: External triggers for workflow automation.
* **RESTful APIs**: Endpoints for email, search, and analytics.
* **TypeScript Support**: Strong typing and maintainable backend code.

---

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │ Node.js Backend │    │  Elasticsearch  │
│   (Port 3001)   │◄──►│   (Port 3000)   │◄──►│   (Port 9200)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │     External Services   │
                    │   • IMAP Servers        │
                    │   • OpenAI API          │
                    │   • Slack API           │
                    │   • Webhook Endpoints   │
                    └─────────────────────────┘
```

### Responsibilities

* **Backend Layer**: REST APIs, IMAP sync, categorization, and integrations.
* **Data Layer**: Elasticsearch for full-text search and analytics.
* **Integration Layer**: AI (OpenAI), Slack, and webhook notifications.

---

## Technology Stack

### Backend

* Node.js 18+
* TypeScript
* Express.js
* Elasticsearch
* IMAP with mailparser
* OpenAI GPT models
* Slack Web API
* Winston (logging)
* Zod (validation)

### Frontend (minimal overview)

* React 18 with TypeScript
* Axios for API communication

### Infrastructure

* Docker & Docker Compose
* Elasticsearch 8.11
* Kibana (optional)

---

## Prerequisites

* Node.js 18+
* Docker and Docker Compose
* IMAP-enabled email accounts
* OpenAI API key
* Slack Bot Token (optional)
* Webhook URL (optional)

---

## Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/Pruthvi-123-prog/IMAP.git
cd IMAP
```

2. **Start infrastructure**

```bash
docker-compose up -d
```

3. **Configure environment**

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials.

4. **Install and build backend**

```bash
npm install
npm run build
npm start
```

5. **Install and start frontend in a new terminal**

```bash
cd frontend
npm install
npm start
```

6. **Verify system health**

```bash
curl http://localhost:3000/api/health/detailed
```

---

## API Documentation

### Health Endpoints

* `GET /api/health`
* `GET /api/health/detailed`
* `GET /api/health/ready`

### Email Endpoints

* `GET /api/emails`
* `GET /api/emails/:id`
* `PATCH /api/emails/:id`
* `GET /api/emails/stats/overview`
* `POST /api/emails/sync`
* `GET /api/emails/sync/status`
* `POST /api/emails/:id/suggest-reply`

### Search Endpoints

* `POST /api/search`
* `GET /api/search/quick`
* `GET /api/search/suggestions`
* `GET /api/search/by-category`
* `GET /api/search/:emailId/similar`
* `GET /api/search/analytics/trends`

---

## Configuration

* **Backend**: Email accounts, Elasticsearch, API keys.
* **Frontend**: API URLs.
* IMAP setup for Gmail, Outlook, etc.
* Slack bot integration.
* OpenAI API configuration.

---

## Development

* TypeScript for type safety.
* ESLint for code quality.
* Jest for testing.
* Docker Compose for dependencies.

Commands include:

```bash
npm run dev
npm run lint
npm run test
npm run build
```

---

## Email Categories

* Interested
* Meeting Booked
* Not Interested
* Spam
* Out of Office
* Business
* Personal
* Support
* Promotional
* Newsletter

---

## Search Features

* Full-text search
* Filters by account, category, sender, date range
* Sorting options
* Auto-suggestions
* Similar email discovery
* Advanced multi-criteria search

---

## Monitoring & Analytics

* Real-time sync monitoring
* Email volume trends
* Category distribution
* Account activity breakdown
* System performance metrics

---

## System Requirements

### Minimum

* Dual-core 2.0 GHz CPU
* 4 GB RAM (8 GB recommended)
* 20 GB storage
* Ubuntu 20.04+, Debian 11+, Windows 10/11, macOS 11+

### Recommended Production

* Quad-core 2.5 GHz CPU
* 16 GB RAM
* 100 GB SSD
* 100 Mbps connection

---

## Security Considerations

* Environment variables for sensitive credentials
* TLS for all communications
* Rate limiting for API endpoints
* JWT authentication
* Least privilege principle
* Regular dependency updates
* Monitoring for anomalies

---

## Troubleshooting

### Common Issues

1. **Elasticsearch connection failed**: check Docker logs.
2. **IMAP errors**: verify credentials and TLS.
3. **AI not working**: validate API key and limits.
4. **Sync not running**: check backend logs and credentials.

Logs:

* Backend: `backend/logs/`
* Elasticsearch: Docker logs

---

## Deployment

### Docker Deployment

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Cloud Deployment

* Frontend: CDN or object storage
* Backend: container services (ECS, AKS, GKE)
* Elasticsearch: managed service

### Production Checklist

* `NODE_ENV=production`
* SSL certificates
* Rate limiting
* Backups
* Monitoring and alerting

---

## Email Analytics & Reporting

* Email volume analysis
* Category distribution
* Account performance metrics
* System performance monitoring

---

## License

Licensed under the [MIT License](LICENSE).

---

## Contributing

1. Fork repository
2. Create a feature branch
3. Commit changes
4. Open a Pull Request

---

## Support

* Documentation: `docs/README.md`
* Troubleshooting section
* Logs for errors
* Issues: [GitHub Issues](https://github.com/Pruthvi-123-prog/IMAP/issues)
* Email: [pruthvis2004@gmail.com](mailto:pruthvis2004@hmail.com)

---

**IMAP Email Management System**
Backend-focused application for scalable email synchronization and analytics.
=======
# IMAP
>>>>>>> 44ed6ea33fadf3dd9a0610398e84c280a1f65e64
