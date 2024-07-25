(function () {
  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      /* Add your styles here */
    </style>
    <div id="root"></div>
  `;

  class FileUploadWidget extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById('root');
      this._props = {
        modelId: '',
        importType: '',
        mappings: {},
        defaultValues: {},
        jobSettings: {},
        isDialogOpen: false
      };
      this._lastJobResult = null;
    }

    connectedCallback() {
      this._loadDependencies().then(() => {
        this.render();
      });
    }

    async _loadDependencies() {
      const dependencies = [
        'https://unpkg.com/react@17/umd/react.production.min.js',
        'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js',
        'https://unpkg.com/papaparse@5.3.0/papaparse.min.js',
        'https://unpkg.com/xlsx@0.17.0/dist/xlsx.full.min.js',
        'https://unpkg.com/@ui5/webcomponents@1.19.0/dist/bundle.js',
        'https://unpkg.com/@babel/standalone/babel.min.js'
      ];

      for (const url of dependencies) {
        await this._loadScript(url);
      }

      // After loading Babel, transform the script
      Babel.transformScriptTags();
    }

    _loadScript(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    render() {
      const FileUploadWidgetComponent = ({ modelId, importType, mappings, defaultValues, jobSettings, isDialogOpen, onDialogClose, onImportComplete }) => {
        const [fileData, setFileData] = React.useState(null);

        const handleFileUpload = async (event) => {
          const file = event.target.files[0];
          if (file) {
            const data = await FileHandler.handleFile(file);
            setFileData(data);
          }
        };

        const handleImport = async () => {
          if (fileData) {
            try {
              const result = await importData(modelId, importType, fileData, mappings, defaultValues, jobSettings);
              console.log('Import successful:', result);
              onImportComplete(result);
            } catch (error) {
              console.error('Import failed:', error);
            }
          }
        };

        return React.createElement('div', null, 
          React.createElement('button', { onClick: () => this._props.isDialogOpen = true }, 'Open File Upload'),
          isDialogOpen && React.createElement('dialog', { open: true },
            React.createElement('h2', null, 'File Upload'),
            React.createElement('input', { type: 'file', onChange: handleFileUpload, accept: '.csv,.xlsx,.xls' }),
            fileData && React.createElement('button', { onClick: handleImport }, 'Import Data'),
            React.createElement('button', { onClick: onDialogClose }, 'Close')
          )
        );
      };

      ReactDOM.render(
        React.createElement(FileUploadWidgetComponent, {
          ...this._props,
          onDialogClose: this.closeDialog.bind(this),
          onImportComplete: this.handleImportComplete.bind(this)
        }),
        this._root
      );
    }

    setModel(modelId) {
      this._props.modelId = modelId;
      this.render();
    }

    getModel() {
      return this._props.modelId;
    }

    setImportType(importType) {
      this._props.importType = importType;
      this.render();
    }

    getImportType() {
      return this._props.importType;
    }

    setMappings(mappings) {
      this._props.mappings = mappings;
      this.render();
    }

    getMappings() {
      return this._props.mappings;
    }

    setDefaultValues(defaultValues) {
      this._props.defaultValues = defaultValues;
      this.render();
    }

    getDefaultValues() {
      return this._props.defaultValues;
    }

    setJobSettings(jobSettings) {
      this._props.jobSettings = jobSettings;
      this.render();
    }

    getJobSettings() {
      return this._props.jobSettings;
    }

    open() {
      this._props.isDialogOpen = true;
      this.render();
    }

    closeDialog() {
      this._props.isDialogOpen = false;
      this.render();
    }

    getTotalJobRowCount() {
      return this._lastJobResult ? this._lastJobResult.totalRowCount : 0;
    }

    getJobFailedRowCount() {
      return this._lastJobResult ? this._lastJobResult.failedRowCount : 0;
    }

    handleImportComplete(result) {
      this._lastJobResult = result;
      this.dispatchEvent(new CustomEvent('importComplete', { detail: result }));
    }
  }

  customElements.define('com-sap-file-upload-widget', FileUploadWidget);

  // React Components

  const FileUploadWidgetComponent = ({ modelId, importType, mappings, defaultValues, jobSettings }) => {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [fileData, setFileData] = React.useState(null);

    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (file) {
        const data = await FileHandler.handleFile(file);
        setFileData(data);
      }
    };

    const handleImport = async () => {
      if (fileData) {
        try {
          const result = await importData(modelId, importType, fileData, mappings, defaultValues, jobSettings);
          console.log('Import successful:', result);
          // Trigger onSuccess event
        } catch (error) {
          console.error('Import failed:', error);
          // Trigger onFailure event
        }
      }
    };

    return (
      <div>
        <button onClick={() => setIsDialogOpen(true)}>Open File Upload</button>
        {isDialogOpen && (
          <dialog open>
            <h2>File Upload</h2>
            <input type="file" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" />
            {fileData && <button onClick={handleImport}>Import Data</button>}
            <button onClick={() => setIsDialogOpen(false)}>Close</button>
          </dialog>
        )}
      </div>
    );
  };

  const ModelSelector = ({ onSelect }) => {
    const [models, setModels] = React.useState([]);
    const [selectedModel, setSelectedModel] = React.useState('');

    React.useEffect(() => {
      const fetchModels = async () => {
        const api = DataImportServiceApi.getInstance();
        const modelList = await api.getModels();
        setModels(modelList);
      };
      fetchModels();
    }, []);

    const handleChange = (event) => {
      const modelId = event.target.value;
      setSelectedModel(modelId);
      onSelect(modelId);
    };

    return (
      <select value={selectedModel} onChange={handleChange}>
        <option value="">Select a model</option>
        {models.map(model => (
          <option key={model.id} value={model.id}>{model.name}</option>
        ))}
      </select>
    );
  };

  const ImportTypeSelector = ({ onSelect, currentValue }) => {
    const importTypes = [
      { key: 'factData', text: 'Fact Data' },
      { key: 'masterData', text: 'Master Data' },
      { key: 'privateFactData', text: 'Private Fact Data' }
    ];

    const handleChange = (event) => {
      onSelect(event.target.value);
    };

    return (
      <div>
        <label htmlFor="importTypeSelect">Import Type:</label>
        <select
          id="importTypeSelect"
          onChange={handleChange}
          value={currentValue}
        >
          {importTypes.map(type => (
            <option key={type.key} value={type.key}>
              {type.text}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const MappingSelector = ({ onUpdate, modelMetadata, currentMappings }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [mappings, setMappings] = React.useState(currentMappings || {});

    React.useEffect(() => {
      setMappings(currentMappings || {});
    }, [currentMappings]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleMappingChange = (columnName, value) => {
      setMappings(prev => ({ ...prev, [columnName]: value }));
    };

    const handleSave = () => {
      onUpdate(mappings);
      handleClose();
    };

    return (
      <div>
        <button onClick={handleOpen}>Configure Mappings</button>
        {isOpen && (
          <dialog open>
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Map to</th>
                </tr>
              </thead>
              <tbody>
                {modelMetadata.map(column => (
                  <tr key={column}>
                    <td>{column}</td>
                    <td>
                      <input
                        type="text"
                        value={mappings[column] || ''}
                        onChange={e => handleMappingChange(column, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleSave}>Save</button>
            <button onClick={handleClose}>Cancel</button>
          </dialog>
        )}
      </div>
    );
  };

  const FileHandler = {
    async handleFile(file) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (extension === 'csv') {
        return this._handleCSV(file);
      } else if (['xls', 'xlsx'].includes(extension)) {
        return this._handleExcel(file);
      }
      throw new Error('Unsupported file format');
    },

    async _handleCSV(file) {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          complete: (result) => resolve(result.data),
          error: (error) => reject(error)
        });
      });
    },

    async _handleExcel(file) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    }
  };

  async function importData(modelId, importType, fileData, mappings, defaultValues, jobSettings) {
    const api = DataImportServiceApi.getInstance();
    const response = await api.importData(
      modelId,
      importType,
      fileData,
      mappings,
      defaultValues,
      jobSettings
    );
    return response.data;
  }
})();
