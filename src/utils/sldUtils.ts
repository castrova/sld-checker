import SLDParser from "geostyler-sld-parser";
import OpenLayersParser from "geostyler-openlayers-parser";
import type { Style as GeoStylerStyle, Rule } from "geostyler-style";
import type { StyleLike } from "ol/style/Style";

const sldParser = new SLDParser();
const olParser = new OpenLayersParser();

export interface SldRuleStats {
  ruleName: string;
  count: number;
  filter: any; // Geostyler filter
  symbolizer: any; // Representative symbolizer for legend
  scaleDenominator?: { min?: number; max?: number };
}

/**
 * Helper to extract property names from a Geostyler filter.
 */
const extractFilterFields = (filter: any): string[] => {
  if (!filter || !Array.isArray(filter)) return [];
  const fields: Set<string> = new Set();
  const operator = filter[0];
  if (["&&", "||", "!"].includes(operator)) {
    for (let i = 1; i < filter.length; i++) {
      extractFilterFields(filter[i]).forEach((f) => fields.add(f));
    }
  } else if (typeof filter[1] === "string") {
    fields.add(filter[1]);
  }
  return Array.from(fields);
};

export interface SldAnalysisResult {
  olStyle: StyleLike;
  rules: SldRuleStats[];
  unmatchedCount: number;
  totalFeatures: number;
  geostylerStyle: GeoStylerStyle;
  stylingFields: string[];
}

/**
 * Helper to evaluate a Geostyler filter against feature properties.
 */
export const evaluateFilter = (filter: any, properties: any): boolean => {
  if (!filter) return true;
  if (!Array.isArray(filter)) return true;

  const operator = filter[0];
  switch (operator) {
    case "&&": return filter.slice(1).every((f: any) => evaluateFilter(f, properties));
    case "||": return filter.slice(1).some((f: any) => evaluateFilter(f, properties));
    case "!": return !evaluateFilter(filter[1], properties);
    case "==": return properties[filter[1]] === filter[2];
    case "!=": return properties[filter[1]] !== filter[2];
    case ">": return properties[filter[1]] > filter[2];
    case ">=": return properties[filter[1]] >= filter[2];
    case "<": return properties[filter[1]] < filter[2];
    case "<=": return properties[filter[1]] <= filter[2];
    case "*=":
      if (typeof properties[filter[1]] === "string" && typeof filter[2] === "string") {
        return properties[filter[1]].toLowerCase().includes(filter[2].toLowerCase());
      }
      return false;
    case "~=":
      if (typeof properties[filter[1]] === "string" && typeof filter[2] === "string") {
        try { return new RegExp(filter[2]).test(properties[filter[1]]); } catch { return false; }
      }
      return false;
    default: return false;
  }
};

/**
 * Helper to proxy external image URLs to avoid CORS issues.
 */
function proxyExternalImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Helper to modify IconSymbolizers to use proxied URLs.
 */
function addProxyToIconSymbolizers(geostylerStyle: GeoStylerStyle): GeoStylerStyle {
  return {
    ...geostylerStyle,
    rules: geostylerStyle.rules.map((rule) => ({
      ...rule,
      symbolizers: rule.symbolizers?.map((symbolizer: any) => {
        if (symbolizer.kind === "Icon" && symbolizer.image) {
          return { ...symbolizer, image: proxyExternalImageUrl(symbolizer.image) };
        }
        return symbolizer;
      }),
    })),
  };
}

/**
 * Generates an OpenLayers style from a Geostyler style.
 */
export const generateOlStyle = async (
  geostylerStyle: GeoStylerStyle,
  showUnmatched: boolean = false
): Promise<StyleLike | null> => {
  let styleToConvert = geostylerStyle;

  const rules = [...geostylerStyle.rules];

  // Add highlight rule (high priority)
  rules.unshift({
    name: "Highlighted",
    filter: ["==", "_highlighted", true],
    symbolizers: [
      {
        kind: "Line",
        color: "#00FFFF",
        width: 4,
      },
      {
        kind: "Mark",
        wellKnownName: "circle",
        color: "#00FFFF",
        radius: 8,
        strokeColor: "#FFFFFF",
        strokeWidth: 2
      }
    ]
  } as any);

  if (showUnmatched) {
    rules.push({
      name: "Unmatched",
      filter: ["==", "_unmatched", true],
      symbolizers: [
        { kind: "Mark", wellKnownName: "circle", color: "#FF0000", radius: 5 },
        { kind: "Line", color: "#FF0000", width: 2 },
        { kind: "Fill", color: "#FF0000", outlineColor: "#FF0000" },
      ],
    } as any);
  }

  styleToConvert = { ...geostylerStyle, rules };
  styleToConvert = addProxyToIconSymbolizers(styleToConvert);

  const { output: olStyle } = await olParser.writeStyle(styleToConvert);
  return olStyle as StyleLike;
};

/**
 * Parses an SLD string and analyzes its rules against a set of features.
 */
export const parseSldAndAnalyze = async (
  sldContent: string,
  features: any[]
): Promise<SldAnalysisResult> => {
  const { output: geostylerStyle, errors } = await sldParser.readStyle(sldContent);
  if (errors || !geostylerStyle) {
    throw new Error("Failed to parse SLD: " + (errors ? errors.join(", ") : "Unknown error"));
  }

  const olStyle = await generateOlStyle(geostylerStyle);
  if (!olStyle) throw new Error("Failed to convert style to OpenLayers format");

  const stylingFieldsSet = new Set<string>();
  const rules: SldRuleStats[] = geostylerStyle.rules.map((rule: Rule) => {
    extractFilterFields(rule.filter).forEach((f) => stylingFieldsSet.add(f));
    return {
      ruleName: rule.name || "Untitled Rule",
      count: 0,
      filter: rule.filter,
      symbolizer: rule.symbolizers,
      scaleDenominator: rule.scaleDenominator as any,
    };
  });

  let unmatchedCount = 0;
  features.forEach((feature) => {
    const properties = feature.getProperties();
    let matched = false;
    for (let i = 0; i < rules.length; i++) {
      if (evaluateFilter(rules[i].filter, properties)) {
        rules[i].count++;
        matched = true;
      }
    }
    if (!matched) {
      unmatchedCount++;
      feature.set("_unmatched", true);
    } else {
      feature.unset("_unmatched");
    }
  });

  return {
    olStyle,
    rules,
    unmatchedCount,
    totalFeatures: features.length,
    geostylerStyle,
    stylingFields: Array.from(stylingFieldsSet),
  };
};
