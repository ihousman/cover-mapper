 var addLayer;var map;var view;
    var mapper = new Object();
    var layerNumber = 1;
    var layerList = [];
    require([
      "esri/widgets/Attribution",
      "esri/config",
      "esri/layers/GeoJSONLayer",
      "esri/layers/WebTileLayer",
      "esri/Map",
      "esri/Basemap",
      "esri/views/SceneView",
      "esri/views/MapView",
      "esri/widgets/Expand",
      "esri/widgets/LayerList",
      "esri/widgets/Legend",
      "esri/widgets/CoordinateConversion",
      "esri/layers/ElevationLayer",
      "esri/layers/BaseElevationLayer",
      "esri/widgets/BasemapGallery",
      "esri/widgets/ScaleBar",
      "dojo/domReady!"
    ], function(Attribution,esriConfig, GeoJSONLayer, WebTileLayer, Map,
      Basemap, SceneView,MapView,Expand,LayerList,Legend,CoordinateConversion,ElevationLayer,BaseElevationLayer,BasemapGallery,ScaleBar
    ) {

      // Push Regular Expression to allow all *.stamen.com servers. Alternatively,
      // it can be added as a list of servers, e.g. push("stamen-tiles-a.a.ssl.fastly.net",
      // "stamen-tiles-b.a.ssl.fastly.net", "stamen-tiles-c.a.ssl.fastly.net", "stamen-tiles-d.a.ssl.fastly.net")
      esriConfig.request.corsEnabledServers.push(
        "https://earthengine.googleapis.com/map");

        
        
        
      var ExaggeratedElevationLayer = BaseElevationLayer.createSubclass({

          properties: {
            // exaggerates the actual elevations by x
            exaggeration: 1.5
          },

          load: function() {
            this._elevation = new ElevationLayer({
              url: "//elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
            });

            // wait for the elevation layer to load before resolving load()
            this.addResolvingPromise(this._elevation.load());
          },

          // Fetches the tile(s) visible in the view
          fetchTile: function(level, row, col) {
            return this._elevation.fetchTile(level, row, col)
              .then(function(data) {

                var exaggeration = this.exaggeration;
                for(var i = 0; i < data.values.length; i++) {
                  data.values[i] = data.values[i] * exaggeration;
                }

                return data;
              }.bind(this));
          }
        });

      map = new Map({
        basemap: 'hybrid',
        ground: {
        layers: [ new ExaggeratedElevationLayer() ]
                }
        });


      // Listen for any layer being added or removed in the Map
      // map.allLayers.on("change", function(event) {
      //  console.log("Layer added: ", event.added);
      //  console.log("Layer removed: ", event.removed);
      //  console.log("Layer moved: ", event.moved);
      // });
      // var mapCenter = [-113.67,47.92]//FNF

      var initCamera;
      if(localStorage.coverMapperCamera === undefined || localStorage.coverMapperCamera === null){
        var mapCenter = [-100,30]
        initCamera = {
        heading: 0,
        tilt:10,
        position: {
          latitude: mapCenter[1],
          longitude: mapCenter[0],
          z: 7000000
        }
      };
      }
      else{
        initCamera = JSON.parse(localStorage.coverMapperCamera);
      }
      

      view = new SceneView({
        container: "viewDiv",
        map: map,
        camera: initCamera
      });
      // var view = new MapView({
      //   container: "viewDiv",
      //   map: map,
      //   center: mapCenter,
      //   zoom:9
      // });
      view.watch("camera", function(newValue) {localStorage.coverMapperCamera = JSON.stringify(newValue)});

      //   var ccWidget = new CoordinateConversion({
      //     view: view
      //   });

      // view.ui.add(ccWidget, "bottom-right");
      view.ui.add('attribution','test');
      var scalebar = new ScaleBar({
      view: view
      });
      view.ui.add(scalebar, "bottom-right");


      var basemapGallery = new BasemapGallery({
        view: view,
        
      });

       var bmExpand = new Expand({
        view: view,
        content: basemapGallery,
        id: 'Basemaps',
        autoCollapse: true
      });

      // Add the expand instance to the ui

      view.ui.add(bmExpand, "top-right");

      // Instructions expand widget
                const legend = document.getElementById("the-legend");
                $('#the-legend').show();
                legendExpand = new Expand({
                    expandIconClass: "esri-icon-key",
                    expandTooltip: "Legend",
                    expanded: true,
                    view: view,
                    content: legend
                });
       view.ui.add(legendExpand, "bottom-left");
    


      ee.initialize("https://rcr-ee-proxy.herokuapp.com/api","https://earthengine.googleapis.com/map",function(){



      console.log('initialized')
      $('#spinner').hide();
      runGEE();



      })

      addGeoJSON = function(geoJSON, name,popupTemplate,renderer){
        const geojsonLayer = new GeoJSONLayer({
          url: geoJSON,
          title:name,
          opacity:0.4,
          popupTemplate: popupTemplate,
          copyright:'Google Earth Engine | USDA Forest Service',
          renderer: renderer //optional
        });
          map.layers.add(geojsonLayer);

      }
      
      addLayer = function(eeImage,vizParams,name,visible){
          if(vizParams.addRampToLegend === undefined || vizParams.addRampToLegend === null){vizParams.addRampToLegend = false};
          if(visible === undefined || visible === null){visible = true};
          if(name === undefined || name === null){name = 'Layer '+ layerNumber.toString()};
          if(!vizParams.opacity){vizParams.opacity = 1};
          if(vizParams.addRampToLegend){
            if(vizParams.labelEnding === undefined || vizParams.labelEnding === null){vizParams.labelEnding = ''}
            var palette = vizParams.palette;
            var ramp = palette.split(',').map(function(i){return '#'+i}).join(',');
            console.log(ramp)
            $('#the-legend-labels').append(`<br>
            <li><span style = 'width:100%;'>${name}</span></li>
            <li><span style='background:linear-gradient(to right,${ramp});width:100%;'></span></li>
            <li style = 'float:left'>${vizParams.min}${vizParams.labelEnding}</li>
            <li style = 'float:right'>${vizParams.max}${vizParams.labelEnding}</li>`)
          }
         
          var actualOpacity = vizParams.opacity;
          vizParams.opacity = 1;
          var m = eeImage.getMap(vizParams);
          var url = "https://earthengine.googleapis.com/map/"+m.mapid+"/{level}/{col}/{row}?token="+m.token;
          console.log(name);console.log(url);
          var urlThumb = "https://earthengine.googleapis.com/map/"+m.mapid+"/10/177/409?token="+m.token + ".png"
          var eeBaseLayer = new WebTileLayer({
                          urlTemplate: url,
                          id: name,
                          title:name,
                          visible: visible,
                          opacity: actualOpacity ,
                          copyright:'Google Earth Engine | USDA Forest Service' 
                          });
          // Create a Basemap with the WebTileLayer. The thumbnailUrl will be used for
          // the image in the BasemapToggle widget.
          // var eeMap = new Basemap({
          // baseLayers: [eeBaseLayer],
          // title: name,
          // id: name,
          // thumbnailUrl: urlThumb
          // });
          
          map.layers.add(eeBaseLayer)
          layerList.push(eeBaseLayer)
          layerNumber ++
        }

        mapper.addLayer = addLayer;

      ////////////////////////////////////////////////////////////
      function runGEE(){
      var msaStats = ee.FeatureCollection('projects/igde-work/CODA_UrbanCanopy/msas-canopy-cover-stats');
      // var blockStats = ee.FeatureCollection('projects/igde-work/CODA_UrbanCanopy/blocks-z12-canopy-cover-stats');
      // var tempI = blockStats.reduceToImage(['mean_temperature_canopy'], ee.Reducer.first())
      // addLayer(tempI,{min:10,max:50,palette:'00F,888,F00'},'Block Canopy Mean Temp')
       var c = ee.ImageCollection('users/Shree1175/CODA_Canopy/FinalCollection').mosaic(); 
       var temps = ee.ImageCollection('projects/igde-work/CODA_UrbanCanopy/CODA-MSA-Temperatures').mosaic().clip(msaStats).subtract(273.15);
       addLayer(temps,{min:15,max:50,palette:'00F,888,F00',opacity:0.7,addRampToLegend:true,labelEnding:'&#xb0 C'},'Median Summer Temperature',false);
       addLayer(c,{min:1,max:1,palette:'0F0',opacity:0.9},'Canopy Image');


       const template = {
          title: "{name}",
          content:`<table class = 'table table-hover'>
                    <tbody>
                      <tr>
                        <td>Non Canopy</td>
                        <td>{nonCanopy_pct} %</td>
                      </tr>
                      <tr>
                        <td>Canopy</td>
                        <td>{canopy_pct} %</td>
                      </tr>

                      <tr>
                        <td>Mean Non Canopy Temperature </td>
                        <td>{mean_temperature_nonCanopy} &#177 {se_temperature_canopy} &#xb0 C</td>
                      </tr>
                      <tr>
                        <td>Mean Canopy Temperature </td>
                        <td>{mean_temperature_canopy} &#177 {se_temperature_nonCanopy} &#xb0 C</td>
                      </tr>
                    </tbody>
                  </table>`
          // content: [{
          //   // It is also possible to set the fieldInfos outside of the content
          //   // directly in the popupTemplate. If no fieldInfos is specifically set
          //   // in the content, it defaults to whatever may be set within the popupTemplate.
          //   type: "fields",
          //   fieldInfos: [{
          //     fieldName: "nonCanopy_pct",
          //     label: "Non Canopy %",
          //     format: {
          //       digitSeparator: true,
          //       places: 2
          //     }
          //   },{
          //     fieldName: "canopy_pct",
          //     label: "Canopy %",
          //     format: {
          //       digitSeparator: true,
          //       places: 2
          //     }}
          //     ,{
          //     fieldName: "mean_temperature_nonCanopy",
          //     label: "Mean Non Canopy Temperature (&#xb0 C)",
          //     format: {
          //       digitSeparator: true,
          //       places: 1
          //     }}
          //     ,{
          //     fieldName: "se_temperature_nonCanopy",
          //     label: "Standard Error Non Canopy Temperature (&#xb0 C)",
          //     format: {
          //       digitSeparator: true,
          //       places: 1
          //     }}
          //     ,{
          //     fieldName: "mean_temperature_canopy",
          //     label: "Mean Canopy Temperature (&#xb0 C)",
          //     format: {
          //       digitSeparator: true,
          //       places: 1
          //     }}
          //     ,{
          //     fieldName: "se_temperature_nonCanopy_canopy",
          //     label: "Standard Error Canopy Temperature (&#xb0 C)",
          //     format: {
          //       digitSeparator: true,
          //       places: 1
          //     }}
              
              
          //   ]},{
          //       // You can set a media element within the popup as well. This
          //       // can be either an image or a chart. You specify this within
          //       // the mediaInfos. The following creates a pie chart in addition
          //       // to two separate images. The chart is also set up to work with
          //       // related tables. Similar to text elements, media can only be set within the content.
          //       type: "media", // MediaContentElement
          //       mediaInfos: [
          //         // {
          //         //   title: "<b>Temp Canopy Distribution</b>",
          //         //   type: "bar-chart",
          //         //   caption: "",
          //         //   value: {
          //         //     fields: ["temperature_canopy_p0", "temperature_canopy_p5", "temperature_canopy_p10", "temperature_canopy_p15", "temperature_canopy_p20", "temperature_canopy_p25", "temperature_canopy_p30", "temperature_canopy_p35", "temperature_canopy_p40", "temperature_canopy_p45", "temperature_canopy_p50", "temperature_canopy_p55", "temperature_canopy_p60", "temperature_canopy_p65", "temperature_canopy_p70", "temperature_canopy_p75", "temperature_canopy_p80", "temperature_canopy_p85", "temperature_canopy_p90", "temperature_canopy_p95", "temperature_canopy_p100"],
                      
          //         //   }
          //         // },
          //         // {
          //         //   title: "<b>Temp Non Canopy Distribution</b>",
          //         //   type: "bar-chart",
          //         //   caption: "",
          //         //   value: {
          //         //     fields: ["temperature_nonCanopy_p0", "temperature_nonCanopy_p5", "temperature_nonCanopy_p10", "temperature_nonCanopy_p15", "temperature_nonCanopy_p20", "temperature_nonCanopy_p25", "temperature_nonCanopy_p30", "temperature_nonCanopy_p35", "temperature_nonCanopy_p40", "temperature_nonCanopy_p45", "temperature_nonCanopy_p50", "temperature_nonCanopy_p55", "temperature_nonCanopy_p60", "temperature_nonCanopy_p65", "temperature_nonCanopy_p70", "temperature_nonCanopy_p75", "temperature_nonCanopy_p80", "temperature_nonCanopy_p85", "temperature_nonCanopy_p90", "temperature_nonCanopy_p95", "temperature_nonCanopy_p100"],
                      
          //         //   }
          //         // },
          //          {
          //           title: "<b>Temperature</b>",
          //           type: "column-chart",
          //           caption: "",
          //           value: {
                      
          //             fields: ["mean_temperature_canopy","mean_temperature_nonCanopy"],
          //             labels:['1','2'],
          //             format: {
          //       digitSeparator: true,
          //       places: 2
          //     },
          //     theme:"Julie",
          //             },

          //         },
          //         {
          //           title: "<b>Canopy %</b>",
          //           type: "pie-chart",
          //           caption: "",
          //           value: {
          //             fields: ["nonCanopy_pct","canopy_pct"],
          //             format: {
          //       digitSeparator: true,
          //       places: 2
          //     },
          //             theme:"Julie"
          //            /* min:290,
          //             max:310*/
                      
          //           }
          //         }
          //         ]}
          //   ]

          // "Non Tree: {nonCanopy_pct}% <br> Tree: {canopy_pct}%<br><br>Mean Tree Temperature: {temperature_canopy_mean}<br>Mean Tree Temperature: {temperature_nonCanopy_mean}",
          
        };

        // const renderer = {
        //   type: "simple",
        //   field: "Tree",
        //   symbol: {
        //     type: "simple-marker",
        //     color: "orange",

        //     outline: {
        //       color: "white"
        //     }
        //   },
        //   visualVariables: [
        //     {
        //       type: "size",
        //       field: "canopy_pct",
        //       stops: [
        //         {
        //           value: 5,
        //           size: "2px"
        //         },
        //         {
        //           value: 20,
        //           size: "20px"
        //         }
        //       ]
        //     }
        //   ]
        // };
        

      var renderer = {
          type: "simple",  // autocasts as new SimpleRenderer()
          symbol: {
            type: "simple-fill",  // autocasts as new SimpleFillSymbol()
            color: [ 255, 128, 0, 0 ],
            outline: {  // autocasts as new SimpleLineSymbol()
              width: 0,
              color: "white"
            }
          }
        };

       addGeoJSON("./js/msa_cover_stats.geojson",'Canopy Features',template,renderer)
       // var tcc = ee.Image('USGS/NLCD/NLCD2011').select([2]);
        // tcc = tcc.updateMask(tcc.gt(10))
        // addLayer(tcc,{min:10,max:100,palette:'000,888,0F0',opacity:0.5},'tcc');
     view.when(function() {



        // Add widget to the top right corner of the view
        // view.ui.add(layerList, "top-right");
        var layerList = new LayerList({
                        view: view,
                        listItemCreatedFunction: function (event) {

                            // The event object contains an item property.
                            // is is a ListItem referencing the associated layer
                            // and other properties. You can control the visibility of the
                            // item, its title, and actions using this object.

                            var item = event.item;



                            // An array of objects defining actions to place in the LayerList.
                            // By making this array two-dimensional, you can separate similar
                            // actions into separate groups with a breaking line.

                            item.actionsSections = [

                                [{
                                    title: "Increase opacity ",
                                    className: "esri-icon-up",
                                    id: "increase-opacity"
                                }, {
                                    title: "Decrease opacity",
                                    className: "esri-icon-down",
                                    id: "decrease-opacity"
                                }]
                            ];


                        }
                    });

                    // Event listener that fires each time an action is triggered

                    layerList.on("trigger-action", function (event) {
                        console.log(event)
                        // The layer visible in the view at the time of the trigger.
                        var visibleLayer = event.item.layer;

                        //.visible ?
                        //USALayer : censusLayer;

                        // Capture the action id.
                        var id = event.action.id;

                        if (id === "increase-opacity") {

                            // if the increase-opacity action is triggered, then
                            // increase the opacity of the GroupLayer by 0.25

                            if (visibleLayer.opacity < 1) {
                                visibleLayer.opacity += 0.25;

                            }
                        } else if (id === "decrease-opacity") {

                            // if the decrease-opacity action is triggered, then
                            // decrease the opacity of the GroupLayer by 0.25

                            if (visibleLayer.opacity > 0) {
                                visibleLayer.opacity -= 0.25;
                            }
                        }
                    });
        var bgExpand = new Expand({
        view: view,
        content: layerList,
        id: 'EE Maps'
      });
    
      // Add the expand instance to the ui

      view.ui.add(bgExpand, "top-right");

    
    //   var legend = new Legend({
    //   view: view,
    //   layerInfos: [{
    //   layer: layerList[0],
    //   title: "Dominant political party by number of registered voters for each U.S. County"
    // }]
    //   });
    //   view.ui.add(legend, "bottom-left");

      });
     
      // basemapGallery = new BasemapGallery({  
      //     showArcGISBasemaps: false,  
      //     basemaps: basemaps,  
      //     map: map  
      //   });  



      //  var basemapGallery = new BasemapGallery({
      //   view: view,
        
      //   container: document.createElement("div")
      // });

      // // Create an Expand instance and set the content
      // // property to the DOM node of the basemap gallery widget
      // // Use an Esri icon font to represent the content inside
      // // of the Expand widget

      // var bgExpand = new Expand({
      //   view: view,
      //   content: basemapGallery
      // });

      // // Add the expand instance to the ui

      // view.ui.add(bgExpand, "top-right");

      // view.when(function() {
      //   // Add a basemap toggle widget to toggle between basemaps
      //   var toggle = new BasemapToggle({
      //     titleVisible: true,
      //     view: view,
      //     nextBasemap: eeMap
      //   });

      //   // Add widget to the top right corner of the view
      //   view.ui.add(toggle, "top-right");
      // });





      // var m = l8s.getMap({'min':500,'max':5000,'bands':'swir1,nir,red'})
      // // var m = i.getMap({'min':0,'max':100,'palette':'000,080','opacity':1})
      
      // var eeBaseLayer = new WebTileLayer({
      //   urlTemplate: "https://earthengine.googleapis.com/map/"+m.mapid+"/{level}/{col}/{row}?token="+m.token,
      //   });
      
      
      // // Create a Basemap with the WebTileLayer. The thumbnailUrl will be used for
      // // the image in the BasemapToggle widget.
      // var eeMap = new Basemap({
      //   baseLayers: [eeBaseLayer],
      //   title: "Terrain",
      //   id: "terrain",
      //   thumbnailUrl: "https://stamen-tiles.a.ssl.fastly.net/terrain/10/177/409.png"
      // });

      // var map = new Map({
      //   basemap: eeMap,
      //   ground: "world-elevation"
      // });

      // var initCamera = {
      //   heading: 90,
      //   tilt:70,
      //   position: {
      //     latitude: 40.5,
      //     longitude: -112.5,
      //     z: 20000
      //   }
      // };

      // var view = new SceneView({
      //   container: "viewDiv",
      //   map: map,
      //   camera: initCamera
      // });

      //  var basemapGallery = new BasemapGallery({
      //   view: view,
      //   source: LocalBasemapsSource,
      //   container: document.createElement("div")
      // });

      // // Create an Expand instance and set the content
      // // property to the DOM node of the basemap gallery widget
      // // Use an Esri icon font to represent the content inside
      // // of the Expand widget

      // var bgExpand = new Expand({
      //   view: view,
      //   content: basemapGallery
      // });

      // // Add the expand instance to the ui

      // view.ui.add(bgExpand, "top-right");

      // view.when(function() {
      //   // Add a basemap toggle widget to toggle between basemaps
      //   var toggle = new BasemapToggle({
      //     titleVisible: true,
      //     view: view,
      //     nextBasemap: eeMap
      //   });

      //   // Add widget to the top right corner of the view
      //   view.ui.add(toggle, "top-right");
      // });
    

}

    });