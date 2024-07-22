set myDataSource(dataBinding) {
  this._myDataSource = dataBinding;
  console.log("Data Source Set: ", this._myDataSource);
  this.render();
}


var getScriptPromisify = (src) => {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to load script: ${src}`);
    $.getScript(src)
      .done(() => {
        console.log(`Successfully loaded script: ${src}`);
        resolve();
      })
      .fail((jqxhr, settings, exception) => {
        console.error(`Failed to load script: ${src}`, exception);
        reject(exception);
      });
  });
};

(function () {
  const prepared = document.createElement("template");
  prepared.innerHTML = `
    <style>
      #root {
        width: 100%;
        height: 100%;
      }
    </style>
    <div id="root"></div>
  `;

  class HalfDoughnutPrepped extends HTMLElement {
    constructor() {
      super();
      console.log("Constructing HalfDoughnutPrepped widget");
      this.attachShadow({ mode: "open" }).appendChild(prepared.content.cloneNode(true));
      this._root = this.shadowRoot.getElementById("root");
      this._props = {};
      this._myDataSource = null;
      this.render();
    }

    onCustomWidgetResize(width, height) {
      console.log("Resizing widget:", width, height);
      this.render();
    }

    set myDataSource(dataBinding) {
      console.log("Setting data source:", dataBinding);
      this._myDataSource = dataBinding;
      this.render();
    }

    async render() {
      try {
        console.log("Rendering chart...");
        await getScriptPromisify("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.0.0/echarts.min.js");

        if (!this._myDataSource) {
          console.log("No data source provided.");
          return;
        }

        if (this._myDataSource.state !== "success") {
          console.log("Data source state is not 'success':", this._myDataSource.state);
          return;
        }

        const dimension = this._myDataSource.metadata.feeds.dimensions.values[0];
        const measure = this._myDataSource.metadata.feeds.measures.values[0];
        console.log("Dimension:", dimension, "Measure:", measure);

        const data = this._myDataSource.data.map((data) => ({
          name: data[dimension].label,
          value: data[measure].raw,
        }));
        console.log("Processed data:", data);

        const halfValue = data.reduce((accumulator, item) => accumulator + item.value, 0);
        data.push({
          value: halfValue,
          itemStyle: {
            color: 'none',
            decal: {
              symbol: 'none'
            }
          },
          label: {
            show: false
          }
        });
        console.log("Final data for chart:", data);

        const myChart = echarts.init(this._root, "wight");
        const option = {
          color: ['#0070F2', '#D2EFFF', '#4CB1FF', '#89D1FF'],
          tooltip: {
            trigger: "item",
            formatter: "{a} <br/>{b}: {c} ({d}%)",
          },
          series: [
            {
              name: '',
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', '70%'],
              startAngle: 180,
              label: {
                show: true,
                formatter(param) {
                  return `${param.name} (${param.percent * 2}%)`;
                }
              },
              data,
            },
          ],
        };
        console.log("Chart options:", option);
        myChart.setOption(option);
        console.log("Chart rendered successfully.");
      } catch (error) {
        console.error("Failed to render chart:", error);
      }
    }
  }

  // Registrierung des Custom Widgets
  console.log("half-doughnut");
  customElements.define("com-sap-sample-echarts-half_doughnut", HalfDoughnutPrepped);
  console.log("Custom widget registered successfully.");
})();
