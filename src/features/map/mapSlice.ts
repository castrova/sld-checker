import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface LayerMeta {
  id: string;
  name: string;
  geojson: object;
  style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderType: string;
  };
}

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
  layers: LayerMeta[];
  clickInfo: ClickInfo | null;
}

const initialState: MapState = {
  center: [-3.7038, 40.4168], // Spain (Madrid)
  layers: [],
  clickInfo: null,
};

export const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setCenter: (state, action: PayloadAction<[number, number]>) => {
      state.center = action.payload;
    },
    addLayer: (state, action: PayloadAction<LayerMeta>) => {
      state.layers.push(action.payload);
    },
    removeLayer: (state, action: PayloadAction<number>) => {
      state.layers.splice(action.payload, 1);
    },
    updateLayerStyle: (
      state,
      action: PayloadAction<{ id: string; style: LayerMeta["style"] }>
    ) => {
      const idx = state.layers.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) {
        state.layers[idx].style = action.payload.style;
      }
    },
    setLayersOrder: (state, action: PayloadAction<LayerMeta[]>) => {
      state.layers = action.payload;
    },
    setClickInfo: (state, action: PayloadAction<ClickInfo | null>) => {
      state.clickInfo = action.payload;
    },
  },
});

export const {
  setCenter,
  addLayer,
  removeLayer,
  updateLayerStyle,
  setLayersOrder,
  setClickInfo,
} = mapSlice.actions;
export default mapSlice.reducer;
