import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import type OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

export const useMapLayers = (mapInstance: OLMap | null) => {
  const layers = useSelector((state: RootState) => state.map.layers);
  const layerObjects = useRef<Map<string, VectorLayer>>(new Map());

  // Handle new layers
  useEffect(() => {
    if (!mapInstance) return;

    layers.forEach((layerData) => {
      if (!layerObjects.current.has(layerData.id)) {
        // Create new layer
        let srs = "EPSG:4326";
        // @ts-expect-error: geojson type is generic object
        if (layerData.geojson?.crs?.properties?.name) {
          // @ts-expect-error: geojson type is generic object
          srs = layerData.geojson.crs.properties.name;
        }

        const source = new VectorSource({
          features: new GeoJSON().readFeatures(layerData.geojson, {
            dataProjection: srs,
            featureProjection: "EPSG:3857",
          }),
        });

        const olStyle = new Style({
          fill: new Fill({ color: layerData.style.fillColor }),
          stroke: new Stroke({
            color: layerData.style.strokeColor,
            width: layerData.style.strokeWidth,
            lineDash:
              layerData.style.borderType === "dashed"
                ? [10, 10]
                : layerData.style.borderType === "dotted"
                ? [2, 6]
                : undefined,
          }),
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: layerData.style.fillColor }),
            stroke: new Stroke({
              color: layerData.style.strokeColor,
              width: layerData.style.strokeWidth,
            }),
          }),
        });

        const layer = new VectorLayer({
          source,
          style: olStyle,
        });

        mapInstance.addLayer(layer);
        layerObjects.current.set(layerData.id, layer);
      }
    });
  }, [mapInstance, layers]);

  return { layerObjects };
};
