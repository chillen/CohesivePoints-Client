class Field {
  constructor (tag, colour, radius, x, y, words=[], interference = []) {
    this.tag = tag
    this.colour = colour
    this.radius = radius
    this.peak = 1
    this.x = x
    this.y = y
    this.interference = interference
    this.data = {}
    this.words = words
    this.multi = 4.761
    this.invstd = Math.pow(-Math.pow(radius / 4.761, 2), -1)
    this._emit()
    this.displayed = false
  }

  at (x, y) {
    let xdist = Math.abs(this.x - x)
    let ydist = Math.abs(this.y - y)
    if (xdist in this.data && ydist in this.data[xdist]) return this.data[xdist][ydist]

    // if (x in this.data && y in this.data[x]) return this.data[x][y]

    // if (x > this.x + this.radius || y > this.y + this.radius) return 0
    // if (x < this.x - this.radius || y < this.y - this.radius) return 0
    if (xdist > this.radius) return 0
    if (ydist > this.radius) return 0

    if (!(xdist in this.data)) this.data[xdist] = {}

    let r = Math.pow(xdist, 2) + Math.pow(ydist, 2)
    let f = this.peak * Math.exp(this.invstd * r)

    this.interference.forEach(function (element) {
      stdev = Math.pow(element[0] / this.multi, 2)
      f -= element[1] * Math.exp(Math.pow(-stdev, -1) * r)
    }, this)

    this.data[xdist][ydist] = f

    return f
  };

  get_words() {
    return this.words
  };

  _emit () {
    for (let x = this.x - this.radius; x < this.x + this.radius; x++) {
      for (let y = this.y - this.radius; y < this.y + this.radius; y++) {
        this.at(x, y)
      }
    }
  }
}

class Location {
  constructor (x, y, colour) {
    this.x = x
    this.y = y
    this.colour = colour
    this.fields = []
  }

  addField (tag, colour, radius, interference = []) {
    let field = new Field(tag, colour, radius, this.x, this.y, interference)
    this.fields.push(field)
    return this.fields[this.fields.length - 1]
  }

  addWords(words) {
    this.fields[0].words = words
    return this.fields[0].get_words()
  }

  numFields () {
    return this.fields.length
  }
}