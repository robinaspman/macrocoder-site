type InputMode = 'github' | 'website' | 'upwork' | 'multiple'

export const PROBLEM_CATEGORIES: Record<InputMode, string[]> = {
  github: ['Security', 'Code Quality', 'Missing Tests', 'No CI/CD', 'Outdated Deps'],
  website: ['Slow Load', 'Bad UX', 'No SEO', 'Broken Links', 'No Analytics'],
  upwork: ['Vague Scope', 'Unrealistic Budget', 'Missing Timeline', 'Unclear Requirements', 'High Competition'],
  multiple: ['Security', 'Code Quality', 'Slow Load', 'Bad UX', 'Vague Scope', 'No SEO', 'Missing Tests', 'No CI/CD', 'Unclear Requirements'],
}
