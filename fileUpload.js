// React and ReactDOM
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// UI5 Web Components
import "@ui5/webcomponents/dist/Select";
import "@ui5/webcomponents/dist/Option";
import "@ui5/webcomponents/dist/Button";
import "@ui5/webcomponents/dist/Dialog";
import "@ui5/webcomponents/dist/Table";
import "@ui5/webcomponents/dist/TableColumn";
import "@ui5/webcomponents/dist/TableRow";
import "@ui5/webcomponents/dist/TableCell";
import "@ui5/webcomponents/dist/Input";
import "@ui5/webcomponents/dist/CheckBox";

// File parsing libraries
import Papa from 'papaparse';
import XLSX from 'xlsx';



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
      this._root = document.createElement('div');
      this._shadowRoot.appendChild(this._root);
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
      this.render();
    }

    render() {
      ReactDOM.render(React.createElement(FileUploadWidgetComponent, {
        ...this._props,
        onDialogClose: this.closeDialog.bind(this),
        onImportComplete: this.handleImportComplete.bind(this)
      }), this._root);
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



  // Implement other components: ImportTypeSelector, MappingSelector, DefaultValuesSelector, JobSettingsSelector

  const ImportTypeSelector = ({ onSelect, currentValue }) => {
    const importTypes = [
      { key: 'factData', text: 'Fact Data' },
      { key: 'masterData', text: 'Master Data' },
      { key: 'privateFactData', text: 'Private Fact Data' }
    ];

    const handleChange = (event) => {
      onSelect(event.detail.selectedOption.getAttribute('data-key'));
    };

    return (
      <div>
        <label htmlFor="importTypeSelect">Import Type:</label>
        <Select
          id="importTypeSelect"
          onChange={handleChange}
          selectedKey={currentValue}
        >
          {importTypes.map(type => (
            <ui5-option key={type.key} value={type.key}>
              {type.text}
            </ui5-option>
          ))}
        </Select>
      </div>
    );
  };

  const MappingSelector = ({ onUpdate, modelMetadata, currentMappings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mappings, setMappings] = useState(currentMappings || {});

    useEffect(() => {
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
        <Button onClick={handleOpen}>Configure Mappings</Button>
        <Dialog open={isOpen} onAfterClose={handleClose}>
          <Table>
            <TableColumn>Model Column</TableColumn>
            <TableColumn>File Column</TableColumn>
            {modelMetadata.map(column => (
              <TableRow key={column.name}>
                <TableCell>{column.name}</TableCell>
                <TableCell>
                  <Input
                    value={mappings[column.name] || ''}
                    onChange={(e) => handleMappingChange(column.name, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </Table>
          <Button onClick={handleSave}>Save Mappings</Button>
        </Dialog>
      </div>
    );
  };

  const DefaultValuesSelector = ({ onUpdate, modelMetadata, currentDefaultValues }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState(currentDefaultValues || {});

    useEffect(() => {
      setDefaultValues(currentDefaultValues || {});
    }, [currentDefaultValues]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleDefaultValueChange = (columnName, value) => {
      setDefaultValues(prev => ({ ...prev, [columnName]: value }));
    };

    const handleSave = () => {
      onUpdate(defaultValues);
      handleClose();
    };

    return (
      <div>
        <Button onClick={handleOpen}>Configure Default Values</Button>
        <Dialog open={isOpen} onAfterClose={handleClose}>
          <Table>
            <TableColumn>Column</TableColumn>
            <TableColumn>Default Value</TableColumn>
            {modelMetadata.map(column => (
              <TableRow key={column.name}>
                <TableCell>{column.name}</TableCell>
                <TableCell>
                  <Input
                    value={defaultValues[column.name] || ''}
                    onChange={(e) => handleDefaultValueChange(column.name, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </Table>
          <Button onClick={handleSave}>Save Default Values</Button>
        </Dialog>
      </div>
    );
  };

  const JobSettingsSelector = ({ onUpdate, currentJobSettings, importType }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [jobSettings, setJobSettings] = useState(currentJobSettings || {
      executeWithFailedRows: true,
      ignoreAdditionalColumns: false,
      importMethod: 'Update',
      dateFormat: 'YYYY-MM-DD'
    });

    useEffect(() => {
      setJobSettings(currentJobSettings || {
        executeWithFailedRows: true,
        ignoreAdditionalColumns: false,
        importMethod: 'Update',
        dateFormat: 'YYYY-MM-DD'
      });
    }, [currentJobSettings]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleSettingChange = (setting, value) => {
      setJobSettings(prev => ({ ...prev, [setting]: value }));
    };

    const handleSave = () => {
      onUpdate(jobSettings);
      handleClose();
    };

    return (
      <div>
        <Button onClick={handleOpen}>Configure Job Settings</Button>
        <Dialog open={isOpen} onAfterClose={handleClose}>
          <CheckBox
            text="Execute With Failed Rows"
            checked={jobSettings.executeWithFailedRows}
            onChange={(e) => handleSettingChange('executeWithFailedRows', e.target.checked)}
          />
          <CheckBox
            text="Ignore Additional Columns"
            checked={jobSettings.ignoreAdditionalColumns}
            onChange={(e) => handleSettingChange('ignoreAdditionalColumns', e.target.checked)}
          />
          {importType === 'factData' && (
            <Select
              label="Import Method"
              onChange={(e) => handleSettingChange('importMethod', e.detail.selectedOption.getAttribute('data-key'))}
              selectedKey={jobSettings.importMethod}
            >
              <ui5-option key="Update" value="Update">Update</ui5-option>
              <ui5-option key="Append" value="Append">Append</ui5-option>
            </Select>
          )}
          <Input
            label="Date Format"
            value={jobSettings.dateFormat}
            onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
          />
          <Button onClick={handleSave}>Save Job Settings</Button>
        </Dialog>
      </div>
    );
  };




  class FileHandler {
    static parseCSV(file) {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          complete: (results) => resolve(results.data),
          error: (error) => reject(error),
          header: true,
          worker: true
        });
      });
    }

    static parseXLSX(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
    }

    static async handleFile(file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (fileExtension === 'csv') {
        return await FileHandler.parseCSV(file);
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        return await FileHandler.parseXLSX(file);
      } else {
        throw new Error('Unsupported file format');
      }
    }
  }

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

  // Import data function
  const importData = async (modelId, importType, data, mappings, defaultValues, jobSettings) => {
    const api = DataImportServiceApi.getInstance();

    // Create import job
    const jobId = await api.createImportJob(modelId, importType, mappings, defaultValues, jobSettings);

    // Post data to job
    const chunkSize = 100000;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await api.postDataToJob(jobId, chunk);
    }

    // Validate and run job
    await api.validateJob(jobId);
    const result = await api.runJob(jobId);

    return result;
  };

  // Builder panel implementation
  class FileUploadWidgetBuilder extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById('root');
      this._props = {};
    }

    connectedCallback() {
      this.render();
    }

    render() {
      ReactDOM.render(React.createElement(FileUploadWidgetBuilderComponent, this._props), this._root);
    }
  }

  customElements.define('upload', FileUploadWidgetBuilder);

  const FileUploadWidgetBuilderComponent = (props) => {
    return (
      <div>
        <h2>File Upload Widget Settings</h2>
        <ModelSelector onSelect={(modelId) => console.log('Selected model:', modelId)} />
        {/* Add other configuration components */}
      </div>
    );
  };

})();
