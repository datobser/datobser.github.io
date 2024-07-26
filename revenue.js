(function () {
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
        <div id="chart"></div>
    `;

    class RevenueImpactWidget extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: 'open' });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props = {};

            // Load Chart.js
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => this._initializeChart();
            this._shadowRoot.appendChild(script);
        }

        _initializeChart() {
            const ctx = this._shadowRoot.getElementById('chart').getContext('2d');
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
            this._updateChart();
        }

        _updateChart() {
            if (!this._chart) return;

            const baseProfit = this._props.baseRevenue - this._props.baseCosts;
            const profit1 = this._props.baseRevenue * (1 + this._props.growthRate1 / 100) - this._props.baseCosts;
            const profit2 = this._props.baseRevenue * (1 + this._props.growthRate2 / 100) - this._props.baseCosts;
            const profit3 = this._props.baseRevenue * (1 + this._props.growthRate3 / 100) - this._props.baseCosts;

            this._chart.data.datasets[0].data = [baseProfit, profit1, profit2, profit3];
            this._chart.update();
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            this._updateChart();
        }

        set baseRevenue(value) {
            this._props.baseRevenue = value;
            this._updateChart();
        }

        set baseCosts(value) {
            this._props.baseCosts = value;
            this._updateChart();
        }

        set growthRate1(value) {
            this._props.growthRate1 = value;
            this._updateChart();
        }

        set growthRate2(value) {
            this._props.growthRate2 = value;
            this._updateChart();
        }

        set growthRate3(value) {
            this._props.growthRate3 = value;
            this._updateChart();
        }
    }

    customElements.define('revenue', RevenueImpactWidget);
})();