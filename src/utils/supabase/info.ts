/**
 * Supabase Configuration
 * Centralized configuration for Supabase connection
 */

// Supabase Project Configuration
export const projectId = 'hjdykjdhxepgfnkurvgr';

// Supabase Public Anonymous Key (Safe to expose in frontend)
export const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZHlramRoeGVwZ2Zua3VydmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTI5NzYsImV4cCI6MjA3OTYyODk3Nn0.IpkS-Gi6cwMQxDYt6qI7_djxEBnqZ-bfMvHFL-L7GYU';

// Supabase Service Role Key (NEVER expose in frontend - only for server-side operations)
export const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZHlramRoeGVwZ2Zua3VydmdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA1Mjk3NiwiZXhwIjoyMDc5NjI4OTc2fQ.aVfC0H6YD2xIi90mNIGt_vfYwZY2ljUXiKH7sCzagGo';

// Supabase URL
export const supabaseUrl = `https://${projectId}.supabase.co`;