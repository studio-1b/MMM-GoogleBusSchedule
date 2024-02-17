Module.register("MMM-GoogleBusSchedule",{
    // Default module config.
    defaults: {
        apikey: 'your_api_key',
        origin: 'your_origin_here',
        style: 'border:0;-webkit-filter: grayscale(100%);filter: grayscale(100%);',
        googleurl: 'https://maps.googleapis.com/maps/api/js?key=@replacemewithgoogleapikey/&callback=callbackFromGoogle',
        icalurl: null,
        cache: true,
    },

    // Define start sequence
    start: function() {
        Log.log('Starting module: ' + this.name);
        this.origin=null;
        this.sendSocketNotification('GOOGLEMAP_BUS_CONFIG', this.config);
    },
    

    socketNotificationReceived: function(notification, payload) {
        Log.log('MMM-GoogleBusSchedule: socketNotificationReceived ' + notification);
        Log.log(payload);
        if (notification === 'GOOGLEMAP_BUS_JSON') {
            if((typeof payload.error) === "undefined") {
                if (this.origin==null){
                    this.origin=payload;
                    this.updateDom(this.config.animationSpeed);
                } else {
                    this.origin=payload;
                    this.updateGpx();    
                }
            }
        }
        else if (notification === 'GOOGLEMAP_BUS_REVERSEGEO') {
            if((typeof payload.status) !== "undefined" && payload.status=="OK") {
                this.reverseGeo=payload;
//                this.updateDom(this.config.animationSpeed);
                this.updateGeocode();
            }
        }
        else if (notification === 'GOOGLEMAP_BUS_BUSROUTE') {
            payload.forEach((o,i,a)=>{o.departureUTC=o.departureUTC.map(d=>new Date(d)); });
            this.busroute=payload;
            this.updateBusSchedule();
//            this.updateDom(this.config.animationSpeed);
        } else if (notification === 'GOOGLEMAP_BUS_ICAL') {
            /*
            {
            DTSTART: 2023-10-30T23:00:00.000Z,
            DTEND: 2023-10-31T00:00:00.000Z,
            DTSTAMP: 2023-10-26T07:46:28.000Z,
            UID: '17034047-11BE-44C4-BCCB-E8E2EE85E740',
            CREATED: 2023-10-20T09:32:31.000Z,
            'LAST-MODIFIED': 2023-10-26T00:43:02.000Z,
            LOCATION: 'No1 beef noodle',
            SEQUENCE: '1',
            STATUS: 'CONFIRMED',
            SUMMARY: 'Text back',
            TRANSP: 'OPAQUE'
            }
            */
            payload.DTSTART=new Date(payload.DTSTART);
            payload.DTEND=new Date(payload.DTEND);
            payload.DTSTAMP=new Date(payload.DTSTAMP);
            payload.CREATED=new Date(payload.CREATED);
            payload['LAST-MODIFIED']=new Date(payload['LAST-MODIFIED']);
            this.ical=payload;
            this.updateNextAppt();
        }
        
    },


    getDom: function() {
        console.log("GoogleMapBus getDom");
        console.log(this.config);
        var self=this; //used for callbacks, in anonymous functions, where this "refers" to the temporary object created for it, as opposed to the anonymous function created in this object own scope.
window.GoogleMapBus=self;
        var div = document.createElement("div");
        var mapdiv = document.createElement("div");
        div.appendChild(mapdiv);
        // iframe.id="vanpower" + Math.floor(new Date().getTime());
        mapdiv.style = "width:"+this.config.width+"px;height:"+this.config.height+"px;" + this.config.style;
        mapdiv.width = this.config.width;
        mapdiv.height = this.config.height;
        mapdiv.id = "map";
        if (this.origin != null) {
            // GOOGLE JAVASCRIPT MAP
            // window.markers=[];
            window.callbackFromGoogle=function() {
                console.log("map callback started");
                var map = new google.maps.Map(document.getElementById('map'), {
                    //zoom: 14,
                    zoom: 18,
                    //center: { lat: 49.248499, lng: -123.001375 },
                    center: { lat: self.origin.lat, lng: self.origin.lon },
                    mapTypeId: 'roadmap',

                    //https://developers.google.com/maps/documentation/javascript/examples/style-array#maps_style_array-html
                    disableDefaultUI: true,
                    styles: [
                          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                          {
                              featureType: "administrative.locality",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#d59563" }],
                          },
                          {
                              featureType: "poi",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#d59563" }],
                          },
                          {
                              featureType: "poi.park",
                              elementType: "geometry",
                              stylers: [{ color: "#263c3f" }],
                          },
                          {
                              featureType: "poi.park",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#6b9a76" }],
                          },
                          {
                              featureType: "road",
                              elementType: "geometry",
                              stylers: [{ color: "#38414e" }],
                         },
                         {
                              featureType: "road",
                              elementType: "geometry.stroke",
                              stylers: [{ color: "#212a37" }],
                         },
                         {
                              featureType: "road",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#9ca5b3" }],
                         },
                         {
                              featureType: "road.highway",
                              elementType: "geometry",
                              stylers: [{ color: "#746855" }],
                         },
                         {
                              featureType: "road.highway",
                              elementType: "geometry.stroke",
                              stylers: [{ color: "#1f2835" }],
                         },
                         {
                              featureType: "road.highway",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#f3d19c" }],
                         },
                         {
                              featureType: "transit",
                              elementType: "geometry",
                              stylers: [{ color: "#2f3948" }],
                         },
                         {
                              featureType: "transit.station",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#d59563" }],
                         },
                         {
                              featureType: "water",
                              elementType: "geometry",
                              stylers: [{ color: "#17263c" }],
                         },
                         {
                              featureType: "water",
                              elementType: "labels.text.fill",
                              stylers: [{ color: "#515c6d" }],
                         },
                         {
                              featureType: "water",
                              elementType: "labels.text.stroke",
                              stylers: [{ color: "#17263c" }],
                         },
                    ],
                });
                window.oGoogleMap=map;
                self.map=map;
console.log("callback map object");
console.log(map);
                const image = "/modules/MMM-GoogleBusSchedule/van.png";
                const vanMarker = self.gpxmarker = new google.maps.Marker({
                    position: { lat: self.origin.lat, lng: self.origin.lon },
                    map,
                    //icon: image,
                    icon: {
                        url: image,
                        anchor: new google.maps.Point(2, 21),
                    },
                });
                /*
                window.markers.forEach(function(o,i,a){
                    //o[0]=map;
                    //self.marker.apply({},o);
                    const poiMarker = new google.maps.Marker({
                        position: { lat: o[1], lng: o[2] },
                        map,
                        //icon: image,
                        icon: {
                            url: o[4],
                            anchor: new google.maps.Point(15, 15),
                        },
                    });

                    var bounds = new google.maps.LatLngBounds();
                    if(typeof self.bounds === "undefined")
                        self.bounds=bounds;
                    else
                        bounds=self.bounds;
                    //bounds.extend(poiMarker);
                    bounds.extend({ lat: o[1], lng: o[2] });
                });

                self.bounds = new google.maps.LatLngBounds();
                self.bounds.extend({ lat: self.gpx_json.lat+0.01, lng: self.gpx_json.lon });
                self.bounds.extend({ lat: self.gpx_json.lat-0.01, lng: self.gpx_json.lon });
                self.bounds.extend({ lat: self.gpx_json.lat, lng: self.gpx_json.lon+0.02 });
                self.bounds.extend({ lat: self.gpx_json.lat, lng: self.gpx_json.lon-0.02 });

                map.fitBounds(self.bounds);*/

                console.log("map callback finished");
            };

            let script = document.createElement("script");
            script.setAttribute("src", this.config.googleurl.replace("@replacemewithgoogleapikey/",this.config.apikey) );
            div.appendChild(script);
            //map.innerHTML = "<script async defer src='" + this.config.googleurl.replace("@replacemewithgoogleapikey/",this.config.apikey) + "'></script>";

            // TIME, CENTER COORDINATES
            var topdiv = document.createElement("div");
            topdiv.className="thin xsmall";
            topdiv.style.textAlign="left";
            topdiv.style.position="relative";
            topdiv.style.top=-this.config.height+"px";
            topdiv.style.left="0px";
            topdiv.style.backgroundColor="rgba(0,0,0, 0.5)";
            div.appendChild(topdiv);

            var timediv = document.createElement("div");
            timediv.style.fontSize="8pt";
            timediv.innerHTML =( new Date()).toLocaleString();
            self.timediv=timediv;
            topdiv.appendChild(timediv);

            var neardiv = document.createElement("div");
            neardiv.className="thin xsmall dimmed";
            neardiv.innerHTML = "(" + this.origin.lat + "," + this.origin.lon + ")";
            self.neardiv=neardiv;
            topdiv.appendChild(neardiv);           

            // REVERSE GEOCODE
            var addrdiv = document.createElement("div");
            addrdiv.style.textAlign="left";
            //addrdiv.innerHTML = this.gpx_json.lat + "," + this.gpx_json.lon;
            addrdiv.className="thin xsmall normal bright";
            //addrdiv.appendChild(addr);
            self.addrdiv=addrdiv;
            topdiv.appendChild(addrdiv);


            /*
            var acceptable = ["street_address", "establishment", "general_contractor", "point_of_interest"];
            if(this.reverseGeo!=null) {
                
                this.reverseGeo.results.slice(0,2).forEach(function(current, i, arr) {
                   const intersection = current.types.filter(x => acceptable.includes(x));
                   if(intersection.length!=0) {
                    addr.innerHTML = current.formatted_address;
                       window.markers.push( [null,current.geometry.location.lat,current.geometry.location.lng,null,"/modules/MMM-GoogleBusSchedule/house-light-32x32px.png"] );
                   }
                });
            }*/

            // NEXT APPT LOCATION
            var apptdiv = document.createElement("div");
            apptdiv.className="small bright";
            apptdiv.style.textAlign="left";
            apptdiv.style.position="relative";
            apptdiv.style.top="-40px";
            apptdiv.style.left="0px";
            self.apptdiv=apptdiv;
            div.appendChild(apptdiv);
            
            // NEARBY BUS STOPS
            var busTbl = document.createElement("table");
            //busTbl.className="med";
            busTbl.className="small";
            busTbl.cellPadding=0;
            busTbl.style.textAlign="left";
            busTbl.style.position="relative";
            busTbl.style.top="-40px";
            busTbl.style.left="0px";
            busTbl.style.backgroundColor="rgba(0,0,0, 0.5)";
            self.busTbl=busTbl;
            div.appendChild(busTbl);

            self.poimarkers=[];
            //console.log("in getdom after self.poimarkers=[];");
            //console.log(self);
            //console.log(self.poimarkers);
/*
            if(this.busroute!=null) {
                this.busroute.slice(0,5).forEach(function(current, i, arr) {
                    var stoptr = document.createElement("tr");
                    stoptr.className="normal event small";
                    stoptr.style.textAlign="left";
                    stoptr.style.verticalAlign="bottom";
                    stoptr.innerHTML ="<td class='bright'><img width=16 height=16 src='http:"+current.transitTypeICO+"'>&nbsp;"
                                       +current.transitLine+"</td>"
                                       //+current.transitType+" "
                                       //+current.transitID+" "
                                       +"<td class='light xsmall'>"+current.departureStopName+"</td>"
                                       +"<td class=''>"+current.departureTime[0]+"</td>";
//                                       +current.departureTime.slice(1,5).join(", ");
                    busTbl.appendChild(stoptr);

                    var timetr = document.createElement("tr");
                    timetr.className="normal event small";
                    timetr.style.textAlign="left";
                    timetr.style.verticalAlign="top";
                    timetr.innerHTML ="<td></td>"
                                       +"<td colspan=2 class='xsmall'>"+current.departureTime.slice(1).join(", ")+"</td>";
                    busTbl.appendChild(timetr);

                    window.markers.push( [null,current.departureStopCoor.latitude,current.departureStopCoor.longitude,null,"/modules/MMM-GoogleBusSchedule/bus-light-32x32px.png"] );
                });
                busTbl.className="med";
                //addrdiv.innerHTML = this.gpx_json.lat + "," + this.gpx_json.lon;
                div.appendChild(busTbl);
            }*/

            // run any updates that have occurred, while map was loading
            self.updateGpx();
            self.updateGeocode();
            self.updateBusSchedule();
            self.updateNextAppt();

            // set UI requested updates
            //window.updateNextBus=self.updateNextBus;
            setInterval("window.GoogleMapBus.updateNextBus()",15000);
            setInterval("window.GoogleMapBus.updateNextAppt()",60000);
        } else {
            var span = document.createElement("span");
            span.innerHTML = "Location not known yet...";
            div.appendChild(span);
        }

        return div;
    },

    updateGpx:function() {
        var self=this;
        //console.log("in updateGpx");
        //console.log(this.timediv);
        //console.log(this.neardiv);
        //console.log(this.gpxmarker);
        //console.log(this.map);
        if(this.timediv==null  || this.neardiv==null){
            console.error("ui not ready for gpx info.  This shouldnt never happen.  It can run before map callback but that is handled");
            return;
        }    
        
        this.timediv.innerHTML =( new Date()).toLocaleString();
        this.neardiv.innerHTML ="(" + this.origin.lat + "," + this.origin.lon + ")";
        if(this.map!=null) {
            this.gpxmarker.setPosition( new google.maps.LatLng( self.origin.lat, self.origin.lon ) );
            var myLocation = { lat: self.origin.lat, lng: self.origin.lon };
            this.map.panTo(myLocation);    
        }
    },
    updateGeocode:function() {
        var self=this;
        if(this.addrdiv==null || this.reverseGeo==null) {
            console.info("ui race condition, geocode not defined yet");
            return;
        }

        if(self.geomarker!=null)
            self.geomarker.setMap(null);
        var acceptable = ["street_address", "establishment", "general_contractor", "point_of_interest"];
        this.reverseGeo.results.slice(0,2).forEach(function(current, i, arr) {
            const intersection = current.types.filter(x => acceptable.includes(x));
            if(intersection.length!=0) {
                //cannot use this, inside forEach()
                self.neardiv.innerHTML = "";
                self.addrdiv.innerHTML = current.formatted_address;
                var lat = current.geometry.location.lat;
                var lon = current.geometry.location.lng;    
                var map = self.map;
                if(map!=null)
                    if(self.geomarker!=null) {
                        self.geomarker.setPosition( new google.maps.LatLng( lat, lon ) );
                        self.geomarker.setMap(map);
                    } else {
                        var addrMarker = self.geomarker = new google.maps.Marker({
                            position: { lat: lat, lng: lon },
                            map,
                            //icon: image,
                            icon: {
                                url: "/modules/MMM-GoogleBusSchedule/house-light-32x32px.png",
                                anchor: new google.maps.Point(15, 15),
                            },
                        });
                    }
                //window.markers.push( [null,current.geometry.location.lat,current.geometry.location.lng,null,"/modules/MMM-GoogleBusSchedule/house-light-32x32px.png"] );
            }
        });
    },
    updateBusSchedule:function() {
        var self=this;
        if(this.busTbl==null || this.busroute==null) {
            console.info("ui race condition, bus info not defined yet");
            return;
        }
        var map=this.map;
            
        var first=true;
        var busTbl=this.busTbl;
        busTbl.innerHTML = "";
        if(this.busroute!=null) {
            var bounds = new google.maps.LatLngBounds();
            this.busroute.sort((a,b)=>a.departureTime[0]<b.departureTime[0] ? -1 : a.departureTime[0]>b.departureTime[0] ? 1 : 0).slice(0,5).forEach(function(current, i, arr) {
                var stoptr = document.createElement("tr");
                stoptr.className="normal event small";
                stoptr.style.textAlign="left";
                stoptr.style.verticalAlign="bottom";
                stoptr.innerHTML ="<td class='bright'><img width=16 height=16 src='http:"+current.transitTypeICO+"'>&nbsp;"
                                   +current.transitLine+"</td>"
                                   //+current.transitType+" "
                                   //+current.transitID+" "
                                   +"<td class='light xsmall'>"+current.departureStopName+"</td>"
                                   +"<td class=''>"+current.departureTime[0]+"</td>";
//                                       +current.departureTime.slice(1,5).join(", ");
                busTbl.appendChild(stoptr);

                var timetr = document.createElement("tr");
                timetr.className="normal event small";
                timetr.style.textAlign="left";
                timetr.style.verticalAlign="top";
                if(first) {
                    timetr.innerHTML ="<td></td>"
                                       +"<td class='xsmall'>"+current.departureTime.slice(1,5).join(", ")+"</td><td class='xsmall'></td>";
                    self.nextbusTr =timetr;
                    self.nextbus =current;
                } else
                    timetr.innerHTML ="<td></td>"
                                       +"<td colspan=2 class='xsmall'>"+current.departureTime.slice(1,5).join(", ")+"</td>";
                busTbl.appendChild(timetr);
                first=false;
 
                var lat=current.departureStopCoor.latitude;
                var lon=current.departureStopCoor.longitude;
                //window.markers.push( [null,current.departureStopCoor.latitude,current.departureStopCoor.longitude,null,"/modules/MMM-GoogleBusSchedule/bus-light-32x32px.png"] );
                //cannot use this, inside foreach()
                var index=self.poimarkers.findIndex(o=>o.departureStopCoor.latitude==lat && o.departureStopCoor.longitude==lon);
                //console.log(self);
                //console.log(self.poimarkers);
                //while((index=self.poimarkers.findIndex(o=>typeof o.marker=="undefined"))!=-1) {
                if(index==-1) {
                    //var current=self.poimarkers[index];
                    self.poimarkers.push(current);
                    const poiMarker = new google.maps.Marker({
                        position: { lat: lat, lng: lon },
                        map,
                        //icon: image,
                        icon: {
                            url: "/modules/MMM-GoogleBusSchedule/bus-light-32x32px.png",
                            anchor: new google.maps.Point(15, 15),
                        },
                    });
                    current.marker=poiMarker;
                } else
                    self.poimarkers[index],departureTime=current.departureTime;
                
                bounds.extend({ lat: lat, lng: lon });
            });
            if(this.directionsRenderer==null) //don't bother resizing, if sized for directions
                map.fitBounds(bounds);
        }
    },
    updateNextBus: function(){
        //console.log(this.nextbusTr);
        //console.log(this.nextbus);
        //console.log( this.nextbus.departureUTC[0] );
        //console.log(typeof this.nextbus.departureUTC[0] );
        if(typeof this.nextbusTr=="undefined")
            return;
        if(this.nextbusTr==null)
            return;
        if(typeof this.nextbus=="undefined")
            return;
        if(this.nextbus==null)
            return;

        const now=(new Date()).getTime();
        var sec=(this.nextbus.departureUTC[0].getTime()-now)/1000;
        if(sec > 0) {
            var time=this.timeForHumans(sec);
            //console.log(this.nextbusTr[2]);
            this.nextbusTr.cells[2].innerHTML="next "+time;    
        } else {
            //send bus update request
            this.nextbusTr.cells[2].innerHTML="past";
            this.config.lastRequestID = this.getRequestID(this.nextbus.departureUTC[0]);
            this.sendSocketNotification('GOOGLEMAP_BUS_UPDATE',this.config);
        }
    },
    /** @Royi's
     * https://stackoverflow.com/questions/8211744/convert-time-interval-given-in-seconds-into-more-human-readable-form
    * Translates seconds into human readable format of seconds, minutes, hours, days, and years
    * 
    * @param  {number} seconds The number of seconds to be processed
    * @return {string}         The phrase describing the amount of time
    */
    timeForHumans: function  ( seconds ) {
        var levels = [
            [Math.floor(seconds / 31536000), 'y'],
            [Math.floor((seconds % 31536000) / 86400), 'd'],
            [Math.floor(((seconds % 31536000) % 86400) / 3600), 'h'],
            [Math.floor((((seconds % 31536000) % 86400) % 3600) / 60), 'm'],
            //[(((seconds % 31536000) % 86400) % 3600) % 60, 's'],
        ];
        var returntext = '';
        if((((seconds % 31536000) % 86400) % 3600) % 60>0)
            seconds+=60;

        for (var i = 0, max = levels.length; i < max; i++) {
            if ( levels[i][0] === 0 ) continue;
            returntext += ' ' + levels[i][0] + '' + (levels[i][0] === 1 ? levels[i][1].substr(0, levels[i][1].length-1): levels[i][1]);
        };
        return returntext.trim();
    },
    getRequestID: function ( d ) {
        return d.getDay()*1000 + d.getHours()*100 + d.getMinutes();
    }

    dateToTimeString: function(d){
        var hh=d.getHours();
        var ispm=hh>12;
        return (ispm? hh-12+1 : hh+1)
                +":"
                +d.getMinutes().toString().padStart(2,'0')
                +(ispm ? "p" : "a");
    },
    updateNextAppt:function() {
        var self=this;
        if(this.apptdiv==null || this.ical==null) {
            console.info("ui race condition, bus info not defined yet");
            return;
        }

        var map=this.map;
        var apptdiv=this.apptdiv;
        var appt=this.ical;
        var now=(new Date()).getTime();
        var within=5; //days
        var wait=appt.DTSTART.getTime()-now;
        var alert=96; //hours
        if(appt!=null) {
            if(appt!=null && (wait<0)) {
                this.sendSocketNotification('GOOGLEMAP_ICAL_UPDATE',null);
            } else if(appt!=null && (wait<within*24*60*60*1000)) {
                console.log("appt within " +within+ " days");
                apptdiv.innerHTML ="<span class='light xsmall'>Next appt&nbsp;:</span> <span class='bright xsmall'>" 
                                +appt.LOCATION+"&nbsp;("+appt.SUMMARY+")<br></span>"
                                +this.dateToTimeString(appt.DTSTART)
                                +" (in "+this.timeForHumans(wait/1000)+")";
                if(this.map!=null && wait<alert*60*60*1000){ //12h
                    console.log("Showing directions within sec"+(alert*60*60*1000));
                    this.drivingpath();
                }
            } else if(this.directionsRenderer!=null) { //if no pending appt, erase directions
                this.directionsRenderer.setMap(null);
                this.directionsRenderer=null;
                this.updateBusSchedule();
            }
        }

        //x-mark-lite-32x32px.png
    },

/*
    marker:function(mapref,latitude,longitude,label,img) {
console.log([mapref,latitude,longitude,label,img]);
        var data = {
            position: { lat: latitude, lng: longitude },
            map: mapref
        };
        if(label!=null)
            data.label=label;
        if(img!=null)
            data.icon={
                url: img,
                anchor: new google.maps.Point(15, 15),
            };
console.log(data);
        var marker = new google.maps.Marker(data);
        //var marker = waypoint(latitude, longitude);

        //this.fit(mapref,marker);
        var bounds = new google.maps.LatLngBounds();
        if(typeof this.bounds === "undefined")
            this.bounds=bounds;
        else
            bounds=this.bounds;
        bounds.extend(marker);
        mapref.fitBounds(bounds);

        return marker;
    },

    fit: function(map,marker) {
        var bounds = new google.maps.LatLngBounds();
        if(typeof this.bounds === "undefined")
            this.bounds=bounds;
        else
            bounds=this.bounds;
        bounds.extend(marker);
        map.fitBounds(bounds);
    },*/

    drivingpath: function() {
        var self=this;
        if(this.drivefirst!=null && this.drivelast!=null)
            if(this.drivelast==this.ical.LOCATION && this.drivefirst.lat()==this.origin.lat && this.drivefirst.lng()==this.origin.lon){
                console.log("no change to driving directions");
                return;
            }
        //console.log(this.drivefirst);
        //console.log(this.drivelast);
        //console.log(this.ical);
        //console.log(this.gpx_json);
        console.log(["old directions " ,this.drivelast , this.drivefirst,this.drivefirst==null?null:this.drivefirst.lat(),this.drivefirst==null?null:this.drivefirst.lng() ]);
        console.log(["new directions " ,this.ical , this.origin]);
        if(this.directionsRenderer!=null) {
            this.directionsRenderer.setMap(null);
            this.directionsRenderer=null;
            this.infowindow.close();
            this.infowindow=null;
        }
            
        ///var colorcycle = ['red','blue','pink','yellow','purple','green','ltblue','orange'];
        // var current=colorcycle[colorcounter++%colorcycle.length];
        var map = this.map;

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);
        this.directionsRenderer=directionsRenderer;
        //const waypts = [];
        //coordinatelist.forEach(s=>waypts.push({location: s,stopover: true,}));
        //const first = coordinatelist[0];
        //const last = coordinatelist[coordinatelist.length-1];
        //waypts.shift();
        //waypts.length--;
        const first = new google.maps.LatLng(this.origin.lat, this.origin.lon);
        const last = this.ical.LOCATION;
        this.drivefirst = first;
        this.drivelast = last;
        directionsRenderer.setOptions({
          polylineOptions: {
            strokeColor: 'white'
          }
        });
        directionsService.route({
            origin: first,
            destination: last,
            //waypoints: waypts,
            //optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
        },(response, status) => {
            if (status === "OK" && response) {
                directionsRenderer.setDirections(response);
        
                var duration="";
                if(response.routes.length==1 && response.routes[0].legs.length==1) {
                    const route = response.routes[0];
                    //route.legs[0].duration.text //human
                    //route.legs[0].duration.value; //sec
                    duration=route.legs[0].duration.text;    
                } else {
                    var total=0;
                    var r=response.routes;
                    for(var i=0; i<r.length; i++){
                        var l=r[i];
                        for(var j=0; j<l.length; j++){
                            total+=l[j].duration.value;
                        }
                    }
                    duration=self.timeForHumans(total);
                }

                var end=response.routes[0].legs[0].end_location;
                //end.lat();
                //end.lng();
                //Create InfoWindow.
                var infoWindow = this.infowindow = new google.maps.InfoWindow();
 
                //Determine the location where the user has clicked.
                var location = end;
    
                //Set Content of InfoWindow.
                var content="<div style='text-align:left;color:black;padding-right:20px;padding-bottom:10px;'><b>"
                            +this.ical.SUMMARY +"<br>"+ this.ical.LOCATION +"<br>"
                            +this.dateToTimeString(this.ical.DTSTART)+"<br>"+duration+" driving</b></div>";
                infoWindow.setContent(content);
    
                //Set Position of InfoWindow.
                infoWindow.setPosition(end);

                //Open InfoWindow.
                infoWindow.open(map);

                //const summaryPanel = document.getElementById("directions-route");
                //summaryPanel.innerHTML = "";

                // For each route, display summary information.
                //for (let i = 0; i < route.legs.length; i++) {
                //    const routeSegment = i + 1;
                //    summaryPanel.innerHTML +=
                //    "<b>Route Segment: " + routeSegment + "</b><br>";
                //    summaryPanel.innerHTML += route.legs[i].start_address + " to ";
                //    summaryPanel.innerHTML += route.legs[i].end_address + "<br>";
                //    summaryPanel.innerHTML +=
                //    route.legs[i].distance.text + "<br><br>";
                //}
            } else {
                console.error("Directions request failed due to " + status);
            }
        });
        return directionsRenderer;
    },

});

