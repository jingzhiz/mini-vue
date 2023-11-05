const getType = (val) => Object.prototype.toString.call(val).slice(8, -1)

const isString = (value) => getType(value) === 'String'
const isNumber = (value) => getType(value) === 'Number'
const isBoolean = (value) => getType(value) === 'Boolean'
const isArray = (value) => getType(value) === 'Array'
const isObject = (value) => getType(value) === 'Object'
const isFunction = (value) => getType(value) === 'Function'

const shouldSetAsProps = (el, key, value) => {
  if (key === 'form' && el.tagName === 'INPUT') return false
  
  return key in el
}

const listDelimiterRE = /;(?![^(]*\))/g
const propertyDelimiterRE = /:([^]+)/
const styleCommentRE = /\/\*[^]*?\*\//g
function parseStringStyle(cssText) {
  const ret = {}
  cssText.replace(styleCommentRE, "").split(listDelimiterRE).forEach((item) => {
    if (item) {
      const tmp = item.split(propertyDelimiterRE)
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return ret
}
function normalizeStyle(value) {
  if (isArray(value)) {
    const res = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const normalized = isString(item) ? parseStringStyle(item) : normalizeStyle(item);
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res
  } else if (isString(value) || isObject(value)) {
    return value
  }
}

function normalizeClass(value) {
  let res = ""
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) {
        res += normalized + " "
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + " "
      }
    }
  }
  return res.trim()
}