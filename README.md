# cmvPrint_addCustomFields

This is to add ability to configure custom fields to print layout in the core CMV print

a config for print widget in viewer.js could look like this.  
```
            print3: {
                include: true,
                id: 'print3',
                type: 'titlePane',
                canFloat: true,
                path: 'gis/dijit/Widgets/Print3',
                title: i18n.viewer.widgets.print,
                iconClass: 'fa-floppy-o', 
                open: false,
                position: 28,
                options: {
                    map: true,
                    printTaskURL: 'https://yourserver/arcgis/rest/services/yourprintservice/GPServer/Export%20Web%20Map',
                    copyrightText: '',
                    authorText: '',
                    defaultTitle: 'CMV Map',
                    defaultFormat: 'PDF',
                    defaultLayout: '85x11Landscape',
                    customElements: [
                        //property name should match the custom element in the mxd.  Value should be what you want the label to be.
                        {"requestedBy": "Req by"},
                        {"by": "Map by"},                         
                        {"subTitle": "Subtitle" }
                    ]
                    
                }
            }
```            
