'use strict';

const NodeHelper = require('node_helper');
var http = require('http');
var https = require('https');
var textToImage = require('text-to-image');

module.exports = NodeHelper.create({
  start: function() {
    console.log('Starting node helper: MMM-GoogleBusSchedule');
    this.isfound=false;

    //set Google default throttle limit to 34,000/30days
    this.startDate = new Date();
    this.routeQueryCount = 0;
  },

  // Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    var self = this;
    console.log(notification);
    console.log(payload);
    if(payload == null) {
      console.log("null payload, aborting notification");
      return;
    }
    if (notification === 'GOOGLEMAP_BUS_CONFIG') {
      this.config = payload;
      console.log(this.name + " GOOGLEMAP_BUS_CONFIG complete, getting geocode" );
      this.processCoordinates();
    } else  if (notification === 'GOOGLEMAP_BUS_UPDATE') { 
      if(this.lastBusRequest){
        const timespan = (new Date()).getTime()-this.lastBusRequest.getTime();
        if(timespan<55000){
          console.log(this.name + " GOOGLEMAP_BUS_UPDATE received " + timespan + "<60sec. aborting" );
          return;
        }
      }
      this.lastBusRequest = new Date();
      self.fetchNearbyBuses();
    } else  if (notification === 'GOOGLEMAP_ICAL_UPDATE') { 
      self.fetchAppt();
    }
  },

  calcDistance: function(tpv) {
    var gpx = this.gpx;
    if(gpx==null)
      return -1;
    var lat1 = tpv.lat;
    var lon1 = tpv.lon;
    var lat2 = gpx.lat;
    var lon2 = gpx.lon;
    // https://www.movable-type.co.uk/scripts/latlong.html#:~:text=%E2%88%9Ax%C2%B2%20%2B%20y%C2%B2-,JavaScript%3A,trigs%20%2B%202%20sqrts%20for%20haversine.
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    /*Note in these scripts, I generally use lat/lon for lati­tude/longi­tude in degrees,
     and φ/λ for lati­tude/longi­tude in radians – having found that mixing degrees & radians 
     is often the easiest route to head-scratching bugs...*/
     return d;
  },

  processCoordinates: function() {
    console.log("processCoordinates");
    var self=this;
    if(this.config==null) {
      console.error("No config");
      return;
    }
    var origin=this.config.origin;
    console.log(origin);
    if(origin && origin.lat && origin.lon && !this.reverseGeo) {
      self.sendSocketNotification('GOOGLEMAP_BUS_JSON', origin);

      console.log(self.name + " missing reverse geocode, getting geocode");
      this.fetchReverseGeocode();
    }
    //if(this.reverseGeo) {
      console.log(self.name + " , getting buses");
      self.fetchNearbyBuses();

      console.log(self.name + " , change direction to next appt");
      self.fetchAppt();
    //}
  },


  fetchReverseGeocode: function() {
    var self=this;
    var origin = this.config.origin;
    //https://maps.googleapis.com/maps/api/geocode/json?latlng=49.226923333,-122.943695&key=<GOOGLE_API_KEY>
    var url="https://maps.googleapis.com/maps/api/geocode/json?latlng="+origin.lat+","+origin.lon+"&key=" + this.config.apikey;
    https.get(url, res => {
            console.log("https callback handler for " + url);
            let data = [];
            const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
            res.on('data', chunk => {
              data.push(chunk);
            });
            res.on('end', () => {
//console.log(data);
              var html = ""+data.join('');
              console.log('Response ended: ' + html.substring(0,100));
              //console.log('Response ended: ' + html);
              //console.log(html.indexOf('"status" : "OK"'));
              if(html.indexOf(' "status" : "OK"') != -1) {
                console.log("good geocode, sending GOOGLEMAP_BUS_REVERSEGEO");
                self.reverseGeo=JSON.parse(html);
                self.sendSocketNotification('GOOGLEMAP_BUS_REVERSEGEO', self.reverseGeo);
              } else {
                self.reverseGeo=null;
              }
            });
    }).on('error', err => {
      console.log('Error: ', err.message);
    });
  },

/*
bob@mint20-500G:~/Pictures$ curl -X POST -H 'content-type: application/json' -d '{
  "origin": {
    "location": {"latLng":{latitude:49.226933333,longitude: -122.943628333 }}
  },
  "destination": {
    "location": {"latLng":{latitude:49.236933333,longitude:-122.943628333}}
  },                                                       
  "travelMode": "TRANSIT",
  "computeAlternativeRoutes": true,
  "transitPreferences": {
     routingPreference: "LESS_WALKING",
     allowedTravelMosdes: ["TRAIN","BUS"]
  },                                    
}' -H 'Content-Type: application/json' -H 'X-Goog-Api-Key: <GOOGLE_API_KEY>' -H 'X-Goog-FieldMask: routes.legs.steps.transitDetails' 'https://routes.googleapis.com/directions/v2:computeRoutes'
*/
  fetchNearbyBuses: function() {
    var self=this;
    var origin = this.config.origin;
    this.busroute=[];
    console.log(this.name + " fetchNearbyBuses() started ");

    const limit = this.config.googleLimit || 34000;
    const timespan = (new Date()).getTime()-this.startDate.getTime();
    const rate = this.routeQueryCount * (30*24*60*60*1000 / timespan);
console.log(this.routeQueryCount);
console.log(this.config.googleLimit);
console.log(timespan);
console.log(limit);
console.log(rate);
    if(timespan>1000000 && rate>limit) {
      console.log(this.name + " Rate throttled, started "+this.startDate.toLocaleDateString('en-US') + " timespan=" + timespan + " query count="+this.routeQueryCount+" produced rate="+rate +" exceeded limit="+limit);
      return;
    }
console.log("past throttle");
    var dest=[
      { latitude:origin.lat+0.02,longitude:origin.lon },
      { latitude:origin.lat-0.02,longitude:origin.lon },
      { latitude:origin.lat,longitude:origin.lon+0.02 },
      { latitude:origin.lat,longitude:origin.lon-0.02 },
    ];
    if(this.ical!=null)
      dest.push(this.ical.LOCATION);

console.log(dest);
    dest.forEach(function(d, i, a) {
        console.log(self.name + " before webservice call "+i);
        var postData = JSON.stringify({
            "origin": {
                "location": {"latLng":{latitude:origin.lat,longitude:origin.lon }}
            },
            "destination": {
                "location": {"latLng":d}
                //"location": {"latLng":{latitude:49.236933333,longitude:-122.943628333}}
            },
            "travelMode": "TRANSIT",
            "computeAlternativeRoutes": true,
            "transitPreferences": {
                routingPreference: "LESS_WALKING",
                allowedTravelModes: ["TRAIN","BUS"]
            },
        });

        //var now= new Date();
        //var ndx = now.getDay()*1000 + now.getHours()*100 + now.getMinutes();
        var options = {
                hostname: 'routes.googleapis.com',
                port: 443,
                path: '/directions/v2:computeRoutes',
                method: 'POST',
                headers: {
                   'content-type': 'application/json',
                   'Content-Type': 'application/json',
                   'User-Agent': 'nodejs',
                   'X-Goog-Api-Key': self.config.apikey,
                   'X-Goog-FieldMask': 'routes.legs.steps.transitDetails',
                   'Content-Length': postData.length,
                }
        };

        var req = https.request(options, (res) => {
            res.setEncoding('utf8');
            console.log("https callback handler for " + options.hostname + options.path);
            console.log('statusCode:', res.statusCode);
            //console.log('headers:', res.headers);
            let data = [];

            res.on('data', (chunk) => {
                data.push(chunk);
            });
            res.on('end', () => {
                var html = ""+data.join('');
                console.log('Response ended: ' + html.substring(0,100));
                //console.log('Response ended: ' + html);
                //console.log(html.indexOf('"error": {'));
                if(html.indexOf('"error": {') == -1) {
                    console.log("routes api json no error, sending GOOGLEMAP_BUS_BUSROUTE");
                    //self.busroute.push(...self.parseNearbyBuses(JSON.parse(html)));
                    self.busroute = self.parseNearbyBuses(JSON.parse(html));
                    self.sendSocketNotification('GOOGLEMAP_BUS_BUSROUTE', self.busroute);
                    console.log(self.busroute);
                } else {
                    self.busroute=null;
                }
            });
        });

        req.on('error', (ex) => {
          console.error(ex);
        });
            
        console.log(self.name + " sending Google route request...");
        req.write(postData);
        req.end();

        self.routeQueryCount++;
    });
  },
  parseNearbyBuses: function(routedata) {
    var stops=this.busroute; //[];
    routedata.routes.forEach(function(s, i, a) {
      if(typeof s.legs!=="undefined")
        s.legs.forEach(function(t, i, a) {
          if(typeof t.steps!=="undefined") {
            var found=false;
            t.steps.forEach(function(u, i, a) {
              if(typeof u.transitDetails!=="undefined" && !found) {
                 found=true;
                 var v = u.transitDetails;
                 var i = stops.findIndex(o=> o.departureStopName==v.stopDetails.departureStop.name
                                             && o.departureStopCoor.latitude==v.stopDetails.departureStop.location.latLng.latitude
                                             && o.departureStopCoor.longitude==v.stopDetails.departureStop.location.latLng.longitude
                                             && o.transitID==v.transitLine.agencies[0].name
                                             && o.transitLine==v.transitLine.nameShort
                                             && o.transitType==v.transitLine.vehicle.type
                                             && o.transitTypeICO==v.transitLine.vehicle.iconUri);
//console.log(stops);
                 if(i === -1) {
                    stops.push({
                      "departureStopName": v.stopDetails.departureStop.name,
                      "departureStopCoor": v.stopDetails.departureStop.location.latLng,
                      "departureUTC": [new Date(v.stopDetails.departureTime)],
                      "departureTime": [v.localizedValues.departureTime.time.text],
                      "departureTZ": v.localizedValues.departureTime.timeZone,
                      "transitID": v.transitLine.agencies[0].name,
                      "transitLine": v.transitLine.nameShort,
                      "transitType": v.transitLine.vehicle.type,
                      "transitTypeICO": v.transitLine.vehicle.iconUri,
                    });
                 } else {
                    var d = new Date(v.stopDetails.departureTime);
                    var insert = stops[i].departureUTC.findIndex(o=>o>=d);
                    if(insert==-1) {
                      stops[i].departureUTC.push(new Date(v.stopDetails.departureTime));
                      stops[i].departureTime.push(v.localizedValues.departureTime.time.text);
                    } else if(stops[i].departureUTC[insert].getTime()!=d.getTime()) {
                      stops[i].departureUTC.splice(insert,0,d);
                      stops[i].departureTime.splice(insert,0,v.localizedValues.departureTime.time.text);
                    }
                    //stops[i].departureUTC.push(new Date(v.stopDetails.departureTime));
                    //stops[i].departureUTC = [...new Set(stops[i].departureUTC)]; 

                    //stops[i].departureTime.push(v.localizedValues.departureTime.time.text);
                    //stops[i].departureTime = [...new Set(stops[i].departureTime)]; 
                 }
              }
            });
          }
        });
    });
    return stops;
/*
    return stops.map((s)=> {
      return {
        "departureStopName": s.stopDetails.departureStop.name,
        "departureStopCoor": s.stopDetails.departureStop.location.latLng,
        "departureUTC": new Date(s.stopDetails.departureTime),
        "departureTime": s.localizedValues.departureTime.time.text,
        "departureTZ": s.localizedValues.departureTime.timeZone,
        "transitID": s.transitLine.agencies[0].name,
        "transitLine": s.transitLine.nameShort,
        "transitType": s.transitLine.vehicle.type,
        "transitTypeICO": s.transitLine.vehicle.iconUri,
      }
    });
{
    departureStopName: 'NB Canada Way @ Elwell St',
    departureStopCoor: { latitude: 49.226926, longitude: -122.94437400000001 },
    departureUTC: '2023-10-19T02:48:10Z',
    departureTime: '7:48 PM',
    departureTZ: 'America/Vancouver',
    transitID: 'TransLink',
    transitLine: '123',
    transitType: 'BUS',
    transitTypeICO: '//maps.gstatic.com/mapfiles/transit/iw2/6/bus2.png'
  },*/
  },



  parseLineByLine: function* (contents) {
    var index=0;
    var count=0;
    var next=contents.indexOf('\n', index);
    //console.error(next);
    while(next != -1) {
        //console.error(index+" to "+next);
        //console.error(contents.substring(index, next));
        yield contents.substring(index, next);
        index=next+1;
        count++;

        next=contents.indexOf('\n', index);
    }
    yield contents.substring(index);
    return count;
  },
  parseChunksToLine: function* (chunks) {
    var count=0;
    var last="";
    var len=chunks.length;
    for(var i=0; i<len; i++) {
      var block=last+chunks[i];
      var l=(i==len-1) ? block.length : block.lastIndexOf("\n");
      //console.log( [l,block.length,len] );
      //console.log( block.substring(0,l) );
      for (const value of this.parseLineByLine(block.substring(0,l)) ) {
        count++;
        //console.log(value);
        yield value;
      }
      last=block.substring(l+1);
    }
    return count;
  },
  icalparsestate: {
    open: 0,
    headerparse: 1,
    recordparse: 2,
    recordclose: 3,
    close: 4,
  },
  parseIcalGenerator: function* (lines) {
    var wrapper={
        PRODID: null,
        VERSION: '2.0',
        CALSCALE: 'GREGORIAN',
        METHOD: 'PUBLISH',
        'X-WR-CALNAME': null,
        'X-WR-TIMEZONE': null,
    };
    var blank={
        DTSTART: null, //20231029T230000Z
        DTEND: null, //20231030T000000Z
        DTSTAMP: null, //20231023T020148Z
        UID: null, //17034047-11BE-44C4-BCCB-E8E2EE85E740
        CREATED: null, //20231020T093231Z
        'LAST-MODIFIED': null, //20231020T093518Z
        LOCATION: null, //No1 beef noodle
        SEQUENCE: null, //0
        STATUS: null, //CONFIRMED
        SUMMARY: null, //Text back
        TRANSP: null, //OPAQUE
    };
    const isdate = new RegExp('^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z$');

    var event;
    var count = 0;
    var state = this.icalparsestate.open;
    for (var line of lines) {
        //console.info([line]);
        line=line.replace('\r','');
        if(state==this.icalparsestate.open) {
            if(line==null || line=="") {
                //skip line
            } else if(line=='BEGIN:VCALENDAR') {
                state=this.icalparsestate.headerparse;
            } else
                return -1;
        } else if(state==this.icalparsestate.headerparse) {
            if(line==null || line=="") {
                //skip line
            } else if(line=='BEGIN:VEVENT') {
                state=this.icalparsestate.recordparse;
                event = { ...blank }
            } else {
                var header=line.split(":");
                wrapper[header[0]] = header.length>1 ? header[1] : null;
            }
        } else if(state==this.icalparsestate.recordparse) {
            if(line==null || line=="") {
                //skip line
            } else if(line=='END:VEVENT') {
                state=this.icalparsestate.recordclose;
                count++;
                yield event;
            } else {
                var header=line.split(":");
                //    var d=c[0]+c[1]+c[2]+c[3]+"-"+c[4]+c[5]+"-"+c[6]+c[7]+"T"+c[9]+c[10]+":"+c[11]+c[12]+":"+c[13]+c[14]+".000Z";
                event[header[0]] = header.length==1 ? null : isdate.test(header[1]) ? new Date( this.re(header[1]) ) : header[1];
            }
        } else if(state==this.icalparsestate.recordclose) {
            if(line==null || line=="") {
                //skip line
            } else if(line=='BEGIN:VEVENT') {
                state=this.icalparsestate.recordparse;
                event = { ...blank };
            } else if(line=='END:VCALENDAR') {
                return count;
            } else 
                return -1;
        } else {
            console.error("parseIcalGenerator error");
        }
    }

    //console.log(itItem);
    console.log("parseIcalGenerator aborted before expected.  probably incomplete ical");
    return count;
  },
  re: function(c) {
    var d=c[0]+c[1]+c[2]+c[3]+"-"+c[4]+c[5]+"-"+c[6]+c[7]+"T"+c[9]+c[10]+":"+c[11]+c[12]+":"+c[13]+c[14]+".000Z";
    return d;
  },
  fetchAppt: function() {
    var self=this;
    var url=this.config.ical;
    if(url!=null)
      https.get(url, res => {
            console.log("https callback handler for " + url);
            let data = [];
            const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
            res.on('data', chunk => {
              data.push(chunk);
            });
            res.on('end', () => {
              self.ical=null;
              console.log('ical result received');
              const now = new Date();
              //console.log(data.join(''));
              for (const value of self.parseIcalGenerator(self.parseChunksToLine(data)) ) {
                //console.error(value);
                if(value.LOCATION && value.DTSTART > now) {
                    console.log(value);
                    self.ical=value;
                    break;
                }
              }

              //self.reverseGeo=JSON.parse(html);
              if(self.ical!=null) {
                console.log('sending GOOGLEMAP_BUS_ICAL');
                self.sendSocketNotification('GOOGLEMAP_BUS_ICAL', self.ical);
              }
              //var html = ""+data.join('');
              //console.log('Response ended: ' + html.substring(0,100));
              //console.log('Response ended: ' + html);
              //console.log(html.indexOf('"status" : "OK"'));
              //if(html.indexOf(' "status" : "OK"') != -1) {
              //} else {
              //    self.reverseGeo=null;
              //}
            });
      }).on('error', err => {
        console.log('Error: ', err.message);
      });
    //end of if and function
  },

});

