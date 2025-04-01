/**
 * TemplateManager handles predefined templates for common configuration patterns.
 * It provides templates for different section types and use cases.
 */
export class TemplateManager {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Initialize the predefined templates
   */
  initializeTemplates() {
    return {
      // Template for restaurants with PDT and mean delay split
      'restaurant-pdt-split': {
        name: 'Restaurant PDT with Mean Delay Split',
        description: 'Common pattern for restaurants with PDT ranges and mean delay thresholds',
        groups: [
          {
            type: 'ranges',
            title: 'Restaurant PDT 18-23 with Mean Delay Split',
            commonParams: {
              deliveryOption: 'STANDARD',
              deliveryMode: 'DELIVERY',
              marketplace: 'false',
              verticalType: 'restaurants'
            },
            rules: [
              {
                lowerBound: -10,
                upperBound: 5,
                pdtGreaterThan: 18,
                pdtLessThanOrEqualTo: 23,
                meanDelayLessThanOrEqualTo: 4,
                meanDelayGreaterThan: null
              },
              {
                lowerBound: -5,
                upperBound: 10,
                pdtGreaterThan: 18,
                pdtLessThanOrEqualTo: 23,
                meanDelayGreaterThan: 4,
                meanDelayLessThanOrEqualTo: 6
              },
              {
                lowerBound: -10,
                upperBound: 5,
                pdtGreaterThan: 18,
                pdtLessThanOrEqualTo: 23,
                meanDelayGreaterThan: 6,
                meanDelayLessThanOrEqualTo: 7
              }
            ]
          }
        ]
      },

      // Template for darkstores
      'darkstore-simple': {
        name: 'Darkstore Simple Rules',
        description: 'Basic configuration for darkstores with PDT ranges',
        groups: [
          {
            type: 'ranges',
            title: 'Darkstore PDT Ranges',
            commonParams: {
              deliveryOption: 'STANDARD',
              deliveryMode: 'DELIVERY',
              marketplace: 'false',
              verticalType: 'darkstores'
            },
            rules: [
              {
                lowerBound: -10,
                upperBound: 5,
                pdtLessThanOrEqualTo: 13,
                pdtGreaterThan: null,
                meanDelayGreaterThan: null,
                meanDelayLessThanOrEqualTo: null
              },
              {
                lowerBound: -5,
                upperBound: 10,
                pdtGreaterThan: 13,
                pdtLessThanOrEqualTo: 18,
                meanDelayGreaterThan: null,
                meanDelayLessThanOrEqualTo: null
              },
              {
                lowerBound: -10,
                upperBound: 5,
                pdtGreaterThan: 18,
                pdtLessThanOrEqualTo: 23,
                meanDelayLessThanOrEqualTo: 5,
                meanDelayGreaterThan: null
              },
              {
                lowerBound: -5,
                upperBound: 10,
                pdtGreaterThan: 18,
                pdtLessThanOrEqualTo: 23,
                meanDelayGreaterThan: 5,
                meanDelayLessThanOrEqualTo: null
              }
            ]
          }
        ]
      },

      // Template for other verticals
      'other-vertical': {
        name: 'Other Vertical Rules',
        description: 'Configuration for non-restaurant, non-darkstore verticals',
        groups: [
          {
            type: 'ranges',
            title: 'Other Vertical PDT Ranges',
            commonParams: {
              deliveryOption: 'STANDARD',
              deliveryMode: 'DELIVERY',
              marketplace: 'false',
              verticalType: ''
            },
            rules: [
              {
                lowerBound: -10,
                upperBound: 5,
                pdtLessThanOrEqualTo: 13,
                pdtGreaterThan: null,
                meanDelayGreaterThan: null,
                meanDelayLessThanOrEqualTo: null
              },
              {
                lowerBound: -5,
                upperBound: 10,
                pdtGreaterThan: 13,
                pdtLessThanOrEqualTo: 18,
                meanDelayGreaterThan: null,
                meanDelayLessThanOrEqualTo: null
              },
              {
                lowerBound: -10,
                upperBound: 5,
                pdtGreaterThan: 18,
                pdtLessThanOrEqualTo: 23,
                meanDelayGreaterThan: null,
                meanDelayLessThanOrEqualTo: null
              }
            ]
          }
        ]
      },

      // Display format templates
      'display-format-common': {
        name: 'Common Display Format',
        description: 'Standard display format configuration',
        groups: [
          // First group with Minute Value format for Pickup
          {
            type: 'display-format',
            title: 'Minute Value Display Format',
            commonParams: {
              deliveryMode: 'PICKUP',
              marketplace: 'false'
            },
            rules: [
              {
                format: 'DISPLAY_FORMAT_MINUTE_VALUE',
                conditions: {}
              }
            ]
          },
          // Second group with Minute Range format for Delivery
          {
            type: 'display-format',
            title: 'Minute Range Display Format',
            commonParams: {
              deliveryMode: 'DELIVERY',
              marketplace: 'false'
            },
            rules: [
              {
                format: 'DISPLAY_FORMAT_MINUTE_RANGE',
                conditions: {}
              }
            ]
          }
        ]
      },

      // Capping templates
      'standard-capping': {
        name: 'Standard Capping Configuration',
        description: 'Basic delivery time capping configuration',
        groups: [
          {
            type: 'capping',
            title: 'Standard Delivery Capping',
            commonParams: {
              deliveryOption: 'STANDARD',
              deliveryMode: 'DELIVERY'
            },
            rules: [
              {
                type: 'single',
                min: 5,
                max: 180
              }
            ]
          }
        ]
      },
      'ranges-capping': {
        name: 'Ranges Capping Configuration',
        description: 'Capping with min/max bounds for delivery time',
        groups: [
          {
            type: 'capping',
            title: 'Delivery Time Bounds',
            commonParams: {
              deliveryOption: 'STANDARD',
              deliveryMode: 'DELIVERY'
            },
            rules: [
              {
                type: 'ranges',
                minLowerBound: 10,
                minUpperBound: 20,
                maxLowerBound: 160,
                maxUpperBound: 180
              }
            ]
          }
        ]
      },
      'complete-capping': {
        name: 'Complete Capping Configuration',
        description: 'Both single and ranges capping for delivery and pickup',
        groups: [
          {
            type: 'capping',
            title: 'Complete Delivery Capping',
            commonParams: {
              deliveryOption: 'STANDARD',
              deliveryMode: 'DELIVERY'
            },
            rules: [
              {
                type: 'single',
                min: 5,
                max: 180
              },
              {
                type: 'ranges',
                minLowerBound: 10,
                minUpperBound: 20,
                maxLowerBound: 160,
                maxUpperBound: 180
              }
            ]
          }
        ]
      },

      // Rounding templates
      'nearest-5-rounding': {
        name: 'Nearest 5 Rounding',
        description: 'Round to the nearest 5 minutes',
        groups: [
          {
            type: 'rounding',
            title: 'Nearest 5 Minutes',
            commonParams: {
              strategy: 'NEAREST_5'
            },
            rules: []
          }
        ]
      }
    };
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId) {
    return this.templates[templateId];
  }

