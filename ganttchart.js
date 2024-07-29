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
                    return {
                        id: row.dimensions_0.id,
                        name: row.dimensions_1.label,
                        start: this._parseDate(row.dimensions_2.rawValue),
                        end: this._parseDate(row.dimensions_3.rawValue),
                        progress: row.measures_0 ? row.measures_0.raw : 0
                    };
                }).filter(task => {
                    const isValid = task.id && task.name && task.start && task.end;
                    if (!isValid) {
                        console.log('Invalid task filtered out:', task);
                    }
                    return isValid;
                });
                console.log('Processed tasks:', this.tasks);
                this._renderChart();
            } else {
                console.log('No data available in dataBinding');
            }
        }

        _parseDate(dateString) {
            console.log('_parseDate called with:', dateString);
            // Assuming dateString is in format 'YYYYMMDD'
            if (dateString && dateString.length === 8) {
                const year = dateString.substring(0, 4);
                const month = dateString.substring(4, 6);
                const day = dateString.substring(6, 8);
                const parsedDate = new Date(`${year}-${month}-${day}`);
                console.log('Parsed date:', parsedDate);
                return parsedDate;
            }
            console.log('Invalid date string');
            return null;
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
