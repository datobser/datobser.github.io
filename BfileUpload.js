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

          <script>
            async function loadDependencies() {
              const dependencies = [
                'https://unpkg.com/react@17/umd/react.production.min.js',
                'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js',
                'https://unpkg.com/papaparse@5.3.0/papaparse.min.js',
                'https://unpkg.com/xlsx@0.17.0/dist/xlsx.full.min.js',
                'https://unpkg.com/@ui5/webcomponents/dist/Assets.js',
                'https://unpkg.com/@ui5/webcomponents-base/dist/features/F6Navigation.js',
                'https://unpkg.com/@ui5/webcomponents/dist/Select.js',
                'https://unpkg.com/@ui5/webcomponents/dist/Option.js',
                'https://unpkg.com/@babel/standalone/babel.min.js'
              ];
              for (const url of dependencies) {
                await loadScript(url);
              }
            }
        
            function loadScript(url) {
              return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }
        
            loadDependencies().then(() => {
              Babel.transformScriptTags();
            });
          </script>
        
          <script type="text/babel">
            const BuilderPanel = (props) => {
              const [modelId, setModelId] = React.useState(props.modelId || "");
              const [importType, setImportType] = React.useState(props.importType || "");
        
              const handleModelChange = (event) => {
                const newModelId = event.detail.selectedOption.getAttribute("value");
                setModelId(newModelId);
                props.setModelId(newModelId);
              };
        
              const handleImportTypeChange = (event) => {
                const newImportType = event.detail.selectedOption.getAttribute("value");
                setImportType(newImportType);
                props.setImportType(newImportType);
              };
        
              return React.createElement(
                'div',
                null,
                React.createElement(
                  'div',
                  { className: "builder-row" },
                  React.createElement('label', { className: "builder-label", htmlFor: "modelSelect" }, "Select Model:"),
                  React.createElement(
                    'ui5-select',
                    { id: "modelSelect", onChange: handleModelChange },
                    props.models && props.models.map(model =>
                      React.createElement('ui5-option', { key: model.id, value: model.id }, model.name)
                    )
                  )
                ),
                React.createElement(
                  'div',
                  { className: "builder-row" },
                  React.createElement('label', { className: "builder-label", htmlFor: "importTypeSelect" }, "Import Type:"),
                  React.createElement(
                    'ui5-select',
                    { id: "importTypeSelect", onChange: handleImportTypeChange },
                    React.createElement('ui5-option', { value: "factData" }, "Fact Data"),
                    React.createElement('ui5-option', { value: "masterData" }, "Master Data"),
                    React.createElement('ui5-option', { value: "privateFactData" }, "Private Fact Data")
                  )
                )
              );
            };
        
            const props = {
              modelId: "",
              importType: "",
              setModelId: (id) => console.log("Model ID set to:", id),
              setImportType: (type) => console.log("Import Type set to:", type),
              models: [
                { id: '1', name: 'Model 1' },
                { id: '2', name: 'Model 2' },
                { id: '3', name: 'Model 3' }
              ]
            };
        
            ReactDOM.render(
              <BuilderPanel {...props} />,
              document.getElementById('root')
            );
          </script>
    `;

    class FileUploadWidgetBuilder extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._root = this._shadowRoot.getElementById("root");
            this._props = {};

            this.addEventListener("propertiesChanged", this.updateProps.bind(this));
        }

        updateProps(event) {
            this._props = { ...this._props, ...event.detail.properties };
            this.render();
        }

        async connectedCallback() {
            await this.loadModels();
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
            ReactDOM.render(React.createElement(BuilderPanel, this._props), this._root);
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

    const BuilderPanel = (props) => {
      const [modelId, setModelId] = React.useState(props.modelId || "");
      const [importType, setImportType] = React.useState(props.importType || "");
    
      const handleModelChange = (event) => {
        const newModelId = event.detail.selectedOption.getAttribute("value");
        setModelId(newModelId);
        props.setModelId(newModelId);
      };
    
      const handleImportTypeChange = (event) => {
        const newImportType = event.detail.selectedOption.getAttribute("value");
        setImportType(newImportType);
        props.setImportType(newImportType);
      };
    
      return React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { className: "builder-row" },
          React.createElement(
            'label',
            { className: "builder-label", htmlFor: "modelSelect" },
            "Select Model:"
          ),
          React.createElement(
            'ui5-select',
            { id: "modelSelect", onChange: handleModelChange },
            props.models && props.models.map(model =>
              React.createElement(
                'ui5-option',
                { key: model.id, value: model.id },
                model.name
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: "builder-row" },
          React.createElement(
            'label',
            { className: "builder-label", htmlFor: "importTypeSelect" },
            "Import Type:"
          ),
          React.createElement(
            'ui5-select',
            { id: "importTypeSelect", onChange: handleImportTypeChange },
            React.createElement('ui5-option', { value: "factData" }, "Fact Data"),
            React.createElement('ui5-option', { value: "masterData" }, "Master Data"),
            React.createElement('ui5-option', { value: "privateFactData" }, "Private Fact Data")
          )
        )
        // Add more configuration options here as needed
      );
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
    
        async fetchJson(baseUrl, options = {}) {
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
