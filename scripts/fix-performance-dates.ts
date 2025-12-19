#!/usr/bin/env tsx
/**
 * Fix Performance Dates - Add One Day
 * 
 * This script fixes the timezone bug where all performance dates were 
 * shifted back by one day. It adds 1 day to all performance_date values
 * and recalculates day_number accordingly.
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase/admin'

async function fixPerformanceDates() {
  console.log('🔧 Fixing performance dates (adding +1 day)...\n')
  
  // Get all lineups with performance_date
  const { data: lineups, error: fetchError } = await supabaseAdmin
    .from('lineups')
    .select('id, performance_date, day_number, festival_id, day_label')
    .not('performance_date', 'is', null)
  
  if (fetchError) {
    throw new Error(`Failed to fetch lineups: ${fetchError.message}`)
  }
  
  console.log(`📊 Found ${lineups?.length ?? 0} lineups with performance_date\n`)
  
  // Get festivals for day_number calculation
  const { data: festivals, error: festivalsError } = await supabaseAdmin
    .from('festivals')
    .select('id, start_date')
  
  if (festivalsError) {
    throw new Error(`Failed to fetch festivals: ${festivalsError.message}`)
  }
  
  const festivalMap = new Map(festivals?.map(f => [f.id, f.start_date]) ?? [])
  
  let updated = 0
  let skipped = 0
  let errors = 0
  
  for (const lineup of lineups ?? []) {
    try {
      // Add one day to performance_date
      const oldDate = new Date(lineup.performance_date + 'T00:00:00Z')
      const newDate = new Date(oldDate)
      newDate.setUTCDate(newDate.getUTCDate() + 1)
      const newPerformanceDate = newDate.toISOString().split('T')[0]
      
      // Recalculate day_number
      const festivalStartDate = festivalMap.get(lineup.festival_id)
      let newDayNumber = lineup.day_number
      
      if (festivalStartDate) {
        const startDate = new Date(festivalStartDate + 'T00:00:00Z')
        const diffTime = newDate.getTime() - startDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        newDayNumber = diffDays < 0 ? 0 : diffDays + 1
      }
      
      // Update the lineup
      const { error: updateError } = await supabaseAdmin
        .from('lineups')
        .update({
          performance_date: newPerformanceDate,
          day_number: newDayNumber,
        })
        .eq('id', lineup.id)
      
      if (updateError) {
        console.error(`❌ ${lineup.id}: ${updateError.message}`)
        errors++
        continue
      }
      
      console.log(
        `✅ ${lineup.day_label?.padEnd(20)} | ${lineup.performance_date} → ${newPerformanceDate} | Day ${lineup.day_number} → Day ${newDayNumber}`
      )
      updated++
      
    } catch (error) {
      console.error(`❌ ${lineup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      errors++
    }
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary:')
  console.log(`  ✅ Updated: ${updated}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`  📈 Total: ${lineups?.length ?? 0}`)
  console.log('='.repeat(80))
}

if (require.main === module) {
  fixPerformanceDates()
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message)
      process.exit(1)
    })
}

export { fixPerformanceDates }
