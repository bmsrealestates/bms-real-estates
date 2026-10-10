import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieidlcmmtsyqtitjzouj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllaWRsY21tdHN5cXRpdGp6b3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MDE0MzUsImV4cCI6MjEwNzE3NzQzNX0.wEvWYCunUo6Eep-KKfClT2l_t_DqBhYsFbWe1_G5DjY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
