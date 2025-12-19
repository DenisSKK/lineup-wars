#!/usr/bin/env tsx
import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase/admin'

async function checkLineups() {
  const { data, error } = await supabaseAdmin
    .from('lineups')
    .select('day_label, performance_date, day_number, festival_id')
    .limit(10)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log(JSON.stringify(data, null, 2))
  }
}

checkLineups()
