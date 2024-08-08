(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
    <style>
    #chart {
        width: 100%; 
        height: 800px;  /* Increased height */
    }
    #refresh-button {
        margin-top: 10px;
    }
    </style>
    <div id="chart"></div>
    <button id="refresh-button">Refresh from SAP</button>
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
            this._shadowRoot.getElementById('refresh-button').addEventListener('click', () => this.refreshFromSAPModel());
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
                this.configureGantt();
                this.render();
            };
            this._shadowRoot.appendChild(dhtmlxGanttScript);

            const sacApiScript = document.createElement('script');
            sacApiScript.src = 'https://datobser.github.io/SACAPI_DataExport.js';
            sacApiScript.onload = () => {
                console.log('SACAPI_DataExport.js loaded');
            };
            document.head.appendChild(sacApiScript);
        }

        configureGantt() {
            // Disable automatic fitting of tasks to the timeline
            gantt.config.fit_tasks = false;

            // Enable horizontal scrolling
            gantt.config.autoscroll = true;
            gantt.config.autoscroll_speed = 30;

            // Configure the main scale to show months
            gantt.config.scale_unit = "month";
            gantt.config.date_scale = "%F %Y";
            gantt.config.step = 1;

            // Add a secondary scale for weeks
            gantt.config.subscales = [
                {unit: "week", step: 1, date: "Week %W"}
            ];

            // Set minimum column width to ensure readability
            gantt.config.min_column_width = 70;

            // Set the initial date range (e.g., 2 years)
            const currentDate = new Date();
            gantt.config.start_date = new Date(currentDate.getFullYear(), 0, 1);
            gantt.config.end_date = new Date(currentDate.getFullYear() + 2, 0, 0);

            // Adjust grid and chart widths
            gantt.config.grid_width = 300;
            gantt.config.autosize = false;  // Changed to false
            gantt.config.height = 750;  // Set a fixed height

            // Enable vertical scrolling for tasks
            gantt.config.scroll_size = 20;

            // Disable task dragging and resizing for read-only view
            gantt.config.drag_move = false;
            gantt.config.drag_resize = false;

            // Enable smart rendering for better performance with large datasets
            gantt.config.smart_rendering = true;

            // Customize the appearance
            gantt.templates.task_class = (start, end, task) => {
                return task.progress >= 0.5 ? "high-progress" : "low-progress";
            };

            // Add custom CSS for task appearance
            const style = document.createElement('style');
            style.textContent = `
                .high-progress { background-color: #4CAF50; }
                .low-progress { background-color: #FFC107; }
            `;
            this._shadowRoot.appendChild(style);

            gantt.init(this._shadowRoot.getElementById('chart'));
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
                const idList = await getHierarchyData();
                const exportedData = await window.getExportedData();
                this.tasks = this.processDataFromSAP(exportedData.value, idList);
                this.render();
            } catch (error) {
                console.error("Error refreshing from SAP model:", error);
            }
        }

        processDataFromSAP(factData, idList) {
            console.log("entered processDataFromSAP");
            const idMap = new Map();
            const tasks = [];
        
            // First, create all tasks
            factData.forEach(item => {
                const parentID = this.assignParentTask(item);
                const task = {
                    id: item.ID,
                    text: item.Label,
                    start_date: new Date(item.StartDate),
                    end_date: new Date(item.EndDate),
                    progress: parseFloat(item.Progress) || 0,
                    open: item.Open === 'X',
                    parent: parentID
                };
                idMap.set(item.ID, task);
                tasks.push(task);
            });
        
            return tasks;  // Return the created tasks
        }

        assignParentTask(task) {
            const idLowerCase = task.ID.toLowerCase();
        
            if (idLowerCase.startsWith('task a') || idLowerCase.startsWith('task b')) {
                return 'Projekt 1';
            } else if (idLowerCase.startsWith('task c') || idLowerCase.startsWith('task d')) {
                return 'Projekt 2';
            }
            return null;
        }

        render() {
            console.log("Entered render, tasks:", JSON.stringify(this.tasks));
            if (this._dhtmlxGanttReady) {
                console.log("DHTMLX Gantt is ready");
                const chartElement = this._shadowRoot.getElementById('chart');
                console.log("Chart element dimensions:", chartElement.offsetWidth, chartElement.offsetHeight);
                
                gantt.init(chartElement);
                gantt.clearAll();
        
                if (this.tasks.length > 0) {
                    try {
                        console.log("Parsing tasks into Gantt chart");
                        gantt.parse({ data: this.tasks });
                        console.log("Tasks parsed successfully");
                    } catch (error) {
                        console.error("Error parsing tasks:", error);
                    }
                } else {
                    console.log('No tasks to render');
                }
            } else {
                console.log('DHTMLX Gantt not ready');
            }
        }
    }

    customElements.define('gantt-chart-widget', GanttChartWidgetAPI);
})();
