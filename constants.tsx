
import { Filter, Frame, LayoutType } from './types';

export const FILTERS: Filter[] = [
  { 
    id: 'none', 
    name: 'Natural', 
    cssFilter: 'none', 
    brightness: 1, contrast: 1, saturation: 1 
  },
  { 
    id: 'cinematic-warm', 
    name: 'Cinematic Warm', 
    cssFilter: 'sepia(20%) hue-rotate(-10deg)', 
    brightness: 1.05, contrast: 1.1, saturation: 1.2 
  },
  { 
    id: 'old-money', 
    name: 'Old Money', 
    cssFilter: 'sepia(15%) contrast(90%) brightness(110%)', 
    brightness: 1.1, contrast: 0.9, saturation: 0.8,
    hasGrain: true
  },
  { 
    id: 'vintage-fade', 
    name: 'Vintage Fade', 
    cssFilter: 'grayscale(20%) sepia(30%) contrast(85%)', 
    brightness: 1.1, contrast: 0.85, saturation: 0.9,
    hasGrain: true
  },
  { 
    id: 'moody-brown', 
    name: 'Moody Brown', 
    cssFilter: 'sepia(50%) contrast(120%) brightness(80%) hue-rotate(-20deg)', 
    brightness: 0.85, contrast: 1.25, saturation: 0.7 
  },
  { 
    id: 'soft-aesthetic', 
    name: 'Soft Aesthetic', 
    cssFilter: 'contrast(90%) brightness(115%) saturate(110%) blur(0.3px)', 
    brightness: 1.15, contrast: 0.9, saturation: 1.1 
  },
  { 
    id: 'dark-academia', 
    name: 'Dark Academia', 
    cssFilter: 'sepia(40%) contrast(130%) brightness(70%)', 
    brightness: 0.75, contrast: 1.4, saturation: 0.6 
  },
  { 
    id: 'golden-hour', 
    name: 'Golden Hour', 
    cssFilter: 'sepia(30%) saturate(180%) contrast(110%) hue-rotate(-15deg)', 
    brightness: 1.05, contrast: 1.1, saturation: 1.8 
  },
  { 
    id: 'film-noir', 
    name: 'Film Noir', 
    cssFilter: 'grayscale(100%) contrast(150%) brightness(90%)', 
    brightness: 0.9, contrast: 1.5, saturation: 0,
    hasGrain: true
  },
  { 
    id: 'film-grain', 
    name: 'Film Grain', 
    cssFilter: 'contrast(110%)', 
    brightness: 1, contrast: 1.1, saturation: 1,
    hasGrain: true
  }
];

export const FRAMES: Frame[] = [
  { id: 'none', name: 'No Frame', className: '' },
  { id: 'classic-white', name: 'Classic White', className: 'border-[16px] border-white shadow-xl' },
  { id: 'polaroid', name: 'Polaroid', className: 'border-t-[12px] border-l-[12px] border-r-[12px] border-b-[48px] border-white shadow-2xl' },
  { id: 'retro-black', name: 'Cinema Black', className: 'border-[20px] border-black shadow-lg ring-2 ring-white/10' },
  { id: 'golden', name: 'Golden Era', className: 'border-[12px] border-[#b8860b] shadow-xl ring-4 ring-yellow-400/30' },
];

export const LAYOUTS = [
  { id: LayoutType.SINGLE, name: 'Single Shot', shots: 1 },
  { id: LayoutType.STRIP, name: 'Classic Strip', shots: 4 },
  { id: LayoutType.GRID, name: '2x2 Grid', shots: 4 },
];
