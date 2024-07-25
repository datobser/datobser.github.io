(function() {
    let template = document.createElement("template");
    template.innerHTML = `
           <style>
            .builder-container {
                padding: 1rem;
                font-family: "72", "72full", Arial, Helvetica, sans-serif;
            }
            .builder-row {
                margin-bottom: 1rem;
            }
            .builder-label {
                display: block;
                margin-bottom: 0.5rem;
            }
          </style>
          <div id="root"></div>
          <div class="builder-container">
            <div class="builder-row">
                <label class="builder-label" for="modelSelect">Select Model:</label>
                <select id="modelSelect"></select>
            </div>
            <div class="builder-row">
                <label class="builder-label" for="importTypeSelect">Import Type:</label>
                <select id="importTypeSelect">
                    <option value="factData">Fact Data</option>
                    <option value="masterData">Master Data</option>
                    <option value="privateFactData">Private Fact Data</option>
                </select>
            </div>
        </div>
    `;

    class FileUploadWidgetBuilder extends HTMLElement {
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

          this._modelSelect = this._shadowRoot.getElementById('modelSelect');
          this._importTypeSelect = this._shadowRoot.getElementById('importTypeSelect');

          this._modelSelect.addEventListener('change', this._handleModelChange.bind(this));
          this._importTypeSelect.addEventListener('change', this._handleImportTypeChange.bind(this));
        }
    
        connectedCallback() {
          this.loadModels().then(() => {
            this.render();
          });
        }
    
        updateProps(event) {
            this._props = { ...this._props, ...event.detail.properties };
            this.render();
        }

        async loadModels() {
            try {
                const api = DataImportServiceApi.getInstance();
                this._props.models = await api.getModels();
            } catch (error) {
                console.error("Error loading models:", error);
                this._props.models = [];
            }
        }

        render() {
            // Instead of using ReactDOM.render, we'll update the DOM directly
            const root = this._root;
            root.innerHTML = ''; // Clear existing content

            const panel = document.createElement('div');
            panel.className = 'builder-panel';

            const modelLabel = document.createElement('label');
            modelLabel.textContent = 'Model:';
            panel.appendChild(modelLabel);

            const modelSelect = document.createElement('select');
            modelSelect.id = 'modelSelect';
            this._props.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
            modelSelect.value = this._props.modelId;
            modelSelect.addEventListener('change', this._handleModelChange.bind(this));
            panel.appendChild(modelSelect);

            const importTypeLabel = document.createElement('label');
            importTypeLabel.textContent = 'Import Type:';
            panel.appendChild(importTypeLabel);

            const importTypeSelect = document.createElement('select');
            importTypeSelect.id = 'importTypeSelect';
            ['factData', 'masterData', 'privateFactData'].forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                importTypeSelect.appendChild(option);
            });
            importTypeSelect.value = this._props.importType;
            importTypeSelect.addEventListener('change', this._handleImportTypeChange.bind(this));
            panel.appendChild(importTypeSelect);

            root.appendChild(panel);
        }

        _handleModelChange(event) {
            const newModelId = event.target.value;
            this.setModelId(newModelId);
        }

        _handleImportTypeChange(event) {
            const newImportType = event.target.value;
            this.setImportType(newImportType);
        }

        getModelId() {
            return this._props.modelId || "";
        }

        setModelId(modelId) {
            this._props.modelId = modelId;
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        modelId: modelId
                    }
                }
            }));
        }

        getImportType() {
            return this._props.importType || "";
        }

        setImportType(importType) {
            this._props.importType = importType;
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        importType: importType
                    }
                }
            }));
        }

        getMappings() {
            return this._props.mappings || {};
        }

        setMappings(mappings) {
            this._props.mappings = mappings;
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        mappings: mappings
                    }
                }
            }));
        }

        getDefaultValues() {
            return this._props.defaultValues || {};
        }

        setDefaultValues(defaultValues) {
            this._props.defaultValues = defaultValues;
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        defaultValues: defaultValues
                    }
                }
            }));
        }

        getJobSettings() {
            return this._props.jobSettings || {};
        }

        setJobSettings(jobSettings) {
            this._props.jobSettings = jobSettings;
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        jobSettings: jobSettings
                    }
                }
            }));
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

    customElements.define("upload-builder", FileUploadWidgetBuilder);
})();
