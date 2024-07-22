var getScriptPromisify = (src) => {
  return new Promise((resolve, reject) => {
    $.getScript(src)
      .done(() => resolve())
      .fail((jqxhr, settings, exception) => reject(exception));
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
      this.attachShadow({ mode: "open" }).appendChild(prepared.content.cloneNode(true));
      this._root = this.shadowRoot.getElementById("root");
      this._props = {};
      this._myDataSource = null;
      this.render();
    }

    onCustomWidgetResize(width, height) {
      this.render();
    }

    set myDataSource(dataBinding) {
      this._myDataSource = dataBinding;
      this.render();
    }

    async render() {
      try {
        await getScriptPromisify("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.0.0/echarts.min.js");

        if (!this._myDataSource || this._myDataSource.state !== "success") {
          return;
        }

        const dimension = this._myDataSource.metadata.feeds.dimensions.values[0];
        const measure = this._myDataSource.metadata.feeds.measures.values[0];
        const data = this._myDataSource.data.map((data) => ({
          name: data[dimension].label,
          value: data[measure].raw,
        }));

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
        myChart.setOption(option);
      } catch (error) {
        console.error("Failed to render chart:", error);
      }
    }
  }

  customElements.define("com-sap-sample-echarts-half_doughnut", HalfDoughnutPrepped);
})();
