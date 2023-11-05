let currentInstance = null
function setCurrentInstance(instance) {
  currentInstance = instance
}

function onBeforeMount(fn) {
  if (currentInstance) {
    currentInstance.beforeMount.push(fn)
  } else {
    console.error('onBeforeMount hooks only be call in setup function')
  }
}

function onMounted(fn) {
  if (currentInstance) {
    currentInstance.mounted.push(fn)
  } else {
    console.error('onMounted hooks only be call in setup function')
  }
}

function onBeforeUpdate(fn) {
  if (currentInstance) {
    currentInstance.beforeUpdate.push(fn)
  } else {
    console.error('onBeforeUpdate hooks only be call in setup function')
  }
}

function onUpdated(fn) {
  if (currentInstance) {
    currentInstance.updated.push(fn)
  } else {
    console.error('onUpdated hooks only be call in setup function')
  }
}

function onBeforeUnmount(fn) {
  if (currentInstance) {
    currentInstance.beforeUnmount.push(fn)
  } else {
    console.error('onBeforeUnmount hooks only be call in setup function')
  }
}

function onUnmounted(fn) {
  if (currentInstance) {
    currentInstance.unmounted.push(fn)
  } else {
    console.error('onUnmounted hooks only be call in setup function')
  }
}