// Fixed set of 8 categories per the brief.
export const CATEGORIES = [
  { id: 'migration', name: 'Migration', icon: '🛂' },
  { id: 'tax_super', name: 'Tax & Super', icon: '💰' },
  { id: 'health', name: 'Health & Medical', icon: '🩺' },
  { id: 'real_estate', name: 'Real Estate', icon: '🏠' },
  { id: 'loans', name: 'Loans & Mortgages', icon: '🏦' },
  { id: 'careers', name: 'Careers', icon: '💼' },
  { id: 'general', name: 'General / Life in Australia', icon: '🌏' },
  { id: 'others', name: 'Others', icon: '📌' },
];

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id);
export const categoryName = (id) => categoryById(id)?.name || 'Others';

// A readable professional label for an expert: their stated profession, else a
// label derived from the category they're verified in.
export function professionLabel(user) {
  if (!user) return 'Verified Expert';
  if (user.expertBadgeTitle?.trim()) return user.expertBadgeTitle.trim();
  if (user.profession) return user.profession;
  if (user.verifiedCategory) return `${categoryName(user.verifiedCategory)} expert`;
  return 'Verified Expert';
}

// Suburbs used for the Greater Melbourne v1 scope.
export const SUBURBS = [
  'Melbourne CBD', 'Carlton', 'Clayton', 'Footscray', 'Box Hill',
  'Tarneit', 'Point Cook', 'Craigieburn', 'Wyndham Vale', 'Sunshine',
  'Dandenong', 'St Albans', 'Glen Waverley', 'Werribee', 'Reservoir',
];
