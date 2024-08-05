class UploadWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Initialize properties
        this._accessToken = null;
        this._csrfToken = null;
        this._modelId = null;
        this._jobId = null;
        this._fileData = null;
        this._fileType = null;

        // Create UI elements
        this._createElements();
        console.log('UploadWidget initialized');
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
        this._modelId = this.modelId; // Get modelId from data binding
        console.log('UploadWidget connected to the DOM. model-id:', this._modelId);
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

        console.log('UI elements created');
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

        console.log('UI elements rendered in shadow DOM');
    }

    _onFileChange(event) {
        const file = event.target.files[0];
        console.log('File selected:', file);

        this._uploadButton.disabled = !file;
        if (file) {
            if (file.size > this.maxFileSize) {
                console.log('File size exceeds limit');
                this._onFileSizeExceed();
                this._fileInput.value = '';
                this._uploadButton.disabled = true;
            } else {
                console.log('Reading file data');
                this._fileType = file.name.split('.').pop().toLowerCase();
                this._readFileData(file);
            }
        }
    }

    _readFileData(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const result = e.target.result;

            if (this._fileType === 'xlsx') {
                // Convert ArrayBuffer to Blob for .xlsx files
                this._fileData = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            } else if (this._fileType === 'csv') {
                // Convert text to Blob for .csv files
                this._fileData = new Blob([result], { type: 'text/csv' });
            }

            console.log(`File data read and converted to Blob successfully (${this._fileType})`);
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
        };

        if (this._fileType === 'xlsx') {
            reader.readAsArrayBuffer(file);
        } else if (this._fileType === 'csv') {
            reader.readAsText(file);
        }
    }




    _onUploadPress() {
        console.log('Upload button pressed');
        this._progressBar.style.display = 'block';
        this._progressBar.value = 0;
        const metadata =this._getModelMetadata();
        console.log('Model metadata:',metadata);
        this._getAccessToken()
            .then((accessToken) => {
                console.log('Access token obtained:', accessToken);
                return this._getCsrfToken().then(csrfToken => {
                    return { accessToken, csrfToken };
                });
            })
            .then(({ accessToken, csrfToken }) => {
                console.log('CSRF token obtained:', csrfToken);
                return this._createJob(this.modelId, "factData").then(jobId => {
                    return { accessToken, csrfToken, jobId };
                });
            })
            .then(({ accessToken, csrfToken, jobId }) => {
                console.log('Job created with ID:', jobId);
                this._jobId = jobId;
                return this._uploadData(jobId, this._fileData).then(() => {
                    return { accessToken, csrfToken, jobId };
                });
            })
            .then(({ accessToken, csrfToken, jobId }) => {
                console.log('Data uploaded successfully');
                return "dee7e875-23b2-4211-aeed-7a0c197551a5";
            })
            .then((response) => {
                console.log('Job run successfully:', response);
                this._progressBar.value = 100;
                this.dispatchEvent(new CustomEvent('uploadComplete', { detail: response }));
                return this._pollJobStatus('dee7e875-23b2-4211-aeed-7a0c197551a5');
            })
            .then((finalJobStatus) => {
                console.log('Final job status:', finalJobStatus);
                if (finalJobStatus.jobStatus === 'COMPLETED') {
                    this._progressBar.value = 100;
                    this.dispatchEvent(new CustomEvent('uploadComplete', { detail: finalJobStatus }));
                } else {
                    throw new Error(`Job failed: ${finalJobStatus.jobStatusDescription}`);
                }
            })
            .catch((error) => {
                console.error('Error during upload process:', error);
                this._progressBar.style.display = 'none';
                this.dispatchEvent(new CustomEvent('uploadError', { detail: error }));
            });
    }


    _getAccessToken() {
        console.log('Requesting access token');
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
                    console.log('Access token response:', response);
                    this._accessToken = response.access_token;
                    resolve(this._accessToken); // Resolve with the access token
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Access token request failed:', errorThrown);
                    reject(errorThrown);
                }
            });
        });
    }
    
    _getCsrfToken() {
        console.log('Requesting CSRF token');
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.eu10.hcs.cloud.sap" + "/api/v1/csrf",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": "fetch",
                    "x-sap-sac-custom-auth": "true"
                },
                success: (data, textStatus, jqXHR) => {
                    console.log('CSRF token response:', data);
                    this._csrfToken = jqXHR.getResponseHeader("x-csrf-token");
                    resolve(this._csrfToken); // Resolve with the CSRF token
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('CSRF token request failed:', errorThrown);
                    reject(errorThrown);
                }
            });
        });
    }

    
    _createJob() {
        console.log('Creating job with modelId:', this.modelId);
        const modelId = "Coocob05ulj04oih3r0j6m9ga60"; 
        console.log('modelId set:', modelId);
        const importType = "factData";
        console.log(importType);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.eu10.hcs.cloud.sap" + "/api/v1/dataimport/models/" + modelId + "/factData",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    importType: importType,
                    jobSettings: {
                        importMethod: "Update", 
                        dimensionScope: [],
                        dateFormats: {},
                        executeWithFailedRows: false,
                        ignoreAdditionalColumns: false
                    }
                }),
                success: (response) => {
                    console.log('Job creation response:', response);
                    this._jobId = response.JobID;
                    resolve(response.JobID);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    const responseText = jqXHR.responseText;
                    const errorMessage = `Job creation request failed: ${textStatus} - ${errorThrown}. Response: ${responseText}`;
                    console.error(errorMessage);
                    reject(errorThrown);
                }
            });
        });
    }

    _uploadData() {
        console.log('Uploading data for jobId: 03711ca7-2023-4cb6-a497-22f6ec2af4bb');
        return new Promise((resolve, reject) => {
            if (!this._fileData) {
                reject(new Error('No data available to upload'));
                return;
            }
            console.log(this._fileData);
            $.ajax({
                url: "https://a2pp-1.eu10.hcs.cloud.sap" + "/api/v1/dataimport/jobs/03711ca7-2023-4cb6-a497-22f6ec2af4bb",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({ "Data": this._fileData}),
                success: (response) => {
                    console.log('Data upload response:', response);
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Data upload request failed:', errorThrown);
                    reject(errorThrown);
                }
            });
        });
    }

    _runJob() {
        console.log('Running job with jobId:', jobId);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "https://a2pp-1.eu10.hcs.cloud.sap" + "/api/v1/dataimport/jobs/dee7e875-23b2-4211-aeed-7a0c197551a5" + "/run",
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                success: (response) => {
                    console.log('Job run response:', response);
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    const responseText = jqXHR.responseText;
                    const errorMessage = `Job run request failed: ${textStatus} - ${errorThrown}. Response: ${responseText}`;
                    console.error(errorMessage);
                }
            });
        });
    }

    _pollJobStatus(jobId, maxAttempts = 30, interval = 5000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            const checkStatus = () => {
                this._getJobStatus(jobId)
                    .then(status => {
                        console.log(`Job status (attempt ${attempts + 1}):`, status);
                        this._updateProgressBar(status);

                        if (status.jobStatus === 'COMPLETED') {
                            resolve(status);
                        } else if (status.jobStatus === 'FAILED') {
                            reject(new Error(`Job failed: ${status.jobStatusDescription}`));
                        } else if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(checkStatus, interval);
                        } else {
                            reject(new Error('Max attempts reached. Job did not complete in time.'));
                        }
                    })
                    .catch(reject);
            };

            checkStatus();
        });
    }

    _getJobStatus() {
        console.log('Getting job status for jobId:', jobId);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/api/v1/dataimport/jobs/dee7e875-23b2-4211-aeed-7a0c197551a5" + "/status",
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken
                },
                success: (response) => {
                    console.log('Job status response:', response);
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Job status request failed:', errorThrown);
                    reject(new Error(`Failed to get job status: ${errorThrown}`));
                }
            });
        });
    }

    _getModelMetadata() {
        console.log('Retrieving model metadata');
        const modelId = "Coocob05ulj04oih3r0j6m9ga60";
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `https://a2pp-1.eu10.hcs.cloud.sap" + "/api/v1/dataimport/models/" + modelId + "/metadata`,
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken
                },
                success: (response) => {
                    console.log('Model metadata:', response);
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    const responseText = jqXHR.responseText;
                    const errorMessage = `Failed to retrieve model metadata: ${textStatus} - ${errorThrown}. Response: ${responseText}`;
                    console.error(errorMessage);
                }
            });
        });
    }

    _onTypeMismatch() {
        console.log('File type mismatch');
        
    }

    _onFileSizeExceed() {
        console.log('File size exceeds limit');
        
    }
}

customElements.define('upload-main', UploadWidget);
