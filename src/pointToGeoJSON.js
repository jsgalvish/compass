module.exports = (point) => {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [
        point.longitude,
        point.latitude
      ]
    }
  }
}
