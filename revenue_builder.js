(function() {
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
                    <tr>
                        <td colspan="2">
                            <input id="profit_formula" type="text" readonly 
                                   value="Profit = (Base Revenue * (1 + Growth Rate / 100)) - Base Costs" 
                                   style="width: 100%; font-style: italic;">
                        </td>
                    </tr>
                </table>
                <div id="formula_container">
                    <p>Profit Formula:</p>
                    <input id="profit_formula" type="text" readonly 
                           value="Profit = (Base Revenue * (1 + Growth Rate / 100)) - Base Costs">
                </div>
                <input type="submit" style="display:none;">
                <input type="submit" style="display:none;">
            </fieldset>
        </form>
        <style>
            #formula_container {
                margin-top: 15px;
            }
            #formula_container p {
                margin-bottom: 5px;
                font-weight: bold;
            }
            #profit_formula {
                width: 100%;
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                padding: 5px;
                font-size: 0.9em;
                font-style: italic;
            }
        </style>
    `;

    class RevenueImpactBuilderPanel extends HTMLElement {
        constructor() {
            super();
            console.log('RevenueImpactBuilderPanel constructor called');
            this._shadowRoot = this.attachShadow({mode: 'open'});
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._shadowRoot.getElementById('form').addEventListener('submit', this._submit.bind(this));
            
            // Add event listeners for each input
            this._shadowRoot.getElementById('base_revenue').addEventListener('change', this._changeBaseRevenue.bind(this));
            this._shadowRoot.getElementById('base_costs').addEventListener('change', this._changeBaseCosts.bind(this));
            this._shadowRoot.getElementById('growth_rate1').addEventListener('change', this._changeGrowthRate1.bind(this));
            this._shadowRoot.getElementById('growth_rate2').addEventListener('change', this._changeGrowthRate2.bind(this));
            this._shadowRoot.getElementById('growth_rate3').addEventListener('change', this._changeGrowthRate3.bind(this));
        }

        _submit(e) {
            e.preventDefault();
            console.log('Form submission prevented');
        }

        _changeBaseRevenue(e) {
            console.log('Base Revenue changed to:', e.target.value);
            this.dispatchEvent(new CustomEvent('propertiesChanged', {
                detail: {
                    properties: {
                        baseRevenue: Number(e.target.value)
                    }
                }
            }));
        }

        _changeBaseCosts(e) {
            console.log('Base Costs changed to:', e.target.value);
            this.dispatchEvent(new CustomEvent('propertiesChanged', {
                detail: {
                    properties: {
                        baseCosts: Number(e.target.value)
                    }
                }
            }));
        }

        _changeGrowthRate1(e) {
            console.log('Growth Rate 1 changed to:', e.target.value);
            this.dispatchEvent(new CustomEvent('propertiesChanged', {
                detail: {
                    properties: {
                        growthRate1: Number(e.target.value)
                    }
                }
            }));
        }

        _changeGrowthRate2(e) {
            console.log('Growth Rate 2 changed to:', e.target.value);
            this.dispatchEvent(new CustomEvent('propertiesChanged', {
                detail: {
                    properties: {
                        growthRate2: Number(e.target.value)
                    }
                }
            }));
        }

        _changeGrowthRate3(e) {
            console.log('Growth Rate 3 changed to:', e.target.value);
            this.dispatchEvent(new CustomEvent('propertiesChanged', {
                detail: {
                    properties: {
                        growthRate3: Number(e.target.value)
                    }
                }
            }));
        }

        // Getter and setter for baseRevenue
        get baseRevenue() {
            return Number(this._shadowRoot.getElementById('base_revenue').value);
        }
        set baseRevenue(value) {
            console.log('Setting base revenue to:', value);
            this._shadowRoot.getElementById('base_revenue').value = value;
        }

        // Getter and setter for baseCosts
        get baseCosts() {
            return Number(this._shadowRoot.getElementById('base_costs').value);
        }
        set baseCosts(value) {
            console.log('Setting base costs to:', value);
            this._shadowRoot.getElementById('base_costs').value = value;
        }

        // Getter and setter for growthRate1
        get growthRate1() {
            return Number(this._shadowRoot.getElementById('growth_rate1').value);
        }
        set growthRate1(value) {
            console.log('Setting growth rate 1 to:', value);
            this._shadowRoot.getElementById('growth_rate1').value = value;
        }

        // Getter and setter for growthRate2
        get growthRate2() {
            return Number(this._shadowRoot.getElementById('growth_rate2').value);
        }
        set growthRate2(value) {
            console.log('Setting growth rate 2 to:', value);
            this._shadowRoot.getElementById('growth_rate2').value = value;
        }

        // Getter and setter for growthRate3
        get growthRate3() {
            return Number(this._shadowRoot.getElementById('growth_rate3').value);
        }
        set growthRate3(value) {
            console.log('Setting growth rate 3 to:', value);
            this._shadowRoot.getElementById('growth_rate3').value = value;
        }
    }

    customElements.define('revenue-builder', RevenueImpactBuilderPanel);
})();
