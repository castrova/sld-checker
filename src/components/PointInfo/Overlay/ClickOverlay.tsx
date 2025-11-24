import React from "react";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import CloseIcon from "@mui/icons-material/Close";
import Draggable from "react-draggable";
import { t } from "../../../i18n";
import styles from "./ClickOverlay.module.css";
import type { ClickInfo } from "../../../features/map/mapSlice";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

interface ClickOverlayProps {
  clickInfo: ClickInfo | null;
  mapInstance: React.RefObject<any>;
  language: import("../../../i18n").Language;
  onClose: () => void;
  stylingFields?: string[];
}

const ClickOverlay: React.FC<ClickOverlayProps> = ({
  clickInfo,
  mapInstance,
  language,
  onClose,
  stylingFields,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const nodeRef = React.useRef(null);
  const highlightLayerRef = React.useRef<VectorLayer | null>(null);

  React.useEffect(() => {
    if (!mapInstance?.current) return;

    // Create highlight layer if it doesn't exist
    if (!highlightLayerRef.current) {
      highlightLayerRef.current = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          stroke: new Stroke({
            color: "red",
            width: 3,
          }),
          fill: new Fill({
            color: "rgba(255, 0, 0, 0.3)",
          }),
          image: new CircleStyle({
            radius: 8,
            fill: new Fill({ color: "rgba(255, 0, 0, 0.3)" }),
            stroke: new Stroke({
              color: "red",
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
      const currentFeature = clickInfo.features[currentIndex];
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
          }
        );
        source?.addFeature(feature);
      }
    }

    return () => {
      // Cleanup handled by the other useEffect
    };
  }, [currentIndex, clickInfo, mapInstance]);

  // Cleanup layer on unmount
  React.useEffect(() => {
    return () => {
      if (mapInstance?.current && highlightLayerRef.current) {
        mapInstance.current.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
    };
  }, [mapInstance]);

  if (!clickInfo || !mapInstance?.current) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % clickInfo.features.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prev) =>
        (prev - 1 + clickInfo.features.length) % clickInfo.features.length
    );
  };

  const currentFeature = clickInfo.features[currentIndex];

  return (
    <Draggable handle={`.${styles.header}`} nodeRef={nodeRef}>
      <Paper className={styles.overlay} ref={nodeRef}>
        <div className={styles.header} style={{ justifyContent: "flex-end" }}>
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
          <Typography>
            {t(language, "coords")}: {clickInfo.coordinates[0].toFixed(2)},{" "}
            {clickInfo.coordinates[1].toFixed(2)} (EPSG:3857)
          </Typography>
          <Typography>
            {t(language, "latLon")}: {clickInfo.latLon[0].toFixed(6)},{" "}
            {clickInfo.latLon[1].toFixed(6)} (EPSG:4326)
          </Typography>

          {clickInfo.features.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />

              {clickInfo.features.length > 1 && (
                <div
                  className={styles.sliderHeader}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <IconButton onClick={handlePrev} size="small">
                    <NavigateBeforeIcon />
                  </IconButton>
                  <Typography variant="subtitle2">
                    {t(language, "feature")} {currentIndex + 1} /{" "}
                    {clickInfo.features.length}
                  </Typography>
                  <IconButton onClick={handleNext} size="small">
                    <NavigateNextIcon />
                  </IconButton>
                </div>
              )}

              {/* Styling Properties Section */}
              {stylingFields && stylingFields.length > 0 && (
                <div
                  style={{
                    marginBottom: 16,
                    backgroundColor: "#f5f5f5",
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {t(language, "stylingProperties")}
                  </Typography>

                  {currentFeature.properties._unmatched && (
                    <Typography
                      variant="body2"
                      color="error"
                      sx={{ mb: 1, fontWeight: "bold" }}
                    >
                      {t(language, "unmatchedWarning")}
                    </Typography>
                  )}

                  {stylingFields.map((field) => {
                    const value = currentFeature?.properties[field];
                    if (value === undefined) return null;
                    return (
                      <Typography
                        key={field}
                        variant="body2"
                        sx={{ fontWeight: "bold" }}
                      >
                        {field}: {String(value)}
                      </Typography>
                    );
                  })}
                </div>
              )}

              <div className={styles.featureCard}>
                <Typography variant="subtitle2" gutterBottom>
                  {t(language, "properties")}
                </Typography>
                {currentFeature &&
                  Object.entries(currentFeature.properties)
                    .filter(
                      ([key, value]) =>
                        value !== null &&
                        value !== undefined &&
                        value !== "" &&
                        (!stylingFields || !stylingFields.includes(key)) // Exclude styling fields from general list
                    )
                    .map(([key, value]) => (
                      <Typography key={key} variant="body2">
                        <strong>{key}:</strong>{" "}
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : value}
                      </Typography>
                    ))}
              </div>
            </>
          )}
        </div>
      </Paper>
    </Draggable>
  );
};

export default ClickOverlay;
