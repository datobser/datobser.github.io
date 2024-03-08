// alte Version von gestern
(function () {
    let tmpl = document.createElement('template');
    tmpl.innerHTML =
        `
        <style>
        /* CSS styles for the widget */
    
        #content {
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            background-color: rgba(255, 255, 255, 0.0);
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.25);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        </style>
        
        <body>
            <div id="root">
                <div id="content">
                    <!-- Widget content -->
                </div>
            </div>
        </body>
       `;

    class PerformanceHelp extends HTMLElement {
        constructor() {
            console.log('constructor() called');
            super();
            this.init();
        }

        init() {
            // Create the shadow root and add the template
            this._shadowRoot = this.attachShadow({ mode: 'open' });
            this._shadowRoot.appendChild(tmpl.content.cloneNode(true));

            // Add event listener for the Resize event
            window.addEventListener('resize', this.onResize.bind(this));

            this.addEventListener('propertiesChanged', this.onPropertiesChanged.bind(this));

            this.onResize();
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            // framework method
            console.log('BeforeUpdate() called');
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            // framework method
            console.log('AfterUpdate() called');
            
            if ("backgroundColor" in changedProperties) {
                this._updateBackgroundColor(changedProperties.backgroundColor);
            }

        }

        onPropertiesChanged(event) {
            console.log('onPropertiesChanged() called with');
            console.log(event.detail.properties);

            const { blur } = event.detail.properties;
            this._updateBlur(blur);

            const { opacity } = event.detail.properties;
            this._updateOpacity(opacity);

            const { borderRadius } = event.detail.properties;
            this._updateBorderRadius(borderRadius);
        
            const { shadowSize } = event.detail.properties; // new
            this.updateShadowSize(shadowSize); // new
            /*
            const { shadowDarkness } = event.detail.properties; // new
            this.updateShadowDarkness(shadowDarkness); // new
            */
        }

        _updateBackgroundColor(color) {
            const widget = this._shadowRoot.querySelector('#content');
            widget.style.backgroundColor = color;
        }

        _updateOpacity(opacity) {
            const widget = this._shadowRoot.querySelector('#content');
            widget.style.opacity = opacity;
        }


        _updateBlur(blur) {
            const widget = this._shadowRoot.querySelector('#content');
            widget.style.webkitBackdropFilter = `blur(${blur}px)`;
            widget.style.backdropFilter = `blur(${blur}px)`;
        }

        _updateBorderRadius(borderRadius) {
            const widget = this._shadowRoot.querySelector('#content');
            widget.style.boxShadow = `0 0 10px rgba(0, 0, 0, 0.5)`;
            widget.style.borderRadius = `${borderRadius}px`;
        }

        updateShadowSize(size) { // new
            console.log('updateShadowSize() called');
            const widget = this._shadowRoot.querySelector('#content');
            widget.style.boxShadow = `0 0 ${size}px rgba(0, 0, 0, 0.5)`;
        } 
        
        updateShadowDarkness(darkness) {
            const widget = this._shadowRoot.querySelector('#content');
            const existingBoxShadow = widget.style.boxShadow;
            const [xOffset, yOffset, blurRadius, spreadRadius, color] = existingBoxShadow.split(' ');
            const rgbaColor = color.substring(0, color.lastIndexOf(',')) + `, ${darkness})`;
            widget.style.boxShadow = `${xOffset} ${yOffset} ${blurRadius} ${spreadRadius} ${rgbaColor}`;
        }

        onResize() {
            console.log('Window has been resized!');
            const rootElement = this._shadowRoot.getElementById('root');
            const contentElement = this._shadowRoot.getElementById('content');
            const rootWidth = rootElement.clientWidth;
            const rootHeight = rootElement.clientHeight;
            contentElement.style.width = `${rootWidth - 20}px`;
            contentElement.style.height = `${rootHeight - 20}px`;
        }
    }

    customElements.define('shadow-widget', PerformanceHelp);
})();
