import { createClient } from '@supabase/supabase-js';

// Replace these strings with your actual Supabase Project details
const supabaseUrl = 'https://rcotjmgpswcoqttdjdee.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb3RqbWdwc3djb3F0dGRqZGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NjQyNjEsImV4cCI6MjEwMDE0MDI2MX0.pGP0YXvW8-zY66tnXTRt0kx9F1E2JBMS8WoW71Gh6vc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);