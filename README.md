# MMM-GoogleBusSchedule

MagicMirror module that Retreives Transit Schedule for nearby routes, and displays the departure stops on Google Map, and displays departure times in table.

> [!NOTE]
> Uses Google Direction Routes API, to get nearby bus stops and departure times.
> Google Direction Routes API is described below, but you don't to understand it to get it to work:
> [https://developers.google.com/maps/documentation/routes/compute_route_directions](https://developers.google.com/maps/documentation/routes/compute_route_directions)

# Platform for the module

Module to be installed in the MagicMirror application, described in below link.

[https://github.com/MagicMirrorOrg/MagicMirror](https://github.com/MagicMirrorOrg/MagicMirror)

The MagicMirror application is built on the [node.js](https://nodejs.org/en) application platform, and node.js package dependencies can be managed by [npm](https://www.npmjs.com/) application.

# Installation
### Pre-requisites: A Google Cloud webservices key needs to grant access to these API:

    Directions API
    Geocoding API
    Maps JavaScript API
    Maps Static API
    Roads API
    Routes API

> [!WARNING]
> Needs Google API key to work.  You can obtain one here:
> [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
> The key needs to have permissions to the API indicated above.

### Step 1: Clone module from github, and install dependencies for module

```bash
cd <MagicMirror root>/modules/
git clone https://github.com/studio-1b/MMM-GoogleBusSchedule.git
cd MMM-GoogleBusSchedule
npm install
```

### Step 2: Add configuration to config.js (

Required is to replace API key, and coordinates of where you want bus stops.
```js
    {
       	module: "MMM-GoogleMapGpx",
        header: "Buses Nearby",
        position: "top_right",
        config: {
            width: 350,
            height: 300,
            apikey: "<GOOGLE_API_KEY>",
            origin:  {lat: <latitude >, lon: <longitude>},
            ical: "<ical url>"
        }
    },
```

## General options: 

| Key | Description |
| :-- | :-- |
| width <br> `350` | Width of Map |
| height <br> `300` | Height of Map |
| apikey <br> (required) | Google API key, as specified above (ie. ) |
| origin <br> (required) | object with Latitude,Longitude (ie. {lat: 49.22652, lon: -122.94399} )  |
| ical <br> (optional) | Ical URL is optional (ie. https://calendar.google.com/calendar/ical/basic.ics), but if supplied, it will retreive next available calendar entry with geocodable location, and posts driving path on map.  Bus legs are added to table. |
| cache <br> (true) | Save Bus Schedule data retreived from Google, save by day of week, and time retreived, and if matches previous data, don't retreive the rest  |

# Details

The program checks directions in 0.25mi N, E, W and S, and displays all departure bus stops and their departure times, and shows it on table.  Bus stop locations are also displayed on map.
