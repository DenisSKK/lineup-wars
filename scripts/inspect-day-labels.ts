#!/usr/bin/env tsx
/**
 * Day Labels Inspector
 * 
 * This script fetches all unique day_label values from the lineups table
 * to analyze the data format before creating a migration to convert them
 * to proper date format and calculate day_number.
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase/admin'

interface LineupDayInfo {
  id: string
  festival_id: string
  band_id: string
  day_label: string | null
  source_url: string | null
}

interface FestivalInfo {
  id: string
  name: string
  year: number
  start_date: string | null
  end_date: string | null
}

async function inspectDayLabels() {
  console.log('📋 Inspecting day_label data from lineups table...\n')

  // Fetch all lineups with day_label
  const { data: lineups, error: lineupsError } = await supabaseAdmin
    .from('lineups')
    .select('id, festival_id, band_id, day_label, source_url')
    .order('day_label', { ascending: true })

  if (lineupsError) {
    throw new Error(`Failed to fetch lineups: ${lineupsError.message}`)
  }

  // Fetch all festivals with dates
  const { data: festivals, error: festivalsError } = await supabaseAdmin
    .from('festivals')
    .select('id, name, year, start_date, end_date')

  if (festivalsError) {
    throw new Error(`Failed to fetch festivals: ${festivalsError.message}`)
  }

  const festivalsMap = new Map<string, FestivalInfo>()
  festivals?.forEach(f => festivalsMap.set(f.id, f))

  console.log(`✅ Found ${lineups?.length ?? 0} lineup entries`)
  console.log(`✅ Found ${festivals?.length ?? 0} festivals\n`)

  // Group by festival
  const byFestival = new Map<string, LineupDayInfo[]>()
  lineups?.forEach(lineup => {
    if (!byFestival.has(lineup.festival_id)) {
      byFestival.set(lineup.festival_id, [])
    }
    byFestival.get(lineup.festival_id)!.push(lineup)
  })

  // Analyze unique day_label values
  const uniqueDayLabels = new Set<string>()
  lineups?.forEach(lineup => {
    if (lineup.day_label) {
      uniqueDayLabels.add(lineup.day_label)
    }
  })

  console.log('=' .repeat(80))
  console.log('UNIQUE DAY LABELS')
  console.log('=' .repeat(80))
  console.log(`Total unique day labels: ${uniqueDayLabels.size}\n`)
  
  const sortedLabels = Array.from(uniqueDayLabels).sort()
  sortedLabels.forEach((label, index) => {
    const count = lineups?.filter(l => l.day_label === label).length ?? 0
    console.log(`${(index + 1).toString().padStart(3)}. "${label}" (${count} lineups)`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('DAY LABELS BY FESTIVAL')
  console.log('='.repeat(80))

  byFestival.forEach((festivalLineups, festivalId) => {
    const festival = festivalsMap.get(festivalId)
    if (!festival) return

    console.log(`\n📅 ${festival.name} ${festival.year}`)
    console.log(`   Start: ${festival.start_date ?? 'NOT SET'}`)
    console.log(`   End: ${festival.end_date ?? 'NOT SET'}`)
    console.log(`   Lineups: ${festivalLineups.length}`)

    const dayLabelsInFestival = new Set<string>()
    festivalLineups.forEach(l => {
      if (l.day_label) dayLabelsInFestival.add(l.day_label)
    })

    const sortedFestivalLabels = Array.from(dayLabelsInFestival).sort()
    sortedFestivalLabels.forEach(label => {
      const count = festivalLineups.filter(l => l.day_label === label).length
      console.log(`   - "${label}" (${count} bands)`)
    })
  })

  console.log('\n' + '='.repeat(80))
  console.log('LINEUPS WITHOUT DAY_LABEL')
  console.log('='.repeat(80))
  
  const withoutLabel = lineups?.filter(l => !l.day_label) ?? []
  console.log(`Total: ${withoutLabel.length}`)
  
  if (withoutLabel.length > 0) {
    withoutLabel.slice(0, 10).forEach(lineup => {
      const festival = festivalsMap.get(lineup.festival_id)
      console.log(`- Festival: ${festival?.name ?? 'Unknown'}, Band ID: ${lineup.band_id}`)
    })
    if (withoutLabel.length > 10) {
      console.log(`... and ${withoutLabel.length - 10} more`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('SAMPLE DATA')
  console.log('='.repeat(80))
  
  const sample = lineups?.slice(0, 20) ?? []
  sample.forEach(lineup => {
    const festival = festivalsMap.get(lineup.festival_id)
    console.log(`Festival: ${festival?.name ?? 'Unknown'} | day_label: "${lineup.day_label ?? 'NULL'}"`)
  })

  console.log('\n✨ Inspection complete!')
  console.log('\nNext steps:')
  console.log('1. Review the day_label formats above')
  console.log('2. Ensure festival start_date and end_date are set correctly')
  console.log('3. Create a migration to add a new date column')
  console.log('4. Create a script to parse day_label and calculate day_number')
}

// Run the script
if (require.main === module) {
  inspectDayLabels()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message)
      process.exit(1)
    })
}

export { inspectDayLabels }
