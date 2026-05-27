(function () {
  const vscode = acquireVsCodeApi();
  const data = window.__TOON_TABLE_DATA__ || [];
  const select = document.getElementById('blockSelect');
  const filterInput = document.getElementById('filter');
  const tableContainer = document.getElementById('table');
  const summary = document.getElementById('summary');
  summary.setAttribute('aria-live', 'polite');
  const exportButton = document.getElementById('exportCsv');
  const sort = { index: 0, asc: true };
  let focusSortIndex = null;

  function init() {
    data.forEach((block, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = block.name;
      select.appendChild(option);
    });
    select.addEventListener('change', function () {
      sort.index = 0;
      sort.asc = true;
      render();
    });
    filterInput.addEventListener('input', render);
    exportButton.addEventListener('click', function () {
      const block = data[Number(select.value) || 0];
      if (block) {
        vscode.postMessage({ command: 'exportCsv', blockName: block.name });
      }
    });
    select.value = '0';
    render();
  }

  function render() {
    const blockIndex = Number(select.value) || 0;
    const block = data[blockIndex];
    if (!block) {
      tableContainer.textContent = 'No block selected';
      summary.textContent = '';
      return;
    }

    const filter = filterInput.value.toLowerCase();
    const filteredRows = block.rows.filter(function (row) {
      return row.some(function (value) {
        return String(value || '')
          .toLowerCase()
          .includes(filter);
      });
    });

    const sortedRows = filteredRows.slice().sort(function (a, b) {
      const av = String(a[sort.index] || '').toLowerCase();
      const bv = String(b[sort.index] || '').toLowerCase();
      if (av === bv) {
        return 0;
      }
      return sort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    summary.textContent =
      block.name +
      ': declared ' +
      block.declaredRows +
      ', showing ' +
      sortedRows.length +
      ' of ' +
      block.rows.length +
      ' rows';

    const table = document.createElement('table');
    table.className = 'toon-table';
    table.setAttribute('role', 'table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    block.fields.forEach(function (field, index) {
      const th = document.createElement('th');
      th.className = 'toon-th';
      th.scope = 'col';
      th.tabIndex = 0;

      if (sort.index === index) {
        th.setAttribute('aria-sort', sort.asc ? 'ascending' : 'descending');
      } else {
        th.setAttribute('aria-sort', 'none');
      }

      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateSort(index);
        }
      });

      const button = document.createElement('button');
      button.className = 'toon-sort-button';
      button.type = 'button';
      button.setAttribute('data-sort-index', String(index));
      button.textContent = field || 'Field ' + (index + 1);

      if (sort.index === index) {
        const indicator = document.createElement('span');
        indicator.className = 'toon-sort-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.textContent = sort.asc ? '▲' : '▼';
        button.appendChild(indicator);
      }

      button.addEventListener('click', function () {
        activateSort(index);
      });
      th.appendChild(button);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    const tbody = document.createElement('tbody');
    if (sortedRows.length === 0) {
      const emptyRow = document.createElement('tr');
      const cell = document.createElement('td');
      cell.className = 'toon-empty';
      cell.colSpan = Math.max(1, block.fields.length);
      cell.textContent = 'No rows match the current filter.';
      emptyRow.appendChild(cell);
      tbody.appendChild(emptyRow);
    } else {
      sortedRows.forEach(function (row) {
        const tr = document.createElement('tr');
        block.fields.forEach(function (_field, index) {
          const td = document.createElement('td');
          td.className = 'toon-td';
          td.textContent = String(row[index] || '');
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.replaceChildren(table);

    if (focusSortIndex !== null) {
      const thIndex = focusSortIndex;
      focusSortIndex = null;
      const ths = table.querySelectorAll('th.toon-th');
      if (ths[thIndex]) {
        ths[thIndex].focus();
      }
    }
  }

  function activateSort(index) {
    if (sort.index === index) {
      sort.asc = !sort.asc;
    } else {
      sort.index = index;
      sort.asc = true;
    }
    focusSortIndex = index;
    render();
  }

  init();
})();
