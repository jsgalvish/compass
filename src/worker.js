const OverpassFronted = require('overpass-frontend')
const turf = require('@turf/turf')

const OverpassLayerWorker = require('./OverpassLayerWorker')
const pointToGeoJSON = require('./pointToGeoJSON')

let layers = {}

function getBBox (cameraPos) {
  let cameraGeoJSON = pointToGeoJSON(cameraPos)
  let viewArea = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ [
        cameraGeoJSON.geometry.coordinates,
        turf.transformTranslate(cameraGeoJSON, config.viewDistance / 1000, -cameraPos.heading + config.viewAngle / 2).geometry.coordinates,
        turf.transformTranslate(cameraGeoJSON, config.viewDistance / 1000, -cameraPos.heading - config.viewAngle / 2).geometry.coordinates,
        cameraGeoJSON.geometry.coordinates
      ] ]
    }
  }

  return turf.buffer(viewArea, config.viewBuffer / 1000)
}

function setCameraPos (cameraPos) {
  let viewArea = getBBox(cameraPos)
  let bbox = turf.bbox(viewArea)
  bbox = {
    minlon: bbox[0],
    minlat: bbox[1],
    maxlon: bbox[2],
    maxlat: bbox[3]
  }

  for (let k in layers) {
    layers[k].load(bbox, () => {})
  }
}

function init (_config) {
  config = _config

  global.overpassFrontend = new OverpassFronted(config.overpassURL)
}

onmessage = (e) => {
  switch (e.data.fun) {
    case 'init':
      init(e.data.config)
      return
    case 'addLayer':
      let layer = new OverpassLayerWorker(e.data.id, e.data.query, e.data.modifier)
      layers[e.data.id] = layer
      return
    case 'cameraPos':
      return setCameraPos(e.data.cameraPos)
  }
}
