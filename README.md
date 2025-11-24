# SLD Checker & Map Viewer

Una aplicación web moderna para visualizar datos geoespaciales y validar estilos SLD (Styled Layer Descriptor). Esta herramienta permite a los usuarios cargar archivos de capas (KML, GML, GeoJSON) junto con archivos SLD para verificar cómo se aplican las reglas de estilo a sus datos en tiempo real.

## 🚀 Características Principales

- **Visualización de Mapas**: Renderizado de mapas interactivos utilizando [OpenLayers](https://openlayers.org/).
- **Soporte de Formatos**:
  - **Datos**: KML, GML, GeoJSON.
  - **Estilos**: SLD (Styled Layer Descriptor) 1.0 / 1.1.
- **Leyenda Inteligente (Smart Legend)**:
  - Visualiza las reglas definidas en el SLD.
  - Muestra el conteo de elementos (features) que cumplen con cada regla.
  - Permite **filtrar** elementos activando/desactivando reglas específicas.
- **Detección de "Unmatched"**: Identifica y visualiza elementos que no cumplen con ninguna regla del SLD.
- **Interfaz Moderna**: Construida con React y Material UI (MUI).
- **Internacionalización**: Soporte para Español e Inglés.

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
- **Mapas**: [OpenLayers](https://openlayers.org/)
- **Parsing de Estilos**: [GeoStyler](https://geostyler.org/) (geostyler-sld-parser, geostyler-openlayers-parser)
- **UI/UX**: [Material UI (MUI)](https://mui.com/)
- **Estado**: Redux Toolkit

## 📦 Instalación y Uso

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

1.  **Clonar el repositorio**:

    ```bash
    git clone https://github.com/castrova/sld-checker.git
    cd sld-checker
    ```

2.  **Instalar dependencias**:
    Asegúrate de tener [Node.js](https://nodejs.org/) instalado.

    ```bash
    npm install
    ```

3.  **Iniciar el servidor de desarrollo**:

    ```bash
    npm run dev
    ```

4.  **Abrir en el navegador**:
    La aplicación estará disponible generalmente en `http://localhost:5173`.

## 📖 Cómo Usar

1.  Al abrir la aplicación, verás una pantalla de carga de proyecto.
2.  Sube un archivo de **Capa** (ej. `mapa.geojson`) y un archivo **SLD** (ej. `estilo.sld`).
3.  La aplicación procesará los archivos y mostrará el mapa con los estilos aplicados.
4.  Utiliza la **Leyenda** flotante a la derecha para:
    - Ver qué reglas se están aplicando.
    - Hacer clic en una regla para filtrar y ver solo los elementos que cumplen esa condición.
    - Activar "Mostrar no coincidentes" para ver elementos que quedaron fuera de las reglas de estilo.

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, abre un issue o envía un Pull Request para mejoras o correcciones.

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
