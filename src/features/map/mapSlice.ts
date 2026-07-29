import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ClickInfo {
  coordinates: number[]; // Projected coordinates (EPSG:3857)
  latLon: number[]; // Lat/lon coordinates (EPSG:4326)
  features: Array<{
    id: string | number;
    properties: Record<string, any>;
    layerId: string; // To associate with the layer
    geometry: object;
  }>;
}

export interface MapState {
  center: [number, number];
  clickInfo: ClickInfo | null;
  highlightedRuleIndex: number | null;
  hoveredRuleIndex: number | null;
  baseMap: "osm" | "satellite" | "dark" | "light";
}

const initialState: MapState = {
  center: [-3.7038, 40.4168], // Spain (Madrid)
  clickInfo: null,
  highlightedRuleIndex: null,
  hoveredRuleIndex: null,
  baseMap: "osm",
};

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setCenter: (state, action: PayloadAction<[number, number]>) => {
      state.center = action.payload;
    },
    setClickInfo: (state, action: PayloadAction<ClickInfo | null>) => {
      state.clickInfo = action.payload;
    },
    setHighlightedRuleIndex: (state, action: PayloadAction<number | null>) => {
      state.highlightedRuleIndex = action.payload;
    },
    setHoveredRuleIndex: (state, action: PayloadAction<number | null>) => {
      state.hoveredRuleIndex = action.payload;
    },
    setBaseMap: (state, action: PayloadAction<MapState["baseMap"]>) => {
      state.baseMap = action.payload;
    },
  },
});

export const {
  setCenter,
  setClickInfo,
  setHighlightedRuleIndex,
  setHoveredRuleIndex,
  setBaseMap,
} = mapSlice.actions;
export default mapSlice.reducer;
