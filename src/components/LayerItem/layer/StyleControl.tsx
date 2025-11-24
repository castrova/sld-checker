import React, { useState } from "react";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import type { SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { SketchPicker } from "react-color";
import type { ColorResult } from "react-color";
import { t } from "../../../i18n";

interface StyleControlProps {
  onStyleChange: (style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderType: string;
  }) => void;
  style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderType: string;
  };
  language: import("../../../i18n").Language;
}

const borderTypes = [
  { value: "solid", labelKey: "solid" },
  { value: "dashed", labelKey: "dashed" },
  { value: "dotted", labelKey: "dotted" },
];

const ColorSwatch: React.FC<{
  color: string;
  label: string;
  onChange: (color: ColorResult) => void;
}> = ({ color, label, onChange }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Box>
      <Typography variant="caption" display="block" gutterBottom>
        {label}
      </Typography>
      <Box
        onClick={handleClick}
        sx={{
          width: "100%",
          height: 36,
          backgroundColor: color,
          borderRadius: 1,
          border: "1px solid #ccc",
          cursor: "pointer",
          "&:hover": {
            borderColor: "#999",
          },
          position: "relative",
          backgroundImage:
            "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <SketchPicker color={color} onChange={onChange} />
      </Popover>
    </Box>
  );
};

const StyleControl: React.FC<StyleControlProps> = ({
  onStyleChange,
  style,
  language,
}) => {
  const handleFillColorChange = (color: ColorResult) => {
    const { r, g, b, a } = color.rgb;
    const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
    onStyleChange({ ...style, fillColor: rgba });
  };
  const handleStrokeColorChange = (color: ColorResult) => {
    const { r, g, b, a } = color.rgb;
    const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
    onStyleChange({ ...style, strokeColor: rgba });
  };
  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleChange({ ...style, strokeWidth: Number(e.target.value) });
  };
  const handleBorderTypeChange = (e: SelectChangeEvent) => {
    onStyleChange({ ...style, borderType: e.target.value });
  };

  return (
    <Box sx={{ p: 2, bgcolor: "#fafafa", borderRadius: 1 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
        }}
      >
        <ColorSwatch
          color={style.fillColor}
          label={t(language, "fillColor")}
          onChange={handleFillColorChange}
        />
        <ColorSwatch
          color={style.strokeColor}
          label={t(language, "strokeColor")}
          onChange={handleStrokeColorChange}
        />
        <TextField
          label={t(language, "strokeWidth")}
          type="number"
          value={style.strokeWidth}
          onChange={handleStrokeWidthChange}
          fullWidth
          size="small"
          InputProps={{ inputProps: { min: 0 } }}
        />
        <FormControl fullWidth size="small">
          <InputLabel>{t(language, "borderType")}</InputLabel>
          <Select
            value={style.borderType}
            label={t(language, "borderType")}
            onChange={handleBorderTypeChange}
          >
            {borderTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {t(language, type.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default StyleControl;
