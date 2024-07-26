(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <form id="form">
            <fieldset>
                <legend>Gantt Chart Data Bindings</legend>
                <table>
                    <tr>
                        <td>Task ID Dimension</td>
                        <td><input id="bps_id_dim" type="text"></td>
                    </tr>
                    <tr>
                        <td>Task Name Dimension</td>
                        <td><input id="bps_task_dim" type="text"></td>
                    </tr>
                    <tr>
                        <td>Start Date Dimension</td>
                        <td><input id="bps_start_date_dim" type="text"></td>
                    </tr>
                    <tr>
                        <td>End Date Dimension</td>
                        <td><input id="bps_end_date_dim" type="text"></td>
                    </tr>
                    <tr>
                        <td>Progress Measure</td>
                        <td><input id="bps_progress_measure" type="text"></td>
                    </tr>
                    <tr>
                        <td>Open Status Dimension</td>
                        <td><input id="bps_open_dim" type="text"></td>
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
                        idDimension: this.idDimension,
                        taskDimension: this.taskDimension,
                        startDateDimension: this.startDateDimension,
                        endDateDimension: this.endDateDimension,
                        progressMeasure: this.progressMeasure,
                        openDimension: this.openDimension
                    }
                }
            }));
        }

        set idDimension(newIdDim) {
            this._shadowRoot.getElementById("bps_id_dim").value = newIdDim;
        }

        get idDimension() {
            return this._shadowRoot.getElementById("bps_id_dim").value;
        }

        set taskDimension(newTaskDim) {
            this._shadowRoot.getElementById("bps_task_dim").value = newTaskDim;
        }

        get taskDimension() {
            return this._shadowRoot.getElementById("bps_task_dim").value;
        }

        set startDateDimension(newStartDateDim) {
            this._shadowRoot.getElementById("bps_start_date_dim").value = newStartDateDim;
        }

        get startDateDimension() {
            return this._shadowRoot.getElementById("bps_start_date_dim").value;
        }

        set endDateDimension(newEndDateDim) {
            this._shadowRoot.getElementById("bps_end_date_dim").value = newEndDateDim;
        }

        get endDateDimension() {
            return this._shadowRoot.getElementById("bps_end_date_dim").value;
        }

        set progressMeasure(newProgressMeasure) {
            this._shadowRoot.getElementById("bps_progress_measure").value = newProgressMeasure;
        }

        get progressMeasure() {
            return this._shadowRoot.getElementById("bps_progress_measure").value;
        }

        set openDimension(newOpenDim) {
            this._shadowRoot.getElementById("bps_open_dim").value = newOpenDim;
        }

        get openDimension() {
            return this._shadowRoot.getElementById("bps_open_dim").value;
        }

        static get observedAttributes() {
            return ["id-dimension", "task-dimension", "start-date-dimension", "end-date-dimension", "progress-measure", "open-dimension"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
            }
        }
    }

    customElements.define("gantt-builder", GanttChartWidgetBuilder);
})();
