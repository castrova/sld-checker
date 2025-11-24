import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../redux/store";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LayerItem from "../LayerItem/LayerItem";
import { t } from "../../i18n";

interface LegendProps {
  layerObjects: React.RefObject<any>;
  mapInstance: React.RefObject<any>;
  language: import("../../i18n").Language;
}

const Legend: React.FC<LegendProps> = ({
  layerObjects,
  mapInstance,
  language,
}) => {
  const layers = useSelector((state: RootState) => state.map.layers || []);

  return (
    <Paper
      elevation={3}
      sx={{
        minWidth: 300,
        maxHeight: "80vh",
        overflowY: "auto",
        borderRadius: 2,
      }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
        <Typography variant="h6" component="div">
          {t(language, "legend")}
        </Typography>
      </Box>
      <List disablePadding>
        {layers.length === 0 ? (
          <ListItem>
            <ListItemText
              primary={t(language, "noLayers")}
              secondary="Upload a GeoJSON file to see it here"
            />
          </ListItem>
        ) : (
          layers.map((layer, idx) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              layerObject={layerObjects.current.get(layer.id)}
              layerObjects={layerObjects}
              index={idx}
              mapInstance={mapInstance}
              language={language}
            />
          ))
        )}
      </List>
    </Paper>
  );
};

export default Legend;
