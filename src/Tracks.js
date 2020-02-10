const turf = require('@turf/turf')

const OverpassLayer = require('./OverpassLayer')

module.exports = class Tracks extends OverpassLayer {
  constructor (view) {
    super(view)
    this.query = 'way[railway=tram]'
  }

  addFeature (geojson) {
    let gauge = geojson.properties.gauge || 1435

    let metaitem = document.createElement('a-entity')

    let shifted = turf.lineOffset(geojson, gauge / 2000, { units: 'meters' })
    let geom = this.view.convertFromGeoJSON(shifted)
    geom = geom.geometry.coordinates
    let item = document.createElement('a-tube')
    item.setAttribute('class', 'tracks')
    item.setAttribute('path', geom.map(pos => pos.x + ' 0 ' + pos.z).join(', '))
    item.setAttribute('radius', 0.05)
    item.setAttribute('material', { color: '#404040' })
    item.setAttribute('segments', geom.length * 2)
    metaitem.appendChild(item)

    shifted = turf.lineOffset(geojson, -gauge / 2000, { units: 'meters' })
    geom = this.view.convertFromGeoJSON(shifted)
    geom = geom.geometry.coordinates
    item = document.createElement('a-tube')
    item.setAttribute('class', 'tracks')
    item.setAttribute('path', geom.map(pos => pos.x + ' 0 ' + pos.z).join(', '))
    item.setAttribute('radius', 0.05)
    item.setAttribute('material', { color: '#404040' })
    item.setAttribute('segments', geom.length * 2)
    metaitem.appendChild(item)
    global.items.appendChild(metaitem)

    return metaitem
  }

  removeFeature (feature, metaitem) {
    global.items.removeChild(metaitem)
  }
}
