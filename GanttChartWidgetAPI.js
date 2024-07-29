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
    <button id="download-csv">Download Tasks as CSV</button>
    
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
            
            this._shadowRoot.getElementById('download-csv').addEventListener('click', this._downloadCSV.bind(this));
    
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
            const version = 'public.Actual';
            const date = '202401'; // You might want to make this dynamic
            const endDate = new Date(task.start_date.getTime() + task.duration * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
            const startDate = task.start_date.toISOString().slice(0, 10).replace(/-/g, '');
            const id = task.id;
            const label = task.text;
            const open = task.open ? 'X' : '';
            const progress = task.progress;
        
            const csvString = `${version},${date},${endDate},${startDate},${id},${label},${open},${progress}`;
            return 'Version,Date,endDate,startDate,id,label,open,progress\n' + csvString;
        }
    
        // GanttChart methods
        static get metadata() {
            //console.log('metadata called');
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
        this._props = { ...this._props, ...changedProperties };
    }

        onCustomWidgetAfterUpdate(changedProperties) {
            console.log('onCustomWidgetAfterUpdate called', changedProperties);
            if ("myDataBinding" in changedProperties) {
                const dataBinding = changedProperties.myDataBinding;
                console.log('Data binding changed:', dataBinding);
                if (dataBinding && dataBinding.state === 'success') {
                    this._updateData(dataBinding);
                }
            }
        }
    
        _updateData(dataBinding) {
            if (dataBinding && dataBinding.data) {
                this.tasks = dataBinding.data.map((row, index) => {
                    if (row.dimensions_0 && row.dimensions_1 && row.dimensions_2 && row.dimensions_3 && row.dimensions_4 && row.measures_0) {
                        // Parse dates from string to Date objects
                        const startDate = this._parseDate(row.dimensions_2.id); // startDate
                        const endDate = this._parseDate(row.dimensions_1.id);   // endDate
                        
                        // Ensure both dates are valid
                        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                            console.error('Invalid date for task:', row);
                            return null;
                        }
        
                        // Calculate duration in days
                        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
                        return {
                            id: row.dimensions_3.id,       // id
                            text: row.dimensions_4.id,     // label
                            start_date: startDate,
                            end_date: endDate,  // Include end_date
                            duration: duration,
                            progress: parseFloat(row.measures_0.raw) || 0,
                            open: row.dimensions_5.id === 'X', // open
                            parent: 0 // Assuming all tasks are top-level for now
                        };
                    }
                    return null;
                }).filter(Boolean);
        
                console.log('Processed tasks:', this.tasks);
                this._renderChart();
            } else {
                console.error('Invalid data binding or no data available');
            }
        }

// Helper method to parse date strings
_parseDate(dateString) {
    if (!dateString) return null;
    // Assuming dateString is in format 'YYYYMMDD'
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return new Date(year, month - 1, day);  // month is 0-indexed in JavaScript Date
}
    
        _renderChart() {
            console.log('_renderChart called');
            if (this._dhtmlxGanttReady) {
                const chartElement = this._shadowRoot.getElementById('chart');
    
                gantt.config.fit_tasks = true;
                gantt.config.scale_unit = "month";
                gantt.config.step = 1;
    
                gantt.init(chartElement);
    
                // Clear existing tasks
                gantt.clearAll();
    
                // Load the new tasks
                gantt.parse({ data: this.tasks });
    
                console.log('Gantt chart rendered with tasks:', this.tasks);
            } else {
                console.error('DHTMLX Gantt is not ready');
            }
        }
    
        // new code
        // Interaction with SAP data model
        
        async getAccessToken() {
                //console.log('Getting access token...');
                // Simulating an async operation
                return new Promise((resolve) => {
                    setTimeout(() => {
                        this.accessToken = 'https://a2pp.authentication.eu10.hana.ondemand.com/oauth/token';
                        //console.log('Access token obtained');
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

        _downloadCSV() {
            const currentTasks = this._getCurrentTasks();
            const csvContent = this._convertTasksToCSV(currentTasks);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "gantt_tasks.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }

        _convertTasksToCSV(tasks) {
            const header = ["ID", "Task", "Start Date", "End Date", "Progress", "Open"];
            const rows = tasks.map(task => [
                task.id,
                task.text,
                task.start_date.toISOString().slice(0, 10),
                task.end_date.toISOString().slice(0, 10),
                task.progress,
                task.open ? 'X' : ''
            ]);
            
            return [
                header.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
        }

        _getCurrentTasks() {
            if (gantt && typeof gantt.getTaskByTime === 'function') {
                // Get all tasks from the Gantt chart
                const allTasks = gantt.getTaskByTime();
                return allTasks.map(task => ({
                    id: task.id,
                    text: task.text,
                    start_date: task.start_date,
                    end_date: task.end_date,
                    progress: task.progress,
                    open: task.open
                }));
            } else {
                console.error('Gantt chart is not initialized or getTaskByTime method is not available');
                return [];
            }
        }

        _updateLocalTasks(action) {
            // Fetch all current tasks from Gantt chart
            const currentTasks = this._getCurrentTasks();
            // Update this.tasks with the current state
            this.tasks = currentTasks;
            //console.log(`Tasks ${action}ed, local tasks updated:`, this.tasks);
        }

    }
    customElements.define('gantt-chart-widget', GanttChartWidgetAPI);

})();
