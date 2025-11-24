import React, { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteIcon from "@mui/icons-material/Delete";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import TransparencyControl from "./layer/TransparencyControl";
import StyleControl from "./layer/StyleControl";
import ListItemText from "@mui/material/ListItemText";
import { useDispatch } from "react-redux";
import { removeLayer } from "../../features/map/mapSlice";
import type { LayerMeta } from "../../features/map/mapSlice";
import type VectorLayer from "ol/layer/Vector";
import type OLMap from "ol/Map";
import OLStyle from "ol/style/Style";
import OLFill from "ol/style/Fill";
import OLStroke from "ol/style/Stroke";
import { updateLayerStyle } from "../../features/map/mapSlice";
import { Box, Stack } from "@mui/material";
import { t } from "../../i18n";

interface LayerItemProps {
  layer: LayerMeta;
  layerObject?: VectorLayer;
  layerObjects: React.MutableRefObject<Map<string, VectorLayer>>;
  mapInstance?: React.MutableRefObject<OLMap | null>;
  index: number;
  language: import("../../i18n").Language;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  layerObject,
  layerObjects,
  mapInstance,
  index,
  language,
}) => {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [visible, setVisible] = useState(true);
  const [showTransparency, setShowTransparency] = useState(false);
  const [showStyle, setShowStyle] = useState(false);

  const handleAccordionChange = (
    _: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded);
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    if (layerObject) {
      layerObject.setOpacity(value);
    }
  };

  const handleVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisible = !visible;
    setVisible(newVisible);
    if (layerObject) {
      layerObject.setVisible(newVisible);
    }
  };

  const handleStyleChange = (style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderType: string;
  }) => {
    if (layerObject) {
      const olStyle = new OLStyle({
        fill: new OLFill({ color: style.fillColor }),
        stroke: new OLStroke({
          color: style.strokeColor,
          width: style.strokeWidth,
          lineDash:
            style.borderType === "dashed"
              ? [10, 10]
              : style.borderType === "dotted"
              ? [2, 6]
              : undefined,
        }),
      });
      layerObject.setStyle(olStyle);
    }
    // Update Redux
    dispatch(updateLayerStyle({ id: layer.id, style }));
  };

  const handleZoomToLayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (layerObject && mapInstance?.current) {
      const source = layerObject.getSource();
      if (source) {
        const extent = source.getExtent();
        if (extent) {
          mapInstance.current.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
          });
        }
      }
    }
  };

  const handleRemoveLayer = () => {
    if (layerObject && mapInstance?.current) {
      mapInstance.current.getLayers().remove(layerObject);
      layerObject.dispose(); // Clean up OpenLayers resources
      layerObjects.current.delete(layer.id);
      dispatch(removeLayer(index));
    }
  };

  return (
    <Accordion expanded={expanded} onChange={handleAccordionChange}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          background: "#f5f5f5",
          borderBottom: "1px solid #e0e0e0",
          "&.Mui-expanded": {
            minHeight: 48,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
          <IconButton
            size="small"
            onClick={handleVisibilityToggle}
            sx={{ mr: 1 }}
          >
            {visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
          </IconButton>
          <IconButton
            size="small"
            onClick={handleZoomToLayer}
            sx={{ mr: 1 }}
            title={t(language, "zoomToLayer")}
          >
            <CenterFocusStrongIcon />
          </IconButton>
          <ListItemText primary={layer.name} />
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Button
              variant={showTransparency ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setShowTransparency((v) => !v);
                if (!showTransparency) setShowStyle(false);
              }}
              sx={{ mr: 1 }}
            >
              {t(language, "transparency")}
            </Button>
            <Button
              variant={showStyle ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setShowStyle((v) => !v);
                if (!showStyle) setShowTransparency(false);
              }}
            >
              {t(language, "styles")}
            </Button>
          </Box>

          {showTransparency && (
            <TransparencyControl
              opacity={opacity}
              onChange={handleOpacityChange}
            />
          )}

          {showStyle && (
            <StyleControl
              onStyleChange={handleStyleChange}
              style={layer.style}
              language={language}
            />
          )}

          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleRemoveLayer}
            fullWidth
          >
            {t(language, "removeLayer")}
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default LayerItem;
