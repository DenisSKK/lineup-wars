#!/usr/bin/env tsx
/**
 * Convert Day Labels to Dates
 * 
 * This script parses day_label strings and converts them to proper dates,
 * then calculates day_number based on festival start dates.
 * 
 * Handles two formats:
 * - English: "Thu, 11. June", "Fri, 12. June", etc.
 * - Czech: "Čtvrtek 11. 6.", "Pátek 12. 6.", etc.
 */

import 'dotenv/config'
import { supabaseAdmin } from '../lib/supabase/admin'

interface Lineup {
  id: string
  festival_id: string
  day_label: string | null
  day_number: number | null
  performance_date: string | null
}

interface Festival {
  id: string
  name: string
  year: number
  start_date: string | null
  end_date: string | null
}

// Czech day names mapping
const czechDays: Record<string, number> = {
  'pondělí': 1,
  'úterý': 2,
  'středa': 3,
  'čtvrtek': 4,
  'pátek': 5,
  'sobota': 6,
  'neděle': 0,
}

// English day names mapping
const englishDays: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 0,
  'mon': 1,
  'tue': 2,
  'wed': 3,
  'thu': 4,
  'fri': 5,
  'sat': 6,
  'sun': 0,
}

// Month names
const czechMonths: Record<string, number> = {
  'ledna': 1, 'únor': 2, 'února': 2, 'března': 3, 'dubna': 4,
  'května': 5, 'června': 6, 'července': 7, 'srpna': 8,
  'září': 9, 'října': 10, 'listopadu': 11, 'prosince': 12,
}

const englishMonths: Record<string, number> = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}

/**
 * Parse day label to extract day and month
 */
function parseDayLabel(dayLabel: string, festivalYear: number): Date | null {
  const normalized = dayLabel.toLowerCase().trim()
  
  // Try Czech format: "Čtvrtek 11. 6."
  const czechMatch = normalized.match(/(\d+)\.\s*(\d+)\./)
  if (czechMatch) {
    const day = parseInt(czechMatch[1], 10)
    const month = parseInt(czechMatch[2], 10)
    return new Date(festivalYear, month - 1, day)
  }
  
  // Try English format: "Thu, 11. June"
  const englishMatch = normalized.match(/(\d+)\.\s*(\w+)/)
  if (englishMatch) {
    const day = parseInt(englishMatch[1], 10)
    const monthStr = englishMatch[2].toLowerCase()
    const month = englishMonths[monthStr]
    
    if (month) {
      return new Date(festivalYear, month - 1, day)
    }
  }
  
  return null
}

/**
 * Calculate day number based on festival start date
 * Note: If performance is before start_date, we treat it as Day 0 (pre-festival)
 * Otherwise, first day is Day 1
 */
function calculateDayNumber(performanceDate: Date, festivalStartDate: Date): number {
  const diffTime = performanceDate.getTime() - festivalStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // If performance is before start date, return 0 (or you could use negative)
  if (diffDays < 0) {
    return 0 // Pre-festival day
  }
  
  return diffDays + 1 // Day 1, Day 2, etc.
}

/**
 * Main conversion function
 */
async function convertDayLabelsToDate() {
  console.log('🔄 Converting day labels to dates...\n')
  
  // Fetch all festivals
  const { data: festivals, error: festivalsError } = await supabaseAdmin
    .from('festivals')
    .select('id, name, year, start_date, end_date')
  
  if (festivalsError) {
    throw new Error(`Failed to fetch festivals: ${festivalsError.message}`)
  }
  
  const festivalsMap = new Map<string, Festival>()
  festivals?.forEach(f => festivalsMap.set(f.id, f))
  
  // Fetch all lineups
  const { data: lineups, error: lineupsError } = await supabaseAdmin
    .from('lineups')
    .select('id, festival_id, day_label, day_number, performance_date')
  
  if (lineupsError) {
    throw new Error(`Failed to fetch lineups: ${lineupsError.message}`)
  }
  
  console.log(`📊 Processing ${lineups?.length ?? 0} lineups...\n`)
  
  let converted = 0
  let skipped = 0
  let errors = 0
  
  for (const lineup of lineups ?? []) {
    try {
      const festival = festivalsMap.get(lineup.festival_id)
      
      if (!festival) {
        console.warn(`⚠️  Lineup ${lineup.id}: Festival not found`)
        errors++
        continue
      }
      
      if (!lineup.day_label) {
        console.warn(`⚠️  Lineup ${lineup.id}: No day_label`)
        skipped++
        continue
      }
      
      if (!festival.start_date) {
        console.warn(`⚠️  Lineup ${lineup.id}: Festival ${festival.name} has no start_date`)
        errors++
        continue
      }
      
      // Parse the day label
      const performanceDate = parseDayLabel(lineup.day_label, festival.year)
      
      if (!performanceDate) {
        console.warn(`⚠️  Lineup ${lineup.id}: Could not parse day_label "${lineup.day_label}"`)
        errors++
        continue
      }
      
      // Calculate day number
      const festivalStartDate = new Date(festival.start_date)
      const dayNumber = calculateDayNumber(performanceDate, festivalStartDate)
      
      // Update the lineup
      const { error: updateError } = await supabaseAdmin
        .from('lineups')
        .update({
          performance_date: performanceDate.toISOString().split('T')[0],
          day_number: dayNumber,
        })
        .eq('id', lineup.id)
      
      if (updateError) {
        console.error(`❌ Lineup ${lineup.id}: ${updateError.message}`)
        errors++
        continue
      }
      
      console.log(
        `✅ ${lineup.id}: "${lineup.day_label}" → ${performanceDate.toISOString().split('T')[0]} (Day ${dayNumber})`
      )
      converted++
      
    } catch (error) {
      console.error(`❌ Lineup ${lineup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      errors++
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary:')
  console.log(`  ✅ Converted: ${converted}`)
  console.log(`  ⏭️  Skipped (no day_label): ${skipped}`)
  console.log(`  ❌ Errors: ${errors}`)
  console.log(`  📈 Total processed: ${lineups?.length ?? 0}`)
  console.log('='.repeat(80))
}

// Run the script
if (require.main === module) {
  convertDayLabelsToDate()
    .then(() => {
      console.log('\n✨ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error.message)
      process.exit(1)
    })
}

export { convertDayLabelsToDate, parseDayLabel, calculateDayNumber }
