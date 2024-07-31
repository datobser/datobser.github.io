class UploadWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Initialize properties
        this._accessToken = null;
        this._csrfToken = null;
        this._jobId = null;
        this._fileData = null;

        // Create UI elements
        this._createElements();
    }

    static get observedAttributes() {
        return ['model-id', 'tenant-url', 'client-id', 'client-secret', 'token-url', 'accepted-file-types', 'max-file-size'];
    }

    get modelId() { return this.getAttribute('model-id'); }
    get tenantUrl() { return this.getAttribute('tenant-url'); }
    get clientId() { return this.getAttribute('client-id'); }
    get clientSecret() { return this.getAttribute('client-secret'); }
    get tokenUrl() { return this.getAttribute('token-url'); }
    get acceptedFileTypes() { return this.getAttribute('accepted-file-types') || '.csv,.xlsx'; }
    get maxFileSize() { return parseInt(this.getAttribute('max-file-size')) || 10 * 1024 * 1024; } // 10MB default

    connectedCallback() {
        this._render();
    }

    _createElements() {
        this._fileInput = document.createElement('input');
        this._fileInput.type = 'file';
        this._fileInput.accept = this.acceptedFileTypes;

        this._uploadButton = document.createElement('button');
        this._uploadButton.textContent = 'Upload';
        this._uploadButton.disabled = true;

        this._progressBar = document.createElement('progress');
        this._progressBar.style.display = 'none';

        this._fileInput.addEventListener('change', this._onFileChange.bind(this));
        this._uploadButton.addEventListener('click', this._onUploadPress.bind(this));
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: Arial, sans-serif;
                }
                button {
                    margin-top: 10px;
                }
                progress {
                    width: 100%;
                    margin-top: 10px;
                }
            </style>
        `;
        this.shadowRoot.appendChild(this._fileInput);
        this.shadowRoot.appendChild(this._uploadButton);
        this.shadowRoot.appendChild(this._progressBar);
    }

    _onFileChange(event) {
        const file = event.target.files[0];
        this._uploadButton.disabled = !file;
        if (file) {
            if (file.size > this.maxFileSize) {
                this._onFileSizeExceed();
                this._fileInput.value = '';
                this._uploadButton.disabled = true;
            } else {
                this._readFileData(file);
            }
        }
    }

    _readFileData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this._fileData = e.target.result;
        };
        reader.readAsText(file);
    }

    _onUploadPress() {
        this._progressBar.style.display = 'block';
        this._progressBar.value = 0;

        this._getAccessToken()
            .then(() => this._getCsrfToken())
            .then(() => this._createJob(this.modelId, "factData"))
            .then((jobId) => {
                this._jobId = jobId;
                return this._uploadData(jobId, this._fileData);
            })
            .then(() => this._runJob(this._jobId))
            .then((response) => {
                this._progressBar.value = 100;
                this.dispatchEvent(new CustomEvent('uploadComplete', { detail: response }));
                this._showMessage("Upload completed successfully");
            })
            .catch((error) => {
                this._progressBar.style.display = 'none';
                this.dispatchEvent(new CustomEvent('uploadError', { detail: error }));
                this._showMessage("Upload failed: " + error, true);
            });
    }

    _getAccessToken() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.authentication.eu10.hana.ondemand.com/oauth/token",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: {
                    grant_type: "client_credentials",
                    client_id: "sb-2ce9dd0e-27e0-4897-87e3-2b765bc0276c!b498618|client!b3650",
                    client_secret: "125e7bc7-5075-471b-adbe-df8793284e36$B2-jpvtouP9h0UUG-UtK9DyKDmGhS-M2tZ8NcBDw900="
                },
                success: (response) => {
                    this._accessToken = response.access_token;
                    resolve();
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    reject(errorThrown);
                }
            });
        });
    }

    _getCsrfToken() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.authentication.eu10.hana.ondemand.com" + "/api/v1/csrf",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": "fetch",
                    "x-sap-sac-custom-auth": "true"
                },
                success: (data, textStatus, jqXHR) => {
                    this._csrfToken = jqXHR.getResponseHeader("x-csrf-token");
                    resolve();
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    reject(errorThrown);
                }
            });
        });
    }

    _createJob() {
        const modelId = "Coocob05ulj04oih3r0j6m9ga60"; 
        const importType = "csv"; 
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.authentication.eu10.hana.ondemand.com" + "/api/v1/dataimport/models/" + modelId,
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    "JobSettings": {
                        "importType": importType
                    }
                }),
                success: (response) => {
                    resolve(response.JobID);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    reject(errorThrown);
                }
            });
        });
    }

    _uploadData(jobId, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.authentication.eu10.hana.ondemand.com" + "/api/v1/dataimport/jobs/" + jobId,
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ "Data": data }),
                success: (response) => {
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    reject(errorThrown);
                }
            });
        });
    }

    _runJob(jobId) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.authentication.eu10.hana.ondemand.com" + "/api/v1/dataimport/jobs/" + jobId + "/run",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                success: (response) => {
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    reject(errorThrown);
                }
            });
        });
    }

    _onTypeMismatch() {
        this._showMessage(`Invalid file type. Accepted types: ${this.acceptedFileTypes}`, true);
    }

    _onFileSizeExceed() {
        this._showMessage(`File size exceeds the maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`, true);
    }

    _showMessage(message, isError = false) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.color = isError ? 'red' : 'green';
        messageElement.style.marginTop = '10px';
        this.shadowRoot.appendChild(messageElement);
        setTimeout(() => this.shadowRoot.removeChild(messageElement), 5000);
    }
}

customElements.define('upload-main', UploadWidget);
