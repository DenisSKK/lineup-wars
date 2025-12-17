import { FestivalConfig } from './core'

export const FESTIVALS: FestivalConfig[] = [
  {
    id: 'rfp',
    supabaseId: '64d1f7b0-8003-437b-bf72-fac602140673',
    name: 'Rock for People',
    year: 2026,
    indexUrls: ['https://rockforpeople.cz/lineup/'],
    baseUrl: 'https://rockforpeople.cz',
    linkSelector: 'a[href*="/lineup/"]',
    linkAllowPattern: /\/lineup\/[^\/]+\/?$/, // only artist pages
    linkDenyPattern: /\/(en\/)?lineup\/?$/, // exclude index links
    artistSelectors: {
      name: 'h1',
      day: '.day, .date, [class*="day"]',
      stage: '.stage, [class*="stage"]',
      time: '.time, [class*="time"]',
    },
  },
  {
    id: 'novarock',
    supabaseId: '7dfcafdf-32e2-4fb1-8c29-af94f25a800e',
    name: 'Nova Rock',
    year: 2026,
    indexUrls: [
      'https://www.novarock.at/en/lineup/#tab-2026-06-11',
      'https://www.novarock.at/en/lineup/#tab-2026-06-12',
      'https://www.novarock.at/en/lineup/#tab-2026-06-13',
      'https://www.novarock.at/en/lineup/#tab-2026-06-14',
    ],
    baseUrl: 'https://www.novarock.at',
    linkSelector: 'a[href*="/artist/"]',
    linkAllowPattern: /\/(en\/)?artist\/[A-Za-z0-9-]+\/?$/, // only artist pages
    artistSelectors: {
      name: 'h1, .artist-title',
      day: '.performance-date, .date',
      stage: '.performance-stage, .stage',
      time: '.performance-time, .time',
    },
  },
]
