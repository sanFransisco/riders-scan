BEGIN;

-- Drop policies ONLY on our tables
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','drivers','reviews','role_scopes','driver_presence','rides')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop our helper functions if present (will recreate)
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.user_has_scope(uuid, text) CASCADE;

-- Drop ONLY our tables (order chosen to satisfy FKs)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.driver_presence CASCADE;
DROP TABLE IF EXISTS public.rides CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.role_scopes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.schema_version CASCADE;

-- Extensions we use
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate tables

CREATE TABLE public.users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  name       text,
  role       text[] NOT NULL DEFAULT ARRAY['user'],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.role_scopes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name   text UNIQUE NOT NULL,
  scopes      text[] NOT NULL,
  description text,
  created_at  timestamp DEFAULT now()
);

CREATE TABLE public.drivers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text,
  license_plate text UNIQUE NOT NULL,
  created_at    timestamp DEFAULT now(),
  updated_at    timestamp DEFAULT now()
);

CREATE TABLE public.reviews (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id             uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id               uuid REFERENCES public.users(id) ON DELETE CASCADE,
  overall_rating        integer CHECK (overall_rating >= 1 AND overall_rating <= 5),
  pleasantness_rating   integer CHECK (pleasantness_rating IS NULL OR (pleasantness_rating >= 1 AND pleasantness_rating <= 5)),
  ride_speed_satisfied  boolean,
  was_on_time           boolean,
  waiting_time_minutes  integer,
  price_fair            boolean,
  ride_city             text,
  review_text           text,
  review_approved       boolean NOT NULL DEFAULT false,
  service               text CHECK (service IN ('Yango','Gett','Uber','Other')),
  created_at            timestamp DEFAULT now(),
  updated_at            timestamp DEFAULT now()
);

-- Presence without PostGIS
CREATE TABLE public.driver_presence (
  driver_id    uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  last_seen    timestamp NOT NULL DEFAULT now(),
  service      text,
  accuracy_m   int,
  speed_kmh    int,
  heading_deg  smallint,
  device_os    text,
  app_version  text,
  battery_pct  smallint
);

-- Rides with lat/lng + consent timestamps
CREATE TABLE public.rides (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  driver_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pickup_lat         double precision,
  pickup_lng         double precision,
  dropoff_lat        double precision,
  dropoff_lng        double precision,
  status             text NOT NULL CHECK (status IN ('pending','consented','enroute','ontrip','completed','canceled')),
  created_at         timestamp NOT NULL DEFAULT now(),
  started_at         timestamp,
  ended_at           timestamp,
  driver_accepted_at timestamp,
  rider_consented_at timestamp,
  expires_at         timestamp
);

-- Indexes (only on our tables)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_drivers_license_plate ON public.drivers(license_plate);
CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON public.reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_presence_last_seen ON public.driver_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_driver_presence_lat_lng ON public.driver_presence(lat, lng);
CREATE UNIQUE INDEX IF NOT EXISTS ux_rides_driver_active ON public.rides(driver_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_rides_rider_active ON public.rides(rider_id) WHERE ended_at IS NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed role scopes
INSERT INTO public.role_scopes (role_name, scopes, description) VALUES
  ('user',      ARRAY['read:reviews','create:reviews','update:own_reviews','delete:own_reviews'], 'Regular user permissions'),
  ('moderator', ARRAY['read:reviews','create:reviews','update:own_reviews','delete:own_reviews','delete:any_reviews','read:users'], 'Moderator'),
  ('admin',     ARRAY['read:reviews','create:reviews','update:own_reviews','delete:own_reviews','delete:any_reviews','read:users','update:users','delete:users','manage:roles'], 'Admin')
ON CONFLICT (role_name) DO UPDATE
SET scopes = EXCLUDED.scopes, description = EXCLUDED.description;

-- helper
CREATE OR REPLACE FUNCTION public.user_has_scope(user_id uuid, required_scope text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.role_scopes rs ON rs.role_name = ANY(u.role::text[])
    WHERE u.id = user_id
      AND required_scope = ANY(rs.scopes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- seed admin (adjust email)
INSERT INTO public.users (email, name, role)
VALUES ('yalibar1121@gmail.com', 'Yali', ARRAY['user','admin'])
ON CONFLICT (email) DO UPDATE
SET role = (SELECT ARRAY(SELECT DISTINCT UNNEST(public.users.role || ARRAY['user','admin']))),
    updated_at = now();

-- RLS back on + policies (ONLY on our tables)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY IF NOT EXISTS "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY IF NOT EXISTS "Anyone can read drivers" ON public.drivers
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can read reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Users can manage own reviews" ON public.reviews
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "Admins can manage all users" ON public.users
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::uuid AND 'admin' = ANY(role::text[])
));

CREATE POLICY IF NOT EXISTS "Admins can manage all drivers" ON public.drivers
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::uuid AND 'admin' = ANY(role::text[])
));

CREATE POLICY IF NOT EXISTS "Admins can manage all reviews" ON public.reviews
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::uuid AND 'admin' = ANY(role::text[])
));

CREATE POLICY IF NOT EXISTS "Only admins can manage role scopes" ON public.role_scopes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::uuid AND 'admin' = ANY(role::text[])
));

-- schema version table
CREATE TABLE public.schema_version (
  id        integer PRIMARY KEY DEFAULT 1,
  version   integer NOT NULL,
  updated_at timestamp DEFAULT now()
);

INSERT INTO public.schema_version (id, version) VALUES (1, 6)
ON CONFLICT (id) DO UPDATE SET version = 6, updated_at = now();

COMMIT;


