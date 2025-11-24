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

interface SmartLegendProps {
  rules: SldRuleStats[];
  unmatchedCount: number;
  language: Language;
  activeRuleIndices: number[];
  onToggleRule: (index: number) => void;
  showUnmatched: boolean;
  onToggleUnmatched: () => void;
  highlightedRuleIndex: number | null;
}

const SmartLegend: React.FC<SmartLegendProps> = ({
  rules,
  unmatchedCount,
  language,
  activeRuleIndices,
  onToggleRule,
  showUnmatched,
  onToggleUnmatched,
  highlightedRuleIndex,
}) => {
  const allMatched = unmatchedCount === 0;

  // Helper to render a simple preview of the symbolizer
  const renderSymbolPreview = (symbolizers: any[]) => {
    if (!symbolizers || symbolizers.length === 0) return null;
    const sym = symbolizers[0];

    // Very basic preview rendering
    const style: React.CSSProperties = {
      width: 20,
      height: 20,
      display: "inline-block",
      border: "1px solid #ccc",
    };

    if (sym.kind === "Mark" || sym.kind === "Icon") {
      style.borderRadius = "50%";
      style.backgroundColor = sym.color || "#000";
    } else if (sym.kind === "Fill") {
      style.backgroundColor = sym.color || "#000";
      if (sym.outlineColor) {
        style.border = `2px solid ${sym.outlineColor}`;
      }
    } else if (sym.kind === "Line") {
      style.height = 4;
      style.backgroundColor = sym.color || "#000";
      style.marginTop = 8;
    }

    return <div style={style} />;
  };

  // Helper to format filter to natural language
  const formatFilter = (filter: any): string => {
    if (!filter || !Array.isArray(filter)) return "";

    const operator = filter[0];
    const opMap: Record<string, string> = {
      "==": t(language, "op_eq"),
      "!=": t(language, "op_neq"),
      ">": t(language, "op_gt"),
      ">=": t(language, "op_gte"),
      "<": t(language, "op_lt"),
      "<=": t(language, "op_lte"),
      "&&": t(language, "op_and"),
      "||": t(language, "op_or"),
      "!": t(language, "op_not"),
    };

    const opText = opMap[operator] || operator;

    if (["==", "!=", ">", ">=", "<", "<="].includes(operator)) {
      const field = filter[1];
      const value = filter[2];
      return `${field} ${opText} ${value}`;
    } else if (["&&", "||"].includes(operator)) {
      // Join children with the logical operator
      const children = filter.slice(1).map((f: any) => formatFilter(f));
      return children.join(` ${opText} `);
    } else if (operator === "!") {
      return `${opText} (${formatFilter(filter[1])})`;
    }

    // Fallback for unknown or complex filters
    return JSON.stringify(filter);
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: 2, maxHeight: "80vh", overflow: "auto", width: 500 }}
    >
      <Typography variant="h6" gutterBottom>
        {t(language, "legend") || "Legend"}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        {allMatched ? (
          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
        ) : (
          <WarningIcon color="warning" sx={{ mr: 1 }} />
        )}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2">
            {allMatched
              ? t(language, "allFeaturesStyled") ||
                "All features covered by SLD"
              : `${unmatchedCount} ${
                  t(language, "unmatchedFeatures") ||
                  "features not matched by any rule"
                }`}
          </Typography>
        </Box>
        {!allMatched && (
          <IconButton
            size="small"
            onClick={onToggleUnmatched}
            title={t(language, "showUnmatched")}
          >
            {showUnmatched ? (
              <VisibilityIcon color="error" />
            ) : (
              <VisibilityOffIcon color="disabled" />
            )}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <List dense>
        {rules.map((rule, index) => {
          const isActive =
            activeRuleIndices.length === 0 || activeRuleIndices.includes(index);
          const isSelected = activeRuleIndices.includes(index);
          const isHighlighted = highlightedRuleIndex === index;

          return (
            <ListItem
              key={index}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                opacity: isActive ? 1 : 0.5,
                borderLeft: isHighlighted ? "4px solid #1976d2" : "none",
                bgcolor: isHighlighted
                  ? "rgba(25, 118, 210, 0.08)"
                  : "transparent",
                pl: isHighlighted ? 1 : 0,
                transition: "all 0.2s ease-in-out",
              }}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="toggle visibility"
                  onClick={() => onToggleRule(index)}
                  size="small"
                >
                  {isActive ? (
                    <VisibilityIcon color={isSelected ? "primary" : "action"} />
                  ) : (
                    <VisibilityOffIcon color="disabled" />
                  )}
                </IconButton>
              }
            >
              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  pr: 4,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {renderSymbolPreview(rule.symbolizer)}
                </ListItemIcon>
                <ListItemText
                  primary={rule.ruleName}
                  secondary={
                    <React.Fragment>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {rule.count} features
                      </Typography>
                      {/* Display filter info if available */}
                      {rule.filter && (
                        <Typography
                          component="div"
                          variant="caption"
                          sx={{
                            fontStyle: "italic",
                            fontSize: "0.75rem",
                            mt: 0.5,
                            color: "text.primary",
                          }}
                        >
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
      </List>
    </Paper>
  );
};

export default SmartLegend;
