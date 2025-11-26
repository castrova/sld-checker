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

import ListItemText from "@mui/material/ListItemText";
import { useDispatch } from "react-redux";
import { removeLayer } from "../../features/map/mapSlice";
import type { LayerMeta } from "../../features/map/mapSlice";
import type VectorLayer from "ol/layer/Vector";
import type OLMap from "ol/Map";

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
  const [visible, setVisible] = useState(true);

  const handleAccordionChange = (
    _: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded);
  };

  const handleVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVisible = !visible;
    setVisible(newVisible);
    if (layerObject) {
      layerObject.setVisible(newVisible);
    }
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
