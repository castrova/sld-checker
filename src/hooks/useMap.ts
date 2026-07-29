import { useEffect, useRef, useState } from "react";
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { defaults as defaultControls, ScaleLine } from "ol/control";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";

export const useMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<OLMap | null>(null);
  const baseLayersRef = useRef<Record<string, TileLayer>>({});
  const baseMapType = useSelector((state: RootState) => state.map.baseMap);

  useEffect(() => {
    if (!mapRef.current) return;

    baseLayersRef.current = {
      osm: new TileLayer({ source: new OSM(), visible: baseMapType === "osm" }),
      satellite: new TileLayer({
        source: new XYZ({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          maxZoom: 19,
        }),
        visible: baseMapType === "satellite",
      }),
    };

    const map = new OLMap({
      target: mapRef.current,
      layers: Object.values(baseLayersRef.current),
      view: new View({
        center: [-412300.0, 4921000.0],
        zoom: 5,
        maxZoom: 20,
        multiWorld: true,
      }),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: true,
        attributionOptions: {
          collapsible: true,
          collapsed: true,
        },
      }).extend([
        new ScaleLine({
          units: "metric",
          bar: true,
          steps: 4,
          text: true,
          minWidth: 140,
        }),
      ]),
    });

    setMapInstance(map);

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    Object.entries(baseLayersRef.current).forEach(([key, layer]) => {
      layer.setVisible(key === baseMapType);
    });
  }, [baseMapType, mapInstance]);

  return { mapRef, mapInstance };
};
