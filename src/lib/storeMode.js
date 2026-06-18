let mode = 'mongo';

function setStoreMode(next) {
  mode = next;
}

function isMongo() {
  return mode === 'mongo';
}

function isJson() {
  return mode === 'json';
}

module.exports = { setStoreMode, isMongo, isJson };
