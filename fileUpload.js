(function () {
  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      /* Add your styles here */
      .dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border: 1px solid #ccc;
        z-index: 1000;
      }
      .dialog-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
      }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
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
      this._clientId = '';
      this._clientSecret = '';
    }

    connectedCallback() {
      this.render();
    }

    render() {
      this._root.innerHTML = '';
      const openButton = document.createElement('button');
      openButton.textContent = 'Open File Upload';
      openButton.addEventListener('click', () => this.open());
      this._root.appendChild(openButton);

      if (this._props.isDialogOpen) {
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        
        const backdrop = document.createElement('div');
        backdrop.className = 'dialog-backdrop';
        backdrop.addEventListener('click', () => this.closeDialog());
        
        const title = document.createElement('h2');
        title.textContent = 'File Upload';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv,.xlsx,.xls';
        fileInput.addEventListener('change', (event) => this.handleFileUpload(event));
        
        const importButton = document.createElement('button');
        importButton.textContent = 'Import Data';
        importButton.style.display = 'none';
        importButton.addEventListener('click', () => this.handleImport());
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.closeDialog());
        
        dialog.appendChild(title);
        dialog.appendChild(fileInput);
        dialog.appendChild(importButton);
        dialog.appendChild(closeButton);
        
        this._root.appendChild(backdrop);
        this._root.appendChild(dialog);
      }
    }

    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        try {
          const data = await FileHandler.handleFile(file);
          this._fileData = data;
          const importButton = this._shadowRoot.querySelector('button:nth-of-type(2)');
          importButton.style.display = 'inline-block';
        } catch (error) {
          console.error('File upload failed:', error);
          // You might want to show an error message to the user here
        }
      }
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

    setClientCredentials(clientId, clientSecret) {
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    }
  
    async handleImport() {
      if (this._fileData) {
        try {
          const api = DataImportServiceApi.getInstance(this._clientId, this._clientSecret);
          const result = await api.importData(
            this._props.modelId,
            this._props.importType,
            this._fileData,
            this._props.mappings,
            this._props.defaultValues,
            this._props.jobSettings
          );
          console.log('Import successful:', result);
          this.handleImportComplete(result);
        } catch (error) {
          console.error('Import failed:', error);
        }
      }
    }
  }

  customElements.define('upload-main', FileUploadWidget);

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
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const csv = event.target.result;
              const lines = csv.split('\n');
              const result = lines.map(line => line.split(',').map(cell => cell.trim()));
              resolve(result);
            } catch (error) {
              reject(new Error('Failed to parse CSV file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read CSV file'));
          reader.readAsText(file);
        });
      },
    
      async _handleExcel(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, {type: 'array'});
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const result = XLSX.utils.sheet_to_json(worksheet, {header: 1});
              resolve(result);
            } catch (error) {
              reject(new Error('Failed to parse Excel file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read Excel file'));
          reader.readAsArrayBuffer(file);
        });
      }
    };
  
  // DataImportServiceApi implementation
  class DataImportServiceApi {
      static instance = null;

      constructor(clientId, clientSecret) {
        this.baseUrl = 'https://a2pp.authentication.eu10.hana.ondemand.com/api/v1/';
        this.oauthHandler = new OAuthHandler(clientId, clientSecret);
      }
    
      static getInstance(clientId, clientSecret) {
        if (!DataImportServiceApi.instance) {
          DataImportServiceApi.instance = new DataImportServiceApi(clientId, clientSecret);
        }
        return DataImportServiceApi.instance;
      }
    
      async fetchJson(url, options = {}) {
        const token = await this.oauthHandler.getAccessToken();
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
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
  
      async importData(modelId, importType, fileData, mappings, defaultValues, jobSettings) {
        const job = await this.createImportJob(modelId, importType, mappings, defaultValues, jobSettings);
        await this.postDataToJob(job.id, fileData);
        await this.validateJob(job.id);
        const result = await this.runJob(job.id);
        return result;
      }
  }

  class OAuthHandler {
      constructor(clientId, clientSecret) {
        this.clientId = 'sb-2ce9dd0e-27e0-4897-87e3-2b765bc0276c!b498618|client!b3650';
        this.clientSecret = '125e7bc7-5075-471b-adbe-df8793284e36$B2-jpvtouP9h0UUG-UtK9DyKDmGhS-M2tZ8NcBDw900=';
        this.tokenUrl = 'https://a2pp.authentication.eu10.hana.ondemand.com/oauth/token';
        this.accessToken = null;
        this.tokenExpiry = null;
      }
    
      async getAccessToken() {
        if (this.accessToken && this.tokenExpiry > Date.now()) {
          return this.accessToken;
        }
    
        const response = await fetch(this.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`
        });
    
        if (!response.ok) {
          throw new Error('Failed to obtain access token');
        }
    
        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        return this.accessToken;
      }
  }
  
  
})();
