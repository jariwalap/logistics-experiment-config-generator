// Import necessary modules
import { ConfigManager } from './config-manager.js';
import { YamlHandler } from './yaml-handler.js';
import { GridManager } from './grid-manager.js';
import { TemplateManager } from './template-manager.js';
import { ValidationManager } from './validation-manager.js';
import { ExportImportManager } from './export-import.js';

// Main App class
class PDTConfigBuilder {
  constructor() {
    this.configManager = new ConfigManager();
    this.yamlHandler = new YamlHandler();
    this.gridManager = new GridManager(this.configManager);
    this.templateManager = new TemplateManager();
    this.validationManager = new ValidationManager(this.configManager);
    this.exportImportManager = new ExportImportManager(this);

    this.currentSection = 'display-format';
    this.activeGroupId = null;

    this.initializeApp();
  }

  validateConfiguration() {
    const validationResult = this.validationManager.validateConfiguration();
    this.showValidationIssues(validationResult);
    return validationResult.valid;
  }

  showValidationIssues(validationResult) {
    // Clear previous validation markers
    document.querySelectorAll('.validation-error').forEach(el => {
      el.classList.remove('validation-error');
      el.removeAttribute('data-validation-message');
    });

    // Show duplicate group issues
    validationResult.issues.duplicateGroups.forEach(issue => {
      this.markGroupWithError(issue.group1, issue.message);
      this.markGroupWithError(issue.group2, issue.message);
    });

    // Show overlapping rules issues
    validationResult.issues.overlappingRules.forEach(issue => {
      this.markRulesWithError(issue.groupId, issue.rule1Index, issue.rule2Index, issue.message);
    });

    // Show required fields issues - NEW
    validationResult.issues.requiredFields.forEach(issue => {
      this.markGroupWithError(issue.groupId, issue.message);
    });


    // Update validation panel
    const issueCount = document.getElementById('issueCount');
    const validationContent = document.getElementById('validationContent');

    const totalIssues =
      validationResult.issues.duplicateGroups.length +
      validationResult.issues.overlappingRules.length;

    issueCount.textContent = totalIssues;

    // Clear previous content
    validationContent.innerHTML = '';

    if (totalIssues === 0) {
      validationContent.innerHTML = '<p class="no-issues">No validation issues found.</p>';
      document.getElementById('validationPanel').classList.remove('has-issues');
    } else {
      document.getElementById('validationPanel').classList.add('has-issues');

      // Add duplicate group issues
      if (validationResult.issues.duplicateGroups.length > 0) {
        const section = document.createElement('div');
        section.className = 'issue-section';
        section.innerHTML = '<h4>Duplicate Groups</h4>';

        const list = document.createElement('ul');
        validationResult.issues.duplicateGroups.forEach(issue => {
          const item = document.createElement('li');
          item.textContent = issue.message;
          item.setAttribute('data-group1', issue.group1);
          item.setAttribute('data-group2', issue.group2);

          // Add click handler to scroll to groups
          item.addEventListener('click', () => {
            const group = document.querySelector(`[data-group-id="${issue.group1}"]`);
            if (group) {
              group.scrollIntoView({ behavior: 'smooth' });
            }
          });

          list.appendChild(item);
        });

        section.appendChild(list);
        validationContent.appendChild(section);
      }

      // Add overlapping rules issues
      if (validationResult.issues.overlappingRules.length > 0) {
        const section = document.createElement('div');
        section.className = 'issue-section';
        section.innerHTML = '<h4>Overlapping Rules</h4>';

        const list = document.createElement('ul');
        validationResult.issues.overlappingRules.forEach(issue => {
          const item = document.createElement('li');
          item.textContent = issue.message;
          item.setAttribute('data-group', issue.groupId);

          // Add click handler to scroll to group
          item.addEventListener('click', () => {
            const group = document.querySelector(`[data-group-id="${issue.groupId}"]`);
            if (group) {
              group.scrollIntoView({ behavior: 'smooth' });
            }
          });

          list.appendChild(item);
        });

        section.appendChild(list);
        validationContent.appendChild(section);
      }

      // Add required fields issues
      if (validationResult.issues.requiredFields.length > 0) {
        const section = document.createElement('div');
        section.className = 'issue-section';
        section.innerHTML = '<h4>Configuration Issues</h4>';

        const list = document.createElement('ul');
        validationResult.issues.requiredFields.forEach(issue => {
          const item = document.createElement('li');
          item.textContent = issue.message;
          item.setAttribute('data-group', issue.groupId);

          // Add click handler to scroll to group
          item.addEventListener('click', () => {
            const group = document.querySelector(`[data-group-id="${issue.groupId}"]`);
            if (group) {
              group.scrollIntoView({ behavior: 'smooth' });
            }
          });

          list.appendChild(item);
        });

        section.appendChild(list);
        validationContent.appendChild(section);
      }
    }
  }

