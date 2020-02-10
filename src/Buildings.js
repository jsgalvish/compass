/* global AFRAME, THREE */
const OverpassLayer = require('./OverpassLayer')

var metersPerLevel = 3
var roofOnlyTypes = ['roof', 'carport', 'grandstand']
var ignoredTypes = ['entrance', 'collapsed', 'destroyed', 'proposed', 'no']
var singleLevelTypes = ['grandstand', 'houseboat', 'bungalow', 'static_caravan',
  'kiosk', 'cabin', 'chapel', 'shrine', 'bakehouse', 'bridge', 'bunker',
  'carport', 'cowshed', 'garage', 'garages', 'gabage_shed', 'hut', 'roof',
  'shed', 'stable', 'sty', 'service', 'shelter']
var specialDefaults = {
  construction: { 'building:colour': '#808080' },
  house: { 'building:levels': 2 },
  farm: { 'building:levels': 2 },
  detached: { 'building:levels': 2 },
  terrace: { 'building:levels': 2 },
  transformer_tower: { 'height': 10 },
  water_tower: { 'height': 20 }
}

module.exports = class Buildings extends OverpassLayer {
  constructor (view) {
    super(view)
    this.query = '(way[building];relation[building];)'
  }

  addFeature (feature) {
    let geom = this.view.convertFromGeoJSON(feature)
    if (!geom.geometry) {
      console.log(feature)
      return
    }

    if (geom.geometry.type === 'LineString') {
      geom.geometry.type = 'Polygon'
      geom.geometry.coordinates = [ geom.geometry.coordinates ]
    }

    let data = getBuildingData(feature)
    if (data === null) {
      return
    }

    let item
    if (geom.geometry.type === 'Polygon') {
      let itemPos = geom.geometry.coordinates[0][0]
      item = this.toItem(geom.geometry.coordinates, data, itemPos)
    } else if (geom.geometry.type === 'MultiPolygon') {
      item = document.createElement('a-entity')
      let itemPos = geom.geometry.coordinates[0][0][0]

      for (let i = 0; i < geom.geometry.coordinates.length; i++) {
        let subitem = this.toItem(geom.geometry.coordinates[i], data, itemPos)
        item.appendChild(subitem)
      }
    } else {
      console.error('Buildings: can\'t handle geometry ' + geom.geometry.type + ', object ' + feature.id)
      return
    }

    global.items.appendChild(item)

    return item
  }

  removeFeature (feature, item) {
    if (item) {
      global.items.removeChild(item)
    }
  }

  toItem (coordinates, data, itemPos) {
    var outerPoints = []
    var innerWays = []
    for (let way of coordinates) {
      let wayPoints = []
      for (let tpos of way) {
        let ppos = this.view.getRelativePositionFromWorldpos(tpos, itemPos)
        wayPoints.push({ x: ppos.x, y: ppos.z })
      }
      if (!outerPoints.length) {
        outerPoints = wayPoints
      } else {
        innerWays.push(wayPoints)
      }
    }

    let item = document.createElement('a-entity')
    item.setAttribute('class', 'building')

    let buildingProperties = {}
    Object.assign(buildingProperties, data.properties)
    buildingProperties.outerPoints = outerPoints
    if (innerWays.length) {
      buildingProperties.innerPaths = innerWays
    }

    item.setAttribute('geometry', buildingProperties)
    item.setAttribute('material', { color: data.color })
    item.setAttribute('position', itemPos)

    return item
  }
}

function getBuildingData (feature) {
  var tags = feature.properties || {}
  var btype = tags.building
  if (tags.shelter === 'yes') { btype = 'shelter' }
  if (ignoredTypes.includes(btype)) { return null }

  var height = tags.height ? tags.height : null
  if (!height && tags['building:levels']) {
    height = tags['building:levels'] * metersPerLevel
  } else if (!height && btype in specialDefaults && specialDefaults[btype].height) {
    height = specialDefaults[btype].height
  } else if (!height && btype in specialDefaults && specialDefaults[btype]['building:levels']) {
    height = specialDefaults[btype]['building:levels'] * metersPerLevel
  } else if (!height && singleLevelTypes.includes(btype)) {
    height = metersPerLevel // assume one level only
  }

  var minHeight = tags.min_height ? tags.min_height : null
  if (!minHeight && tags['building:min_level']) {
    minHeight = tags['building:min_level'] * metersPerLevel
  } else if (!minHeight && btype in specialDefaults && specialDefaults[btype]['building:min_level']) {
    minHeight = specialDefaults[btype]['building:min_level'] * metersPerLevel
  } else if (!minHeight && roofOnlyTypes.includes(btype)) {
    if (!height) { height = metersPerLevel /* assume one level only */ }
    minHeight = height - 0.3
  }

  var color = '#d9c0d9'
  if (tags['building:colour']) {
    color = tags['building:colour']
  } else if (btype in specialDefaults && specialDefaults[btype]['building:colour']) {
    color = specialDefaults[btype]['building:colour']
  }

  let buildingProperties = { primitive: 'building' }
  if (height) {
    buildingProperties.height = height
  }
  if (minHeight) {
    buildingProperties.minHeight = minHeight
  }

  return {
    properties: buildingProperties,
    color: color
  }
}

AFRAME.registerGeometry('building', {
  schema: {
    outerPoints: {
      parse: function (value) {
        if (typeof value === 'string' && value.length) {
          // e.g. "x1 y1, x2 y2, x3 y3, x4 y4"
          return value.split(',').map(val => AFRAME.utils.coordinates.parse(val))
        } else if (typeof value === 'object') {
          // assume we got an object we can use directly
          return value
        } else {
          return []
        }
      },
      default: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
    },
    innerPaths: {
      parse: function (value) {
        if (typeof value === 'string' && value.length) {
          // e.g. "x1 y1, x2 y2, x3 y3, x4 y4 / x5 y5, x6 y6, x7 y7" describes two paths (holes)
          return value.split('/').map(part => part.split(',').map(val => AFRAME.utils.coordinates.parse(val)))
        } else if (typeof value === 'object') {
          // assume we got an object we can use directly
          return value
        } else {
          return []
        }
      },
      default: []
    },
    height: { type: 'number', default: 0 },
    minHeight: { type: 'number', default: 0 }
  },

  init: function (data) {
    var shape = new THREE.Shape(data.outerPoints)
    var outerLength = shape.getLength()
    if (data.innerPaths.length) {
      for (let ipoints of data.innerPaths) {
        var holePath = new THREE.Path(ipoints)
        shape.holes.push(holePath)
      }
    }
    // Extrude from a 2D shape into a 3D object with a height.
    var height = data.height - data.minHeight
    if (!height) {
      height = Math.min(10, outerLength / 5)
    }
    var geometry = new THREE.ExtrudeGeometry(shape, { amount: height, bevelEnabled: false })
    // As Y is the coordinate going up, let's rotate by 90° to point Z up.
    geometry.rotateX(-Math.PI / 2)
    // Rotate around Y and Z as well to make it show up correctly.
    geometry.rotateY(Math.PI)
    geometry.rotateZ(Math.PI)
    // Now we would point under ground, move up the height, and any above-ground space as well.
    geometry.translate(0, height + data.minHeight, 0)
    this.geometry = geometry
  }
})
