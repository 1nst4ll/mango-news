# Mango News - TCI News Aggregator

A comprehensive news aggregation platform for the Turks and Caicos Islands. The application scrapes news from multiple sources, processes content with AI for summaries, translations, and topic tagging, and presents it through a modern web interface.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** database
- **API Keys:** Groq (AI), Ideogram (images), AWS S3 (storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/mango-news.git
cd mango-news

# Backend setup
cd backend
cp .env.example .env  # Configure your environment variables
npm install
npm run dev

# Frontend setup (new terminal)
cd frontend
cp .env.example .env  # Set PUBLIC_API_URL
npm install
npm run dev
```

The backend runs on `http://localhost:3000` and frontend on `http://localhost:4321`.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Backend Setup](docs/backend-setup.md) | Database setup, environment variables, authentication |
| [API Documentation](docs/api-documentation.md) | Complete API endpoint reference |
| [Deployment Guide](docs/deployment.md) | Production deployment on Render and other platforms |
| [Frontend UI](docs/frontend-ui.md) | Astro/React frontend architecture and components |
| [Scraping Methods](docs/scraping-methods.md) | Open-source (Puppeteer) and Firecrawl scraping |
| [CSS Selectors](docs/css-selectors.md) | Guide for configuring source scraping selectors |
| [Admin UI](docs/admin-ui.md) | Settings page and source management |
| [Multilingual Support](docs/multilingual-support.md) | Spanish & Haitian Creole translations |
| [Sunday Edition](docs/sunday-edition.md) | Weekly AI-generated news summary feature |
| [WordPress Integration](docs/wordpress-integration.md) | Embedding news widgets in WordPress |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## 🏗️ Architecture

```
mango-news/
├── backend/           # Node.js/Express API server
│   ├── src/
│   │   ├── index.js          # Main server entry point
│   │   ├── scraper.js        # Article scraping & AI processing
│   │   ├── opensourceScraper.js  # Puppeteer-based scraper
│   │   ├── browserPool.js    # Shared browser instance
│   │   ├── db.js             # PostgreSQL connection pool
│   │   └── sundayEditionGenerator.js  # Weekly summary feature
│   └── config/
│       └── blacklist.json    # URLs to exclude from scraping
├── frontend/          # Astro + React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Astro pages with i18n routing
│   │   ├── locales/          # Translation files (en, es, ht)
│   │   └── layouts/          # Page layouts
│   └── public/               # Static assets
├── db/                # Database schema and migrations
└── widgets/           # WordPress integration widgets
```

## ✨ Key Features

- **Multi-Source Scraping:** Aggregate news from multiple TCI news sources
- **AI-Powered Processing:**
  - Automatic article summaries (Groq/Llama)
  - Topic classification (31 predefined topics)
  - AI-generated images (Ideogram API)
  - Translations (Spanish, Haitian Creole)
- **Sunday Edition:** Weekly AI-narrated news summary with audio
- **Admin Dashboard:** Source management, scraping controls, statistics
- **RSS Feed:** Subscribe to news updates
- **Responsive Design:** Mobile-first with dark/light mode

## 🔧 Environment Variables

### Backend (`backend/.env`)

```env
# Database
DB_HOST=localhost
DB_NAME=mangonews
DB_USER=mangoadmin
DB_PASSWORD=your_password

# API Keys
GROQ_API_KEY=your_groq_key
IDEOGRAM_API_KEY=your_ideogram_key
FIRECRAWL_API_KEY=your_firecrawl_key  # Optional
UNREAL_SPEECH_API_KEY=your_unreal_key  # For Sunday Edition

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

# Auth
JWT_SECRET=your_jwt_secret
```

### Frontend (`frontend/.env`)

```env
PUBLIC_API_URL=http://localhost:3000
```

## 🔐 Authentication

Protected endpoints require JWT authentication:

1. Register: `POST /api/register`
2. Login: `POST /api/login` → Returns JWT token
3. Use token: `Authorization: Bearer YOUR_TOKEN`

See [API Documentation](docs/api-documentation.md) for protected endpoint list.

## 📝 License

ISC

---

For detailed documentation on specific features, see the [docs](docs/) folder.
