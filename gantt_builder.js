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
                    </tr>
                    <tr>
                        <td>End Date Column</td>
                        <td><input id="bps_end_date_col" type="text"></td>
                    </tr>
                    <tr>
                        <td>Progress Column</td>
                        <td><input id="bps_progress_col" type="text"></td>
                    </tr>
                    <tr>
                        <td>Open Status Column</td>
                        <td><input id="bps_open_col" type="text"></td>
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
                        dataSource: this.dataSource,
                        idColumn: this.idColumn,
                        taskColumn: this.taskColumn,
                        startDateColumn: this.startDateColumn,
                        endDateColumn: this.endDateColumn,
                        progressColumn: this.progressColumn,
                        openColumn: this.openColumn
                    }
                }
            }));
        }

        set dataSource(dataSource) {
            this._dataSource = dataSource;
            if (this._dataSource && this._dataSource.type === "ResultSet") {
                this._shadowRoot.getElementById("dataSource").innerHTML = "Data Source Type: Result Set";
            } else {
                this._shadowRoot.getElementById("dataSource").innerHTML = "Data Source Type: Unknown";
            }
        }

        get dataSource() {
            return this._dataSource;
        }

        set idColumn(newIdCol) {
            this._shadowRoot.getElementById("bps_id_col").value = newIdCol;
        }

        get idColumn() {
            return this._shadowRoot.getElementById("bps_id_col").value;
        }

        set taskColumn(newTaskCol) {
            this._shadowRoot.getElementById("bps_task_col").value = newTaskCol;
        }

        get taskColumn() {
            return this._shadowRoot.getElementById("bps_task_col").value;
        }

        set startDateColumn(newStartDateCol) {
            this._shadowRoot.getElementById("bps_start_date_col").value = newStartDateCol;
        }

        get startDateColumn() {
            return this._shadowRoot.getElementById("bps_start_date_col").value;
        }

        set endDateColumn(newEndDateCol) {
            this._shadowRoot.getElementById("bps_end_date_col").value = newEndDateCol;
        }

        get endDateColumn() {
            return this._shadowRoot.getElementById("bps_end_date_col").value;
        }

        set progressColumn(newProgressCol) {
            this._shadowRoot.getElementById("bps_progress_col").value = newProgressCol;
        }

        get progressColumn() {
            return this._shadowRoot.getElementById("bps_progress_col").value;
        }

        set openColumn(newOpenCol) {
            this._shadowRoot.getElementById("bps_open_col").value = newOpenCol;
        }

        get openColumn() {
            return this._shadowRoot.getElementById("bps_open_col").value;
        }

        static get observedAttributes() {
            return ["data-source", "id-column", "task-column", "start-date-column", "end-date-column", "progress-column", "open-column"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
            }
        }
    }

    customElements.define("gantt-builder", GanttChartWidgetBuilder);
})();
