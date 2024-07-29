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
                this._frappeGanttReady = true;
                this._renderChart();
            };
            this._shadowRoot.appendChild(frappeGanttScript);
        }

        // Gantt chart methods
        static get metadata() {
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
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if ("myDataBinding" in changedProperties) {
                this._updateData(changedProperties.myDataBinding);
            }
        }

        _updateData(dataBinding) {
            if (dataBinding && dataBinding.data) {
                this.tasks = dataBinding.data.map((row, index) => {
                    return {
                        id: row.dimensions_0.id,
                        name: row.dimensions_1.label,
                        start: this._parseDate(row.dimensions_2.rawValue),
                        end: this._parseDate(row.dimensions_3.rawValue),
                        progress: row.measures_0 ? row.measures_0.raw : 0
                    };
                }).filter(task => task.id && task.name && task.start && task.end);
                this._renderChart();
            }
        }

        _parseDate(dateString) {
            // Assuming dateString is in format 'YYYYMMDD'
            if (dateString && dateString.length === 8) {
                const year = dateString.substring(0, 4);
                const month = dateString.substring(4, 6);
                const day = dateString.substring(6, 8);
                return new Date(`${year}-${month}-${day}`);
            }
            return null;
        }

        _renderChart() {
            if (this._frappeGanttReady && this.tasks.length > 0) {
                const chartElement = this._shadowRoot.getElementById('chart');
                chartElement.innerHTML = ''; // Clear previous chart
                new Gantt(chartElement, this.tasks, {
                    view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
                    view_mode: 'Month',
                    date_format: 'YYYY-MM-DD',
                    popup_trigger: 'click'
                });
            }
        }
    }

    customElements.define('basic-gantt', GanttChartWidget);
})();
