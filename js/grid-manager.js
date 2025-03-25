/**
 * GridManager handles the spreadsheet-like interface for editing rules.
 * It manages the table rendering, inline editing, and events.
 */
export class GridManager {
  constructor(configManager) {
    this.onChangeHandler = null;
    this.onDeleteHandler = null;
    this.currentEditCell = null;
    this.configManager = configManager;
  }

  /**
   * Set the handler for value changes
   */
  setOnChangeHandler(handler) {
    this.onChangeHandler = handler;
  }

  /**
   * Set the handler for row deletion
   */
  setOnDeleteHandler(handler) {
    this.onDeleteHandler = handler;
  }

  /**
   * Render the table for a group based on section type
   */
  renderTable(tableContainer, group, sectionType) {
    // Clear the container
    tableContainer.innerHTML = '';

    // Create table element
    const table = document.createElement('table');
    table.className = 'editable-table';

    // Add header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // For capping section, use special headers
    if (sectionType === 'capping') {
      const headers = ['Type', 'Min', 'Max', 'Min Lower', 'Min Upper', 'Max Lower', 'Max Upper', 'Actions'];

      headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
    } else {
      // Add headers based on section type for other sections
      const columns = this.getColumnsForSectionType(sectionType);

      columns.forEach(column => {
        const th = document.createElement('th');
        th.className = column.className || '';
        th.textContent = column.label;
        headerRow.appendChild(th);
      });

      // Add actions column
      const actionsHeader = document.createElement('th');
      actionsHeader.className = 'actions-cell';
      actionsHeader.textContent = 'Actions';
      headerRow.appendChild(actionsHeader);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Add body rows
    const tbody = document.createElement('tbody');

    if (group.rules && group.rules.length > 0) {
      group.rules.forEach((rule, index) => {
        const row = this.createRowForRule(rule, index, group.id,
          sectionType === 'capping' ? [] : this.getColumnsForSectionType(sectionType),
          sectionType);
        tbody.appendChild(row);
      });
    } else {
      // Empty state row
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = sectionType === 'capping' ? 8 : (this.getColumnsForSectionType(sectionType).length + 1);
      emptyCell.className = 'empty-grid';
      emptyCell.textContent = 'No rules defined. Click "Add Rule" to create one.';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);

    // Add the table to the container
    tableContainer.appendChild(table);
  }

  /**
   * Get the column definitions for a section type
   */
  getColumnsForSectionType(sectionType) {
    switch (sectionType) {
      case 'display-format':
        return [
          {
            field: 'format',
            label: 'Format',
            type: 'select',
            options: [
              { value: 'DISPLAY_FORMAT_MINUTE_VALUE', label: 'Minute Value' },
              { value: 'DISPLAY_FORMAT_MINUTE_RANGE', label: 'Minute Range' },
              { value: 'DISPLAY_FORMAT_ETA_RANGE', label: 'ETA Range' }
            ]
          }
        ];
      case 'ranges':
        return [
          {
            field: 'pdtGreaterThan',
            label: 'PDT >',
            type: 'number',
            className: 'narrow-column'
          },
          {
            field: 'pdtLessThanOrEqualTo',
            label: 'PDT ≤',
            type: 'number',
            className: 'narrow-column'
          },
          {
            field: 'meanDelayGreaterThan',
            label: 'Mean Delay >',
            type: 'number',
            className: 'narrow-column'
          },
          {
            field: 'meanDelayLessThanOrEqualTo',
            label: 'Mean Delay ≤',
            type: 'number',
            className: 'narrow-column'
          },
          {
            field: 'lowerBound',
            label: 'Lower Bound',
            type: 'number',
            className: 'narrow-column'
          },
          {
            field: 'upperBound',
            label: 'Upper Bound',
            type: 'number',
            className: 'narrow-column'
          }
        ];
      case 'capping':
        return [
          {
            field: 'type',
            label: 'Type',
            type: 'select',
            options: [
              { value: 'single', label: 'Single' },
              { value: 'ranges', label: 'Ranges' }
            ],
            className: 'medium-column'
          },
          {
            field: 'min',
            label: 'Min',
            type: 'number',
            className: 'narrow-column',
            visibleWhen: (rule) => rule.type === 'single'
          },
          {
            field: 'max',
            label: 'Max',
            type: 'number',
            className: 'narrow-column',
            visibleWhen: (rule) => rule.type === 'single'
          },
          {
            field: 'minLowerBound',
            label: 'Min Lower',
            type: 'number',
            className: 'narrow-column',
            visibleWhen: (rule) => rule.type === 'ranges'
          },
          {
            field: 'minUpperBound',
            label: 'Min Upper',
            type: 'number',
            className: 'narrow-column',
            visibleWhen: (rule) => rule.type === 'ranges'
          },
          {
            field: 'maxLowerBound',
            label: 'Max Lower',
            type: 'number',
            className: 'narrow-column',
            visibleWhen: (rule) => rule.type === 'ranges'
          },
          {
            field: 'maxUpperBound',
            label: 'Max Upper',
            type: 'number',
            className: 'narrow-column',
            visibleWhen: (rule) => rule.type === 'ranges'
          }
        ];
      default:
        return [];
    }
  }

  /**
   * Create a table row for a rule
   */
  createRowForRule(rule, ruleIndex, groupId, columns, sectionType) {
    // For capping, we need special handling based on type
    const row = document.createElement('tr');
    row.dataset.ruleIndex = ruleIndex;
    row.dataset.groupId = groupId;

    // For capping, we need special handling based on rule type
    if (sectionType === 'capping') {
      // Add type column first
      const typeCell = document.createElement('td');
      const typeSelect = document.createElement('select');
      typeSelect.className = 'cell-input';

      // Add options for single/ranges
      const singleOpt = document.createElement('option');
      singleOpt.value = 'single';
      singleOpt.textContent = 'Single';
      singleOpt.selected = rule.type === 'single';
      typeSelect.appendChild(singleOpt);

      const rangesOpt = document.createElement('option');
      rangesOpt.value = 'ranges';
      rangesOpt.textContent = 'Ranges';
      rangesOpt.selected = rule.type === 'ranges';
      typeSelect.appendChild(rangesOpt);

      // Add event listener for type changes
      typeSelect.addEventListener('change', (e) => {
        if (this.onChangeHandler) {
          const newType = e.target.value;
          this.onChangeHandler(groupId, ruleIndex, 'type', newType);

          // If changing to ranges type, set default values for ranges
          if (newType === 'ranges' && this.configManager) {
            const group = this.configManager.getGroup(groupId);
            if (group && group.rules[ruleIndex]) {
              if (!group.rules[ruleIndex].minLowerBound)
                this.onChangeHandler(groupId, ruleIndex, 'minLowerBound', 10);
              if (!group.rules[ruleIndex].minUpperBound)
                this.onChangeHandler(groupId, ruleIndex, 'minUpperBound', 20);
              if (!group.rules[ruleIndex].maxLowerBound)
                this.onChangeHandler(groupId, ruleIndex, 'maxLowerBound', 160);
              if (!group.rules[ruleIndex].maxUpperBound)
                this.onChangeHandler(groupId, ruleIndex, 'maxUpperBound', 180);
            }
          }

          // Re-render this row to show correct fields after type change
          const tableContainer = row.closest('.rules-table');
          if (tableContainer) {
            this.renderTable(tableContainer, this.configManager.getGroup(groupId), 'capping');
          }
        }
      });

      typeCell.appendChild(typeSelect);
      row.appendChild(typeCell);

      // Create fields based on type
      if (rule.type === 'single') {
        // Min field
        const minCell = document.createElement('td');
        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'cell-input';
        minInput.value = rule.min || '';
        minInput.addEventListener('change', (e) => {
          if (this.onChangeHandler) {
            this.onChangeHandler(groupId, ruleIndex, 'min', parseInt(e.target.value));
          }
        });
        minCell.appendChild(minInput);
        row.appendChild(minCell);

        // Max field
        const maxCell = document.createElement('td');
        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'cell-input';
        maxInput.value = rule.max || '';
        maxInput.addEventListener('change', (e) => {
          if (this.onChangeHandler) {
            this.onChangeHandler(groupId, ruleIndex, 'max', parseInt(e.target.value));
          }
        });
        maxCell.appendChild(maxInput);
        row.appendChild(maxCell);

        // Empty cells for ranges fields
        for (let i = 0; i < 4; i++) {
          const emptyCell = document.createElement('td');
          row.appendChild(emptyCell);
        }
      } else {
        // Empty cells for single fields
        for (let i = 0; i < 2; i++) {
          const emptyCell = document.createElement('td');
          row.appendChild(emptyCell);
        }

        // Min Lower field
        const minLowerCell = document.createElement('td');
        const minLowerInput = document.createElement('input');
        minLowerInput.type = 'number';
        minLowerInput.className = 'cell-input';
        minLowerInput.value = rule.minLowerBound || '';
        minLowerInput.addEventListener('change', (e) => {
          if (this.onChangeHandler) {
            this.onChangeHandler(groupId, ruleIndex, 'minLowerBound', parseInt(e.target.value));
          }
        });
        minLowerCell.appendChild(minLowerInput);
        row.appendChild(minLowerCell);

        // Min Upper field
        const minUpperCell = document.createElement('td');
        const minUpperInput = document.createElement('input');
        minUpperInput.type = 'number';
        minUpperInput.className = 'cell-input';
        minUpperInput.value = rule.minUpperBound || '';
        minUpperInput.addEventListener('change', (e) => {
          if (this.onChangeHandler) {
            this.onChangeHandler(groupId, ruleIndex, 'minUpperBound', parseInt(e.target.value));
          }
        });
        minUpperCell.appendChild(minUpperInput);
        row.appendChild(minUpperCell);

        // Max Lower field
        const maxLowerCell = document.createElement('td');
        const maxLowerInput = document.createElement('input');
        maxLowerInput.type = 'number';
        maxLowerInput.className = 'cell-input';
        maxLowerInput.value = rule.maxLowerBound || '';
        maxLowerInput.addEventListener('change', (e) => {
          if (this.onChangeHandler) {
            this.onChangeHandler(groupId, ruleIndex, 'maxLowerBound', parseInt(e.target.value));
          }
        });
        maxLowerCell.appendChild(maxLowerInput);
        row.appendChild(maxLowerCell);

        // Max Upper field
        const maxUpperCell = document.createElement('td');
        const maxUpperInput = document.createElement('input');
        maxUpperInput.type = 'number';
        maxUpperInput.className = 'cell-input';
        maxUpperInput.value = rule.maxUpperBound || '';
        maxUpperInput.addEventListener('change', (e) => {
          if (this.onChangeHandler) {
            this.onChangeHandler(groupId, ruleIndex, 'maxUpperBound', parseInt(e.target.value));
          }
        });
        maxUpperCell.appendChild(maxUpperInput);
        row.appendChild(maxUpperCell);
      }

      // Add actions cell (delete button)
      const actionsCell = document.createElement('td');
      actionsCell.className = 'actions-cell';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-rule';
      deleteButton.innerHTML = '🗑️';
      deleteButton.title = 'Delete rule';
      deleteButton.addEventListener('click', () => {
        if (this.onDeleteHandler) {
          this.onDeleteHandler(groupId, ruleIndex);
        }
      });

      actionsCell.appendChild(deleteButton);
      row.appendChild(actionsCell);

      return row;
    }

    // For other section types, use the existing column-based approach
    columns.forEach(column => {
      // Skip if column has visibility condition that evaluates to false
      if (column.visibleWhen && !column.visibleWhen(rule)) {
        return;
      }

      const cell = document.createElement('td');
      cell.className = column.className || '';

      const cellContent = this.createEditableCell(
        rule,
        column,
        ruleIndex,
        groupId,
        sectionType
      );

      cell.appendChild(cellContent);
      row.appendChild(cell);
    });

    // Add actions cell
    this.addActionsCell(row, groupId, ruleIndex);
    return row;
  }

  addCappingCell(row, rule, fieldName, ruleIndex, groupId) {
    const cell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'cell-input';
    input.value = rule[fieldName] || '';

    input.addEventListener('change', (e) => {
      if (this.onChangeHandler) {
        this.onChangeHandler(groupId, ruleIndex, fieldName, parseInt(e.target.value));
      }
    });

    cell.appendChild(input);
    row.appendChild(cell);
  }

  addActionsCell(row, groupId, ruleIndex) {
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-rule';
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Delete rule';
    deleteButton.addEventListener('click', () => {
      if (this.onDeleteHandler) {
        this.onDeleteHandler(groupId, ruleIndex);
      }
    });

    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);
  }

