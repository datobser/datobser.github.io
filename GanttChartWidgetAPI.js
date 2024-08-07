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

    .task-form {
        display: none;
        margin-top: 20px;
        padding: 10px;
        border: 1px solid #ccc;
        background-color: #f9f9f9;
    }
    .task-form input, .task-form button {
        margin: 5px;
        padding: 5px;
    }
    </style>
    <div id="image-container"> <svg width="750" height="100">  </svg></div> 
    <div id="chart"></div>
    <button id="download-csv">Download Tasks as CSV</button>
    <button id="refresh-button">Refresh from SAP</button>
    <button id="add-task-button">Add New Task</button>

    <div class="task-form" id="task-form">
        <input type="text" id="task-text" placeholder="Task Name">
        <input type="date" id="task-start-date">
        <input type="number" id="task-duration" placeholder="Duration (days)">
        <input type="number" id="task-progress" placeholder="Progress (0-100)" min="0" max="100">
        <button id="save-task">Save Task</button>
        <button id="cancel-task">Cancel</button>
    </div>

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
            this._shadowRoot = this.attachShadow({ mode: 'open' });
            this._shadowRoot.appendChild(tmpl.content.cloneNode(true));
            this._props = {};
            this.tasks = [];
            this.initializeWidget();
        }

        initializeWidget() {
            this.initializeEventListeners();
            this.loadExternalResources();
        }

        initializeEventListeners() {
            this._shadowRoot.getElementById('debugToggle').addEventListener('change', this.toggleDebuggingMode.bind(this));
            this._shadowRoot.getElementById('download-csv').addEventListener('click', this._downloadCSV.bind(this));
            this._shadowRoot.getElementById('refresh-button').addEventListener('click', () => this.refreshFromSAPModel());
            this._shadowRoot.getElementById('add-task-button').addEventListener('click', this.showAddTaskForm.bind(this));
            this._shadowRoot.getElementById('save-task').addEventListener('click', this.saveNewTask.bind(this));
            this._shadowRoot.getElementById('cancel-task').addEventListener('click', this.hideAddTaskForm.bind(this));

            // Debugging buttons
            this._shadowRoot.getElementById('getAccessToken').addEventListener('click', () => this.getAccessToken(this._shadowRoot.getElementById('messages')));
            this._shadowRoot.getElementById('getCsrfToken').addEventListener('click', this.handleGetCsrfToken.bind(this));
            this._shadowRoot.getElementById('createJob').addEventListener('click', () => this.createJob(this._shadowRoot.getElementById('messages')));
            this._shadowRoot.getElementById('uploadData').addEventListener('click', () => this.uploadData(this.generateDebugCsvData(), this._shadowRoot.getElementById('messages')));
            this._shadowRoot.getElementById('validateJob').addEventListener('click', () => this.validateJob(this._shadowRoot.getElementById('messages')));
            this._shadowRoot.getElementById('runJob').addEventListener('click', () => this.runJob(this._shadowRoot.getElementById('messages')));
        }

        loadExternalResources() {
            const dhtmlxGanttCSS = document.createElement('link');
            dhtmlxGanttCSS.rel = 'stylesheet';
            dhtmlxGanttCSS.href = 'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.css';
            this._shadowRoot.appendChild(dhtmlxGanttCSS);

            const dhtmlxGanttScript = document.createElement('script');
            dhtmlxGanttScript.src = 'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.js';
            dhtmlxGanttScript.onload = () => {
                this._dhtmlxGanttReady = true;
                this.render();
            };
            this._shadowRoot.appendChild(dhtmlxGanttScript);

            const sacApiScript = document.createElement('script');
            sacApiScript.src = 'https://datobser.github.io/SACAPI_DataImport.js';
            sacApiScript.onload = () => {
                console.log('SACAPI_DataImport.js loaded');
                this.initializeSAPAPI();
            };
            document.head.appendChild(sacApiScript);
        }

        initializeSAPAPI() {
            this.getAccessToken = window.getAccessToken;
            this.getCsrfToken = window.getCsrfToken;
            this.createJob = window.createJob;
            this.uploadData = window.uploadData;
            this.validateJob = window.validateJob;
            this.runJob = window.runJob;
        }

        toggleDebuggingMode() {
            const debuggingArea = this._shadowRoot.getElementById('debugging-area');
            const debugStatus = this._shadowRoot.getElementById('debugStatus');
            const isDebugMode = this._shadowRoot.getElementById('debugToggle').checked;
            debugStatus.textContent = isDebugMode ? 'Debugging Mode Active' : 'Debugging Mode Inactive';
            debuggingArea.style.display = isDebugMode ? 'block' : 'none';
        }

        showAddTaskForm() {
            this._shadowRoot.getElementById('task-form').style.display = 'block';
        }

        hideAddTaskForm() {
            this._shadowRoot.getElementById('task-form').style.display = 'none';
        }

        saveNewTask() {
            const taskText = this._shadowRoot.getElementById('task-text').value;
            const startDate = this._shadowRoot.getElementById('task-start-date').value;
            const duration = parseInt(this._shadowRoot.getElementById('task-duration').value);
            const progress = parseInt(this._shadowRoot.getElementById('task-progress').value) / 100;

            if (taskText && startDate && duration && !isNaN(progress)) {
                const newTask = {
                    id: Date.now(),  // Simple unique ID generator
                    text: taskText,
                    start_date: startDate,
                    duration: duration,
                    progress: progress
                };

                this.tasks.push(newTask);
                this.render();
                this.hideAddTaskForm();
            } else {
                alert('Please fill all fields correctly.');
            }
        }

        static get metadata() {
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
            if ("myDataBinding" in changedProperties) {
                this.myDataBinding = changedProperties["myDataBinding"];
                this.render();
            }
        }

        async refreshFromSAPModel() {
            console.log("Refreshing data from SAP model");
            try {
                await this.getAccessToken(this._shadowRoot.getElementById('messages'));
                await this.getCsrfToken();
                await this.createJob(this._shadowRoot.getElementById('messages'));
                await this.validateJob(this._shadowRoot.getElementById('messages'));
                const jobStatus = await this.runJob(this._shadowRoot.getElementById('messages'));
                
                if (jobStatus && jobStatus.status === 'SUCCESSFUL') {
                    console.log("Data successfully refreshed from SAP");
                    this.tasks = this.processDataFromSAP(jobStatus.data);
                    this.render();
                } else {
                    console.error("Failed to refresh data from SAP");
                }
            } catch (error) {
                console.error("Error refreshing from SAP model:", error);
            }
        }

        processDataFromSAP(data) {
            return data.map(item => ({
                id: item.ID,
                text: item.Label,
                start_date: item.StartDate,
                end_date: item.EndDate,
                progress: parseFloat(item.Progress),
                open: item.Open === 'X'
            }));
        }

        render() {
            if (this._dhtmlxGanttReady) {
                const chartElement = this._shadowRoot.getElementById('chart');
                gantt.init(chartElement);
                gantt.clearAll();
                
                if (this.tasks.length > 0) {
                    gantt.parse({ data: this.tasks });
                    this.setupGanttEventListeners();
                } else {
                    console.log('No tasks to render');
                }
            } else {
                console.log('DHTMLX Gantt not ready');
            }
        }

        setupGanttEventListeners() {
            gantt.attachEvent("onAfterTaskAdd", (id, task) => {
                console.log("New task added:", task);
                this.tasks.push(task);
            });

            gantt.attachEvent("onAfterTaskUpdate", (id, task) => {
                console.log("Task updated:", task);
                const index = this.tasks.findIndex(t => t.id == id);
                if (index !== -1) {
                    this.tasks[index] = task;
                }
            });

            gantt.attachEvent("onAfterTaskDelete", (id) => {
                console.log("Task deleted:", id);
                this.tasks = this.tasks.filter(task => task.id != id);
            });
        }

        _downloadCSV() {
            if (this.tasks.length > 0) {
                const csvContent = this.convertTasksToCSV(this.tasks);
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
            } else {
                console.log("No tasks available to download as CSV");
            }
        }

        convertTasksToCSV(tasks) {
            const header = ['Version', 'Date', 'ID', 'Label', 'StartDate', 'EndDate', 'Open', 'Progress'];
            const rows = tasks.map(task => [
                'public.Actual', // Version
                new Date().toISOString().slice(0,7).replace(/-/g, ''), // Date (YYYYMM)
                task.id,
                task.text,
                task.start_date,
                task.end_date || this.calculateEndDate(task.start_date, task.duration),
                task.open ? 'X' : '',
                task.progress
            ]);
            return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
        }

        calculateEndDate(startDate, duration) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + duration);
            return date.toISOString().split('T')[0];
        }

        handleGetCsrfToken() {
            this.getCsrfToken().then(token => {
                const messagesElement = this._shadowRoot.getElementById('messages');
                messagesElement.textContent = `CSRF Token obtained: ${token}`;
            }).catch(error => {
                const messagesElement = this._shadowRoot.getElementById('messages');
                messagesElement.textContent = `Error getting CSRF Token: ${error.message}`;
            });
        }

        generateDebugCsvData() {
            return `Version,Date,ID,Label,StartDate,EndDate,Open,Progress
            public.Actual,202401,999,TaskDebugger,2023-02-02,2023-05-05,X,0.5`;
        }
    }

    customElements.define('gantt-chart-widget', GanttChartWidgetAPI);
})();
