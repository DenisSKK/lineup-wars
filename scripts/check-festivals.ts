#!/usr/bin/env tsx
import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase/admin'

async function checkFestivals() {
  const { data, error } = await supabaseAdmin.from('festivals').select('*')
  if (error) {
    console.error('Error:', error)
  } else {
    console.log(JSON.stringify(data, null, 2))
  }
}

checkFestivals()
