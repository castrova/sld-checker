import React, { useState, useRef, useCallback, useEffect } from "react";
import { KML, GML, GeoJSON as OLGeoJSON } from "ol/format";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { createEmpty, extend } from "ol/extent";
import { useMap } from "./hooks/useMap";
import { useMapClick } from "./hooks/useMapClick";
import ProjectLoader from "./components/ProjectLoader/ProjectLoader";
import SmartLegend from "./components/SmartLegend/SmartLegend";
import {
  parseSldAndAnalyze,
  generateOlStyle,
  evaluateFilter,
  type SldAnalysisResult,
} from "./utils/sldUtils";
import { t, type Language } from "./i18n";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "./redux/store";
import {
  setBaseMap,
  setHighlightedRuleIndex,
  setHoveredRuleIndex,
} from "./features/map/mapSlice";

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
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Drawer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Tooltip,
  TablePagination,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MapIcon from "@mui/icons-material/Map";
import TableChartIcon from "@mui/icons-material/TableChart";
import CodeIcon from "@mui/icons-material/Code";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DownloadIcon from "@mui/icons-material/Download";
import LocationSearchingIcon from "@mui/icons-material/LocationSearching";

// Define EPSG:25831
proj4.defs(
  "EPSG:25831",
  "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
);
register(proj4);

const theme = createTheme({
  palette: { primary: { main: "#1976d2" }, secondary: { main: "#dc004e" } },
});

