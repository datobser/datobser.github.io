class ExcelWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Initialize properties
        this._tenantUrl = 'https://a2pp-1.eu10.hcs.cloud.sap';
        this._accessToken = null;
        this._csrfToken = null;
        this._modelId = 'Cl94sr05ultdetk3npm9hu6q83u';
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

    get modelId() { return this.getAttribute('model-id') || this._modelId; }
    get tenantUrl() { return this._tenantUrl; }
    get clientId() { return this.getAttribute('client-id'); }
    get clientSecret() { return this.getAttribute('client-secret'); }
    get tokenUrl() { return this.getAttribute('token-url'); }
    get maxFileSize() { return parseInt(this.getAttribute('max-file-size')) || 10 * 1024 * 1024; } // 10MB default

    connectedCallback() {
        this._render();
        this._modelId = this.modelId; // Get modelId from data binding
        console.log('UploadWidget connected to the DOM. model-id:', this._modelId);
    }

    _createElements() {
        this._fileInput = document.createElement('input');
        this._fileInput.type = 'file';
        this._fileInput.accept = '.xlsx, .xls, .xlsm';


        this._uploadButton = document.createElement('button');
        this._uploadButton.textContent = 'Upload';
        this._uploadButton.disabled = true;

        this._progressBar = document.createElement('progress');
        this._progressBar.style.display = 'none';

        this._modelIdDisplay = document.createElement('p');
        this._modelIdDisplay.textContent = `sending Excel data to Model ID: ${this._modelId}`;

        this._fileInput.addEventListener('change', this._onFileChange.bind(this));
        this._uploadButton.addEventListener('click', this._onUploadPress.bind(this));

        this._createSheetJSLibrary();

        console.log('UI elements created');
    }

    _createSheetJSLibrary() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) {
                console.log('ExcelJS library already loaded');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.2.1/exceljs.min.js';
            script.async = true;
            script.onload = () => {
                console.log('ExcelJS library loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load SheetJS library');
                reject(new Error('Failed to load SheetJS library'));
            };
            document.head.appendChild(script);
        });
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
        this.shadowRoot.appendChild(this._modelIdDisplay);

        console.log('UI elements rendered in shadow DOM');
    }

    _onFileChange(event) {
        const file = event.target.files[0];
        console.log('File selected:', file);
    
        this._uploadButton.disabled = true;
        this._fileData = null;
        this._fileType = null;
    
        if (!file) {
            console.log('No file selected');
            return;
        }
    
        if (file.size > this.maxFileSize) {
            console.log('File size exceeds limit');
            this._onFileSizeExceed();
            this._fileInput.value = '';
            return;
        }
    
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.xlsm')) {
            this._fileType = 'excel';
        } else {
            console.error('Invalid file type. Please select an Excel file.');
            this._onTypeMismatch();
            this._fileInput.value = '';
            return;
        }
    
        console.log('File type:', this._fileType);
        this._readFileData(file);
    }

    _readFileData(file) {
        const reader = new FileReader();
    
        reader.onload = async (e) => {
            const result = e.target.result;
    
            try {
                // Convert ArrayBuffer to Blob for Excel files
                const arrayBuffer = await new Response(result).arrayBuffer();
                this._fileData = await this._convertExcelToCSV(arrayBuffer);
                this._fileType = 'csv'; // We convert Excel to CSV
    
                console.log('File data read and prepared successfully');
                this._uploadButton.disabled = false; // Enable the upload button
            } catch (error) {
                console.error('Error during file processing:', error);
                this._fileData = null;
                this._uploadButton.disabled = true;
            }
        };
    
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            this._uploadButton.disabled = true;
        };
    
        reader.readAsArrayBuffer(file);
    }

    async _convertExcelToCSV(data) {
        console.log('Entered convertExcelToCSV with:', data);
    
        if (!window.ExcelJS) {
            console.error('ExcelJS library not loaded');
            return null;
        }
    
        try {
            // Create a new workbook
            const workbook = new ExcelJS.Workbook();
    
            // Load the workbook from the ArrayBuffer
            await workbook.xlsx.load(data);
    
            // Log the number of worksheets
            console.log('Number of worksheets:', workbook.worksheets.length);
    
            // Get the first worksheet
            const worksheet = workbook.worksheets[0]; // Access the first worksheet directly
    
            if (!worksheet) {
                console.error('No worksheet found in the workbook');
                return null;
            }
    
            // Log the worksheet name and number of rows
            console.log('Worksheet name:', worksheet.name);
            console.log('Number of rows in the worksheet:', worksheet.rowCount);
    
            // Convert the worksheet to CSV
            let csvContent = '';
            worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
                csvContent += row.values.slice(1).join(',') + '\n';  // slice(1) to remove the first undefined value
            });
    
            console.log('Excel file successfully converted to CSV');
            console.log(csvContent);
            return csvContent;
    
        } catch (error) {
            console.error('Error during Excel to CSV conversion:', error);
            return null;
        }
    }



    
    _onUploadPress() {
        console.log('Upload button pressed');
        if (!this._modelId) {
            console.error('Model ID is not set. Cannot proceed with upload.');
            this.dispatchEvent(new CustomEvent('uploadError', { detail: 'Model ID is not set' }));
            return;
        }

        if (!this._fileData) {
            console.error('No file selected. Cannot proceed with upload.');
            this.dispatchEvent(new CustomEvent('uploadError', { detail: 'No file selected' }));
            return;
        }
        console.log('Data to send:', this._fileData);
        this._progressBar.style.display = 'block';
        this._progressBar.value = 0;

        this._getAccessToken()
            .then((accessToken) => {
                console.log('Access token obtained:', accessToken);
                // Get CSRF token after obtaining access token
                return this._getCsrfToken().then(csrfToken => {
                    return { accessToken, csrfToken };
                });
            })
            .then(({ accessToken, csrfToken }) => {
                console.log('CSRF token obtained:', csrfToken);
                // Create job
                return this._createJob(this._modelId, "factData");
            })
            .then((jobId) => {
                console.log('Job created with ID:', jobId);
                this._jobId = jobId;
                // Upload data
                return this._uploadData(jobId, this._fileData);
            })
            .then((uploadResponse) => {
                console.log('Data upload response:', uploadResponse);
                if (uploadResponse.status !== 'success') {
                    throw new Error(`Data upload failed: ${uploadResponse.message}`);
                }
                // Run job
                return this._runJob(this._jobId);
            })
            .then((runJobResponse) => {
                console.log('Job run response:', runJobResponse);
                if (runJobResponse.status !== 'success') {
                    throw new Error(`Job execution failed: ${runJobResponse.message}`);
                }
                // Poll job status
                return this._pollJobStatus(this._jobId);
            })
            .then((finalJobStatus) => {
                console.log('Final job status:', finalJobStatus);
                if (finalJobStatus.jobStatus === 'COMPLETED') {
                    this._progressBar.value = 100;
                    this.dispatchEvent(new CustomEvent('uploadComplete', { detail: finalJobStatus }));
                } else {
                    throw new Error(`Job did not complete successfully: ${finalJobStatus.jobStatusDescription}`);
                }
            })
            .catch((error) => {
                console.error('Error during upload process:', error);
                this._progressBar.style.display = 'none';
                this.dispatchEvent(new CustomEvent('uploadError', { detail: error.message }));
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
    
    _createJob(modelId, importType) {
        console.log('Creating job for modelId:', modelId);
        const url = `${this.tenantUrl}/api/v1/dataimport/models/${modelId}/${importType}`;
        console.log('Creating job using URL:', url);
        console.log('importType:', importType);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${this.tenantUrl}/api/v1/dataimport/models/${modelId}/${importType}`,
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
                    console.log('Job creation response received:', response);
                    if (response && response.jobID) {
                        console.log(`Job created successfully with ID: ${response.jobID}`);
                        resolve(response.jobID);
                    } else {
                        console.error('Invalid job creation response:', response);
                        reject(new Error('Invalid job creation response: jobID not found'));
                    }
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Job creation request failed:', textStatus, errorThrown);
                    console.error('Error details:', jqXHR.responseText);
                    reject(new Error(`Failed to create job: ${errorThrown}`));
                }

            });
        });
    }

    _uploadData(jobId) {
        console.log(`Starting data upload process for jobId: ${jobId}`);
        return new Promise((resolve, reject) => {
            if (!this._fileData) {
                console.error('No file data available for upload');
                reject(new Error('No data available to upload'));
                return;
            }
    
            console.log('Preparing data for upload');
            const url = `${this.tenantUrl}/api/v1/dataimport/jobs/${jobId}`;
            console.log(`Upload URL: ${url}`);
    
            // Log the data being sent
            console.log('Data being sent:', this._fileData);
    
            $.ajax({
                url: url,
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this._accessToken}`,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": this._fileType === 'csv' ? "text/csv" : "application/json"
                },
                data: this._fileType === 'csv' ? this._fileData : JSON.stringify({ "Data": this._fileData }),
                success: (response) => {
                    console.log('uploadData response received:', response);
                    if (response.upsertedNumberRows !== undefined) {
                        resolve({
                            status: 'success',
                            message: 'Data uploaded successfully',
                            response: response
                        });
                    } else if (response.error) {
                        reject(new Error(`Data upload failed: ${response.error.message}`));
                    } else {
                        reject(new Error('Unexpected response format'));
                    }
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Data upload request failed:', textStatus, errorThrown);
                    console.error('Error details:', jqXHR.responseText);
                    reject(new Error(`Failed to upload data: ${errorThrown}`));
                }
            });
        });
    }


   _runJob(jobId) {
        console.log('Running job with jobId:', jobId);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${this.tenantUrl}/api/v1/dataimport/jobs/${jobId}/run`,
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken,
                    "Content-Type": "application/json"
                },
                success: (response) => {
                    console.log('Job run response:', response);
                    resolve({ status: 'success', message: 'Job execution initiated', response });
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Job run request failed:', errorThrown);
                    if (jqXHR.responseJSON && jqXHR.responseJSON.error && jqXHR.responseJSON.error.message.includes("Every row in temporary storage is invalid")) {
                        this._getInvalidRows(jobId)
                            .then(invalidRows => {
                                console.error('All rows are invalid. Invalid rows:', invalidRows);
                                reject(new Error(`All rows are invalid. Please check the data and try again.`));
                            })
                            .catch(error => {
                                reject(new Error(`Failed to run job and retrieve invalid rows: ${error.message}`));
                            });
                    } else {
                        console.error('Data upload request failed:', textStatus, errorThrown);
                        console.error('Error details:', jqXHR.responseText);
                        reject(new Error(`Failed to run job: ${errorThrown}`));
                    }
                }
            });
        });
    }

    _pollJobStatus(jobId, maxAttempts = 10, interval = 5000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            let isFinished = false;
            let timeoutId = null;
    
            const checkStatus = () => {
                if (isFinished) return; // Stop if we've already finished
    
                this._getJobStatus(jobId)
                    .then(status => {
                        console.log(`Job status (attempt ${attempts + 1}):`, status);
                        //this._updateProgressBar(status);
    
                        if (status.jobStatus === 'COMPLETED') {
                            isFinished = true;
                            clearTimeout(timeoutId);
                            resolve(status);
                        } else if (status.jobStatus === 'FAILED') {
                            isFinished = true;
                            clearTimeout(timeoutId);
                            reject(new Error(`Job failed: ${status.jobStatusDescription}`));
                        } else if (attempts < maxAttempts) {
                            attempts++;
                            timeoutId = setTimeout(checkStatus, interval);
                        } else {
                            isFinished = true;
                            reject(new Error('Max attempts reached. Job did not complete in time.'));
                        }
                    })
                    .catch(error => {
                        isFinished = true;
                        clearTimeout(timeoutId);
                        reject(error);
                    });
            };
    
            checkStatus();
        });
    }

    _getJobStatus(jobId) {
        console.log(`Getting job status for jobId: ${jobId}`);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${this.tenantUrl}/api/v1/dataimport/jobs/${jobId}/status`,
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
        console.log('Retrieving model metadata for model ID:', this._modelId);
        console.log('csrfToken:', this._csrfToken);
        return new Promise((resolve, reject) => {
            if (!this._modelId) {
                reject(new Error('Model ID is not set. Cannot retrieve metadata.'));
                return;
            }

            $.ajax({
                url: `${this.tenantUrl}/api/v1/dataimport/models/${this._modelId}/metadata`,
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
                    reject(new Error(errorMessage));
                }
            });
        });
    }

    _getInvalidRows(jobId) {
        console.log('Retrieving invalid rows for jobId:', jobId);
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${this.tenantUrl}/api/v1/dataimport/jobs/${jobId}/invalidRows`,
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + this._accessToken,
                    "x-csrf-token": this._csrfToken
                },
                success: (response) => {
                    console.log('Invalid rows:', response);
                    resolve(response);
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    console.error('Failed to retrieve invalid rows:', errorThrown);
                    reject(new Error(`Failed to retrieve invalid rows: ${errorThrown}`));
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

customElements.define('excel-upload', ExcelWidget);
