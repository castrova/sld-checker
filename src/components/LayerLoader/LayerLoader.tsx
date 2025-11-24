import React, { useRef } from "react";
import Button from "@mui/material/Button";
import styles from "./LayerLoader.module.css";
import { t } from "../../i18n";

interface LayerLoaderProps {
  onUpload: (file: File) => void;
  language: import("../../i18n").Language;
}

const LayerLoader: React.FC<LayerLoaderProps> = ({ onUpload, language }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        onUpload(file);
      });
      e.target.value = "";
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={styles.container}>
      <input
        id="geojson-upload"
        type="file"
        accept="application/json,.geojson,.kml,.gml,.xml"
        multiple
        className={styles.fileInput}
        onChange={handleFileChange}
        ref={fileInputRef}
        aria-label={t(language, "uploadFiles")}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={handleButtonClick}
        className={styles.button}
      >
        {t(language, "uploadFiles")}
      </Button>
    </div>
  );
};

export default LayerLoader;
