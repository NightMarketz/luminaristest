export interface WidgetDimensions {
  W: number;
  H: number;
  MIN_W: number;
  MIN_H: number;
}

// Persisted shapes live with the service that loads them (lib must not import UI — check:arch U2).
export type { DashboardGridItem, DashboardLayout } from '@/lib/services/dashboardLayout.service';
import type { DashboardGridItem } from '@/lib/services/dashboardLayout.service';

export interface DashboardGridConfig {
  WIDGET_TYPES: {
    [key: string]: string;
    CHAT: string;
    DOCUMENT_CHAT: string;
    GENERIC_CHAT: string;
    KPI: string;
  };
  DIMENSIONS: {
    [key: string]: WidgetDimensions;
    DEFAULT: WidgetDimensions;
    CHAT: WidgetDimensions;
  };
  GRID: {
    BREAKPOINTS: Record<string, number>;
    COLS: Record<string, number>;
    ROW_HEIGHT: number;
    MARGIN: [number, number];
    PADDING: [number, number];
  };
}

export enum ItemActionType {
  ADD_WIDGET = 'ADD_WIDGET',
  UPDATE_WIDGET_LAYOUT = 'UPDATE_WIDGET_LAYOUT',
  UPDATE_WIDGET_CONFIG = 'UPDATE_WIDGET_CONFIG',
  REMOVE_WIDGET = 'REMOVE_WIDGET',
  SET_LAYOUT = 'SET_LAYOUT',
  OPTIMIZE_LAYOUT = 'OPTIMIZE_LAYOUT'
}

export interface ItemAction {
  type: ItemActionType;
  payload: {
    widgetType?: string;
    droppedX?: number;
    droppedY?: number;
    newLayout?: DashboardGridItem[];
    itemId?: string;
    config?: any;
    layoutItems?: DashboardGridItem[];
  };
}

// Tipos para Drag and Drop
export const ItemTypes = {
  WIDGET: 'widget',
} as const;

export interface DraggableItem {
  type: string;
  // Adicione outras propriedades necessárias
}

export interface DropResult {
  x: number;
  y: number;
}

export interface UseDashboardGridProps {
  initialItems?: DashboardGridItem[];
  onLayoutChange?: (layout: DashboardGridItem[]) => void;
}
