import type { ArtifactDoc, Track } from './types'

export const TRACK_LABELS: Record<Track, string> = {
  pm:  'Product Manager',
  swe: 'Software Engineer',
}

export const COMP: Record<string, string> = {
  navigating_ambiguity:  'Navigating ambiguity',
  data_driven_decisions: 'Data-driven decisions',
  stakeholder_influence: 'Influencing without authority',
  strategic_thinking:    'Strategic thinking',
  cross_functional:      'Cross-functional leadership',
  user_empathy:          'User empathy',
  product_sense:         'Product sense',
  analytical_thinking:   'Analytical thinking',
  execution_ownership:   'Execution & ownership',
  handling_failure:      'Handling failure & learning',
  team_development:      'Team development',
  communication:         'Communication & storytelling',
  system_design:         'System design',
  coding_proficiency:    'Coding proficiency',
  debugging:             'Debugging & troubleshooting',
  code_quality:          'Code quality & craftsmanship',
}

export const ROUND_COMP: Record<Track, Record<string, string[]>> = {
  pm: {
    'Recruiter Screen':    ['communication', 'execution_ownership', 'stakeholder_influence'],
    'Hiring Manager':      ['strategic_thinking', 'cross_functional', 'execution_ownership', 'stakeholder_influence', 'data_driven_decisions'],
    'Product Sense':       ['product_sense', 'user_empathy', 'data_driven_decisions', 'communication'],
    'Analytical Thinking': ['analytical_thinking', 'data_driven_decisions', 'execution_ownership'],
    'Technical':           ['execution_ownership', 'communication', 'analytical_thinking', 'navigating_ambiguity'],
    'Panel':               ['cross_functional', 'stakeholder_influence', 'communication', 'strategic_thinking'],
    'Bar Raiser':          ['execution_ownership', 'handling_failure', 'navigating_ambiguity', 'strategic_thinking', 'data_driven_decisions'],
  },
  swe: {
    'Recruiter Screen':    ['communication', 'execution_ownership', 'stakeholder_influence'],
    'Hiring Manager':      ['execution_ownership', 'cross_functional', 'communication', 'handling_failure', 'navigating_ambiguity'],
    'Coding':              ['coding_proficiency', 'debugging', 'communication', 'navigating_ambiguity'],
    'System Design':       ['system_design', 'analytical_thinking', 'code_quality', 'navigating_ambiguity'],
    'Panel':               ['cross_functional', 'stakeholder_influence', 'communication', 'system_design'],
    'Bar Raiser':          ['execution_ownership', 'handling_failure', 'code_quality', 'navigating_ambiguity', 'system_design'],
  },
}

export const ROUND_TYPES_BY_TRACK: Record<Track, string[]> = {
  pm:  Object.keys(ROUND_COMP.pm),
  swe: Object.keys(ROUND_COMP.swe),
}

export function roundTypesFor(track: Track): string[] {
  return ROUND_TYPES_BY_TRACK[track]
}

export const EXPECTED_ROUNDS_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: '2–3', value: 2 },
  { label: '4–5', value: 4 },
  { label: '6+', value: 7 },
  { label: 'Not sure', value: null },
]

// Optional: static reference docs that auto-attach to a campaign when its company
// name matches `campaignCompany`. Empty by default — add your own here, with the
// matching HTML file dropped in `public/`, if you want this feature.
export const ARTIFACTS: ArtifactDoc[] = []
