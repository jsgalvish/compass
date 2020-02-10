const turf = require('@turf/turf')
const OverpassFrontend = require('overpass-frontend')

module.exports = (ob, feature, callback) => {
  // make sure that all route members are fully loaded (including connections to prev/next way)
  let routeWayIds = []
  feature.members.forEach(
    member => {
      if (member.role === '' && member.type === 'way') {
        routeWayIds.push(member.id)
      }
    }
  )

  global.overpassFrontend.get(
    routeWayIds,
    {
      properties: OverpassFrontend.MEMBERS
    },
    () => {},
    () => {
      let routeFeatures = []
      let routeGeom = []

      feature.members.forEach(
        member => {
          if (member.role === '' && member.type === 'way') {
            routeFeatures.push(member)

            if (member.dir === 'backward') {
              routeGeom = routeGeom.concat(member.geometry.reverse().slice(member.connectedPrev === 'no' ? 0 : 1))
            } else {
              routeGeom = routeGeom.concat(member.geometry.slice(member.connectedPrev === 'no' ? 0 : 1))
            }
          }
        }
      )

      ob.routeJsonFeature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeGeom.map(pos => [ pos.lon, pos.lat ])
        }
      }
      ob.routeLength = turf.length(ob.routeJsonFeature)

      callback(null, ob)
    }
  )
}