  /**
   * Create an editable cell for a value
   */
  createEditableCell(rule, column, ruleIndex, groupId, sectionType) {
    const cellContainer = document.createElement('div');
    cellContainer.className = 'editable-cell';
    cellContainer.dataset.field = column.field;

    let cellValue = rule[column.field];

    // Create the display element
    const displayElement = document.createElement('div');
    displayElement.className = 'cell-display';

    if (column.type === 'select' && column.options) {
      // For select fields, show the label instead of the value
      const option = column.options.find(opt => opt.value === cellValue);
      displayElement.textContent = option ? option.label : '';
    } else {
      // Even if the value is null/undefined/empty, display a space or placeholder
      displayElement.textContent = cellValue !== null && cellValue !== undefined && cellValue !== ''
        ? cellValue
        : ' '; // Space or placeholder to ensure it remains clickable
    }

    // Make sure the cell is always clickable
    displayElement.style.minHeight = '1.5em'; // Ensure empty cells have height
    displayElement.style.cursor = 'pointer';  // Show pointer cursor

    // Add click handler to start editing
    displayElement.addEventListener('click', () => {
      this.startEditing(cellContainer, rule, column, ruleIndex, groupId, sectionType);
    });

    cellContainer.appendChild(displayElement);

    return cellContainer;
  }

