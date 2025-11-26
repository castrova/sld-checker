import React, { useState, useRef } from "react";
import { KML, GML, GeoJSON } from "ol/format";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useMap } from "./hooks/useMap";
import { useMapClick } from "./hooks/useMapClick";
import ProjectLoader from "./components/ProjectLoader/ProjectLoader";
import SmartLegend from "./components/SmartLegend/SmartLegend";
import { parseSldAndAnalyze, type SldAnalysisResult } from "./utils/sldUtils";
import { t, type Language } from "./i18n";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Define EPSG:25831
proj4.defs(
  "EPSG:25831",
  "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);
register(proj4);

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

const App: React.FC = () => {
  const { mapRef, mapInstance } = useMap();
  const [language, setLanguage] = useState<Language>("es");
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [sldStats, setSldStats] = useState<SldAnalysisResult | null>(null);
  const [layerName, setLayerName] = useState<string>("");
  const [currentScale, setCurrentScale] = useState<number | null>(null);
  const layerObjects = useRef<Map<string, VectorLayer>>(new Map());

  const [activeRuleIndices, setActiveRuleIndices] = useState<number[]>([]);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [highlightedRuleIndex, setHighlightedRuleIndex] = useState<
    number | null
  >(null);

  useMapClick(
    mapInstance,
    layerObjects,
    language,
    sldStats?.stylingFields,
    sldStats?.rules,
    setHighlightedRuleIndex
  );

  // Calculate scale on map move
  React.useEffect(() => {
    if (!mapInstance) return;

    const calculateScale = () => {
      const view = mapInstance.getView();
      const resolution = view.getResolution();
      if (resolution) {
        // OGC DPI = 90.714
        // Inches per meter = 39.3701
        // Scale = Resolution * InchesPerUnit * DPI
        // Assuming meters as units (EPSG:3857 or EPSG:25831)
        const scale = resolution * 39.3701 * 90.714;
        setCurrentScale(scale);
      }
    };

    // Initial calculation
    calculateScale();

    mapInstance.on("moveend", calculateScale);

    return () => {
      mapInstance.un("moveend", calculateScale);
    };
  }, [mapInstance]);

  const updateStyle = async (
    indices: number[],
    showUnmatchedFeatures: boolean
  ) => {
    if (!sldStats || !mapInstance) return;

    const originalRules = sldStats.geostylerStyle.rules;
    const filteredRules =
      indices.length === 0
        ? originalRules
        : originalRules.filter((_, i) => indices.includes(i));

    const newGeostylerStyle = {
      ...sldStats.geostylerStyle,
      rules: filteredRules,
    };

    try {
      const { generateOlStyle } = await import("./utils/sldUtils");
      const newOlStyle = await generateOlStyle(
        newGeostylerStyle,
        showUnmatchedFeatures
      );

      if (newOlStyle) {
        const layer = layerObjects.current.get("main-layer");
        if (layer) {
          layer.setStyle(newOlStyle);
        }
      }
    } catch (error) {
      console.error("Failed to update style:", error);
    }
  };

  const handleToggleRule = async (index: number) => {
    const newIndices = activeRuleIndices.includes(index)
      ? activeRuleIndices.filter((i) => i !== index)
      : [...activeRuleIndices, index];

    setActiveRuleIndices(newIndices);
    updateStyle(newIndices, showUnmatched);
  };

  const handleToggleUnmatched = () => {
    const newValue = !showUnmatched;
    setShowUnmatched(newValue);
    updateStyle(activeRuleIndices, newValue);
  };

  const handleLoadProject = async (layerFile: File, sldFile: File) => {
    if (!mapInstance) return;

    try {
      // Reset active rules
      setActiveRuleIndices([]);
      setShowUnmatched(false);
      setShowUnmatched(false); // Reset showUnmatched state
      setLayerName(layerFile.name);

      // 1. Read Layer File
      const layerContent = await readFileAsText(layerFile);
      const features = parseLayerContent(layerFile.name, layerContent);

      if (!features || features.length === 0) {
        throw new Error(t(language, "noFeaturesFound"));
      }

      // 2. Read SLD File
      const sldContent = await readFileAsText(sldFile);

      // 3. Parse SLD and Analyze
      const analysis = await parseSldAndAnalyze(sldContent, features);
      setSldStats(analysis);

      // 4. Create Layer with Style
      const source = new VectorSource({
        features: features,
      });

      const layer = new VectorLayer({
        source: source,
        style: analysis.olStyle,
      });

      // Clear existing layers (except marker layer managed by useMapClick)
      // We can just remove all layers and let useMapClick recreate its marker layer if needed,
      // or better, iterate and remove our project layers.
      // For simplicity in this "Single Layer" app, we can clear the map layers that are not overlays/base.
      // But mapInstance.getLayers().clear() removes everything including base tiles if any (we don't have base tiles in useMap currently).
      // Let's just add the new layer.

      // Remove previous project layer if any
      layerObjects.current.forEach((l) => mapInstance.removeLayer(l));
      layerObjects.current.clear();

      mapInstance.addLayer(layer);
      layerObjects.current.set("main-layer", layer);

      // 5. Zoom to Extent
      const extent = source.getExtent();
      if (extent) {
        mapInstance.getView().fit(extent, { padding: [50, 50, 50, 50] });
      }

      setProjectLoaded(true);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`${t(language, "errorLoadingProject")}: ${message}`);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const parseLayerContent = (fileName: string, content: string) => {
    const name = fileName.toLowerCase();
    if (name.endsWith(".kml")) {
      return new KML().readFeatures(content, {
        featureProjection: "EPSG:3857",
      });
    } else if (name.endsWith(".gml") || name.endsWith(".xml")) {
      // Simple GML handling from previous code
      let dataProjection = "EPSG:4326";
      const srsMatch =
        content.match(/srsName="([^"]*)"/) ||
        content.match(/srsName='([^']*)'/);
      if (srsMatch && srsMatch[1]) {
        dataProjection = srsMatch[1];
      }
      // Try/Catch for GML parsing omitted for brevity, assuming standard GML for now or can add back if needed
      return new GML().readFeatures(content, {
        dataProjection: dataProjection,
        featureProjection: "EPSG:3857",
      });
    } else if (name.endsWith(".json") || name.endsWith(".geojson")) {
      return new GeoJSON().readFeatures(JSON.parse(content), {
        featureProjection: "EPSG:3857",
      });
    }
    throw new Error(t(language, "unsupportedFormat"));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "es" ? "en" : "es"));
  };

  const handleReset = () => {
    setProjectLoaded(false);
    setSldStats(null);
    if (mapInstance) {
      layerObjects.current.forEach((l) => mapInstance.removeLayer(l));
      layerObjects.current.clear();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", height: "100vh", flexDirection: "column" }}>
        <AppBar position="static">
          <Toolbar>
            {projectLoaded && (
              <IconButton
                edge="start"
                color="inherit"
                onClick={handleReset}
                sx={{ mr: 2 }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {t(language, "appTitle")}
            </Typography>
            <Button
              color="inherit"
              onClick={toggleLanguage}
              startIcon={<LanguageIcon />}
            >
              {language.toUpperCase()}
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, position: "relative" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

          {!projectLoaded && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 20,
                bgcolor: "background.default",
              }}
            >
              <ProjectLoader onLoad={handleLoadProject} language={language} />
            </Box>
          )}

          {projectLoaded && (
            <>
              {/* Floating Legend */}
              {sldStats && (
                <Box
                  sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}
                >
                  <SmartLegend
                    rules={sldStats.rules}
                    unmatchedCount={sldStats.unmatchedCount}
                    language={language}
                    activeRuleIndices={activeRuleIndices}
                    onToggleRule={handleToggleRule}
                    showUnmatched={showUnmatched}
                    onToggleUnmatched={handleToggleUnmatched}
                    highlightedRuleIndex={highlightedRuleIndex}
                    layerName={layerName}
                    currentScale={currentScale}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
