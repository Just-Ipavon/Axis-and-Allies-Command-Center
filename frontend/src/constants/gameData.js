// Game rules come from /shared/gameRules.mjs (also used by the backend).
import { RULES, getTurnOrder } from '../../../shared/gameRules.mjs';

export { RULES, getTurnOrder };

export const UNITS = RULES.units;
export const ALL_OBJECTIVES = RULES.nationalObjectives;
export const TECH_CHARTS = RULES.techCharts;
export const CHINA_TERRITORIES = RULES.chinaTerritories;
export const AXIS = RULES.alliances.Axis;
export const ALLIES = RULES.alliances.Allies;

export const getVersionLabel = (version) => (RULES.versions[version] || RULES.versions['1942']).label;

// UI-only constants shared by the nation cards and the header.
export const FLAG_MAP = {
  'USSR': '/flags/Russians_large.png',
  'Germany': '/flags/Germans_large.png',
  'UK': '/flags/British_large.png',
  'Japan': '/flags/Japanese_large.png',
  'USA': '/flags/Americans_large.png',
  'Italy': '/flags/Italians_large.png',
};

export const FACTION_COLORS = {
  'USSR': 'bg-faction-ussr text-white border-vintage-text',
  'Germany': 'bg-faction-germany text-white border-vintage-text',
  'UK': 'bg-faction-uk text-black border-vintage-text',
  'Japan': 'bg-faction-japan text-white border-vintage-text',
  'USA': 'bg-faction-usa text-white border-vintage-text',
  'Italy': 'bg-faction-italy text-white border-vintage-text',
};
