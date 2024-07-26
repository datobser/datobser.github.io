(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
    <style>
    .switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ca2222;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2ab934;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

#chart {
    border: 1px solid #000;
    padding: 10px;
    margin: 10px;
    width: 100%; 
    max-width: 95%; 
    height: 500px;  
    overflow: hidden; 
    box-sizing: border-box;  
}

  #image-container {
            width: 100%;
            height: 100px;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }

        
    </style>


     <div id="image-container"> <svg width="750" height="100">  </svg></div> 
    <div id="chart"></div>

<div style="display: flex; align-items: center;">
  <label class="switch">
    <input type="checkbox" id="debugToggle">
    <span class="slider round"></span>
  </label>
  <p id="debugStatus" style="margin-left: 10px;">Debugging Mode Inactive</p>
</div>

<div id="debugging-area" style="display: none;">
  <h2>Debugging Mode</h2>
  <button id="getAccessToken">Get Access Token</button>
  <button id="getCsrfToken">Get CSRF Token</button>
  <button id="createJob">Create Job</button>
  <button id="uploadData">Upload Data</button>
  <button id="validateJob">Validate Job</button>
  <button id="runJob">Run Job</button>
  <h3>Messages</h3>
  <div id="messages"></div>
</div>

    `;

        class GanttChartWidgetAPI extends HTMLElement {
        constructor() {
            super();
            console.log('Constructor called');
            this._shadowRoot = this.attachShadow({ mode: 'open' });
            this._shadowRoot.appendChild(tmpl.content.cloneNode(true));
            this._props = {};
            this.tasks = [];
            this.taskToCsv = this.taskToCsv.bind(this);
    
            // Add event listener for the toggle button
            this._shadowRoot.getElementById('debugToggle').addEventListener('change', () => {
                const debuggingArea = this._shadowRoot.getElementById('debugging-area');
                const debugStatus = this._shadowRoot.getElementById('debugStatus');
                if (this._shadowRoot.getElementById('debugToggle').checked) {
                    debugStatus.textContent = 'Debugging Mode Active';
                    debuggingArea.style.display = 'block';
                } else {
                    debugStatus.textContent = 'Debugging Mode Inactive';
                    debuggingArea.style.display = 'none';
                }
            });
    
            // Get a reference to the messages element
            const messagesElement = this._shadowRoot.getElementById('messages');
    
            // Pass the reference to the functions
            const csvData_debugger = `Version,Date,id,label,startDate,endDate,open,progress
            public.Actual,202401,999,TaskDebugger,2023-02-02,2023-05-05,X,1`;
    
            this._shadowRoot.getElementById('getAccessToken').addEventListener('click', () => this.getAccessToken(messagesElement));
            this._shadowRoot.getElementById('getCsrfToken').addEventListener('click', () => this.getCsrfToken().then(token => {
                const messagesElement = this._shadowRoot.getElementById('messages');
                messagesElement.textContent = `CSRF Token obtained: ${token}`;
                }).catch(error => {
                    const messagesElement = this._shadowRoot.getElementById('messages');
                    messagesElement.textContent = `Error getting CSRF Token: ${error.message}`;
                })
            );
            this._shadowRoot.getElementById('createJob').addEventListener('click', () => this.createJob(messagesElement));
            this._shadowRoot.getElementById('uploadData').addEventListener('click', () => this.uploadData(csvData_debugger, messagesElement));
            this._shadowRoot.getElementById('validateJob').addEventListener('click', () => this.validateJob(messagesElement));
            this._shadowRoot.getElementById('runJob').addEventListener('click', () => this.runJob(messagesElement));
    
            // Load DHTMLX Gantt CSS
            const dhtmlxGanttCSS = document.createElement('link');
            dhtmlxGanttCSS.rel = 'stylesheet';
            dhtmlxGanttCSS.href = 'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.css';
            this._shadowRoot.appendChild(dhtmlxGanttCSS);
    
            // Load DHTMLX Gantt
            const dhtmlxGanttScript = document.createElement('script');
            dhtmlxGanttScript.src = 'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.js';
            dhtmlxGanttScript.onload = () => {
                this._dhtmlxGanttReady = true;
                this._renderChart();
            };
            this._shadowRoot.appendChild(dhtmlxGanttScript);
    
            // Load SACAPI_DataImport.js
            const script = document.createElement('script');
            script.src = 'https://datobser.github.io/SACAPI_DataImport.js';
            document.head.appendChild(script);
    
            // Initialize SAP API methods
            console.log('initializing access...');
            this.getAccessToken = this.getAccessToken.bind(this);
            console.log('initializing csrf...');
            this.getCsrfToken = this.getCsrfToken.bind(this);
            console.log('initializing api methods...');
            this.createJob = window.createJob;
            this.uploadData = window.uploadData;
            this.validateJob = window.validateJob;
            this.runJob = window.runJob;
    
            const refreshButton = document.createElement('button');
            refreshButton.textContent = 'Refresh from SAP';
            refreshButton.addEventListener('click', () => this.refreshFromSAPModel());
            this._shadowRoot.appendChild(refreshButton);
        }
    
        taskToCsv(task) {
            // Convert the task data to the CSV format
            const version = 'public.Actual';
            const date = '000000';
            const id = task.id;
            const label = task.text;
            const startDate = task.start_date.toISOString().slice(0, 10);  // Convert the date to the format YYYYMMDD
            const endDate = task.end_date.toISOString().slice(0, 10);  // Convert the date to the format YYYYMMDD
            const open = 'X';
            const progress = '0';
    
            console.log("New task was added: ", task);
    
            // Create the CSV string
            const csvString = `${version},${date},${id},${label},${startDate},${endDate},${open},${progress}`;
    
            // Log the CSV string
            console.log('CSV string:', csvString);
            const csvData_raw = 'Version,Date,id,label,startDate,endDate,open,progress\n' + csvString;
    
            // Return the CSV string
            console.log('Data_raw:', csvData_raw);
    
            return csvData_raw;
        }
    
        // GanttChart methods
        static get metadata() {
            console.log('metadata called');
            return {
                properties: {
                    myDataBinding: {
                        type: "object",
                        defaultValue: {}
                    },
                }
            };
        }
    
        onCustomWidgetBeforeUpdate(changedProperties) {
            console.log('onCustomWidgetBeforeUpdate called');
            this._props = { ...this._props, ...changedProperties };
        }
    
        onCustomWidgetAfterUpdate(changedProperties) {
            console.log('onCustomWidgetAfterUpdate called');
            if ("myDataBinding" in changedProperties) {
                const dataBinding = changedProperties.myDataBinding;
                if (dataBinding.state === 'success') {
                    this._updateData(dataBinding);
                }
            }
        }
    
        _updateData(dataBinding) {
            console.log('_updateData called');
            if (dataBinding && Array.isArray(dataBinding.data)) {
                this.tasks = dataBinding.data.map((row, index) => {
                    if (row.dimensions_0 && row.dimensions_1 && row.dimensions_2 && row.dimensions_3) {
                        console.log('original startDate:', row.dimensions_2.id, 'endDate:', row.dimensions_3.id);  // Log the start and end dates
                        console.log('the rest measure:', row.measures_0.raw, 'the rest dim', row.dimensions_4.id);  // Log the start and end dates
    
                        const startDate = new Date(row.dimensions_2.id);
                        const endDate = new Date(row.dimensions_3.id);
    
                        console.log('original startDate:', startDate, 'endDate:', endDate);  // Log the start and end dates
    
                        // Check if startDate and endDate are valid dates
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                            console.error('Invalid date:', row.dimensions_2.id, row.dimensions_3.id);
                            return null;
                        }
                        // Check if startDate is before endDate
                        if (startDate > endDate) {
                            console.error('Start date is after end date:', startDate, endDate);
                            return null;
                        }
                        console.log('startDate:', startDate, 'endDate:', endDate);  // Log the start and end dates
                        return {
                            id: row.dimensions_0.label,  // Unique id of task
                            text: row.dimensions_1.label,  // Name of task
                            start_date: startDate,  // Start date of task
                            end_date: endDate,  // End date of task
                            progress: row.measures_0.raw,  // Progress of task in percent
                            open: row.dimensions_4.id  // Task is open by default
                        };
                    }
                }).filter(Boolean);  // Filter out any null values
    
                // Check if all tasks have valid start and end dates
                for (let task of this.tasks) {
                    if (!task.start_date || !task.end_date) {
                        console.error('Task with null start or end date:', task);
                    }
                }
    
                console.log('Tasks:', this.tasks);  // Log the tasks
    
                this._renderChart();
            }
        }
    
        _renderChart() {
            console.log('_renderChart called');
            if (this._dhtmlxGanttReady) {
                const chartElement = this._shadowRoot.getElementById('chart');
    
                // Set fit_tasks to false to enable horizontal scrolling
                gantt.config.fit_tasks = true;
                // Configure the Gantt chart to use a monthly scale
                gantt.config.scale_unit = "month";
                gantt.config.step = 1;
    
                // Initialize the Gantt chart
                gantt.init(chartElement);
    
                gantt.attachEvent("onAfterTaskAdd", (id, task) => {
                    console.log("New task was added: ", task);
                    // Convert the task to CSV
                    const csvData = this.taskToCsv(task);
                    // Retrieve the tokens and then call createJob, uploadData, validateJob, and runJob
                    this.getAccessToken().then(() => {
                        this.getCsrfToken().then(() => {
                            this.createJob().then(() => {
                                this.uploadData(csvData).then(() => {
                                    this.validateJob().then(() => {
                                        this.runJob();
                                        gantt.clearAll();
                                        // Load the new data
                                        gantt.parse({ data: this.tasks });
                                    });
                                });
                            });
                        });
                    });
                });
    
                // Load the tasks into the Gantt chart
                gantt.parse({ data: this.tasks });
    
                console.log('Gantt chart rendered');
            }
        }
    
        // new code
        // Interaction with SAP data model
        
        async getAccessToken() {
                console.log('Getting access token...');
                // Simulating an async operation
                return new Promise((resolve) => {
                    setTimeout(() => {
                        this.accessToken = 'https://a2pp.authentication.eu10.hana.ondemand.com/oauth/token';
                        console.log('Access token obtained');
                        resolve(this.accessToken);
                    }, 1000);
                });
        }
        
        async getCsrfToken() {
            console.log('getCsrfToken() called');
            try {
                // Ensure we have an access token
                if (!this.accessToken) {
                    throw new Error('Access token not available. Please get an access token first.');
                }
    
                const response = await fetch('/api/v1/csrf', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
    
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
    
                const csrfToken = response.headers.get('X-CSRF-Token');
                if (!csrfToken) {
                    throw new Error('CSRF token not found in response headers');
                }
    
                this.csrfToken = csrfToken;
                console.log('CSRF token obtained successfully');
                return this.csrfToken;
            } catch (error) {
                console.error('Error getting CSRF token:', error);
                throw error;
            }
        }
    
        async insertTaskIntoSAPModel(task) {
            const csvData = this.taskToCsv(task);
            try {
                await this.getAccessToken();
                await this.getCsrfToken();
                await this.createJob();
                await this.uploadData(csvData);
                await this.validateJob();
                await this.runJob();
                console.log('Task inserted successfully into SAP model');
            } catch (error) {
                console.error('Error inserting task into SAP model:', error);
            }
        }
    
        async updateSAPModel() {
            const allTasks = gantt.getTaskByTime();
            const csvData = allTasks.map(task => this.taskToCsv(task)).join('\n');
            try {
                await this.getAccessToken();
                await this.getCsrfToken();
                await this.createJob();
                await this.uploadData(csvData);
                await this.validateJob();
                await this.runJob();
                console.log('SAP model updated successfully');
            } catch (error) {
                console.error('Error updating SAP model:', error);
            }
        }
    
        async fetchLatestDataFromSAP() {
            try {
                await this.getAccessToken();
                await this.getCsrfToken();
    
                // Create a new job
                const jobId = await this.createJob();
    
                // Validate the job
                await this.validateJob(jobId);
    
                // Run the job
                await this.runJob(jobId);
    
                // Fetch the results
                const response = await fetch(`/api/v1/dataexport/jobs/${jobId}/result`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'X-CSRF-Token': this.csrfToken
                    }
                });
    
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
    
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error fetching latest data from SAP:', error);
                throw error;
            }
        }
    
        async refreshFromSAPModel() {
            try {
                const latestData = await this.fetchLatestDataFromSAP();
                this._updateData({ data: latestData, state: 'success' });
                console.log('Gantt chart refreshed with latest SAP data');
            } catch (error) {
                console.error('Error refreshing data from SAP model:', error);
            }
        }
    }
    customElements.define('gantt-chart-widget', GanttChartWidgetAPI);

})();
