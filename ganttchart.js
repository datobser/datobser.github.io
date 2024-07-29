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
        <span id="form-status">Show Form</span>
        
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

            // Add event listeners
            const toggleSwitch = this._shadowRoot.getElementById('toggle-form-switch');
            const formStatus = this._shadowRoot.getElementById('form-status');
            const formContainer = this._shadowRoot.querySelector('.form-container');

            if (toggleSwitch) {
                toggleSwitch.addEventListener('change', () => {
                    if (toggleSwitch.checked) {
                        formContainer.classList.add('show');
                        formStatus.textContent = 'Hide Form';
                    } else {
                        formContainer.classList.remove('show');
                        formStatus.textContent = 'Show Form';
                    }
                });
            } else {
                console.error('Toggle switch not found');
            }

            const addTaskBtn = this._shadowRoot.getElementById('add-task-btn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', () => {
                    this._addTask();
                });
            } else {
                console.error('Add Task button not found');
            }

            const downloadBtn = this._shadowRoot.getElementById('download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    this._downloadCSV();
                });
            } else {
                console.error('Download button not found');
            }

            const updateTaskBtn = this._shadowRoot.getElementById('update-task-btn');
            if (updateTaskBtn) {
                updateTaskBtn.addEventListener('click', () => {
                    this._updateTask();
                });
            } else {
                console.error('Update Task button not found');
            }

            const deleteTaskBtn = this._shadowRoot.getElementById('delete-task-btn');
            if (deleteTaskBtn) {
                deleteTaskBtn.addEventListener('click', () => {
                    this._deleteTask();
                });
            } else {
                console.error('Delete Task button not found');
            }

            const cancelEditBtn = this._shadowRoot.getElementById('cancel-edit-btn');
            if (cancelEditBtn) {
                cancelEditBtn.addEventListener('click', () => {
                    this._cancelEdit();
                });
            } else {
                console.error('Cancel Edit button not found');
            }
        
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
                this.tasks = dataBinding.data.map((row, index) => {
                    console.log(`Processing row ${index}:`, row);
                    
                    const startDate = this._parseDate(row.dimensions_2.id );
                    const endDate = this._parseDate(row.dimensions_3.id );
                    
                    if (!startDate || !endDate) {
                        console.error(`Invalid dates for row ${index}:`, row);
                        return null;
                    }
                    
                    // Create the task object
                    const task = {
                        id: row.dimensions_0.id,
                        name: row.dimensions_1.label,
                        start: startDate,
                        end: endDate,
                        progress: row.measures_0 ? row.measures_0.raw : 0
                    };
                    
                    // Validate task properties
                    const isValid = task.id && task.name && task.start && task.end;
                    if (!isValid) {
                        console.error('Invalid task filtered out:', task);
                    }
                    
                    return isValid ? task : null;
                }).filter(task => task !== null); // Remove null entries

                console.log('Processed tasks:', this.tasks);
                this._renderChart();
            } else {
                console.log('No data available in dataBinding');
            }
        }

        _parseDate(dateString) {
            // Überprüfen, ob das Format den Erwartungen entspricht
            const regex = /\.\&\[(\d{4}-\d{2}-\d{2})\]/;
    
            // Versuchen, das Datum aus dem String zu extrahieren
            const match = dateString.match(regex);
            console.log("Datum: " +match);
            if (match) {
                const extractedDate = match[1];  // Extrahiertes Datum
                console.log("Das extrahierte Datum ist: " + extractedDate);  
                return extractedDate;
            }
        }


        _renderChart() {
            console.log('_renderChart called');
            if (this._frappeGanttReady && this.tasks.length > 0) {
                console.log('Rendering chart with tasks:', this.tasks);
                const chartElement = this._shadowRoot.getElementById('chart');
                chartElement.innerHTML = ''; // Clear previous chart
                new Gantt(chartElement, this.tasks, {
                    view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                    view_mode: 'Month',
                    date_format: 'YYYY-MM-DD',
                    popup_trigger: 'click'
                });
                console.log('Chart rendered');
            } else {
                console.log('Cannot render chart. Frappe Gantt ready:', this._frappeGanttReady, 'Number of tasks:', this.tasks.length);
            }
        }

        _getCurrentTasks() {
            return this.tasks; // Returns the current tasks array
        }

        _convertTasksToCSV(tasks) {
            const header = ['ID', 'Name', 'Start', 'End', 'Progress'];
            const rows = tasks.map(task => [
                task.id,
                task.name,
                task.start,
                task.end,
                task.progress
            ]);

            // Convert header and rows into CSV string
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
                toggleButton.textContent = 'Show Form';
            } else {
                formContainer.classList.add('show');
                toggleButton.textContent = 'Hide Form';
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
                editContainer.classList.add('show');
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
                        start: new Date(start).toISOString(),
                        end: new Date(end).toISOString(),
                        progress: parseFloat(progress) || 0
                    };

                    // Update the task in the list
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
                // Remove the task from the list
                this.tasks = this.tasks.filter(task => task.id !== this.currentEditingTask.id);
                console.log('Task deleted:', this.currentEditingTask);
                this._renderChart();
                this._cancelEdit();
            }
        }
        
        _cancelEdit() {
            const editContainer = this._shadowRoot.getElementById('task-edit-container');
            editContainer.classList.remove('show');
            this.currentEditingTask = null;
        }

    }

    customElements.define('basic-gantt', GanttChartWidget);
})();
