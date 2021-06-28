try {
  var socket = io.connect();
  console.log('Socket.IO connected')
} catch {
  console.log('Socket.IO not connected')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}