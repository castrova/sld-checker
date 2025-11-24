import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { transform } from "ol/proj";
import { Overlay } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { setClickInfo } from "../features/map/mapSlice";
import type OLMap from "ol/Map";
import { createRoot } from "react-dom/client";
import ClickOverlay from "../components/PointInfo/Overlay/ClickOverlay";
import React from "react";
import GeoJSON from "ol/format/GeoJSON";
import type { SldRuleStats } from "../utils/sldUtils";
import { evaluateFilter } from "../utils/sldUtils";

export const useMapClick = (
  mapInstance: OLMap | null,
  layerObjects: React.MutableRefObject<Map<string, VectorLayer>>,
  language: string,
  stylingFields: string[] = [],
  rules: SldRuleStats[] | undefined = undefined,
  setHighlightedRuleIndex:
    | ((index: number | null) => void)
    | undefined = undefined
) => {
  const dispatch = useDispatch();
  const activeRootRef = useRef<any>(null);
  const markerLayerRef = useRef<VectorLayer | null>(null);

  useEffect(() => {
    if (!mapInstance) return;

    // Create marker layer
    if (!markerLayerRef.current) {
      markerLayerRef.current = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: "#3399CC" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
        }),
        zIndex: 10000,
      });
      mapInstance.addLayer(markerLayerRef.current);
    }

    const handleSingleClick = (evt: any) => {
      // Unmount previous root immediately
      if (activeRootRef.current) {
        activeRootRef.current.unmount();
        activeRootRef.current = null;
      }

      const coordinates = evt.coordinate;
      const latLon = transform(coordinates, "EPSG:3857", "EPSG:4326");

      // Update marker
      const markerSource = markerLayerRef.current?.getSource();
      markerSource?.clear();
      markerSource?.addFeature(new Feature(new Point(coordinates)));

      const features = mapInstance.getFeaturesAtPixel(evt.pixel, {
        layerFilter: (layer) =>
          layer instanceof VectorLayer &&
          layer !== markerLayerRef.current &&
          !layer.get("ignoreClick"),
      });

      const clickInfo = {
        coordinates,
        latLon,
        features: features
          ? features.map((feature) => {
              const layerId =
                Array.from(layerObjects.current.entries()).find(([, layer]) =>
                  layer
                    .getSource()
                    ?.getFeatures()
                    .includes(feature as any)
                )?.[0] || "";

              const properties = feature.getProperties();
              // Remove geometry from properties to avoid non-serializable error
              // Also handle the case where geometry might be under a different key or implicit
              const geometryName =
                "getGeometryName" in feature
                  ? feature.getGeometryName()
                  : "geometry";
              if (properties[geometryName]) {
                delete properties[geometryName];
              }
              // Double check for 'geometry' property just in case
              if (properties["geometry"]) {
                delete properties["geometry"];
              }

              const geometry = new GeoJSON().writeGeometryObject(
                feature.getGeometry() as any
              );

              return {
                id: feature.getId() || (feature as any).ol_uid,
                properties,
                layerId,
                geometry,
              };
            })
          : [],
      };

      dispatch(setClickInfo(clickInfo));

      // Find matching rule for the first feature (if rules are provided)
      if (rules && setHighlightedRuleIndex && clickInfo.features.length > 0) {
        const firstFeature = clickInfo.features[0];
        let matchingRuleIndex: number | null = null;

        for (let i = 0; i < rules.length; i++) {
          if (evaluateFilter(rules[i].filter, firstFeature.properties)) {
            matchingRuleIndex = i;
            break;
          }
        }

        setHighlightedRuleIndex(matchingRuleIndex);
      } else if (setHighlightedRuleIndex) {
        setHighlightedRuleIndex(null);
      }

      // Overlay logic
      mapInstance.getOverlays().clear();

      const element = document.createElement("div");
      const overlay = new Overlay({
        positioning: "bottom-center",
        position: coordinates,
        element: element,
        stopEvent: true,
        offset: [0, -10],
      });
      mapInstance.addOverlay(overlay);

      const root = createRoot(element);
      activeRootRef.current = root;

      const handleCloseOverlay = () => {
        dispatch(setClickInfo(null));
        mapInstance.getOverlays().clear();
        markerLayerRef.current?.getSource()?.clear(); // Clear marker
        if (setHighlightedRuleIndex) {
          setHighlightedRuleIndex(null); // Clear highlight
        }

        if (activeRootRef.current) {
          activeRootRef.current.unmount();
          activeRootRef.current = null;
        }
      };

      root.render(
        React.createElement(ClickOverlay, {
          clickInfo: clickInfo,
          mapInstance: { current: mapInstance },
          language: language as any,
          onClose: handleCloseOverlay,
          stylingFields: stylingFields,
          rules: rules,
          setHighlightedRuleIndex: setHighlightedRuleIndex,
        })
      );
    };

    mapInstance.on("singleclick", handleSingleClick);

    return () => {
      mapInstance.un("singleclick", handleSingleClick);
      if (activeRootRef.current) {
        activeRootRef.current.unmount();
        activeRootRef.current = null;
      }
      if (markerLayerRef.current) {
        mapInstance.removeLayer(markerLayerRef.current);
        markerLayerRef.current = null;
      }
    };
  }, [
    mapInstance,
    layerObjects,
    dispatch,
    language,
    stylingFields,
    rules,
    setHighlightedRuleIndex,
  ]);
};
