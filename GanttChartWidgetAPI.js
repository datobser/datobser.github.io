(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML = `
    <style>
    #chart {
        width: 100%; 
        height: 500px;  
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
            const idMap = new Map();
            const tasks = [];
        
            // First, create all tasks
            factData.forEach(item => {
                const task = {
                    id: item.ID,
                    text: item.Label,
                    start_date: new Date(item.StartDate),
                    end_date: new Date(item.EndDate),
                    progress: parseFloat(item.Progress) || 0,
                    open: item.Open === 'X'
                };
                idMap.set(item.ID, task);
                tasks.push(task);
            });
        
            // Then, set parent-child relationships based on the idList order
            idList.forEach(id => {
                const task = idMap.get(id);
                if (task) {
                    if (id.toLowerCase().startsWith('task a')) {
                        task.parent = 'Projekt 1'; 
                        
                    } else if (id.toLowerCase().startsWith('task b')) {
                        task.parent = 'Projekt 1';
                    } else if (id.toLowerCase().startsWith('task b')) {
                        task.parent = 'Projekt 1';
                    }
                    else if (id.toLowerCase().startsWith('task c')) {
                        task.parent = 'Projekt 2';
                    }
                    else if (id.toLowerCase().startsWith('task d')) {
                        task.parent = 'Projekt 2';
                    }
                }
            });
        
            return tasks;
        }

        render() {
            if (this._dhtmlxGanttReady) {
                const chartElement = this._shadowRoot.getElementById('chart');
                
                // Configure Gantt to use hierarchy
                gantt.config.sort = true;
                gantt.config.open_tree_initially = true;
                gantt.config.row_height = 30;
                gantt.config.indent_padding = 15;
                gantt.config.columns = [
                    {name: "text", label: "Task name", tree: true, width: '*'},
                    {name: "start_date", label: "Start time", align: "center"},
                    {name: "duration", label: "Duration", align: "center"}
                ];
                
                gantt.init(chartElement);
                gantt.clearAll();
        
                if (this.tasks.length > 0) {
                    gantt.parse({ data: this.tasks });
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
