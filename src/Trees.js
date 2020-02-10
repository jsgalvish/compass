const OverpassLayer = require('./OverpassLayer')

module.exports = class Trees extends OverpassLayer {
  constructor (view) {
    super(view)
    this.query = 'node[natural=tree]'
  }

  addFeature (feature) {
    let itemPos = this.view.convertFromGeoJSON(feature).geometry.coordinates

    var tags = feature.properties || {}
    var item = document.createElement('a-entity')
    item.setAttribute('class', 'tree')
    var trunk = document.createElement('a-entity')
    trunk.setAttribute('class', 'trunk')
    var crown = document.createElement('a-entity')
    crown.setAttribute('class', 'crown')
    var height = tags.height ? tags.height : 8
    var trunkRadius = (tags.circumference ? tags.circumference : 1) / 2 / Math.PI
    var crownRadius = (tags.diameter_crown ? tags.diameter_crown : 3) / 2
    // leaf_type is broadleaved, needleleaved, mixed or rarely something else.
    if (tags['leaf_type'] === 'needleleaved') { // special shape for needle-leaved trees
      let trunkHeight = height * 0.5
      let crownHeight = height * 0.8
      trunk.setAttribute('geometry', { primitive: 'cylinder', height: trunkHeight, radius: trunkRadius })
      trunk.setAttribute('material', { color: '#b27f36' })
      trunk.setAttribute('position', { x: 0, y: (trunkHeight / 2), z: 0 })
      crown.setAttribute('geometry', { primitive: 'cone', height: crownHeight, radiusBottom: crownRadius, radiusTop: 0 })
      crown.setAttribute('material', { color: '#80ff80' })
      crown.setAttribute('position', { x: 0, y: (height - crownHeight / 2), z: 0 })
    } else { // use a simple typical broadleaved-type shape
      let trunkHeight = height - crownRadius
      trunk.setAttribute('geometry', { primitive: 'cylinder', height: trunkHeight, radius: trunkRadius })
      trunk.setAttribute('material', { color: '#b27f36' })
      trunk.setAttribute('position', { x: 0, y: (trunkHeight / 2), z: 0 })
      crown.setAttribute('geometry', { primitive: 'sphere', radius: crownRadius })
      crown.setAttribute('material', { color: '#80ff80' })
      crown.setAttribute('position', { x: 0, y: trunkHeight, z: 0 })
    }
    item.setAttribute('position', itemPos)
    item.setAttribute('data-gpspos', feature.geometry.lat + '/' + feature.geometry.lon)
    item.appendChild(trunk)
    item.appendChild(crown)
    global.items.appendChild(item)

    return item
  }

  removeFeature (feature, item) {
    global.items.removeChild(item)
  }
}
