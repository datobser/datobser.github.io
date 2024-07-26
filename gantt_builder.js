(function () {
    let template = document.createElement("template");
    template.innerHTML = `
        <form id="form">
            <fieldset>
                <legend>Gantt Chart Properties</legend>
                <table>
                    <tr>
                        <td>Task ID</td>
                        <td><input id="bps_id" type="text"></td>
                    </tr>
                    <tr>
                        <td>Task Name</td>
                        <td><input id="bps_task" type="text"></td>
                    </tr>
                    <tr>
                        <td>Start Date</td>
                        <td><input id="bps_start_date" type="text"></td>
                    </tr>
                    <tr>
                        <td>End Date</td>
                        <td><input id="bps_end_date" type="text"></td>
                    </tr>
                    <tr>
                        <td>Progress</td>
                        <td><input id="bps_progress" type="text"></td>
                    </tr>
                    <tr>
                        <td>Open Status</td>
                        <td><input id="bps_open" type="text"></td>
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
                        id: this.id,
                        task: this.task,
                        startDate: this.startDate,
                        endDate: this.endDate,
                        progress: this.progress,
                        open: this.open
                    }
                }
            }));
        }

        set id(newId) {
            this._shadowRoot.getElementById("bps_id").value = newId;
        }

        get id() {
            return this._shadowRoot.getElementById("bps_id").value;
        }

        set task(newTask) {
            this._shadowRoot.getElementById("bps_task").value = newTask;
        }

        get task() {
            return this._shadowRoot.getElementById("bps_task").value;
        }

        set startDate(newStartDate) {
            this._shadowRoot.getElementById("bps_start_date").value = newStartDate;
        }

        get startDate() {
            return this._shadowRoot.getElementById("bps_start_date").value;
        }

        set endDate(newEndDate) {
            this._shadowRoot.getElementById("bps_end_date").value = newEndDate;
        }

        get endDate() {
            return this._shadowRoot.getElementById("bps_end_date").value;
        }

        set progress(newProgress) {
            this._shadowRoot.getElementById("bps_progress").value = newProgress;
        }

        get progress() {
            return this._shadowRoot.getElementById("bps_progress").value;
        }

        set open(newOpen) {
            this._shadowRoot.getElementById("bps_open").value = newOpen;
        }

        get open() {
            return this._shadowRoot.getElementById("bps_open").value;
        }

        static get observedAttributes() {
            return ["id", "task", "start-date", "end-date", "progress", "open"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
            }
        }
    }

    customElements.define("-gantt--builder", GanttChartWidgetBuilder);
})();
