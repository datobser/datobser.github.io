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
        'https://unpkg.com/@ui5/webcomponents@1.19.0/dist/bundle.esm.js',
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

  customElements.define('upload-main', FileUploadWidget);

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
    
      return React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          { onClick: () => setIsDialogOpen(true) },
          'Open File Upload'
        ),
        isDialogOpen && React.createElement(
          'dialog',
          { open: true },
          React.createElement('h2', null, 'File Upload'),
          React.createElement('input', {
            type: 'file',
            onChange: handleFileUpload,
            accept: '.csv,.xlsx,.xls'
          }),
          fileData && React.createElement(
            'button',
            { onClick: handleImport },
            'Import Data'
          ),
          React.createElement(
            'button',
            { onClick: () => setIsDialogOpen(false) },
            'Close'
          )
        )
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
    
      return React.createElement(
        'select',
        { value: selectedModel, onChange: handleChange },
        React.createElement('option', { value: '' }, 'Select a model'),
        models.map(model =>
          React.createElement('option', { key: model.id, value: model.id }, model.name)
        )
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
    
      return React.createElement(
        'div',
        null,
        React.createElement('label', { htmlFor: 'importTypeSelect' }, 'Import Type:'),
        React.createElement(
          'select',
          {
            id: 'importTypeSelect',
            onChange: handleChange,
            value: currentValue
          },
          importTypes.map(type =>
            React.createElement('option', { key: type.key, value: type.key }, type.text)
          )
        )
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
  
    return React.createElement(
      'div',
      null,
      React.createElement('button', { onClick: handleOpen }, 'Configure Mappings'),
      isOpen && React.createElement(
        'dialog',
        { open: true },
        React.createElement(
          'table',
          null,
          React.createElement(
            'thead',
            null,
            React.createElement(
              'tr',
              null,
              React.createElement('th', null, 'Column'),
              React.createElement('th', null, 'Map to')
            )
          ),
          React.createElement(
            'tbody',
            null,
            modelMetadata.map(column =>
              React.createElement(
                'tr',
                { key: column },
                React.createElement('td', null, column),
                React.createElement(
                  'td',
                  null,
                  React.createElement('input', {
                    type: 'text',
                    value: mappings[column] || '',
                    onChange: e => handleMappingChange(column, e.target.value)
                  })
                )
              )
            )
          )
        ),
        React.createElement('button', { onClick: handleSave }, 'Save'),
        React.createElement('button', { onClick: handleClose }, 'Cancel')
      )
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

  // DataImportServiceApi implementation
  class DataImportServiceApi {
    static instance = null;

    constructor() {
      this.baseUrl = 'https://a2pp.authentication.eu10.hana.ondemand.com/api/v1/'; // Adjust this based on your SAC environment
    }

    static getInstance() {
      if (!DataImportServiceApi.instance) {
        DataImportServiceApi.instance = new DataImportServiceApi();
      }
      return DataImportServiceApi.instance;
    }

    async fetchJson(url, options = {}) {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }

    async getModels() {
      return this.fetchJson(`${this.baseUrl}/models`);
    }

    async getModelMetadata(modelId) {
      return this.fetchJson(`${this.baseUrl}/models/${modelId}/metadata`);
    }

    async createImportJob(modelId, importType, mappings, defaultValues, jobSettings) {
      return this.fetchJson(`${this.baseUrl}/jobs`, {
        method: 'POST',
        body: JSON.stringify({
          modelId,
          importType,
          mappings,
          defaultValues,
          jobSettings,
        }),
      });
    }

    async postDataToJob(jobId, data) {
      return this.fetchJson(`${this.baseUrl}/jobs/${jobId}`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      });
    }

    async validateJob(jobId) {
      return this.fetchJson(`${this.baseUrl}/jobs/${jobId}/validate`, {
        method: 'POST',
      });
    }

    async runJob(jobId) {
      return this.fetchJson(`${this.baseUrl}/jobs/${jobId}/run`, {
        method: 'POST',
      });
    }

    async getJobStatus(jobId) {
      return this.fetchJson(`${this.baseUrl}/jobs/${jobId}/status`);
    }

    async getInvalidRows(jobId) {
      return this.fetchJson(`${this.baseUrl}/jobs/${jobId}/invalidRows`);
    }

    async getJobs(modelId) {
      return this.fetchJson(`${this.baseUrl}/jobs?modelId=${modelId}`);
    }
  }
  
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
