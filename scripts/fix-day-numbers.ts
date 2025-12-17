#!/usr/bin/env tsx
/**
 * Fix Day Numbers
 * Adds +1 to all day_number values so they start from 1 instead of 0
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase/admin'

async function fixDayNumbers() {
  console.log('🔧 Fixing day numbers (adding +1 to all)...\n')
  
  // Get all lineups with day_number
  const { data: lineups, error: fetchError } = await supabaseAdmin
    .from('lineups')
    .select('id, day_number, festival_id')
    .not('day_number', 'is', null)
  
  if (fetchError) {
    throw new Error(`Failed to fetch lineups: ${fetchError.message}`)
  }
  
  console.log(`📊 Found ${lineups?.length ?? 0} lineups with day_number\n`)
  
  let updated = 0
  let errors = 0
  
  for (const lineup of lineups ?? []) {
    const newDayNumber = (lineup.day_number ?? 0) + 1
    
    const { error: updateError } = await supabaseAdmin
      .from('lineups')
      .update({ day_number: newDayNumber })
      .eq('id', lineup.id)
    
    if (updateError) {
      console.error(`❌ ${lineup.id}: ${updateError.message}`)
      errors++
    } else {
      console.log(`✅ ${lineup.id}: Day ${lineup.day_number} → Day ${newDayNumber}`)
      updated++
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary:')
  console.log(`  ✅ Updated: ${updated}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`  📈 Total: ${lineups?.length ?? 0}`)
  console.log('='.repeat(80))
}

if (require.main === module) {
  fixDayNumbers()
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message)
      process.exit(1)
    })
}

export { fixDayNumbers }
