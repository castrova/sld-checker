import React from "react";
import Slider from "@mui/material/Slider";

interface TransparencyControlProps {
  opacity: number;
  onChange: (value: number) => void;
}

const TransparencyControl: React.FC<TransparencyControlProps> = ({
  opacity,
  onChange,
}) => (
  <Slider
    value={opacity}
    min={0}
    max={1}
    step={0.01}
    onChange={(_, value) => onChange(value as number)}
    sx={{ width: 200, mb: 2 }}
  />
);

export default TransparencyControl;
