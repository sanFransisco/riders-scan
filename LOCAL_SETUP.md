# 🏠 Local Development Setup

## Prerequisites

- Node.js 18+
- A PostgreSQL database (local or Vercel Postgres)

## Quick Start

### Option 1: Use Vercel Postgres (Recommended)

1. **Create a Vercel Postgres database:**
   - Go to your Vercel dashboard
   - Create a new Postgres database
   - Copy the connection details

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   ```

3. **Edit `.env.local` with your Vercel Postgres credentials:**
   ```env
   POSTGRES_URL="postgresql://username:password@host:port/database"
   POSTGRES_HOST="your-postgres-host"
   POSTGRES_DATABASE="your-database-name"
   POSTGRES_USERNAME="your-username"
   POSTGRES_PASSWORD="your-password"
   ```

4. **Install dependencies and start:**
   ```bash
   npm install
   npm run dev
   ```

5. **Initialize the database:**
   ```bash
   curl -X POST http://localhost:3000/api/init
   ```

### Option 2: Use Local PostgreSQL

1. **Install PostgreSQL locally:**
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Or use Docker
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. **Create a database:**
   ```bash
   createdb riders_scan
   ```

3. **Set up environment variables:**
   ```env
   POSTGRES_URL="postgresql://localhost:5432/riders_scan"
   POSTGRES_HOST="localhost"
   POSTGRES_DATABASE="riders_scan"
   POSTGRES_USERNAME="your-username"
   POSTGRES_PASSWORD="your-password"
   ```

## Development Workflow

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Access the application:**
   - Open http://localhost:3000
   - The app will show a database configuration error if no environment variables are set

3. **Test the application:**
   - Search for drivers (will work once database is configured)
   - Create reviews
   - View driver profiles

## Troubleshooting

### "Database not configured" Error
- Make sure you have a `.env.local` file with the correct database credentials
- Verify your PostgreSQL connection is working
- Check that all required environment variables are set

### Connection Issues
- Verify your database is running
- Check firewall settings
- Ensure the database credentials are correct

### Vercel Postgres Issues
- Make sure you're using the correct connection string from Vercel dashboard
- Check that your IP is allowed (if using IP restrictions)
- Verify the database is active in Vercel

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_URL` | Full connection string | Yes (or individual vars) |
| `POSTGRES_HOST` | Database host | Yes (if not using URL) |
| `POSTGRES_DATABASE` | Database name | Yes (if not using URL) |
| `POSTGRES_USERNAME` | Database username | Yes (if not using URL) |
| `POSTGRES_PASSWORD` | Database password | Yes (if not using URL) |

## Next Steps

Once your local environment is working:

1. **Deploy to Vercel** (see main README)
2. **Set up environment variables in Vercel dashboard**
3. **Initialize the production database**
4. **Test the deployed application**
