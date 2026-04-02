import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uweiptzbtpojnowyozdzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZWlwdHpidHBvam53eW96ZHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjI1NDksImV4cCI6MjA5MDY5ODU0OX0.NG39vNere5VRGb66WyWnoQ8sbGOTnBQD5rx6Hkmchgo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
