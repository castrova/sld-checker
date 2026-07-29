import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { SldRuleStats } from "../../utils/sldUtils";
import { t, type Language } from "../../i18n";

import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ZoomInIcon from "@mui/icons-material/ZoomIn";

interface SmartLegendProps {
  rules: SldRuleStats[];
  unmatchedCount: number;
  language: Language;
  activeRuleIndices: number[];
  onToggleRule: (index: number) => void;
  onZoomToRule: (index: number) => void;
  showUnmatched: boolean;
  onToggleUnmatched: () => void;
  highlightedRuleIndex: number | null;
  hoveredRuleIndex: number | null;
  onHoverRule: (index: number | null) => void;
  layerName: string;
  currentScale: number | null;
}

const SmartLegend: React.FC<SmartLegendProps> = ({
  rules,
  unmatchedCount,
  language,
  activeRuleIndices,
  onToggleRule,
  onZoomToRule,
  showUnmatched,
  onToggleUnmatched,
  highlightedRuleIndex,
  hoveredRuleIndex,
  onHoverRule,
  layerName,
  currentScale,
}) => {
  const allMatched = unmatchedCount === 0;

  const groupedRules = React.useMemo(() => {
    const groups: Record<string, { rules: SldRuleStats[]; indices: number[]; min?: number; max?: number }> = {};
    rules.forEach((rule, index) => {
      let key = "General";
      let min = rule.scaleDenominator?.min;
      let max = rule.scaleDenominator?.max;
      if (min !== undefined && max !== undefined) key = `1:${min} - 1:${max}`;
      else if (min !== undefined) key = `> 1:${min}`;
      else if (max !== undefined) key = `< 1:${max}`;

      if (!groups[key]) groups[key] = { rules: [], indices: [], min, max };
      groups[key].rules.push(rule);
      groups[key].indices.push(index);
    });
    return groups;
  }, [rules]);

  const renderSymbolPreview = (symbolizers: any[]) => {
    if (!symbolizers || symbolizers.length === 0) return null;
    const sym = symbolizers[0];
    const style: React.CSSProperties = { width: 20, height: 20, display: "inline-block", border: "1px solid #ccc" };
    if (sym.kind === "Icon") {
      return <img src={sym.image} alt="icon" style={{ width: sym.size || 20, height: sym.size || 20, objectFit: "contain" }} />;
    } else if (sym.kind === "Mark") {
      style.borderRadius = "50%"; style.backgroundColor = sym.color || "#000";
    } else if (sym.kind === "Fill") {
      style.backgroundColor = sym.color || "#000";
      if (sym.outlineColor) style.border = `2px solid ${sym.outlineColor}`;
    } else if (sym.kind === "Line") {
      style.height = 4; style.backgroundColor = sym.color || "#000"; style.marginTop = 8;
    }
    return <div style={style} />;
  };

  const formatFilter = (filter: any): string => {
    if (!filter || !Array.isArray(filter)) return "";
    const operator = filter[0];
    const opMap: Record<string, string> = {
      "==": t(language, "op_eq"), "!=": t(language, "op_neq"),
      ">": t(language, "op_gt"), ">=": t(language, "op_gte"),
      "<": t(language, "op_lt"), "<=": t(language, "op_lte"),
      "&&": t(language, "op_and"), "||": t(language, "op_or"), "!": t(language, "op_not"),
      "*=": "contiene", "~=": "coincide con",
    };
    const opText = opMap[operator] || operator;
    if (["==", "!=", ">", ">=", "<", "<=", "*=", "~="].includes(operator)) {
      return `${filter[1]} ${opText} ${filter[2]}`;
    } else if (["&&", "||"].includes(operator)) {
      return filter.slice(1).map((f: any) => formatFilter(f)).join(` ${opText} `);
    } else if (operator === "!") return `${opText} (${formatFilter(filter[1])})`;
    return JSON.stringify(filter);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, maxHeight: "80vh", overflow: "auto", width: 450, bgcolor: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}>
      <Typography variant="h6" gutterBottom>{t(language, "legend")}</Typography>
      {layerName && <Typography variant="subtitle2" color="text.secondary" gutterBottom>{layerName}</Typography>}

      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        {allMatched ? <CheckCircleIcon color="success" sx={{ mr: 1 }} /> : <WarningIcon color="warning" sx={{ mr: 1 }} />}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2">{allMatched ? t(language, "allFeaturesStyled") : `${unmatchedCount} ${t(language, "unmatchedFeatures")}`}</Typography>
        </Box>
        {!allMatched && (
          <IconButton size="small" onClick={onToggleUnmatched}>
            {showUnmatched ? <VisibilityIcon color="error" /> : <VisibilityOffIcon color="disabled" />}
          </IconButton>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      <List dense>
        {Object.entries(groupedRules).map(([groupName, group]) => {
          let isActiveScale = groupName === "General";
          if (currentScale !== null && !isActiveScale) {
            const { min, max } = group;
            if (min !== undefined && max !== undefined) isActiveScale = currentScale >= min && currentScale <= max;
            else if (min !== undefined) isActiveScale = currentScale > min;
            else if (max !== undefined) isActiveScale = currentScale < max;
          }

          return (
            <React.Fragment key={groupName}>
              {groupName !== "General" && (
                <Typography variant="caption" sx={{ mt: 2, mb: 1, display: "block", fontWeight: "bold", color: isActiveScale ? "primary.main" : "text.secondary", bgcolor: isActiveScale ? "rgba(25, 118, 210, 0.1)" : "transparent", p: 0.5, borderRadius: 1 }}>
                  {t(language, "scale")}: {groupName} {isActiveScale && `(${t(language, "active")})`}
                </Typography>
              )}
              {group.rules.map((rule, i) => {
                const originalIndex = group.indices[i];
                const isActive = activeRuleIndices.length === 0 || activeRuleIndices.includes(originalIndex);
                const isSelected = activeRuleIndices.includes(originalIndex);
                const isSelectedByClick = highlightedRuleIndex === originalIndex;
                const isHovered = hoveredRuleIndex === originalIndex;

                return (
                  <ListItem
                    key={originalIndex}
                    onMouseEnter={() => onHoverRule(originalIndex)}
                    onMouseLeave={() => onHoverRule(null)}
                    sx={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start", opacity: isActive ? 1 : 0.5,
                      borderLeft: isHovered ? "4px solid #00FFFF" : isSelectedByClick ? "4px solid #1976d2" : "none",
                      bgcolor: isHovered ? "rgba(0, 255, 255, 0.1)" : isSelectedByClick ? "rgba(25, 118, 210, 0.08)" : "transparent",
                      pl: isHovered || isSelectedByClick ? 1 : 0, transition: "all 0.2s", cursor: "default",
                    }}
                    secondaryAction={
                      <Box>
                        <IconButton size="small" onClick={() => onZoomToRule(originalIndex)} title="Zoom to features">
                          <ZoomInIcon />
                        </IconButton>
                        <IconButton edge="end" size="small" onClick={() => onToggleRule(originalIndex)}>
                          {isActive ? <VisibilityIcon color={isSelected ? "primary" : "action"} /> : <VisibilityOffIcon color="disabled" />}
                        </IconButton>
                      </Box>
                    }
                  >
                    <Box sx={{ display: "flex", width: "100%", alignItems: "center", pr: 8 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>{renderSymbolPreview(rule.symbolizer)}</ListItemIcon>
                      <ListItemText
                        primary={rule.ruleName}
                        secondary={
                          <React.Fragment>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {rule.count} {t(language, "feature").toLowerCase()}(s)
                            </Typography>
                            {rule.filter && (
                              <Typography component="div" variant="caption" sx={{ fontStyle: "italic", fontSize: "0.75rem", mt: 0.5, color: "text.primary" }}>
                                {formatFilter(rule.filter)}
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                    </Box>
                  </ListItem>
                );
              })}
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
};

export default SmartLegend;
