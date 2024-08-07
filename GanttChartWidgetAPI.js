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
    <button id="refresh-button">Refresh from SAP</button>

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
            this._shadowRoot.getElementById('refresh-button').addEventListener('click', () => this.refreshFromSAPModel());

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
                this.myDataBinding = changedProperties["myDataBinding"];
                this.render();
            }
        }

        async refreshFromSAPModel() {
            console.log("Refresh from SAP called");
            this.myDataBinding = await this.getSampleData();
            this.render();
        }

        getSampleData() {
            return new Promise(resolve => {
                setTimeout(() => {
                    const sampleData = {
                        tasks: [
                            { id: 1, text: "Task #1", start_date: "2023-02-02", duration: 3, progress: 0.6 },
                            { id: 2, text: "Task #2", start_date: "2023-02-05", duration: 4, progress: 0.8 },
                        ]
                    };
                    resolve(sampleData);
                }, 1000);
            });
        }

        render() {
            if (this._dhtmlxGanttReady && this.myDataBinding && this.myDataBinding.tasks) {
                console.log('Rendering Gantt chart');
                gantt.init(this._shadowRoot.getElementById('chart'));
                gantt.clearAll();
                gantt.parse({ data: this.myDataBinding.tasks });
            } else {
                console.log('Gantt chart not ready or no data to render');
            }
        }

        _downloadCSV() {
            console.log("Download CSV called");
            if (this.myDataBinding && this.myDataBinding.tasks) {
                const csvData = this.myDataBinding.tasks.map(this.taskToCsv).join("\n");
                const blob = new Blob([csvData], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tasks.csv';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                console.log("No tasks available to download as CSV");
            }
        }

    }

    customElements.define('com-demo-ganttchartwidget-api', GanttChartWidgetAPI);
})();
