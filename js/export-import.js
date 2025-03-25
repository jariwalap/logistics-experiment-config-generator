/**
 * ExportImportManager handles the import and export of configurations.
 */
export class ExportImportManager {
  constructor(app) {
    this.app = app;

    // File input for importing (hidden)
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.yml,.yaml,.json';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    // Setup event listener for file input
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileImport(e.target.files[0]);
      }
    });
  }

  /**
   * Show import dialog
   */
  showImportDialog() {
    // Reset file input
    this.fileInput.value = '';

    // Trigger file selection
    this.fileInput.click();
  }

  /**
   * Handle file import
   */
  handleFileImport(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target.result;

      try {
        let importedConfig;

        // Determine file type
        if (file.name.endsWith('.json')) {
          // Parse JSON
          importedConfig = JSON.parse(fileContent);
        } else if (file.name.endsWith('.yml') || file.name.endsWith('.yaml')) {
          // Parse YAML
          if (!window.jsyaml) {
            alert('YAML support is not available. js-yaml library is required.');
            return;
          }

          importedConfig = window.jsyaml.load(fileContent);
        } else {
          alert('Unsupported file type. Please use .yml, .yaml, or .json');
          return;
        }

        // Validate imported config structure
        if (!this.validateImportedConfig(importedConfig)) {
          alert('Invalid configuration format. Please check the file.');
          return;
        }

        // Confirm import
        if (confirm('Are you sure you want to import this configuration? This will replace your current configuration.')) {
          // Import config
          this.importConfig(importedConfig);
        }
      } catch (error) {
        console.error('Error importing file:', error);
        alert(`Error importing file: ${error.message}`);
      }
    };

    reader.readAsText(file);
  }

  /**
   * Validate imported config structure
   */
  validateImportedConfig(config) {
    // Basic validation
    if (!config) return false;

    // Check required fields
    if (!config.configFormatVersion && !config.config_format_version) return false;
    if (!config.variant) return false;
    if (!config.pdt || !Array.isArray(config.pdt)) return false;

    // Check if any PDT section is valid
    let hasValidSection = false;

    for (const section of config.pdt) {
      if (section.display_format || section.ranges || section.capping || section.rounding) {
        hasValidSection = true;
        break;
      }
    }

    return hasValidSection;
  }

  /**
   * Import configuration
   */
  importConfig(config) {
    // Convert snake_case to camelCase if needed
    if (config.config_format_version) {
      config.configFormatVersion = config.config_format_version;
      delete config.config_format_version;
    }

    if (config.country_code) {
      config.countryCode = config.country_code;
      delete config.country_code;
    }

    // Update app's config
    this.app.configManager.config = config;

    // Rebuild groups mapping
    this.app.configManager.rebuildGroupsMapping();

    // Save to localStorage
    this.app.configManager.saveConfig();

    // Re-render UI
    this.app.renderUI();

    // Update YAML preview
    this.app.updateYamlPreview();

    alert('Configuration imported successfully!');
  }

  /**
   * Export configuration as YAML
   */
  exportYaml() {
    // Generate YAML
    const yaml = this.app.yamlHandler.generateYaml(this.app.configManager.getConfig());

    // Create a downloadable file
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `pdt-config-${this.app.configManager.config.variant || 'export'}.yml`;

    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Export configuration as JSON
   */
  exportJson() {
    // Generate JSON
    const json = JSON.stringify(this.app.configManager.getConfig(), null, 2);

    // Create a downloadable file
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `pdt-config-${this.app.configManager.config.variant || 'export'}.json`;

    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
