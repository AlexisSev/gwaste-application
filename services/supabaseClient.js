import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://phlovmvbjaqpzuutlyrv.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobG92bXZiamFxcHp1dXRseXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5OTA3MDYsImV4cCI6MjA3MjU2NjcwNn0.SRdb3Y4toIkqkv5arZgS2t3eZQ-zN4aF_iABt0wGEmc"
export const supabase = createClient(supabaseUrl, supabaseKey)
