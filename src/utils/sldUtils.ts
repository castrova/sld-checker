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
}

// Helper to extract property names from a Geostyler filter
const extractFilterFields = (filter: any): string[] => {
  if (!filter || !Array.isArray(filter)) return [];

  const operator = filter[0];
  const fields: Set<string> = new Set();

  // Recursive extraction based on operator type
  // This covers standard Geostyler comparison operators where the second argument is property name
  // e.g. ['==', 'propName', 'value']
  if (
    ["==", "!=", ">", ">=", "<", "<=", "*="].includes(operator) &&
    typeof filter[1] === "string"
  ) {
    fields.add(filter[1]);
  } else if (["&&", "||", "!"].includes(operator)) {
    // Logical operators, recurse into children
    for (let i = 1; i < filter.length; i++) {
      const childFields = extractFilterFields(filter[i]);
      childFields.forEach((f) => fields.add(f));
    }
  }
  // TODO: Handle other complex cases like functions if needed

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

// Helper to evaluate a Geostyler filter against feature properties
export const evaluateFilter = (filter: any, properties: any): boolean => {
  if (!filter) return true; // No filter means match all
  if (!Array.isArray(filter)) return true; // Unknown format, assume match

  const operator = filter[0];

  switch (operator) {
    case "&&":
      return filter.slice(1).every((f: any) => evaluateFilter(f, properties));
    case "||":
      return filter.slice(1).some((f: any) => evaluateFilter(f, properties));
    case "!":
      return !evaluateFilter(filter[1], properties);
    case "==":
      return properties[filter[1]] == filter[2];
    case "!=":
      return properties[filter[1]] != filter[2];
    case ">":
      return properties[filter[1]] > filter[2];
    case ">=":
      return properties[filter[1]] >= filter[2];
    case "<":
      return properties[filter[1]] < filter[2];
    case "<=":
      return properties[filter[1]] <= filter[2];
    // Add more operators as needed (e.g. string functions, math)
    // Geostyler also supports 'PropertyIsEqualTo' etc. in some versions, but usually normalized to array
    default:
      // console.warn("Unknown filter operator:", operator);
      return false;
  }
};

export const generateOlStyle = async (
  geostylerStyle: GeoStylerStyle,
  showUnmatched: boolean = false
): Promise<StyleLike | null> => {
  let styleToConvert = geostylerStyle;

  if (showUnmatched) {
    // Clone to avoid mutating original
    styleToConvert = {
      ...geostylerStyle,
      rules: [
        ...geostylerStyle.rules,
        {
          name: "Unmatched",
          filter: ["==", "_unmatched", true],
          symbolizers: [
            {
              kind: "Mark",
              wellKnownName: "circle",
              color: "#FF0000",
              radius: 5,
            },
            {
              kind: "Line",
              color: "#FF0000",
              width: 2,
            },
            {
              kind: "Fill",
              color: "#FF0000",
              outlineColor: "#FF0000",
            },
          ],
        } as any,
      ],
    };
  }

  const { output: olStyle } = await olParser.writeStyle(styleToConvert);
  return olStyle as StyleLike;
};

export const parseSldAndAnalyze = async (
  sldContent: string,
  features: any[] // Array of OL features
): Promise<SldAnalysisResult> => {
  // 1. Parse SLD to Geostyler Style
  const { output: geostylerStyle, errors } = await sldParser.readStyle(
    sldContent
  );

  if (errors || !geostylerStyle) {
    throw new Error(
      "Failed to parse SLD: " + (errors ? errors.join(", ") : "Unknown error")
    );
  }

  // 2. Convert to OpenLayers Style
  const olStyle = await generateOlStyle(geostylerStyle);

  if (!olStyle) {
    throw new Error("Failed to convert style to OpenLayers format");
  }

  // 3. Analyze Rules against Features
  const stylingFieldsSet = new Set<string>();

  const rules = geostylerStyle.rules.map((rule: Rule) => {
    // Extract fields from this rule's filter
    const fields = extractFilterFields(rule.filter);
    fields.forEach((f) => stylingFieldsSet.add(f));

    return {
      ruleName: rule.name || "Untitled Rule",
      count: 0,
      filter: rule.filter,
      symbolizer: rule.symbolizers,
    };
  });

  let unmatchedCount = 0;

  features.forEach((feature) => {
    const properties = feature.getProperties();
    let matched = false;

    rules.forEach((rule) => {
      if (evaluateFilter(rule.filter, properties)) {
        rule.count++;
        matched = true;
      }
    });

    if (!matched) {
      unmatchedCount++;
      feature.set("_unmatched", true);
    } else {
      feature.unset("_unmatched");
    }
  });

  return {
    olStyle: olStyle as StyleLike,
    rules,
    unmatchedCount,
    totalFeatures: features.length,
    geostylerStyle,
    stylingFields: Array.from(stylingFieldsSet),
  };
};
