

var getScriptPromisify = (src) => {
  return new Promise((resolve) => {
    $.getScript(src, resolve);
  });
};

(function () {

  const parseMetadata = metadata => {
    const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata
    const dimensions = []
    for (const key in dimensionsMap) {
      const dimension = dimensionsMap[key]
      dimensions.push({ key, ...dimension })
    }
    const measures = []
    for (const key in measuresMap) {
      const measure = measuresMap[key]
      measures.push({ key, ...measure })
    }
    return { dimensions, measures, dimensionsMap, measuresMap }
  }

  const parse = (value, min, max) => {
    value = (value - min) / (max - min)
    value = Math.max(0, Math.min(1, value))
    return value
  }

  const COLORS = ['#89D1FF', '#0070F2', '#0040B0', '#1D2D3E']

  class Renderer {
    constructor (root) {
      this._root = root
      this._echart = null
    }

    async render (dataBinding, stops, reverse) {
      await getScriptPromisify("https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js");
      this.dispose()

      if (dataBinding.state !== 'success') { return }

      const { data, metadata } = dataBinding
      const { dimensions, measures } = parseMetadata(metadata)

      const min = stops[0]
      const max = stops[stops.length - 1]
      const colors = COLORS.slice(0)
      if (reverse)(colors.reverse())
      const ranges = [
        { value: parse(stops[1], min, max), color: colors[0] },
        { value: parse(stops[2], min, max), color: colors[1] },
        { value: parse(stops[3], min, max), color: colors[2] },
        { value: parse(stops[4], min, max), color: colors[3] }
      ]
      const raw = data[0][measures[0].key].raw
      const value = parse(raw, min, max)

      // Ausgabe des aktuellen Werts auf der Konsole
      console.log('Aktueller Wert:', raw);
      console.log('Berechneter Wert:', value);

      // measures
      const series = measures.map(measure => {
        // https://echarts.apache.org/examples/en/editor.html?c=gauge-grade
        return {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 1,
          splitNumber: 8,
          axisLine: {
            lineStyle: {
              width: 6,
              color: ranges.map(range => {
                return [range.value, range.color]
              })
            }
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '12%',
            width: 8,
            offsetCenter: [0, '-25%'],
            itemStyle: {
              color: 'auto'
            }
          },
          axisTick: {
            length: 4,
            lineStyle: {
              color: 'auto',
              width: 1
            }
          },
          splitLine: {
            length: 10,
            lineStyle: {
              color: 'auto',
              width: 0.5
            }
          },
          axisLabel: {
            show: false
            // color: '#464646',
            // fontSize: 20,
            // distance: -60,
            // formatter: function (value) {
            //   if (value === 0.875) {
            //     return 'A'
            //   } else if (value === 0.625) {
            //     return 'B'
            //   } else if (value === 0.375) {
            //     return 'C'
            //   } else if (value === 0.125) {
            //     return 'D'
            //   }
            //   return ''
            // }
          },
          title: {
            show: false
          },
          detail: {
            show: false
          },
          data: [
            {
              value,
              name: 'Grade Rating'
            }
          ]
        }
      })

      data.forEach(row => {
          // Dimensionen verarbeiten
          const name = dimensions.map(dimension => {
            const label = row[dimension.key] ? row[dimension.key].label : '';
            console.log(`Dimension ${dimension.key}: ${label}`); // Log für Dimensionen
            return label;
          }).join('/');
        
          console.log(`Generated name: ${name}`); // Log für den vollständigen Namen
        
          // Messwerte verarbeiten
          measures.forEach(measure => {
            const seriesData = series.find(s => s.name === measure.key); // Suchen Sie die passende Serie
        
            if (seriesData) {
              const rawValue = row[measure.key] ? row[measure.key].raw : null;
              const parsedValue = rawValue !== null ? parse(rawValue, min, max) : null;
              
              console.log(`Measure ${measure.key} raw value: ${rawValue}`); // Log für rohe Messwerte
              console.log(`Measure ${measure.key} parsed value: ${parsedValue}`); // Log für normalisierte Messwerte
              
              if (parsedValue !== null) {
                seriesData.data.push({
                  name,
                  value: parsedValue
                });
                console.log(`Added data to series ${measure.key}:`, { name, value: parsedValue }); // Log für hinzugefügte Daten
              } else {
                console.warn(`No raw value found for measure ${measure.key} in row:`, row); // Warnung, wenn kein Rohwert vorhanden ist
              }
            } else {
              console.warn(`No series found for measure ${measure.key}`); // Warnung, wenn keine passende Serie gefunden wird
            }
          });
      });
        
      // Log zur Überprüfung des finalen series Arrays
      console.log('Final series data:', series);

      this._echart = echarts.init(this._root)
      // https://echarts.apache.org/en/option.html
      this._echart.setOption({
        series
      })
    }

    dispose () {
      if (this._echart) {
        echarts.dispose(this._echart)
      }
    }
  }

  const template = document.createElement('template')
  template.innerHTML = `
  <style>
      #chart {
          width: 100%;
          height: 100%;
      }
  </style>
  <div id="root" style="width: 100%; height: 100%;">
      <div id="chart"></div>
  </div>
  `

  class Main extends HTMLElement {
    constructor () {
      super()

      this._shadowRoot = this.attachShadow({ mode: 'open' })
      this._shadowRoot.appendChild(template.content.cloneNode(true))
      this._root = this._shadowRoot.getElementById('root')
      this._renderer = new Renderer(this._root)
    }

    // ------------------
    // LifecycleCallbacks
    // ------------------
    async onCustomWidgetBeforeUpdate (changedProps) {
    }

    async onCustomWidgetAfterUpdate (changedProps) {
      this.render()
    }

    async onCustomWidgetResize (width, height) {
      this.render()
    }

    async onCustomWidgetDestroy () {
      this.dispose()
    }

    // ------------------
    //
    // ------------------
    render () {
      if (!document.contains(this)) {
        // Delay the render to assure the custom widget is appended on dom
        setTimeout(this.render.bind(this), 0)
        return
      }

      this._renderer.render(this.dataBinding, this.stops, this.reverse)
    }

    dispose () {
      this._renderer.dispose()
    }
  }

  customElements.define('gauge-chart', Main)

})()