  markGroupWithError(groupId, message) {
    const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
    if (groupElement) {
      groupElement.classList.add('validation-error');
      groupElement.setAttribute('data-validation-message', message);

      // Add warning icon to group header
      const header = groupElement.querySelector('.group-header');
      if (header && !header.querySelector('.validation-icon')) {
        const icon = document.createElement('span');
        icon.className = 'validation-icon';
        icon.innerHTML = '⚠️';
        icon.title = message;
        header.appendChild(icon);
      }
    }
  }

  markRulesWithError(groupId, rule1Index, rule2Index, message) {
    const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
    if (groupElement) {
      const table = groupElement.querySelector('.rules-table');
      if (table) {
        const rows = table.querySelectorAll('tbody tr');

        // Mark first rule
        if (rows[rule1Index]) {
          rows[rule1Index].classList.add('validation-error');
          rows[rule1Index].setAttribute('data-validation-message', message);
          this.addWarningIconToRow(rows[rule1Index], message);
        }

        // Mark second rule
        if (rows[rule2Index]) {
          rows[rule2Index].classList.add('validation-error');
          rows[rule2Index].setAttribute('data-validation-message', message);
          this.addWarningIconToRow(rows[rule2Index], message);
        }
      }
    }
  }

  addWarningIconToRow(row, message) {
    const actionsCell = row.querySelector('.actions-cell');
    if (actionsCell && !actionsCell.querySelector('.validation-icon')) {
      const icon = document.createElement('span');
      icon.className = 'validation-icon';
      icon.innerHTML = '⚠️';
      icon.title = message;
      actionsCell.prepend(icon);
    }
  }

