(function() {
    let template = document.createElement("template");
    template.innerHTML = `
        <form id="form">
            <fieldset>
                <legend>Gantt Chart Properties</legend>
                <table>
                    <tr>
                        <td>Data Source</td>
                        <td><div id="dataSource"></div></td>
                    </tr>
                    <tr>
                        <td>Task ID Column</td>
                        <td><input id="bps_id_col" type="text"></td>
                    </tr>
                    <tr>
                        <td>Task Name Column</td>
                        <td><input id="bps_task_col" type="text"></td>
                    </tr>
                    <tr>
                        <td>Start Date Column</td>
                        <td><input id="bps_start_date_col" type="text"></td>
        let template = document.createElement("template");
    template.innerHTML = `
        <form id="form">
            <fieldset>
                <legend>Gantt Chart Properties</legend>
                <table>
                    <tr>
                        <td>Date Format</td>
                        <td><input id="bps_date_format" type="text"></td>
                    </tr>
                    <tr>
                        <td>Show Progress</td>
                        <td><input id="bps_show_progress" type="checkbox"></td>
                    </tr>
                    <tr>
                        <td>Bar Color</td>
                        <td><input id="bps_bar_color" type="color"></td>
                    </tr>
                </table>
            </fieldset>
        </form>
    `;

    class GanttChartWidgetBuilder extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._shadowRoot.getElementById("form").addEventListener("submit", this._submit.bind(this));
        }

        _submit(e) {
            e.preventDefault();
            this.dispatchEvent(new CustomEvent("propertiesChanged", {
                detail: {
                    properties: {
                        dateFormat: this.dateFormat,
                        showProgress: this.showProgress,
                        barColor: this.barColor
                    }
                }
            }));
        }

        set dateFormat(newFormat) {
            this._shadowRoot.getElementById("bps_date_format").value = newFormat;
        }

        get dateFormat() {
            return this._shadowRoot.getElementById("bps_date_format").value;
        }

        set showProgress(show) {
            this._shadowRoot.getElementById("bps_show_progress").checked = show;
        }

        get showProgress() {
            return this._shadowRoot.getElementById("bps_show_progress").checked;
        }

        set barColor(color) {
            this._shadowRoot.getElementById("bps_bar_color").value = color;
        }

        get barColor() {
            return this._shadowRoot.getElementById("bps_bar_color").value;
        }

        static get observedAttributes() {
            return ["date-format", "show-progress", "bar-color"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
            }
        }
    }

    customElements.define("gantt-builder", GanttChartWidgetBuilder);
})();