  /**
   * Start inline editing for a cell
   */
  startEditing(cellContainer, rule, column, ruleIndex, groupId, sectionType) {
    // If already editing, finish that first
    if (this.currentEditCell) {
      this.finishEditing();
    }

    this.currentEditCell = {
      container: cellContainer,
      rule,
      column,
      ruleIndex,
      groupId,
      sectionType
    };

    // Remove the display element
    cellContainer.innerHTML = '';
    cellContainer.classList.add('editing');

    let inputElement;

    if (column.type === 'select' && column.options) {
      // Create select dropdown
      inputElement = document.createElement('select');

      // Add options
      column.options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;

        // Select the current value
        if (option.value === rule[column.field]) {
          optionElement.selected = true;
        }

        inputElement.appendChild(optionElement);
      });
    } else {
      // Create text/number input
      inputElement = document.createElement('input');
      inputElement.type = column.type || 'text';

      // Set value
      inputElement.value = rule[column.field] !== null && rule[column.field] !== undefined
        ? rule[column.field]
        : '';
    }

    // Add class for styling
    inputElement.className = 'cell-input';

    // Add event listeners
    inputElement.addEventListener('blur', () => {
      this.finishEditing();
    });

    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.finishEditing();
      } else if (event.key === 'Escape') {
        this.cancelEditing();
      }
    });

    cellContainer.appendChild(inputElement);

    // Focus the input
    inputElement.focus();

    // For text/number inputs, select all text
    if (inputElement.type !== 'select') {
      inputElement.select();
    }
  }

  /**
   * Finish editing and save the value
   */
  finishEditing() {
    if (!this.currentEditCell) return;

    const { container, rule, column, ruleIndex, groupId, sectionType } = this.currentEditCell;

    // Get the input element
    const inputElement = container.querySelector('.cell-input');
    if (!inputElement) return;

    // Get the new value
    let newValue;

    if (column.type === 'number') {
      // Convert to number and handle empty values
      newValue = inputElement.value.trim() === ''
        ? null
        : parseFloat(inputElement.value);

      // Handle NaN
      if (isNaN(newValue)) {
        newValue = null;
      }
    } else if (column.type === 'checkbox') {
      newValue = inputElement.checked;
    } else {
      newValue = inputElement.value;
    }

    // Update the rule
    if (this.onChangeHandler) {
      this.onChangeHandler(groupId, ruleIndex, column.field, newValue);
    }

    // Reset the cell to display mode
    container.classList.remove('editing');
    container.innerHTML = '';

    // Create the display element
    const displayElement = document.createElement('div');
    displayElement.className = 'cell-display';
    displayElement.style.minHeight = '1.5em';
    displayElement.style.cursor = 'pointer';

    if (column.type === 'select' && column.options) {
      // For select fields, show the label instead of the value
      const option = column.options.find(opt => opt.value === newValue);
      displayElement.textContent = option ? option.label : '';
    } else {
      // Always provide some content for empty values
      displayElement.textContent = newValue !== null && newValue !== undefined && newValue !== ''
        ? newValue
        : ' '; // Space or placeholder
    }

    // Add click handler to start editing again
    displayElement.addEventListener('click', () => {
      this.startEditing(container, rule, column, ruleIndex, groupId, sectionType);
    });

    container.appendChild(displayElement);

    // Reset current edit cell
    this.currentEditCell = null;
  }

  /**
   * Cancel editing without saving
   */
  cancelEditing() {
    if (!this.currentEditCell) return;

    const { container, rule, column, ruleIndex, groupId, sectionType } = this.currentEditCell;

    // Reset the cell to display mode
    container.classList.remove('editing');
    container.innerHTML = '';

    // Create the display element with the original value
    const displayElement = document.createElement('div');
    displayElement.className = 'cell-display';

    const originalValue = rule[column.field];

    if (column.type === 'select' && column.options) {
      // For select fields, show the label instead of the value
      const option = column.options.find(opt => opt.value === originalValue);
      displayElement.textContent = option ? option.label : (originalValue || '');
    } else {
      displayElement.textContent = originalValue !== null && originalValue !== undefined
        ? originalValue
        : '';
    }

    // Add click handler to start editing again
    displayElement.addEventListener('click', () => {
      this.startEditing(container, rule, column, ruleIndex, groupId, sectionType);
    });

    container.appendChild(displayElement);

    // Reset current edit cell
    this.currentEditCell = null;
  }

  /**
   * Create a batch editor for multiple cells
   */
  createBatchEditor(selectedCells, column) {
    // Implementation for batch editing
    // This would allow editing multiple cells at once
  }
}
