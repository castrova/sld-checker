import React from "react";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import Draggable from "react-draggable";
import { t } from "../../../i18n";
import styles from "./ClickOverlay.module.css";
import type { ClickInfo } from "../../../features/map/mapSlice";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import type { SldRuleStats } from "../../../utils/sldUtils";
import { evaluateFilter } from "../../../utils/sldUtils";

interface ClickOverlayProps {
  clickInfo: ClickInfo | null;
  mapInstance: React.RefObject<any>;
  language: import("../../../i18n").Language;
  onClose: () => void;
  stylingFields?: string[];
  rules?: SldRuleStats[];
  setHighlightedRuleIndex?: (index: number | null) => void;
}

const ClickOverlay: React.FC<ClickOverlayProps> = ({
  clickInfo,
  mapInstance,
  language,
  onClose,
  stylingFields,
  rules,
  setHighlightedRuleIndex,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const nodeRef = React.useRef(null);
  const highlightLayerRef = React.useRef<VectorLayer | null>(null);

  // Derive safeIndex BEFORE any useEffect hooks reference it
  const safeIndex =
    clickInfo && clickInfo.features.length > 0
      ? Math.min(Math.max(0, currentIndex), clickInfo.features.length - 1)
      : 0;

  // Reset currentIndex when clickInfo changes
  React.useEffect(() => {
    setCurrentIndex(0);
  }, [clickInfo]);

  React.useEffect(() => {
    if (!mapInstance?.current) return;

    // Create highlight layer if it doesn't exist
    if (!highlightLayerRef.current) {
      highlightLayerRef.current = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          stroke: new Stroke({
            color: "#1976d2",
            width: 3,
          }),
          fill: new Fill({
            color: "rgba(25, 118, 210, 0.25)",
          }),
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "rgba(25, 118, 210, 0.25)" }),
            stroke: new Stroke({
              color: "#1976d2",
              width: 3,
            }),
          }),
        }),
        zIndex: 9999, // Ensure it's on top
        properties: { ignoreClick: true },
      });
      mapInstance.current.addLayer(highlightLayerRef.current);
    }

    const layer = highlightLayerRef.current;
    const source = layer.getSource();
    source?.clear();

    if (clickInfo && clickInfo.features.length > 0) {
      const currentFeature = clickInfo.features[safeIndex];
      if (currentFeature && currentFeature.geometry) {
        const feature = new GeoJSON().readFeature(
          {
            type: "Feature",
            geometry: currentFeature.geometry,
            properties: {},
          },
          {
            dataProjection: "EPSG:3857",
            featureProjection: "EPSG:3857",
          },
        );
        source?.addFeature(feature);
      }
    }

    return () => {
      // Cleanup handled by the other useEffect
    };
  }, [safeIndex, clickInfo, mapInstance]);

  // Cleanup layer on unmount
  React.useEffect(() => {
    return () => {
      if (mapInstance?.current && highlightLayerRef.current) {
        mapInstance.current.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
    };
  }, [mapInstance]);

  // Update highlighted rule when safeIndex changes
  React.useEffect(() => {
    if (
      !rules ||
      !setHighlightedRuleIndex ||
      !clickInfo ||
      clickInfo.features.length === 0
    ) {
      return;
    }

    const currentFeature = clickInfo.features[safeIndex];
    if (!currentFeature || !currentFeature.properties) return;

    let matchingRuleIndex: number | null = null;

    for (let i = 0; i < rules.length; i++) {
      if (evaluateFilter(rules[i].filter, currentFeature.properties)) {
        matchingRuleIndex = i;
        break;
      }
    }

    setHighlightedRuleIndex(matchingRuleIndex);
  }, [safeIndex, clickInfo, rules, setHighlightedRuleIndex]);

  if (!clickInfo || !mapInstance?.current || clickInfo.features.length === 0)
    return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % clickInfo.features.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prev) =>
        (prev - 1 + clickInfo.features.length) % clickInfo.features.length,
    );
  };

  const currentFeature = clickInfo.features[safeIndex];
  if (!currentFeature) return null;

  // Find matching rule for current feature
  const matchingRule =
    rules && currentFeature.properties
      ? rules.find((rule) =>
          evaluateFilter(rule.filter, currentFeature.properties),
        )
      : undefined;

  const isUnmatched = currentFeature.properties._unmatched === true;

  // Get non-styling properties
  const generalProperties = Object.entries(currentFeature.properties).filter(
    ([key, value]) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      key !== "_unmatched" &&
      key !== "_highlighted" &&
      (!stylingFields || !stylingFields.includes(key)),
  );

  return (
    <Draggable handle={`.${styles.header}`} nodeRef={nodeRef}>
      <Paper className={styles.overlay} ref={nodeRef} elevation={0}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <InfoIcon fontSize="small" />
            {t(language, "pointInfo")}
          </div>
          <IconButton
            className={styles.closeButton}
            onClick={onClose}
            size="small"
            aria-label={t(language, "close")}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        <div className={styles.content}>
          {/* Coordinate Section */}
          <div className={styles.coordsSection}>
            <div className={styles.coordRow}>
              <MyLocationIcon
                fontSize="small"
                sx={{ color: "#1976d2", fontSize: "0.9rem" }}
              />
              <span className={styles.coordLabel}>
                {t(language, "coords")}:
              </span>
              <span className={styles.coordValue}>
                {clickInfo.coordinates[0].toFixed(2)},{" "}
                {clickInfo.coordinates[1].toFixed(2)}
                <span className={styles.coordProjection}>EPSG:3857</span>
              </span>
            </div>
            <div className={styles.coordRow}>
              <span
                className={styles.coordLabel}
                style={{ marginLeft: "20px" }}
              >
                {t(language, "latLon")}:
              </span>
              <span className={styles.coordValue}>
                {clickInfo.latLon[0].toFixed(6)},{" "}
                {clickInfo.latLon[1].toFixed(6)}
                <span className={styles.coordProjection}>EPSG:4326</span>
              </span>
            </div>
          </div>

          {/* Feature Navigation */}
          {clickInfo.features.length > 1 && (
            <div className={styles.sliderHeader}>
              <IconButton
                className={styles.navButton}
                onClick={handlePrev}
                size="small"
              >
                <NavigateBeforeIcon fontSize="small" />
              </IconButton>
              <span className={styles.sliderCounter}>
                {t(language, "feature")} {safeIndex + 1} /{" "}
                {clickInfo.features.length}
              </span>
              <IconButton
                className={styles.navButton}
                onClick={handleNext}
                size="small"
              >
                <NavigateNextIcon fontSize="small" />
              </IconButton>
            </div>
          )}

          {/* Rule Badge */}
          {rules && rules.length > 0 && (
            <div
              className={`${styles.ruleBadge} ${
                matchingRule
                  ? styles.ruleBadgeMatched
                  : styles.ruleBadgeUnmatched
              }`}
            >
              {matchingRule ? (
                <>
                  <CheckCircleIcon sx={{ fontSize: "0.9rem" }} />
                  {t(language, "matchedRule")}: {matchingRule.ruleName}
                </>
              ) : (
                <>
                  <CancelIcon sx={{ fontSize: "0.9rem" }} />
                  {t(language, "noMatchedRule")}
                </>
              )}
            </div>
          )}

          {/* Unmatched Warning */}
          {isUnmatched && (
            <div
              className={`${styles.ruleBadge} ${styles.ruleBadgeUnmatched}`}
              style={{ marginTop: 8 }}
            >
              <CancelIcon sx={{ fontSize: "0.9rem" }} />
              {t(language, "unmatchedWarning")}
            </div>
          )}

          {/* Styling Properties Section */}
          {stylingFields && stylingFields.length > 0 && (
            <div className={styles.stylingSection}>
              <div className={styles.sectionTitle}>
                {t(language, "stylingProperties")}
              </div>
              {stylingFields.map((field) => {
                const value = currentFeature?.properties[field];
                if (value === undefined) return null;
                return (
                  <div key={field} className={styles.stylingField}>
                    <span className={styles.stylingFieldName}>{field}</span>
                    <span className={styles.stylingFieldValue}>
                      {String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* General Properties Section */}
          <div className={styles.propertiesSection}>
            <div className={styles.sectionTitle}>
              {t(language, "properties")}
            </div>
            {generalProperties.length > 0 ? (
              <div className={styles.propertiesGrid}>
                {generalProperties.map(([key, value]) => (
                  <div key={key} className={styles.propertyRow}>
                    <span className={styles.propertyKey}>{key}</span>
                    <span className={styles.propertyValue}>
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noProperties}>
                {t(language, "noProperties")}
              </div>
            )}
          </div>
        </div>
      </Paper>
    </Draggable>
  );
};

export default ClickOverlay;
