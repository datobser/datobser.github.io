(function() {
    // Define a function to dynamically load scripts
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Define a function to load all required dependencies
  async function loadDependencies() {
    const dependencies = [
      'https://unpkg.com/react@17/umd/react.production.min.js',
      'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js',
      'https://unpkg.com/@ui5/webcomponents-base@1.19.0/dist/bundle.js',
      'https://unpkg.com/@ui5/webcomponents@1.19.0/dist/bundle.js'
    ];

    for (const url of dependencies) {
      await loadScript(url);
    }

    // Load specific UI5 Web Components
    await Promise.all([
      loadScript('https://unpkg.com/@ui5/webcomponents@1.19.0/dist/Select.js'),
      loadScript('https://unpkg.com/@ui5/webcomponents@1.19.0/dist/Option.js'),
      loadScript('https://unpkg.com/@ui5/webcomponents@1.19.0/dist/Input.js'),
      loadScript('https://unpkg.com/@ui5/webcomponents@1.19.0/dist/Button.js')
    ]);
  }


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
        <div class="builder-container" id="root"></div>
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
        const [modelId, setModelId] = useState(props.modelId || "");
        const [importType, setImportType] = useState(props.importType || "");

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

        return (
            <div>
                <div className="builder-row">
                    <label className="builder-label" htmlFor="modelSelect">Select Model:</label>
                    <ui5-select id="modelSelect" onChange={handleModelChange}>
                        {props.models && props.models.map(model => (
                            <ui5-option key={model.id} value={model.id}>{model.name}</ui5-option>
                        ))}
                    </ui5-select>
                </div>
                <div className="builder-row">
                    <label className="builder-label" htmlFor="importTypeSelect">Import Type:</label>
                    <ui5-select id="importTypeSelect" onChange={handleImportTypeChange}>
                        <ui5-option value="factData">Fact Data</ui5-option>
                        <ui5-option value="masterData">Master Data</ui5-option>
                        <ui5-option value="privateFactData">Private Fact Data</ui5-option>
                    </ui5-select>
                </div>
                {/* Add more configuration options here as needed */}
            </div>
        );
    };

    customElements.define("upload-builder", FileUploadWidgetBuilder);
})();
