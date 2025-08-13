# 🚗 Riders Scan - Honest Driver Reviews (Updated)

A platform for riders to share honest reviews and ratings of local drivers, helping others make informed decisions about their rides.

## Features

- **Driver Search**: Search by driver name or license plate
- **Comprehensive Reviews**: Rate drivers on multiple criteria:
  - Overall experience (1-5 stars)
  - Ride pleasantness (1-5 stars)
  - Arrival time accuracy (1-5 stars)
  - Ride speed/efficiency (1-5 stars)
  - Punctuality (on-time vs late with wait time)
  - Price fairness (boolean)
  - Service areas/cities
- **Analytics Dashboard**: View aggregated statistics for each driver
- **Simple Interface**: Clean, modern UI built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Backend**: Vercel Serverless Functions
- **Database**: Vercel Postgres
- **Styling**: Tailwind CSS + shadcn/ui components
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- Vercel account
- Vercel Postgres database

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd riders-scan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with your Vercel Postgres credentials:
   ```env
   POSTGRES_URL="your-vercel-postgres-url"
   POSTGRES_HOST="your-host"
   POSTGRES_DATABASE="your-database"
   POSTGRES_USERNAME="your-username"
   POSTGRES_PASSWORD="your-password"
   ```

4. **Initialize the database**
   ```bash
   # Start the development server
   npm run dev
   
   # In another terminal, initialize the database
   curl -X POST http://localhost:3000/api/init
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add your Postgres environment variables in Vercel dashboard
   - Deploy

3. **Initialize the database**
   After deployment, call the init endpoint:
   ```bash
   curl -X POST https://your-app.vercel.app/api/init
   ```

## Database Schema

### Drivers Table
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR NOT NULL,
  license_plate VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  overall_rating INTEGER CHECK (1 <= overall_rating AND overall_rating <= 5),
  pleasantness_rating INTEGER CHECK (1 <= pleasantness_rating AND pleasantness_rating <= 5),
  arrival_time_rating INTEGER CHECK (1 <= arrival_time_rating AND arrival_time_rating <= 5),
  ride_speed_rating INTEGER CHECK (1 <= ride_speed_rating AND ride_speed_rating <= 5),
  was_on_time BOOLEAN NOT NULL,
  waiting_time_minutes INTEGER CHECK (waiting_time_minutes > 0),
  price_fair BOOLEAN NOT NULL,
  comment TEXT,
  ride_city VARCHAR,
  ride_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Search Drivers
```
GET /api/drivers?q={query}
```

### Get Driver Details
```
GET /api/drivers/{id}
```

### Create Review
```
POST /api/reviews
```

### Initialize Database
```
POST /api/init
```

## Project Structure

```
riders-scan/
├── app/
│   ├── api/                 # API routes
│   ├── drivers/            # Driver profile pages
│   ├── reviews/            # Review creation pages
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── db.ts              # Database functions
│   └── utils.ts           # Utility functions
└── types/                 # TypeScript types
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support, please open an issue in the GitHub repository or contact the development team.