  /**
   * Get all available templates
   */
  getAllTemplates() {
    return Object.entries(this.templates).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description
    }));
  }

  /**
   * Get templates for a specific section type
   */
  getTemplatesForSection(sectionType) {
    return Object.entries(this.templates)
      .filter(([_, template]) => {
        // Check if any group in the template matches the section type
        return template.groups.some(group => group.type === sectionType);
      })
      .map(([id, template]) => ({
        id,
        name: template.name,
        description: template.description
      }));
  }

  /**
   * Create a custom template from existing groups
   */
  createTemplateFromGroups(name, description, groupIds, configManager) {
    const groups = groupIds.map(id => configManager.getGroup(id))
      .filter(group => group); // Filter out any undefined groups

    if (groups.length === 0) {
      return null;
    }

    const templateId = this.generateTemplateId(name);

    this.templates[templateId] = {
      name,
      description,
      groups: JSON.parse(JSON.stringify(groups)) // Deep clone
    };

    return templateId;
  }

  /**
   * Generate a unique template ID from a name
   */
  generateTemplateId(name) {
    // Convert name to kebab case
    const baseId = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if ID already exists
    let id = baseId;
    let counter = 1;

    while (this.templates[id]) {
      id = `${baseId}-${counter++}`;
    }

    return id;
  }

  /**
   * Save templates to localStorage
   */
  saveTemplates() {
    try {
      localStorage.setItem('pdtTemplates', JSON.stringify(this.templates));
    } catch (e) {
      console.error('Failed to save templates:', e);
    }
  }

  /**
   * Load templates from localStorage
   */
  loadTemplates() {
    const savedTemplates = localStorage.getItem('pdtTemplates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        // Merge with default templates, preserving custom ones
        this.templates = {
          ...this.initializeTemplates(),
          ...parsed
        };
        return true;
      } catch (e) {
        console.error('Failed to parse saved templates:', e);
        return false;
      }
    }
    return false;
  }

  /**
   * Delete a custom template
   */
  deleteTemplate(templateId) {
    if (this.templates[templateId]) {
      delete this.templates[templateId];
      this.saveTemplates();
      return true;
    }
    return false;
  }
}
