import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import LegendIcon from "@mui/icons-material/Layers";
import type { SldRuleStats } from "../../utils/sldUtils";
import { t, type Language } from "../../i18n";
import styles from "./SmartLegend.module.css";

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
    const groups: Record<
      string,
      { rules: SldRuleStats[]; indices: number[]; min?: number; max?: number }
    > = {};
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
    const style: React.CSSProperties = {
      width: 20,
      height: 20,
      display: "inline-block",
      border: "1px solid #ccc",
    };
    if (sym.kind === "Icon") {
      return (
        <img
          src={sym.image}
          alt="icon"
          style={{
            width: sym.size || 20,
            height: sym.size || 20,
            objectFit: "contain",
          }}
        />
      );
    } else if (sym.kind === "Mark") {
      style.borderRadius = "50%";
      style.backgroundColor = sym.color || "#000";
    } else if (sym.kind === "Fill") {
      style.backgroundColor = sym.color || "#000";
      if (sym.outlineColor) style.border = `2px solid ${sym.outlineColor}`;
    } else if (sym.kind === "Line") {
      style.height = 4;
      style.backgroundColor = sym.color || "#000";
      style.marginTop = 8;
    }
    return <div style={style} />;
  };

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
      "*=": "contiene",
      "~=": "coincide con",
    };
    const opText = opMap[operator] || operator;
    if (["==", "!=", ">", ">=", "<", "<=", "*=", "~="].includes(operator)) {
      return `${filter[1]} ${opText} ${filter[2]}`;
    } else if (["&&", "||"].includes(operator)) {
      return filter
        .slice(1)
        .map((f: any) => formatFilter(f))
        .join(` ${opText} `);
    } else if (operator === "!")
      return `${opText} (${formatFilter(filter[1])})`;
    return JSON.stringify(filter);
  };

  return (
    <div className={styles.legend}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <LegendIcon fontSize="small" />
          {t(language, "legend")}
        </div>
        {layerName && <div className={styles.layerName}>{layerName}</div>}
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div
          className={`${styles.statusBadge} ${
            allMatched ? styles.statusBadgeMatched : styles.statusBadgeUnmatched
          }`}
        >
          {allMatched ? (
            <CheckCircleIcon sx={{ fontSize: "0.85rem" }} />
          ) : (
            <WarningIcon sx={{ fontSize: "0.85rem" }} />
          )}
          {allMatched
            ? t(language, "allFeaturesStyled")
            : `${unmatchedCount} ${t(language, "unmatchedFeatures")}`}
        </div>
        <div className={styles.statusText}>
          {currentScale !== null &&
            `1:${Math.round(currentScale).toLocaleString()}`}
        </div>
        {!allMatched && (
          <Tooltip title={t(language, "showUnmatched")}>
            <IconButton size="small" onClick={onToggleUnmatched}>
              {showUnmatched ? (
                <VisibilityIcon color="error" fontSize="small" />
              ) : (
                <VisibilityOffIcon color="disabled" fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {Object.entries(groupedRules).map(([groupName, group]) => {
          let isActiveScale = groupName === "General";
          if (currentScale !== null && !isActiveScale) {
            const { min, max } = group;
            if (min !== undefined && max !== undefined)
              isActiveScale = currentScale >= min && currentScale <= max;
            else if (min !== undefined) isActiveScale = currentScale > min;
            else if (max !== undefined) isActiveScale = currentScale < max;
          }

          return (
            <div key={groupName} className={styles.scaleGroup}>
              {groupName !== "General" && (
                <div
                  className={`${styles.scaleHeader} ${
                    isActiveScale ? styles.scaleHeaderActive : ""
                  }`}
                >
                  {t(language, "scale")}: {groupName}
                  {isActiveScale && (
                    <span className={styles.scaleBadge}>
                      {t(language, "active")}
                    </span>
                  )}
                </div>
              )}
              {group.rules.map((rule, i) => {
                const originalIndex = group.indices[i];
                const isActive =
                  activeRuleIndices.length === 0 ||
                  activeRuleIndices.includes(originalIndex);
                const isSelected = activeRuleIndices.includes(originalIndex);
                const isSelectedByClick =
                  highlightedRuleIndex === originalIndex;
                const isHovered = hoveredRuleIndex === originalIndex;

                const itemClass = `${styles.ruleItem} ${
                  !isActive ? styles.ruleItemInactive : ""
                } ${isHovered ? styles.ruleItemHovered : ""} ${
                  isSelectedByClick ? styles.ruleItemSelected : ""
                }`;

                return (
                  <div
                    key={originalIndex}
                    className={itemClass}
                    onMouseEnter={() => onHoverRule(originalIndex)}
                    onMouseLeave={() => onHoverRule(null)}
                  >
                    <div className={styles.ruleContent}>
                      <div className={styles.symbolPreview}>
                        {renderSymbolPreview(rule.symbolizer)}
                      </div>
                      <div className={styles.ruleInfo}>
                        <div className={styles.ruleName}>{rule.ruleName}</div>
                        <div className={styles.ruleCount}>
                          {rule.count} {t(language, "feature").toLowerCase()}(s)
                        </div>
                        {rule.filter && (
                          <div className={styles.ruleFilter}>
                            {formatFilter(rule.filter)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.ruleActions}>
                      <Tooltip title="Zoom">
                        <IconButton
                          className={styles.actionButton}
                          size="small"
                          onClick={() => onZoomToRule(originalIndex)}
                        >
                          <ZoomInIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isActive ? "Ocultar" : "Mostrar"}>
                        <IconButton
                          className={styles.actionButton}
                          size="small"
                          onClick={() => onToggleRule(originalIndex)}
                        >
                          {isActive ? (
                            <VisibilityIcon
                              color={isSelected ? "primary" : "action"}
                              fontSize="small"
                            />
                          ) : (
                            <VisibilityOffIcon
                              color="disabled"
                              fontSize="small"
                            />
                          )}
                        </IconButton>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartLegend;
