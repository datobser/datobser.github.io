(function() {
    let template = document.createElement('template');
    template.innerHTML = `
        <style>
            :host {
                display: block;
                padding: 1em;
                width: 100%;
                height: 100%;
            }
            #chart {
                width: 100%;
                height: 100%;
            }
        </style>
        <canvas id="chart"></canvas>
    `;

    class RevenueImpactWidget extends HTMLElement {
        constructor() {
            super();
            console.log('RevenueImpactWidget constructor called');
            this._shadowRoot = this.attachShadow({mode: 'open'});
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props = {
                baseRevenue: 1000000,
                baseCosts: 800000,
                growthRate1: 5,
                growthRate2: 10,
                growthRate3: 15
            };
            this._chartInitialized = false;

            this._loadChartJs();
        }

        _loadChartJs() {
            console.log('Loading Chart.js');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                console.log('Chart.js loaded');
                this._initializeChart();
            };
            this._shadowRoot.appendChild(script);
        }

        connectedCallback() {
            console.log('RevenueImpactWidget connected to DOM');
            if (window.Chart && !this._chartInitialized) {
                this._initializeChart();
            }
        }

        _initializeChart() {
            console.log('Initializing chart');
            const ctx = this._shadowRoot.getElementById('chart');
            if (!ctx) {
                console.error('Canvas element not found');
                return;
            }

            this._chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Base', 'Growth 1', 'Growth 2', 'Growth 3'],
                    datasets: [{
                        label: 'Profit',
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(54, 162, 235, 0.6)',
                            'rgba(153, 102, 255, 0.6)',
                            'rgba(255, 159, 64, 0.6)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            this._chartInitialized = true;
            this._updateChart();
        }

        _updateChart() {
            console.log('Updating chart with current properties:', this._props);
            if (!this._chart) {
                console.log('Chart not initialized yet');
                return;
            }

            const baseProfit = this._props.baseRevenue - this._props.baseCosts;
            const profit1 = this._props.baseRevenue * (1 + this._props.growthRate1 / 100) - this._props.baseCosts;
            const profit2 = this._props.baseRevenue * (1 + this._props.growthRate2 / 100) - this._props.baseCosts;
            const profit3 = this._props.baseRevenue * (1 + this._props.growthRate3 / 100) - this._props.baseCosts;

            this._chart.data.datasets[0].data = [baseProfit, profit1, profit2, profit3];
            this._chart.update();
            console.log('Chart updated with new data:', [baseProfit, profit1, profit2, profit3]);
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            console.log('onCustomWidgetBeforeUpdate called with:', changedProperties);
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            console.log('onCustomWidgetAfterUpdate called with:', changedProperties);
            if (this._chartInitialized) {
                this._updateChart();
            } else {
                console.log('Chart not initialized yet, skipping update');
            }
        }

        // Getter and setter for baseRevenue
        get baseRevenue() {
            return this._props.baseRevenue;
        }
        set baseRevenue(value) {
            console.log('baseRevenue setter called with:', value);
            this._props.baseRevenue = value;
            this._updateChart();
        }

        // Getter and setter for baseCosts
        get baseCosts() {
            return this._props.baseCosts;
        }
        set baseCosts(value) {
            console.log('baseCosts setter called with:', value);
            this._props.baseCosts = value;
            this._updateChart();
        }

        // Getter and setter for growthRate1
        get growthRate1() {
            return this._props.growthRate1;
        }
        set growthRate1(value) {
            console.log('growthRate1 setter called with:', value);
            this._props.growthRate1 = value;
            this._updateChart();
        }

        // Getter and setter for growthRate2
        get growthRate2() {
            return this._props.growthRate2;
        }
        set growthRate2(value) {
            console.log('growthRate2 setter called with:', value);
            this._props.growthRate2 = value;
            this._updateChart();
        }

        // Getter and setter for growthRate3
        get growthRate3() {
            return this._props.growthRate3;
        }
        set growthRate3(value) {
            console.log('growthRate3 setter called with:', value);
            this._props.growthRate3 = value;
            this._updateChart();
        }
    }

    customElements.define('revenue-widget', RevenueImpactWidget);
})();
