-- Migration: Admin Configuration and System Settings
-- Creates the table for storing global platform configurations

CREATE TABLE IF NOT EXISTS public.admin_config (
  id integer PRIMARY KEY,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default configuration
INSERT INTO public.admin_config (id, config)
VALUES (1, '{
  "platformFeePercent": 5,
  "minFreightValue": 200,
  "maxFreightValue": 500000,
  "driverAvailabilityHours": 24,
  "xpPerFreightCompleted": 100,
  "xpPerRating": 25,
  "xpPerPost": 10,
  "levelThresholds": "0, 500, 1500, 3500, 7000, 15000",
  "maintenanceMode": false,
  "maintenanceBanner": "",
  "featureChat": true,
  "featureTracking": true,
  "featureSocialFeed": true,
  "featureGamification": true,
  "featureScheduledFreights": true,
  "featurePreferredRoutes": true
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Grant access to authenticated users (admin checks should be done via RLS or Application logic)
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on admin_config"
  ON public.admin_config
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))))
  WITH CHECK (auth.jwt() ->> 'email' IN (SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))));

-- Note: app.admin_emails should be set in Supabase Settings or via a function.
-- For now, we allow reading for all authenticated to allow features to be toggled in UI, 
-- but only admins should update.
CREATE POLICY "Anyone can read admin_config"
  ON public.admin_config
  FOR SELECT
  TO authenticated
  USING (true);