  updateTemplateSelector() {
    const selector = document.getElementById('templateSelector');
    selector.innerHTML = '<option value="">Select Template...</option>';

    // Get templates for current section
    const templates = this.templateManager.getTemplatesForSection(this.currentSection);

    if (templates.length === 0) {
      // If no templates for this section, disable the selector
      selector.disabled = true;
      return;
    }

    // Enable the selector and add template options
    selector.disabled = false;
    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      selector.appendChild(option);
    });
  }

  initializeApp() {
    // Initialize app state
    this.configManager.initializeConfig();

    // Set up event listeners
    this.setupEventListeners();

    // Initial render of UI
    this.renderUI();

    // Update template selector for initial section
    this.updateTemplateSelector();

    // Update YAML preview
    this.updateYamlPreview();
  }

  setupEventListeners() {
    // Section navigation
    document.querySelectorAll('.section-item').forEach(item => {
      item.addEventListener('click', () => this.changeSection(item.dataset.section));
    });

    // Metadata changes
    document.getElementById('configVersion').addEventListener('change', (e) => {
      this.configManager.updateMetadata('configFormatVersion', e.target.value);
      this.updateYamlPreview();
    });

    document.getElementById('variant').addEventListener('change', (e) => {
      this.configManager.updateMetadata('variant', e.target.value);
      this.updateYamlPreview();
    });

    document.getElementById('platform').addEventListener('change', (e) => {
      this.configManager.updateMetadata('platform', e.target.value);
      this.updateYamlPreview();
    });

    document.getElementById('countryCode').addEventListener('change', (e) => {
      this.configManager.updateMetadata('countryCode', e.target.value);
      this.updateYamlPreview();
    });

    // Add group button
    document.getElementById('addGroupBtn').addEventListener('click', () => {
      this.addNewGroup();
    });

    // Template selector
    document.getElementById('templateSelector').addEventListener('change', (e) => {
      if (e.target.value) {
        this.applyTemplate(e.target.value);
        e.target.value = ''; // Reset select
      }
    });

    // YAML panel actions
    document.getElementById('copyYamlBtn').addEventListener('click', () => {
      this.copyYamlToClipboard();
    });

    document.getElementById('formatYamlBtn').addEventListener('click', () => {
      this.formatYaml();
    });

    // Import/Export buttons
    document.getElementById('importBtn').addEventListener('click', () => {
      this.exportImportManager.showImportDialog();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportImportManager.exportYaml();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.resetConfiguration();
    });

    document.getElementById('toggleValidationPanel').addEventListener('click', () => {
      document.getElementById('validationPanel').classList.toggle('expanded');
    });
  }

  resetConfiguration() {
    if (confirm('Are you sure you want to reset the configuration? This will clear all your current settings.')) {
      // Clear the current configuration
      this.configManager.resetConfig();

      // Re-render UI with empty state
      this.renderUI();

      // Update YAML preview
      this.updateYamlPreview();
    }
  }

  changeSection(sectionId) {
    // Update current section
    this.currentSection = sectionId;

    // Update UI
    document.querySelectorAll('.section-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });

    document.getElementById('currentSection').textContent =
      this.sectionIdToDisplayName(sectionId);

    // Update template selector with templates for this section
    this.updateTemplateSelector();

    // Re-render groups
    this.renderGroups();
  }

  sectionIdToDisplayName(sectionId) {
    const nameMap = {
      'display-format': 'Display Format',
      'ranges': 'Ranges',
      'capping': 'Capping',
      'rounding': 'Rounding'
    };

    return nameMap[sectionId] || sectionId;
  }

  renderUI() {
    // Render all UI components
    this.renderGroups();
  }

  renderGroups() {
    const groupsContainer = document.getElementById('groupsContainer');
    const groups = this.configManager.getGroupsForSection(this.currentSection);

    // Clear container
    groupsContainer.innerHTML = '';

    if (groups.length === 0) {
      // Show empty state
      groupsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No configuration groups yet for ${this.sectionIdToDisplayName(this.currentSection)}.</p>
                    <p>Add a new group or select a template to get started.</p>
                </div>
            `;
      return;
    }

    // Render each group
    groups.forEach(group => {
      const groupElement = this.createGroupElement(group);
      groupsContainer.appendChild(groupElement);
    });
  }

  createGroupElement(group) {
    // Get template for group
    const template = document.getElementById('groupTemplate');
    const groupElement = document.createElement('div');

    // Clone template content
    const templateContent = template.innerHTML
      .replace('${groupId}', group.id)
      .replace('${groupTitle}', group.title || 'Unnamed Group');

    groupElement.innerHTML = templateContent;
    groupElement.className = 'rule-group';
    groupElement.dataset.groupId = group.id;

    // Make the title editable
    const titleElement = groupElement.querySelector('.group-title h3');
    titleElement.addEventListener('click', () => {
      this.makeGroupTitleEditable(titleElement, group.id);
    });

    // Add a hint that it's editable (optional)
    titleElement.title = "Click to edit group title";
    titleElement.style.cursor = "pointer";

    // Set up event listeners for group actions
    this.setupGroupEventListeners(groupElement, group);

    // Render common parameters
    this.renderCommonParams(groupElement, group);

    // Render rules table
    this.renderRulesTable(groupElement, group);

    return groupElement;
  }

  makeGroupTitleEditable(titleElement, groupId) {
    const currentTitle = titleElement.textContent;
    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.value = currentTitle;
    inputElement.className = 'edit-title-input';
    inputElement.style.width = '100%';
    inputElement.style.padding = '0.25rem';
    inputElement.style.fontSize = 'inherit';
    inputElement.style.fontWeight = 'inherit';

    // Replace the title with input
    titleElement.innerHTML = '';
    titleElement.appendChild(inputElement);

    // Focus and select all text
    inputElement.focus();
    inputElement.select();

    // Handle save on blur or Enter key
    const saveTitle = () => {
      const newTitle = inputElement.value.trim();
      if (newTitle) {
        this.configManager.updateGroupTitle(groupId, newTitle);
        titleElement.textContent = newTitle;
        // Force the YAML preview to update with new comments
        this.updateYamlPreview();
      } else {
        // If empty, restore original title and ensure it remains editable
        titleElement.textContent = currentTitle || 'Unnamed Group';

        // Ensure the title remains clickable for editing
        titleElement.addEventListener('click', () => {
          this.makeGroupTitleEditable(titleElement, groupId);
        });
        titleElement.title = "Click to edit group title";
        titleElement.style.cursor = "pointer";
      }
    };

    inputElement.addEventListener('blur', saveTitle);
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveTitle();
      } else if (e.key === 'Escape') {
        titleElement.textContent = currentTitle;

        // Re-attach click handler
        titleElement.addEventListener('click', () => {
          this.makeGroupTitleEditable(titleElement, groupId);
        });
        titleElement.title = "Click to edit group title";
        titleElement.style.cursor = "pointer";
      }
    });
  }

  setupGroupEventListeners(groupElement, group) {
    // Toggle group collapse
    groupElement.querySelector('.toggle-group').addEventListener('click', () => {
      groupElement.classList.toggle('collapsed');
    });

    // Clone group
    groupElement.querySelector('.clone-group').addEventListener('click', () => {
      this.cloneGroup(group.id);
    });

    // Delete group
    groupElement.querySelector('.delete-group').addEventListener('click', () => {
      this.deleteGroup(group.id);
    });

    // Add rule button
    groupElement.querySelector('.add-rule').addEventListener('click', () => {
      this.addRule(group.id);
    });
  }

  renderCommonParams(groupElement, group) {
    const paramsGrid = groupElement.querySelector('.params-grid');
    paramsGrid.innerHTML = '';

    // Get common parameters based on section type
    const commonParams = this.getCommonParamsForSection(this.currentSection);

    // Render each parameter
    commonParams.forEach(param => {
      const paramElement = this.createParamElement(param, group);
      paramsGrid.appendChild(paramElement);
    });
  }

  createParamElement(param, group) {
    const paramElement = document.createElement('div');
    paramElement.className = 'param-item';

    const label = document.createElement('label');
    label.textContent = param.label;
    label.htmlFor = `${group.id}-${param.name}`;
    paramElement.appendChild(label);

    let inputElement;

    if (param.type === 'select') {
      inputElement = document.createElement('select');

      // Add options
      param.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        inputElement.appendChild(optionElement);
      });
    } else if (param.type === 'checkbox') {
      const wrapper = document.createElement('div');
      wrapper.className = 'checkbox-wrapper';

      inputElement = document.createElement('input');
      inputElement.type = 'checkbox';

      const checkboxLabel = document.createElement('span');
      checkboxLabel.textContent = param.checkboxLabel || '';

      wrapper.appendChild(inputElement);
      wrapper.appendChild(checkboxLabel);

      paramElement.appendChild(wrapper);
      return paramElement;
    } else {
      inputElement = document.createElement('input');
      inputElement.type = param.type || 'text';
    }

    inputElement.id = `${group.id}-${param.name}`;
    inputElement.name = param.name;

    // FIXED VERSION: Prioritize the value from group.commonParams regardless if it's empty
    // Only fall back to default if the value is completely undefined/null
    let value;
    if (group.commonParams[param.name] !== undefined && group.commonParams[param.name] !== null) {
      // Use the value from group, even if it's an empty string
      value = group.commonParams[param.name];
    } else {
      // Fall back to default only when needed
      value = param.default || '';
    }

    if (param.type === 'checkbox') {
      inputElement.checked = value;
    } else {
      inputElement.value = value;
    }

    // Add change event
    inputElement.addEventListener('change', (e) => {
      const value = param.type === 'checkbox' ? e.target.checked : e.target.value;
      this.updateGroupCommonParam(group.id, param.name, value);
    });

    if (param.type !== 'checkbox') {
      paramElement.appendChild(inputElement);
    }

    return paramElement;
  }

  getCommonParamsForSection(sectionId) {
    // Define common parameters for each section type
    switch (sectionId) {
      case 'display-format':
        return [
          {
            name: 'deliveryMode',
            label: 'Delivery Mode',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'DELIVERY', label: 'Delivery' },
              { value: 'PICKUP', label: 'Pickup' }
            ]
            // Removed default
          },
          {
            name: 'marketplace',
            label: 'Marketplace',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'true', label: 'True' },
              { value: 'false', label: 'False' }
            ]
            // Removed default
          },
          {
            name: 'pdtLessThanOrEqualTo',
            label: 'PDT ≤',
            type: 'number'
          },
          {
            name: 'verticalType',
            label: 'Vertical Type',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'restaurants', label: 'Restaurants' },
              { value: 'darkstores', label: 'Darkstores' }
            ]
          }
        ];
      case 'ranges':
        return [
          {
            name: 'deliveryOption',
            label: 'Delivery Option',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'STANDARD', label: 'Standard' },
              { value: 'PRIORITY', label: 'Priority' },
              { value: 'SAVER', label: 'Saver' }
            ]
            // Removed default
          },
          {
            name: 'deliveryMode',
            label: 'Delivery Mode',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'DELIVERY', label: 'Delivery' },
              { value: 'PICKUP', label: 'Pickup' }
            ]
            // Removed default
          },
          {
            name: 'marketplace',
            label: 'Marketplace',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'true', label: 'True' },
              { value: 'false', label: 'False' }
            ]
            // Removed default
          },
          {
            name: 'verticalType',
            label: 'Vertical Type',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'restaurants', label: 'Restaurants' },
              { value: 'darkstores', label: 'Darkstores' }
            ]
          }
        ];
      case 'capping':
        return [
          {
            name: 'deliveryOption',
            label: 'Delivery Option',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'STANDARD', label: 'Standard' },
              { value: 'PRIORITY', label: 'Priority' },
              { value: 'SAVER', label: 'Saver' }
            ]
            // Removed default
          },
          {
            name: 'deliveryMode',
            label: 'Delivery Mode',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'DELIVERY', label: 'Delivery' },
              { value: 'PICKUP', label: 'Pickup' }
            ]
            // Removed default
          },
          {
            name: 'marketplace',
            label: 'Marketplace',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'true', label: 'True' },
              { value: 'false', label: 'False' }
            ]
            // Removed default
          },
          {
            name: 'pdtGreaterThan',
            label: 'PDT >',
            type: 'number'
          },
          {
            name: 'pdtLessThanOrEqualTo',
            label: 'PDT ≤',
            type: 'number'
          },
          {
            name: 'meanDelayGreaterThan',
            label: 'Mean Delay >',
            type: 'number'
          },
          {
            name: 'meanDelayLessThanOrEqualTo',
            label: 'Mean Delay ≤',
            type: 'number'
          },
          {
            name: 'verticalType',
            label: 'Vertical Type',
            type: 'select',
            options: [
              { value: '', label: 'Any' },
              { value: 'restaurants', label: 'Restaurants' },
              { value: 'darkstores', label: 'Darkstores' }
            ]
          }
        ];
      case 'rounding':
        return [
          {
            name: 'strategy',
            label: 'Rounding Strategy',
            type: 'select',
            options: [
              { value: 'FLOOR_5', label: 'Floor to 5 minutes' },
            ]
          }
        ];
      default:
        return [];
    }
  }

  renderRulesTable(groupElement, group) {
    const tableContainer = groupElement.querySelector('.rules-table');

    // Get grid manager to handle the table
    this.gridManager.renderTable(tableContainer, group, this.currentSection);

    // Set up grid events
    this.gridManager.setOnChangeHandler((groupId, ruleIndex, field, value) => {
      this.updateRule(groupId, ruleIndex, field, value);
    });

    this.gridManager.setOnDeleteHandler((groupId, ruleIndex) => {
      this.deleteRule(groupId, ruleIndex);
    });
  }

  addNewGroup() {
    const groupId = this.configManager.addGroup(this.currentSection);
    this.renderGroups();

    // Scroll to new group
    const newGroup = document.querySelector(`[data-group-id="${groupId}"]`);
    if (newGroup) {
      newGroup.scrollIntoView({ behavior: 'smooth' });
    }

    this.updateYamlPreview();

    // Validate after adding group
    this.validateConfiguration();
  }

  cloneGroup(groupId) {
    const newGroupId = this.configManager.cloneGroup(groupId);
    this.renderGroups();

    // Scroll to new group
    const newGroup = document.querySelector(`[data-group-id="${newGroupId}"]`);
    if (newGroup) {
      newGroup.scrollIntoView({ behavior: 'smooth' });
    }

    this.updateYamlPreview();
  }

  deleteGroup(groupId) {
    if (confirm('Are you sure you want to delete this group?')) {
      this.configManager.deleteGroup(this.currentSection, groupId);
      this.renderGroups();
      this.updateYamlPreview();
    }
  }

  updateGroupCommonParam(groupId, paramName, value) {
    this.configManager.updateGroupCommonParam(groupId, paramName, value);
    this.updateYamlPreview();

    // Validate after parameter change
    this.validateConfiguration();
  }

  addRule(groupId) {
    const group = this.configManager.getGroup(groupId);
    if (!group) return false;

    // For display-format, only allow one rule per group
    if (group.type === 'display-format') {
      // If the group already has a rule, don't allow adding another
      if (group.rules && group.rules.length > 0) {
        alert("Display Format groups can only have one format rule. Please create a new group for additional formats.");
        return false;
      }

      // Add a default display format rule
      this.configManager.addRule(groupId, 'DISPLAY_FORMAT_MINUTE_RANGE');
    } else {
      // For other section types, just add a rule normally
      this.configManager.addRule(groupId);
    }

    // Re-render just this group
    const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
    if (groupElement) {
      const group = this.configManager.getGroup(groupId);
      this.renderRulesTable(groupElement, group);

      // If this is a ranges group, re-apply the color coding
      if (group.type === 'ranges') {
        const tableContainer = groupElement.querySelector('.rules-table');
        if (tableContainer && this.gridManager) {
          this.gridManager.applyColorCodingToRangesTable(tableContainer);
        }
      }
    }

    this.updateYamlPreview();

    // Validate after adding a rule
    this.validateConfiguration();

    return true;
  }


  // Helper method to get format options
  getFormatOptions() {
    return [
      { value: 'DISPLAY_FORMAT_MINUTE_VALUE', label: 'Minute Value' },
      { value: 'DISPLAY_FORMAT_MINUTE_RANGE', label: 'Minute Range' },
      { value: 'DISPLAY_FORMAT_ETA_RANGE', label: 'ETA Range' }
    ];
  }


  updateRule(groupId, ruleIndex, field, value) {
    this.configManager.updateRule(groupId, ruleIndex, field, value);
    this.updateYamlPreview();

    // Validate after rule update
    this.validateConfiguration();
  }

  deleteRule(groupId, ruleIndex) {
    this.configManager.deleteRule(groupId, ruleIndex);

    // Re-render just this group
    const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
    if (groupElement) {
      const group = this.configManager.getGroup(groupId);
      this.renderRulesTable(groupElement, group);
    }

    this.updateYamlPreview();
  }

  applyTemplate(templateId) {
    const template = this.templateManager.getTemplate(templateId);

    if (template) {
      // Apply template to create new groups
      template.groups.forEach(templateGroup => {
        // Override the template's type with the current section type
        const groupToAdd = {...templateGroup, type: this.currentSection};
        const groupId = this.configManager.addGroup(this.currentSection, groupToAdd);
      });

      // Re-render
      this.renderGroups();
      this.updateYamlPreview();
    }
  }

  updateYamlPreview() {
    const yaml = this.yamlHandler.generateYaml(this.configManager.getConfig());
    document.getElementById('yamlPreview').textContent = yaml;
  }

  copyYamlToClipboard() {
    const yaml = document.getElementById('yamlPreview').textContent;
    navigator.clipboard.writeText(yaml)
      .then(() => {
        alert('YAML copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy YAML: ', err);
        alert('Failed to copy YAML. Please try again or copy manually.');
      });
  }

  formatYaml() {
    // Re-format the YAML with proper indentation
    const yaml = this.yamlHandler.formatYaml(document.getElementById('yamlPreview').textContent);
    document.getElementById('yamlPreview').textContent = yaml;
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pdtConfigBuilder = new PDTConfigBuilder();
});

// Export for module usage
export { PDTConfigBuilder };
