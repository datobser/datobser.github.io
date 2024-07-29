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
        </style>
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
                    
                    const startDate = this._parseDate(row.dimensions_2.rawValue);
                    const endDate = this._parseDate(row.dimensions_3.rawValue);
                    
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
            const match = dateString.match(/^\[.*\].\&\[(\d{4}-\d{2}-\d{2})\]$/);
            const match = dateString.match(/\[\w+\] & \[(\d{4}-\d{2}-\d{2})\]/);

            if (match) {
                const extractedDate = match[1];  // Extrahiertes Datum
                console.log(extractedDate);      // Ausgabe: 2024-07-29
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
    }

    customElements.define('basic-gantt', GanttChartWidget);
})();
