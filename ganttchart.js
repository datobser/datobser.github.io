
(function() {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
         <style>
            :host {
                display: block;
                height: 100%;
            }
            #chart {
                width: 100%;
                height: 100%;
            }
            .form-container {
                margin: 20px;
                display: none; /* Initially hidden */
            }
            .form-container.show {
                display: block; /* Shown when 'show' class is added */
            }
            input, button {
                margin: 5px;
            }
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
                transition: .4s;
            }
            input:checked + .slider {
                background-color: #2ab934;
            }
            input:focus + .slider {
                box-shadow: 0 0 1px #2196F3;
            }
            input:checked + .slider:before {
                transform: translateX(26px);
            }
            .slider.round {
                border-radius: 34px;
            }
            .slider.round:before {
                border-radius: 50%;
            }
            .task-edit-container {
                display: none;
                margin: 20px;
                background: #f1f1f1;
                padding: 10px;
                border: 1px solid #ddd;
            }
            .task-edit-container.show {
                display: block;
            }
        </style>

        <label class="switch">
            <input type="checkbox" id="toggle-form-switch">
            <span class="slider round"></span>
        </label>
        <span id="form-status">New Tasks</span>
        
        <div class="form-container">
            <input type="text" id="task-id" placeholder="ID" />
            <input type="text" id="task-name" placeholder="Name" />
            <input type="date" id="task-start" placeholder="Start Date" />
            <input type="date" id="task-end" placeholder="End Date" />
            <input type="number" id="task-progress" placeholder="Progress" />
            <button id="add-task-btn">Add Task</button>
        </div>
        <div class="task-edit-container" id="task-edit-container">
                <input type="text" id="edit-task-id" placeholder="ID" readonly />
                <input type="text" id="edit-task-name" placeholder="Name" />
                <input type="date" id="edit-task-start" placeholder="Start Date" />
                <input type="date" id="edit-task-end" placeholder="End Date" />
                <input type="number" id="edit-task-progress" placeholder="Progress" />
                <button id="update-task-btn">Update Task</button>
                <button id="delete-task-btn">Delete Task</button>
                <button id="cancel-edit-btn">Cancel</button>
        </div>
        
        <button id="download-btn">Download CSV</button> 
        <div id="chart"></div>   
    `;

    class GanttChartWidget extends HTMLElement {
        constructor() {
            super();
            console.log('GanttChartWidget constructor called');
            this._shadowRoot = this.attachShadow({mode: 'open'});
            this._shadowRoot.appendChild(tmpl.content.cloneNode(true));
            this._props = {};
            this.tasks = [];

            // Load the SACAPI_DataImport.js script
            const script = document.createElement('script');
            script.src = 'https://datobser.github.io/SACAPI_DataImport.js';
            script.onload = () => {
                console.log('SACAPI_DataImport.js loaded');
                this._initializeAPIProcess();
            };
            document.head.appendChild(script);

            // Load Frappe Gantt CSS
            const frappeGanttCSS = document.createElement('link');
            frappeGanttCSS.rel = 'stylesheet';
            frappeGanttCSS.href = 'https://cdn.jsdelivr.net/npm/frappe-gantt@0.5.0/dist/frappe-gantt.css';
            this._shadowRoot.appendChild(frappeGanttCSS);

            // Load Frappe Gantt
            const frappeGanttScript = document.createElement('script');
            frappeGanttScript.src = 'https://cdn.jsdelivr.net/npm/frappe-gantt@0.5.0/dist/frappe-gantt.min.js';
            frappeGanttScript.onload = () => {
                console.log('Frappe Gantt script loaded');
                this._frappeGanttReady = true;
                this._renderChart();
            };
            this._shadowRoot.appendChild(frappeGanttScript);

            //outsourced
            this._initializeElements();
            this._addEventListeners();

        }

        _initializeElements() {
        this._toggleSwitch = this._shadowRoot.getElementById('toggle-form-switch');
        this._formStatus = this._shadowRoot.getElementById('form-status');
        this._formContainer = this._shadowRoot.querySelector('.form-container');
        this._addTaskBtn = this._shadowRoot.getElementById('add-task-btn');
        this._downloadBtn = this._shadowRoot.getElementById('download-btn');
        this._updateTaskBtn = this._shadowRoot.getElementById('update-task-btn');
        this._deleteTaskBtn = this._shadowRoot.getElementById('delete-task-btn');
        this._cancelEditBtn = this._shadowRoot.getElementById('cancel-edit-btn');
        this._taskEditContainer = this._shadowRoot.getElementById('task-edit-container');
        }
    
        _addEventListeners() {
            this._toggleSwitch.addEventListener('change', () => this._toggleForm());
            this._addTaskBtn.addEventListener('click', () => this._addTask());
            this._downloadBtn.addEventListener('click', () => this._downloadCSV());
            this._updateTaskBtn.addEventListener('click', () => this._updateTask());
            this._deleteTaskBtn.addEventListener('click', () => this._deleteTask());
            this._cancelEditBtn.addEventListener('click', () => this._cancelEdit());
        }

        // Gantt chart methods
        static get metadata() {
            console.log('metadata called');
            return {
                properties: {
                    myDataBinding: {
                        type: "data",
                        datasourcetype: "DATA_SOURCE"
                    }
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
                console.log('myDataBinding updated');
                this._updateData(changedProperties.myDataBinding);
            }
        }

        _updateData(dataBinding) {
            console.log('_updateData called');
            if (dataBinding && dataBinding.data) {
                console.log('Raw data:', dataBinding.data);
                
                const processedTasks = dataBinding.data.map((row, index) => {
                    console.log(`Processing row ${index}:`, row);
                    
                    const date = this._parseDate(row.dimensions_0.id);
                    const endDate = this._parseDate(row.dimensions_1.id);
                    const startDate = this._parseDate(row.dimensions_5.id);
                    
                    if (!date || !startDate || !endDate) {
                        console.error(`Invalid dates for row ${index}:`, row);
                        return null;
                    }
                    
                    // Create the task object
                    const task = {
                        version: row.dimensions_6.id,
                        date: date,
                        start: startDate,
                        end: endDate,
                        id: row.dimensions_2.id,
                        name: row.dimensions_3.label,
                        open: row.dimensions_4.id === 'true',
                        progress: row.measures_0 ? row.measures_0.raw : 0
                    };
                    
                    // Validate task properties
                    const isValid = task.version && task.date && task.id && task.name && task.start && task.end;
                    if (!isValid) {
                        console.error('Invalid task filtered out:', task);
                        return null;
                    }
                    
                    console.log('Processed task:', task);
                    return task;
                }).filter(task => task !== null); // Remove null entries
        
                console.log('All processed tasks:', processedTasks);
                
                if (processedTasks.length > 0) {
                    this.tasks = processedTasks;
                    console.log('this.tasks updated:', this.tasks);
                    this._renderChart();
                    this._initializeAPIProcess();
                } else {
                    console.error('No valid tasks were processed');
                }
            } else {
                console.log('No data available in dataBinding');
            }
        }
        
        _parseDate(dateString) {
            console.log('Parsing date string:', dateString);
            
            // Check if dateString is undefined or null
            if (!dateString) {
                console.error('Date string is undefined or null');
                return null;
            }
        
            // Remove the square brackets and everything inside them
            const cleanedDateString = dateString.replace(/\[.*?\]/g, '');
            
            // Split the cleaned string by dots
            const parts = cleanedDateString.split('.');
            
            // The last part should be the actual date
            const datePart = parts[parts.length - 1];
            console.log('Date Part:',datePart);
            
            // Parse the date
            const date = new Date(datePart);
            
            if (isNaN(date.getTime())) {
                console.error('Invalid date:', dateString);
                return null;
            }
            
            // Format the date as YYYY-MM-DD
            const formattedDate = date.toISOString().split('T')[0];
            console.log('Parsed and formatted date:', formattedDate);
            
            return formattedDate;
        }
        
        _initializeAPIProcess() {
            console.log('Initializing API process...');
            this._getAccessToken()
                .then(() => this._getCsrfToken())
                .then(() => this._createJob())
                .then(() => this._uploadData())
                .then(() => this._validateJob())
                .then(() => this._runJob())
                .then(jobStatus => {
                    console.log('Final job status:', jobStatus);
                    console.log('API process completed successfully');
                })
                .catch(error => {
                    console.error('API process error:', error);
                    // Handle the error appropriately
                });
        }

        _getAccessToken() {
            console.log('Getting access token...');
            return new Promise((resolve, reject) => {
                window.getAccessToken()
                    .then(() => {
                        console.log('Access token acquired');
                        resolve();
                    })
                    .catch(reject);
            });
        }
    
        _getCsrfToken() {
            console.log('Getting CSRF token...');
            return new Promise((resolve, reject) => {
                window.getCsrfToken()
                    .then(() => {
                        console.log('CSRF token acquired');
                        resolve();
                    })
                    .catch(reject);
            });
        }
    
        _createJob() {
            console.log('Creating job...');
            return new Promise((resolve, reject) => {
                window.createJob()
                    .then(() => {
                        console.log('Job created');
                        resolve();
                    })
                    .catch(reject);
            });
        }
    
        _uploadData() {
            console.log('Uploading data...');
            const csvData = this._convertTasksToCSV(this.tasks);
            return new Promise((resolve, reject) => {
                window.uploadData(csvData)
                    .then(() => {
                        console.log('Data uploaded');
                        resolve();
                    })
                    .catch(reject);
            });
        }
    
        _validateJob() {
            console.log('Validating job...');
            return new Promise((resolve, reject) => {
                window.validateJob()
                    .then(() => {
                        console.log('Job validated');
                        resolve();
                    })
                    .catch(reject);
            });
        }
    
        _runJob() {
            console.log('Running job...');
            return new Promise((resolve, reject) => {
                window.runJob()
                    .then(() => {
                        console.log('Job completed');
                        resolve();
                    })
                    .catch(reject);
            });
        }


        _renderChart() {
            console.log('_renderChart called');
            if (this._frappeGanttReady && this.tasks.length > 0) {
                console.log('Rendering chart with tasks:', this.tasks);
                const chartElement = this._shadowRoot.getElementById('chart');
                chartElement.innerHTML = ''; // Clear previous chart
                this.ganttChart = new Gantt(chartElement, this.tasks, {
                    view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                    view_mode: 'Month',
                    date_format: 'YYYY-MM-DD',
                    popup_trigger: 'click',
                    on_click: (task) => this._onTaskClick(task)
                });
                console.log('Chart rendered');
                chartElement.addEventListener('click', (event) => this._handleChartClick(event));
            } else {
                console.log('Cannot render chart. Frappe Gantt ready:', this._frappeGanttReady, 'Number of tasks:', this.tasks.length);
            }
            
        }

        _getCurrentTasks() {
            return this.tasks; // Returns the current tasks array
        }

        _convertTasksToCSV(tasks) {
            const header = ['Version', 'Date', 'StartDate', 'EndDate', 'ID', 'Label', 'Open', 'Progress'];
            const rows = tasks.map(task => [
                task.version,
                task.date,
                task.start,
                task.end,
                task.id,
                task.name,
                task.open.toString(),
                task.progress.toString()
            ]);
        
            const csvContent = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
            return csvContent;
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

        // Addtask functionality
        _addTask() {
            const id = this._shadowRoot.getElementById('task-id').value.trim();
            const name = this._shadowRoot.getElementById('task-name').value.trim();
            const start = this._shadowRoot.getElementById('task-start').value;
            const end = this._shadowRoot.getElementById('task-end').value;
            const progress = parseFloat(this._shadowRoot.getElementById('task-progress').value) || 0;

            if (id && name && start && end) {
                const task = {
                    id,
                    name,
                    start,
                    end,
                    progress
                };

                this.tasks.push(task);
                this._renderChart();
                this._clearForm();
            } else {
                console.error('Invalid task input');
            }
        }

        _clearForm() {
            this._shadowRoot.getElementById('task-id').value = '';
            this._shadowRoot.getElementById('task-name').value = '';
            this._shadowRoot.getElementById('task-start').value = '';
            this._shadowRoot.getElementById('task-end').value = '';
            this._shadowRoot.getElementById('task-progress').value = '';
        }

        _toggleForm() {
            const formContainer = this._shadowRoot.querySelector('.form-container');
            const toggleButton = this._shadowRoot.getElementById('toggle-form-btn');
            if (formContainer.classList.contains('show')) {
                formContainer.classList.remove('show');
            } else {
                formContainer.classList.add('show');
            }
        }

        // edit functionality
        _onTaskClick(task) {
            console.log('Task clicked:', task);
            this.currentEditingTask = task;
        
            // Populate the edit form with the task details
            if (this.currentEditingTask) {
                const editContainer = this._shadowRoot.getElementById('task-edit-container');
                this._shadowRoot.getElementById('edit-task-id').value = this.currentEditingTask.id;
                this._shadowRoot.getElementById('edit-task-name').value = this.currentEditingTask.name;
                this._shadowRoot.getElementById('edit-task-start').value = new Date(this.currentEditingTask.start).toISOString().split('T')[0];
                this._shadowRoot.getElementById('edit-task-end').value = new Date(this.currentEditingTask.end).toISOString().split('T')[0];
                this._shadowRoot.getElementById('edit-task-progress').value = this.currentEditingTask.progress;
                editContainer.classList.add('show'); // Show the edit form
            }
        }


        _updateTask() {
            if (this.currentEditingTask) {
                const id = this._shadowRoot.getElementById('edit-task-id').value;
                const name = this._shadowRoot.getElementById('edit-task-name').value;
                const start = this._shadowRoot.getElementById('edit-task-start').value;
                const end = this._shadowRoot.getElementById('edit-task-end').value;
                const progress = this._shadowRoot.getElementById('edit-task-progress').value;
        
                if (id && name && start && end) {
                    const updatedTask = {
                        id,
                        name,
                        start,
                        end,
                        progress: parseFloat(progress) || 0
                    };
        
                    const index = this.tasks.findIndex(task => task.id === this.currentEditingTask.id);
                    if (index !== -1) {
                        this.tasks[index] = updatedTask;
                        console.log('Task updated:', updatedTask);
                        this._renderChart();
                        this._cancelEdit();
                    } else {
                        console.error('Task not found for update:', this.currentEditingTask);
                    }
                } else {
                    console.error('Invalid task input for update:', { id, name, start, end, progress });
                }
            }
        }
        
        _deleteTask() {
            if (this.currentEditingTask) {
                this.tasks = this.tasks.filter(task => task.id !== this.currentEditingTask.id);
                console.log('Task deleted:', this.currentEditingTask);
                this._renderChart();
                this._cancelEdit();
            }
        }
        
        _cancelEdit() {
            const editContainer = this._shadowRoot.getElementById('task-edit-container');
            editContainer.classList.remove('show'); // Hide the edit form
            this.currentEditingTask = null;
        }

        _handleChartClick(event) {
            console.log('Chart clicked:', event);
            
            // Log the clicked element and its parents for debugging
            let element = event.target;
            let i = 0;
            while (element && i < 5) {
                console.log(`${i}: `, element);
                element = element.parentElement;
                i++;
            }
        
            // Try to find the task element
            const taskElement = event.target.closest('.bar-wrapper');
            if (taskElement) {
                console.log('Task element found:', taskElement);
                const taskId = taskElement.getAttribute('data-id');
                console.log('Clicked task ID:', taskId);
                
                if (taskId) {
                    // Find the corresponding task in our tasks array
                    const clickedTask = this.tasks.find(task => task.id == taskId);
                    if (clickedTask) {
                        console.log('Clicked task:', clickedTask);
                        this._onTaskClick(clickedTask);
                    } else {
                        console.log('Task not found in tasks array');
                    }
                } else {
                    console.log('No task ID found on element');
                }
            } else {
                console.log('No task element found');
            }
        }
    }

    customElements.define('basic-gantt', GanttChartWidget);
})();
