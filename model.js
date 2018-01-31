var model = (function () {
  var points = []
  var connections = []
  var connectionsChanged = true

  function initialize (data) {
    // Takes in data in json format
    for (let row in data.rows) {
      let p = data.rows[row].obj
      p.pos = p.Position.split(',').map(x => parseInt(x))
      p.col = p.Colour.split(',').map(x => parseInt(x))
      p.col.push(255) // transparency
      p.words = p.Words.split(',').map(x => x.trim())

      points.push(new Location(p.pos[0], p.pos[1], p.col))
      p.col = p.col.map(x => Math.round(0.5*x))
      p.col[3] = 255
      p.radius = parseInt(p.Radius)
      points[points.length - 1].addField(p.Name, p.col, p.radius, p.words)
    }
    return this
  }

  function getPoints () {
    return points
  }

  function updateConnections() {
    for (let pointA of points) {
      for (let pointB of points) {
        if (pointA === pointB) continue
        for (let word of pointA.fields[0].words) {
          if (pointB.fields[0].words.includes(word)) {
            connections.push({
              x1: pointA.fields[0].x,
              x2: pointB.fields[0].x,
              y1: pointA.fields[0].y,
              y2: pointB.fields[0].y,
              word: word,
              colour: pointA.fields[0].colour
            })
          }
        }
      }
    }
    connectionsChanged = false
  }

  function getConnections() {
    if (connectionsChanged) {
      updateConnections()
    }
    return connections
  }

  function getFields () {
    let fields = []
    for (let point of points) {
      for (let field of point.fields) {
        fields.push(field)
      }
    }
    return fields
  }

  function addPoint (x, y, radius, name, colour = [200, 200, 150, 255], words=[]) {
    let point = new Location(x, y, colour)
    let fcol = colour.map(x => Math.round(0.5*x))
    fcol[3] = 255
    point.addField(name, fcol, radius)
    point.fields[point.fields.length - 1].words = words
    points.push(point)
    return points[points.length - 1]
  }

  return {
    initialize: initialize,
    getPoints: getPoints,
    getFields: getFields,
    addPoint: addPoint,
    getConnections: getConnections
  }
})()
