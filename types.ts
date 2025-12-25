
export enum View {
  LANDING = 'landing',
  BOOTH = 'booth'
}

export enum BoothStage {
  CLOSED = 'closed',
  OPENING = 'opening',
  ACTIVE = 'active'
}

export enum LayoutType {
  SINGLE = 'single',
  STRIP = 'strip',
  GRID = 'grid'
}

export interface Filter {
  id: string;
  name: string;
  cssFilter: string;
  hasGrain?: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface Frame {
  id: string;
  name: string;
  className: string;
}

export interface PhotoCapture {
  dataUrl: string;
  timestamp: number;
}

export interface PhotoSession {
  photos: PhotoCapture[];
  frame: Frame;
  filter: Filter;
  layout: LayoutType;
}