const App: React.FC = () => {
  const dispatch = useDispatch();
  const { mapRef, mapInstance } = useMap();
  const baseMapType = useSelector((state: RootState) => state.map.baseMap);
  const highlightedRuleIndex = useSelector(
    (state: RootState) => state.map.highlightedRuleIndex,
  );
  const hoveredRuleIndex = useSelector(
    (state: RootState) => state.map.hoveredRuleIndex,
  );

  const [language, setLanguage] = useState<Language>("es");
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [sldStats, setSldStats] = useState<SldAnalysisResult | null>(null);
  const [layerName, setLayerName] = useState<string>("");
  const [currentScale, setCurrentScale] = useState<number | null>(null);
  const layerObjects = useRef<Map<string, VectorLayer>>(new Map());

  const [activeRuleIndices, setActiveRuleIndices] = useState<number[]>([]);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sldContent, setSldContent] = useState("");
  const [features, setFeatures] = useState<any[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "error" | "success";
  }>({
    open: false,
    message: "",
    severity: "error",
  });

  const handleSetHighlightedRuleIndex = useCallback(
    (index: number | null) => dispatch(setHighlightedRuleIndex(index)),
    [dispatch],
  );

  useMapClick(
    mapInstance,
    layerObjects,
    language,
    sldStats?.stylingFields,
    sldStats?.rules,
    handleSetHighlightedRuleIndex,
  );

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const layerFile = files.find((f) =>
      f.name.match(/\.(geojson|json|kml|gml|xml)$/i),
    );
    const sldFile = files.find((f) => f.name.match(/\.sld$/i));
    if (layerFile && sldFile) handleLoadProject(layerFile, sldFile);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang") as Language;
    if (lang && (lang === "es" || lang === "en")) setLanguage(lang);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState({}, "", url);
  }, [language]);

  // Highlighting Logic (ONLY on hover)
  useEffect(() => {
    const layer = layerObjects.current.get("main-layer");
    if (!layer || !sldStats) return;
    const source = layer.getSource();
    if (!source) return;
    source.getFeatures().forEach((feature) => {
      const rule =
        hoveredRuleIndex !== null ? sldStats.rules[hoveredRuleIndex] : null;
      feature.set(
        "_highlighted",
        rule ? evaluateFilter(rule.filter, feature.getProperties()) : false,
      );
    });
    // Trigger layer redraw
    layer.changed();
  }, [hoveredRuleIndex, sldStats]);

  useEffect(() => {
    if (!mapInstance) return;
    const calc = () => {
      const res = mapInstance.getView().getResolution();
      if (res) setCurrentScale(res * 39.3701 * 90.714);
    };
    calc();
    mapInstance.on("moveend", calc);
    return () => mapInstance.un("moveend", calc);
  }, [mapInstance]);

  const updateStyle = useCallback(
    async (indices: number[], showUnm: boolean) => {
      if (!sldStats || !mapInstance) return;
      const filteredRules =
        indices.length === 0
          ? sldStats.geostylerStyle.rules
          : sldStats.geostylerStyle.rules.filter((_, i) => indices.includes(i));
      try {
        const style = await generateOlStyle(
          { ...sldStats.geostylerStyle, rules: filteredRules },
          showUnm,
        );
        if (style) layerObjects.current.get("main-layer")?.setStyle(style);
      } catch (e) {
        console.error(e);
      }
    },
    [sldStats, mapInstance],
  );

  const handleApplySld = async () => {
    if (!projectLoaded || !features.length) return;
    try {
      const analysis = await parseSldAndAnalyze(sldContent, features);
      setSldStats(analysis);
      const layer = layerObjects.current.get("main-layer");
      if (layer && analysis.olStyle) {
        layer.setStyle(analysis.olStyle);
      }
      setActiveRuleIndices([]);
      setSnackbar({
        open: true,
        message: t(language, "styleApplied"),
        severity: "success",
      });
    } catch (e: any) {
      setSnackbar({
        open: true,
        message: `${t(language, "errorApplyingStyle")}: ${e.message}`,
        severity: "error",
      });
    }
  };

  const handleDownloadSld = () => {
    const blob = new Blob([sldContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = layerName.replace(/\.[^/.]+$/, "") + ".sld";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = async (layerFile: File, sldFile: File) => {
    if (!mapInstance) return;
    try {
      setLayerName(layerFile.name);
      const [lTxt, sTxt] = await Promise.all([
        readFileAsText(layerFile),
        readFileAsText(sldFile),
      ]);
      const feats = parseLayerContent(layerFile.name, lTxt);
      if (!feats.length) throw new Error(t(language, "noFeaturesFound"));
      setFeatures(feats);
      setSldContent(sTxt);
      const analysis = await parseSldAndAnalyze(sTxt, feats);
      setSldStats(analysis);
      const source = new VectorSource({ features: feats });
      const layer = new VectorLayer({ source, style: analysis.olStyle });
      layerObjects.current.forEach((l) => mapInstance.removeLayer(l));
      layerObjects.current.clear();
      mapInstance.addLayer(layer);
      layerObjects.current.set("main-layer", layer);
      const ext = source.getExtent();
      if (ext)
        mapInstance
          .getView()
          .fit(ext, { padding: [50, 50, 50, 50], duration: 1000 });
      setProjectLoaded(true);
      setPage(0); // Reset page
      setSnackbar({
        open: true,
        message: t(language, "projectLoadedSuccess"),
        severity: "success",
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `${t(language, "errorLoadingProject")}: ${err.message}`,
        severity: "error",
      });
    }
  };

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target?.result as string);
      r.onerror = () => rej(new Error("Read error"));
      r.readAsText(file);
    });

  const parseLayerContent = (fileName: string, content: string) => {
    const n = fileName.toLowerCase();
    const o = { featureProjection: "EPSG:3857" };
    let dataProjection = "EPSG:4326"; // Default
    if (content.includes("srsName=")) {
      const match = content.match(/srsName=["']([^"']*)["']/);
      if (match && match[1]) {
        dataProjection = match[1].split("#").pop() || match[1];
        if (!dataProjection.startsWith("EPSG:"))
          dataProjection = `EPSG:${dataProjection}`;
      }
    }
    let feats: any[] = [];
    if (n.endsWith(".kml")) feats = new KML().readFeatures(content, o);
    else if (n.endsWith(".gml") || n.endsWith(".xml"))
      feats = new GML().readFeatures(content, { ...o, dataProjection });
    else if (n.endsWith(".json") || n.endsWith(".geojson"))
      feats = new OLGeoJSON().readFeatures(JSON.parse(content), o);
    else throw new Error(t(language, "unsupportedFormat"));
    return feats;
  };

  const handleExportImage = () => {
    if (!mapInstance) return;
    mapInstance.once("rendercomplete", () => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement("a");
        link.download = "map_export.png";
        link.href = canvas.toDataURL();
        link.click();
      }
    });
    mapInstance.renderSync();
  };

  const handleInspectFeature = (f: any) => {
    if (!mapInstance) return;
    const geom = f.getGeometry();
    if (!geom) return;
    const ext = geom.getExtent();
    mapInstance
      .getView()
      .fit(ext, { duration: 1000, padding: [150, 150, 150, 150], maxZoom: 18 });
    setTimeout(() => {
      const center = [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2];
      const pixel = mapInstance.getPixelFromCoordinate(center);
      if (pixel) {
        mapInstance.dispatchEvent({
          type: "singleclick",
          coordinate: center,
          pixel: pixel,
          originalEvent: new MouseEvent("click"),
        } as any);
      }
    }, 100);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{ display: "flex", height: "100vh", flexDirection: "column" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <AppBar position="static">
          <Toolbar>
            {projectLoaded && (
              <IconButton
                color="inherit"
                onClick={() => {
                  setProjectLoaded(false);
                  setSldStats(null);
                }}
                sx={{ mr: 2 }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {t(language, "appTitle")}
            </Typography>
            {projectLoaded && (
              <>
                <Tooltip title={t(language, "attributeTable")}>
                  <IconButton
                    color="inherit"
                    onClick={() => setTableOpen(true)}
                  >
                    <TableChartIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t(language, "sldEditor")}>
                  <IconButton
                    color="inherit"
                    onClick={() => setEditorOpen(true)}
                  >
                    <CodeIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t(language, "exportImage")}>
                  <IconButton color="inherit" onClick={handleExportImage}>
                    <FileDownloadIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <ToggleButtonGroup
              value={baseMapType}
              exclusive
              onChange={(_, v) => v && dispatch(setBaseMap(v))}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.1)", mx: 2 }}
            >
              <ToggleButton value="osm" title={t(language, "osm")}>
                <MapIcon sx={{ color: "white" }} />
              </ToggleButton>
              <ToggleButton value="satellite" title={t(language, "satellite")}>
                <MapIcon sx={{ color: "white" }} />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              color="inherit"
              onClick={() => setLanguage((l) => (l === "es" ? "en" : "es"))}
            >
              {language.toUpperCase()}
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden" }}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          {!projectLoaded && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                bgcolor: "background.default",
              }}
            >
              <ProjectLoader onLoad={handleLoadProject} language={language} />
            </Box>
          )}
          {projectLoaded && sldStats && (
            <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
              <SmartLegend
                rules={sldStats.rules}
                unmatchedCount={sldStats.unmatchedCount}
                language={language}
                activeRuleIndices={activeRuleIndices}
                onToggleRule={(idx) => {
                  const next = activeRuleIndices.includes(idx)
                    ? activeRuleIndices.filter((i) => i !== idx)
                    : [...activeRuleIndices, idx];
                  setActiveRuleIndices(next);
                  updateStyle(next, showUnmatched);
                }}
                onZoomToRule={(idx) => {
                  const l = layerObjects.current.get("main-layer");
                  if (!l || !mapInstance) return;
                  const src = l.getSource();
                  const ext = createEmpty();
                  let match = false;
                  src?.getFeatures().forEach((f) => {
                    if (
                      evaluateFilter(
                        sldStats.rules[idx].filter,
                        f.getProperties(),
                      )
                    ) {
                      extend(ext, f.getGeometry()!.getExtent());
                      match = true;
                    }
                  });
                  if (match)
                    mapInstance.getView().fit(ext, {
                      padding: [100, 100, 100, 100],
                      duration: 1000,
                      maxZoom: 18,
                    });
                }}
                showUnmatched={showUnmatched}
                onToggleUnmatched={() => {
                  const v = !showUnmatched;
                  setShowUnmatched(v);
                  updateStyle(activeRuleIndices, v);
                }}
                highlightedRuleIndex={highlightedRuleIndex}
                hoveredRuleIndex={hoveredRuleIndex}
                onHoverRule={(idx) => dispatch(setHoveredRuleIndex(idx))}
                layerName={layerName}
                currentScale={currentScale}
              />
            </Box>
          )}
        </Box>

        <Drawer
          anchor="bottom"
          open={tableOpen}
          onClose={() => setTableOpen(false)}
          PaperProps={{ sx: { height: "60vh" } }}
        >
          <Box
            sx={{
              height: "100%",
              p: 2,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Typography variant="h6" gutterBottom>
              {t(language, "properties")} - {layerName}
            </Typography>
            <TableContainer
              component={Paper}
              sx={{
                flexGrow: 1,
                overflow: "auto",
                mb: 1,
                border: "1px solid #eee",
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        zIndex: 100,
                      }}
                    >
                      <b>{t(language, "actions")}</b>
                    </TableCell>
                    {features[0] &&
                      Object.keys(features[0].getProperties())
                        .filter(
                          (k) =>
                            k !== "geometry" &&
                            k !== "_unmatched" &&
                            k !== "_highlighted" &&
                            !k.endsWith("Property") &&
                            typeof features[0].getProperties()[k] !== "object",
                        )
                        .map((k) => (
                          <TableCell
                            key={k}
                            sx={{
                              bgcolor: "primary.main",
                              color: "white",
                              minWidth: 150,
                              zIndex: 100,
                            }}
                          >
                            <b>{k}</b>
                          </TableCell>
                        ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {features
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((f, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Tooltip title={t(language, "inspectFeature")}>
                            <IconButton
                              size="small"
                              onClick={() => handleInspectFeature(f)}
                              color="primary"
                            >
                              <LocationSearchingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        {Object.entries(f.getProperties())
                          .filter(
                            ([k, v]) =>
                              k !== "geometry" &&
                              k !== "_unmatched" &&
                              k !== "_highlighted" &&
                              !k.endsWith("Property") &&
                              typeof v !== "object",
                          )
                          .map(([k, v]) => (
                            <TableCell
                              key={k}
                              sx={{
                                maxWidth: 300,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              <Tooltip title={String(v)} placement="top">
                                <span>{String(v)}</span>
                              </Tooltip>
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box
              sx={{ borderTop: "1px solid #eee", bgcolor: "background.paper" }}
            >
              <TablePagination
                component="div"
                count={features.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPageOptions={[50]}
              />
            </Box>
          </Box>
        </Drawer>

        <Drawer
          anchor="left"
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
        >
          <Box
            sx={{
              width: { xs: "90vw", sm: 700, md: 800 },
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">{t(language, "sldEditor")}</Typography>
              <Box>
                <Tooltip title={t(language, "downloadSLD")}>
                  <IconButton onClick={handleDownloadSld}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                minHeight: 0,
                mb: 2,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <TextField
                multiline
                fullWidth
                variant="outlined"
                value={sldContent}
                onChange={(e) => setSldContent(e.target.value)}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "& .MuiInputBase-root": {
                    height: "100%",
                    alignItems: "flex-start",
                  },
                  "& .MuiInputBase-input": {
                    height: "100% !important",
                    overflow: "auto !important",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                  },
                }}
              />
            </Box>
            <Box sx={{ pt: 1, borderTop: "1px solid #eee" }}>
              <Button
                variant="contained"
                onClick={handleApplySld}
                fullWidth
                size="large"
              >
                {t(language, "applyStyle")}
              </Button>
            </Box>
          </Box>
        </Drawer>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App;
