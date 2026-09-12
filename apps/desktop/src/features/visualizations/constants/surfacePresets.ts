export interface SurfacePreset {
  id: string;
  name: string;
  subtitle: string;
  bg: string;
  grid: string;
}

export const LIGHT_SURFACE_PRESETS: SurfacePreset[] = [
  {
    id: 'parchment',
    name: 'Parchment',
    subtitle: 'Editorial / documentation',
    bg: '#F4F0E8',
    grid: '#D6CFC2',
  },
  {
    id: 'warm-paper',
    name: 'Warm paper',
    subtitle: 'Warm & balanced editorial',
    bg: '#F7F4EE',
    grid: '#D9D3C8',
  },
  {
    id: 'soft-cream',
    name: 'Soft cream',
    subtitle: 'Clean dashboards',
    bg: '#FAF8F3',
    grid: '#DDD8CE',
  },
  {
    id: 'warm-gray',
    name: 'Warm gray',
    subtitle: 'More technical',
    bg: '#F2F0EB',
    grid: '#D5D1C9',
  },
  {
    id: 'near-white-warm',
    name: 'Near-white warm',
    subtitle: 'Minimal UI',
    bg: '#FCFBF8',
    grid: '#E2DED6',
  },
];

export const DARK_SURFACE_PRESETS: SurfacePreset[] = [
  {
    id: 'soft-black',
    name: 'Soft black',
    subtitle: 'Higher contrast',
    bg: '#181816',
    grid: '#34332F',
  },
  {
    id: 'warm-charcoal',
    name: 'Warm charcoal',
    subtitle: 'Warm low-fatigue dark',
    bg: '#1F1E1B',
    grid: '#3A3833',
  },
  {
    id: 'deep-brown-charcoal',
    name: 'Deep brown-charcoal',
    subtitle: 'Warmer aesthetic',
    bg: '#211F1C',
    grid: '#3C3934',
  },
  {
    id: 'warm-slate',
    name: 'Warm slate',
    subtitle: 'Technical dashboards',
    bg: '#252421',
    grid: '#414039',
  },
  {
    id: 'deep-parchment-black',
    name: 'Deep parchment-black',
    subtitle: 'Editorial',
    bg: '#191817',
    grid: '#36332F',
  },
];
