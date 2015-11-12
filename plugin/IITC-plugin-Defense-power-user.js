// ==UserScript==
// @id             iitc-plugin-power-of-defense@Route288
// @name           IITC plugin: Power of Defense
// @category       Layer
// @version        0.0.1.20140810
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      https://dl.dropboxusercontent.com/u/4145113/IITC-plugin-Defense-power-user.js
// @downloadURL    https://dl.dropboxusercontent.com/u/4145113/IITC-plugin-Defense-power-user.js
// @description    Show diffense power of resonators on map.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'route288';
plugin_info.dateTimeVersion = '20151110';
plugin_info.pluginId = 'portal-diffese-power';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.portalDefensePower = function() {
};

window.plugin.portalDefensePower.ICON_SIZE = 12;
window.plugin.portalDefensePower.MOBILE_SCALE = 1.5;

window.plugin.portalDefensePower.levelLayers = {};
window.plugin.portalDefensePower.levelLayerGroup = null;

window.plugin.portalDefensePower.setupCSS = function() {
  $("<style>")
    .prop("type", "text/css")
    .html(".plugin-portal-diffese-power {\
            font-size: 10px;\
            color: #BBFFFF;\
            font-family: monospace;\
            text-align: center;\
            text-shadow: 0 0 0.5em black, 0 0 0.5em black, 0 0 0.5em black;\
            pointer-events: none;\
            -webkit-text-size-adjust:none;\
          }")
  .appendTo("head");
}

window.plugin.portalDefensePower.removeLabel = function(guid) {
  var previousLayer = window.plugin.portalDefensePower.levelLayers[guid];
  if(previousLayer) {
    window.plugin.portalDefensePower.levelLayerGroup.removeLayer(previousLayer);
    delete plugin.portalDefensePower.levelLayers[guid];
  }
}

window.plugin.portalDefensePower.addLabel = function(guid,latLng) {
  // remove old layer before updating
  window.plugin.portalDefensePower.removeLabel(guid);

  // add portal level to layers
  var p = window.portals[guid];

  var defPow = 0;
  var d = p.options.details;

  tempPortalDetail = window.portalDetail.get(guid);
  if (tempPortalDetail === undefined) {
      window.portalDetail.request(guid);
  }
  else
  {
    $.each(tempPortalDetail.mods, function(ind, mod) {
      if(mod && (mod.name === "Portal Shield" || mod.name === "AXA Shield")) {
        defPow += parseInt(mod.stats.MITIGATION, 10);
      }
    });
  }

  var resoNumber = defPow; //p.options.data.resCount;
  var reso = L.marker(latLng, {
    icon: L.divIcon({
      className: 'plugin-portal-diffese-power',
      iconSize: [window.plugin.portalDefensePower.ICON_SIZE, window.plugin.portalDefensePower.ICON_SIZE],
      html: defPow
      }),
    guid: guid
  });
  plugin.portalDefensePower.levelLayers[guid] = reso;
  reso.addTo(plugin.portalDefensePower.levelLayerGroup);
}

window.plugin.portalDefensePower.updatePortalLabels = function() {

  var SQUARE_SIZE = L.Browser.mobile ? (window.plugin.portalDefensePower.ICON_SIZE + 3) * window.plugin.portalDefensePower.MOBILE_SCALE
                                     : (window.plugin.portalDefensePower.ICON_SIZE + 3);

  // as this is called every time layers are toggled, there's no point in doing it when the layer is off
  if (!map.hasLayer(window.plugin.portalDefensePower.levelLayerGroup)) {
    return;
  }

  var portalPoints = {};

  for (var guid in window.portals) {
    var p = window.portals[guid];
    if (p._map) {  // only consider portals added to the map
      var point = map.project(p.getLatLng());
      portalPoints[guid] = point;
    }
  }

  // for efficient testing of intersection, group portals into buckets based on the defined rectangle size
  var buckets = {};
  for (var guid in portalPoints) {
    var point = portalPoints[guid];

    var bucketId = L.point([Math.floor(point.x/(SQUARE_SIZE*2)),Math.floor(point.y/SQUARE_SIZE*2)]);
    // the guid is added to four buckets. this way, when testing for overlap we don't need to test
    // all 8 buckets surrounding the one around the particular portal, only the bucket it is in itself
    var bucketIds = [bucketId, bucketId.add([1,0]), bucketId.add([0,1]), bucketId.add([1,1])];
    for (var i in bucketIds) {
      var b = bucketIds[i].toString();
      if (!buckets[b]) buckets[b] = {};
      buckets[b][guid] = true;
    }
  }

  var coveredPortals = {};

  for (var bucket in buckets) {
    var bucketGuids = buckets[bucket];
    for (var guid in bucketGuids) {
      var point = portalPoints[guid];
      // the bounds used for testing are twice as wide as the rectangle. this is so that there's no left/right
      // overlap between two different portals text
      var southWest = point.subtract([SQUARE_SIZE, SQUARE_SIZE]);
      var northEast = point.add([SQUARE_SIZE, SQUARE_SIZE]);
      var largeBounds = L.bounds(southWest, northEast);

      for (var otherGuid in bucketGuids) {
        // do not check portals already marked as covered
        if (guid != otherGuid && !coveredPortals[otherGuid]) {
          var otherPoint = portalPoints[otherGuid];

          if (largeBounds.contains(otherPoint)) {
            if (portals[guid].options.data.resCount < portals[otherGuid].options.data.resCount) continue;
            else coveredPortals[guid] = true;
            break;
          }
        }
      }
    }
  }

  for (var guid in coveredPortals) {
    delete portalPoints[guid];
  }

  // remove any not wanted
  for (var guid in window.plugin.portalDefensePower.levelLayers) {
    if (!(guid in portalPoints)) {
      window.plugin.portalDefensePower.removeLabel(guid);
    }
  }

  // and add those we do
  for (var guid in portalPoints) {
    window.plugin.portalDefensePower.addLabel(guid, portals[guid].getLatLng());
  }
}

// as calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.portalDefensePower.delayedUpdatePortalLabels = function(wait) {

  if (window.plugin.portalDefensePower.timer === undefined) {
    window.plugin.portalDefensePower.timer = setTimeout ( function() {
      window.plugin.portalDefensePower.timer = undefined;
      window.plugin.portalDefensePower.updatePortalLabels();
    }, wait*1000);

  }
}

var setup = function() {

  window.plugin.portalDefensePower.setupCSS();

  window.plugin.portalDefensePower.levelLayerGroup = new L.LayerGroup();
  window.addLayerGroup('Portal ResoNums', window.plugin.portalDefensePower.levelLayerGroup, true);

  window.addHook('requestFinished', function() { setTimeout(function(){window.plugin.portalDefensePower.delayedUpdatePortalLabels(3.0);},1); });
  window.addHook('mapDataRefreshEnd', function() { window.plugin.portalDefensePower.delayedUpdatePortalLabels(0.5); });
  window.map.on('overlayadd overlayremove', function() { setTimeout(function(){window.plugin.portalDefensePower.delayedUpdatePortalLabels(1.0);},1); });

}

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

