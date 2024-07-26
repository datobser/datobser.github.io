(function () {
    let template = document.createElement('template');
    template.innerHTML = `
        <form id="form">
            <fieldset>
                <legend>Revenue Impact Properties</legend>
                <table>
                    <tr>
                        <td>Base Revenue</td>
                        <td><input id="base_revenue" type="number" step="1000"></td>
                    </tr>
                    <tr>
                        <td>Base Costs</td>
                        <td><input id="base_costs" type="number" step="1000"></td>
                    </tr>
                    <tr>
                        <td>Growth Rate 1 (%)</td>
                        <td><input id="growth_rate1" type="number" step="0.1"></td>
                    </tr>
                    <tr>
                        <td>Growth Rate 2 (%)</td>
                        <td><input id="growth_rate2" type="number" step="0.1"></td>
                    </tr>
                    <tr>
                        <td>Growth Rate 3 (%)</td>
                        <td><input id="growth_rate3" type="number" step="0.1"></td>
                    </tr>
                </table>
                <input type="submit" style="display:none;">
            </fieldset>
        </form>
    `;

    class RevenueImpactBuilderPanel extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: 'open' });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._shadowRoot.getElementById('form').addEventListener('submit', this._submit.bind(this));
            this._shadowRoot.getElementById('form').addEventListener('change', this._change.bind(this));
        }

        _submit(e) {
            e.preventDefault();
        }

        _change(e) {
            var eventDetail = {
                properties: {
                    baseRevenue: this.baseRevenue,
                    baseCosts: this.baseCosts,
                    growthRate1: this.growthRate1,
                    growthRate2: this.growthRate2,
                    growthRate3: this.growthRate3
                }
            };
            this.dispatchEvent(new CustomEvent('propertiesChanged', { detail: eventDetail }));
        }

        set baseRevenue(newBaseRevenue) {
            this._shadowRoot.getElementById('base_revenue').value = newBaseRevenue;
        }

        get baseRevenue() {
            return Number(this._shadowRoot.getElementById('base_revenue').value);
        }

        set baseCosts(newBaseCosts) {
            this._shadowRoot.getElementById('base_costs').value = newBaseCosts;
        }

        get baseCosts() {
            return Number(this._shadowRoot.getElementById('base_costs').value);
        }

        set growthRate1(newGrowthRate1) {
            this._shadowRoot.getElementById('growth_rate1').value = newGrowthRate1;
        }

        get growthRate1() {
            return Number(this._shadowRoot.getElementById('growth_rate1').value);
        }

        set growthRate2(newGrowthRate2) {
            this._shadowRoot.getElementById('growth_rate2').value = newGrowthRate2;
        }

        get growthRate2() {
            return Number(this._shadowRoot.getElementById('growth_rate2').value);
        }

        set growthRate3(newGrowthRate3) {
            this._shadowRoot.getElementById('growth_rate3').value = newGrowthRate3;
        }

        get growthRate3() {
            return Number(this._shadowRoot.getElementById('growth_rate3').value);
        }
    }

    customElements.define('revenue-builder', RevenueImpactBuilderPanel);
})();