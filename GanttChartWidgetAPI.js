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
                await window.getAccessToken();
                await window.getCsrfToken();
                await window.getProviders();
                const subscriptionID = await window.createSubscription();
                const exportedData = await window.getExportedData(subscriptionID);
                this.tasks = this.processDataFromSAP(exportedData.value);
                this.render();
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
