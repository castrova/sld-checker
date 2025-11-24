import React, { useState } from "react";
import { Box, Button, Typography, Paper, Stack, styled } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { t, type Language } from "../../i18n";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

interface ProjectLoaderProps {
  onLoad: (layerFile: File, sldFile: File) => void;
  language: Language;
}

const ProjectLoader: React.FC<ProjectLoaderProps> = ({ onLoad, language }) => {
  const [layerFile, setLayerFile] = useState<File | null>(null);
  const [sldFile, setSldFile] = useState<File | null>(null);

  const handleLayerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setLayerFile(event.target.files[0]);
    }
  };

  const handleSldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSldFile(event.target.files[0]);
    }
  };

  const handleLoadClick = () => {
    if (layerFile && sldFile) {
      onLoad(layerFile, sldFile);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: 400, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          {t(language, "loadProject")}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          {t(language, "loadProjectDesc")}
        </Typography>

        <Stack spacing={2}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            fullWidth
            color={layerFile ? "success" : "primary"}
          >
            {layerFile ? layerFile.name : t(language, "selectLayer")}
            <VisuallyHiddenInput
              type="file"
              onChange={handleLayerChange}
              accept=".geojson,.json,.kml,.gml,.xml"
            />
          </Button>

          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            fullWidth
            color={sldFile ? "success" : "primary"}
          >
            {sldFile ? sldFile.name : t(language, "selectSLD")}
            <VisuallyHiddenInput
              type="file"
              onChange={handleSldChange}
              accept=".sld,.xml"
            />
          </Button>

          <Button
            variant="contained"
            disabled={!layerFile || !sldFile}
            onClick={handleLoadClick}
            fullWidth
            size="large"
            sx={{ mt: 2 }}
          >
            {t(language, "loadMap")}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ProjectLoader;
