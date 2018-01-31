var domHelper = (function (m) {

  m.getSize = function () {
    return {
      width: document.querySelector('#sketch').clientWidth,
      height: document.querySelector('#sketch').clientHeight
    }
  }

  return m
})({})
