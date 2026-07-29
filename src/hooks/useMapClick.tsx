import { useEffect, useRef, useCallback } from "react";
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
import { createRoot, type Root } from "react-dom/client";
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
  setHighlightedRuleIndex: (index: number | null) => void,
) => {
  const dispatch = useDispatch();
  const activeRootRef = useRef<Root | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const markerLayerRef = useRef<VectorLayer | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);

  const languageRef = useRef(language);
  languageRef.current = language;

  const stylingFieldsRef = useRef(stylingFields);
  stylingFieldsRef.current = stylingFields;

  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const setHighlightedRuleIndexRef = useRef(setHighlightedRuleIndex);
  setHighlightedRuleIndexRef.current = setHighlightedRuleIndex;

  const cleanupOverlay = useCallback(() => {
    console.log("Cleaning up overlay");
    dispatch(setClickInfo(null));
    if (overlayRef.current) overlayRef.current.setPosition(undefined);
    if (activeRootRef.current) activeRootRef.current.render(<React.Fragment />);
    markerLayerRef.current?.getSource()?.clear();
    setHighlightedRuleIndexRef.current(null);
  }, [dispatch]);

  useEffect(() => {
    if (!mapInstance) return;

    if (!overlayContainerRef.current) {
      overlayContainerRef.current = document.createElement("div");
      overlayContainerRef.current.style.pointerEvents = "auto";
      overlayRef.current = new Overlay({
        element: overlayContainerRef.current,
        positioning: "bottom-center",
        stopEvent: true,
        offset: [0, -10],
      });
      mapInstance.addOverlay(overlayRef.current);
      activeRootRef.current = createRoot(overlayContainerRef.current);
    }

    if (!markerLayerRef.current) {
      markerLayerRef.current = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: "#1976d2" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
        }),
        zIndex: 10000,
        properties: { ignoreClick: true },
      });
      mapInstance.addLayer(markerLayerRef.current);
    }

    const handleSingleClick = (evt: any) => {
      console.log("Map clicked at", evt.coordinate);
      const coordinates = evt.coordinate;
      const latLon = transform(coordinates, "EPSG:3857", "EPSG:4326");

      const features = mapInstance.getFeaturesAtPixel(evt.pixel, {
        hitTolerance: 10,
      });
      console.log("Found features count:", features?.length);

      if (!features || features.length === 0) {
        cleanupOverlay();
        return;
      }

      const geojsonFormat = new GeoJSON();
      const clickInfoFeatures = features
        .filter((f: any) => {
          const layers = mapInstance.getLayers().getArray();
          const featureLayer = layers.find(
            (l) =>
              l instanceof VectorLayer &&
              l.getSource()?.getFeatures().includes(f),
          );
          return (
            featureLayer !== markerLayerRef.current &&
            !featureLayer?.get("ignoreClick")
          );
        })
        .map((feature: any) => {
          const allProps = feature.getProperties();
          const { geometry, ...properties } = allProps;
          return {
            id: feature.getId() || (feature as any).ol_uid,
            properties,
            layerId: "main-layer",
            geometry: geojsonFormat.writeGeometryObject(
              feature.getGeometry() as any,
            ),
          };
        });

      console.log("Filtered features count:", clickInfoFeatures.length);

      if (clickInfoFeatures.length === 0) {
        cleanupOverlay();
        return;
      }

      const markerSource = markerLayerRef.current?.getSource();
      markerSource?.clear();
      markerSource?.addFeature(new Feature(new Point(coordinates)));

      const clickInfo = { coordinates, latLon, features: clickInfoFeatures };
      dispatch(setClickInfo(clickInfo));

      const currentRules = rulesRef.current;
      if (currentRules && clickInfoFeatures.length > 0) {
        const firstFeatureProps = clickInfoFeatures[0].properties;
        const matchingRuleIndex = currentRules.findIndex((rule) =>
          evaluateFilter(rule.filter, firstFeatureProps),
        );
        setHighlightedRuleIndexRef.current(
          matchingRuleIndex !== -1 ? matchingRuleIndex : null,
        );
      }

      if (overlayRef.current && activeRootRef.current) {
        overlayRef.current.setPosition(coordinates);
        activeRootRef.current.render(
          <ClickOverlay
            clickInfo={clickInfo}
            mapInstance={{ current: mapInstance }}
            language={languageRef.current as any}
            onClose={cleanupOverlay}
            stylingFields={stylingFieldsRef.current}
            rules={rulesRef.current}
            setHighlightedRuleIndex={(idx) => setHighlightedRuleIndexRef.current(idx)}
          />,
        );
      }
    };

    mapInstance.on("singleclick", handleSingleClick);
    return () => {
      mapInstance.un("singleclick", handleSingleClick);
    };
  }, [mapInstance, dispatch, cleanupOverlay]);
};
